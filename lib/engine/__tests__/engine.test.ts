import { describe, expect, it } from "vitest";
import { parseEvent, type InboxEvent } from "../parser";
import { computeRecurrence, ASSUMED_ANNUAL_PERIOD_DAYS } from "../recurrence";
import { lookupAlias, prettifyMerchant } from "../resolver";
import { analyzeInbox } from "../index";
import { toDashboard } from "../../ui-adapter";
import { cadenceSuffix } from "../../utils";
import inboxData from "../../../data/inbox.json";
import karanData from "../../../data/demo-karan.json";
import priyaData from "../../../data/demo-priya.json";

const inbox = inboxData as InboxEvent[];

function parse(body: string) {
  return parseEvent({ id: "t", ts: "2026-02-01T00:00:00+05:30", channel: "sms", body });
}

describe("parser", () => {
  it("extracts amount + merchant from real message formats", () => {
    const cases: Array<{ text: string; amount: number; merchantIncludes: string }> = [
      {
        // Format A: merchant string with a "*" separator
        text: "Rs.119.00 debited from a/c XX4821 towards SPTFY*Spotify India on 02-01-26. UPI Ref 302388389. Not you? Call 1800-XXX-XXXX -HDFC Bank",
        amount: 119,
        merchantIncludes: "SPTFY*Spotify India",
      },
      {
        // Format B: UPI P2M debit, "thru UPI" phrasing
        text: "A/c X7051 debited INR 364.37 Dt 10-01-26 13:57:59 to CHAI POINT thru UPI:607991656753.Bal INR 2075.57 Not u?Fwd this SMS to 9264092640 to block UPI.-PNB",
        amount: 364.37,
        merchantIncludes: "CHAI POINT",
      },
      {
        // Format C: pre-debit notice ("will be debited towards X via UPI Autopay mandate")
        text: "Your Hotstar subscription of Rs.399.00 will be debited towards Hotstar via UPI Autopay mandate on 01-05-26. A/c X7051. To cancel, visit your bank app > UPI Mandates. -PNB",
        amount: 399,
        merchantIncludes: "Hotstar",
      },
    ];

    for (const c of cases) {
      const parsed = parseEvent({ id: "t", ts: "2026-01-01T00:00:00+05:30", channel: "sms", body: c.text });
      expect(parsed.type).toBe("transaction");
      expect(parsed.amount).toBe(c.amount);
      expect(parsed.merchantRaw).toContain(c.merchantIncludes);
    }
  });

  it("classifies a promo SMS as promo, not transaction", () => {
    const parsed = parseEvent({
      id: "p1",
      ts: "2026-02-22T15:32:31+05:30",
      channel: "sms",
      body: "MYNTRA END OF SEASON SALE: Flat 70% off on top brands. Shop now before stocks run out! myntra.app/EOSS26",
    });
    expect(parsed.type).toBe("promo");
    expect(parsed.amount).toBeUndefined();
  });
});

describe("parser — bank template coverage", () => {
  // One case per issuer template we claim to support. Each of these failed
  // before the template refactor.
  const CASES: Array<{
    bank: string;
    text: string;
    amount: number;
    merchant: string;
  }> = [
    {
      bank: "ICICI — structured UPI info field",
      text: "Dear Customer, Acct XX8734 is debited with Rs 649.00 on 05-Feb-26. Info: UPI/NETFLIX INDIA/504312. Avl Bal Rs 12,340.55.",
      amount: 649,
      merchant: "NETFLIX INDIA",
    },
    {
      bank: "ICICI — card 'used for ... at MERCHANT'",
      text: "ICICI Bank Card XX9012 used for Rs 1,499.00 on 12-Feb-26 at AUDIBLE IN. Not you? SMS BLOCK 9012 to 9215676766.",
      amount: 1499,
      merchant: "AUDIBLE IN",
    },
    {
      bank: "SBI — 'transfer to MERCHANT Ref No'",
      text: "Dear SBI User, your A/c X6789-debited by Rs.199.0 on 03Feb26 transfer to LINKEDIN PREMIUM Ref No 504398112233.",
      amount: 199,
      merchant: "LINKEDIN PREMIUM",
    },
    {
      bank: "SBI — bare amount, no currency prefix",
      text: "Dear UPI user A/C X1234 debited by 299.0 on date 07Feb26 trf to PRACTO TECHNOLOGIE Refno 403912887654. -SBI",
      amount: 299,
      merchant: "PRACTO TECHNOLOGIE",
    },
    {
      bank: "HDFC — card standing instruction",
      text: "Rs.499.00 has been debited from HDFC Bank Card xx4455 towards TIMES PRIME on 09-02-26. Standing Instruction. Avl Lmt: Rs.45,000",
      amount: 499,
      merchant: "TIMES PRIME",
    },
    {
      bank: "Axis — UPI/P2M/MERCHANT/ref",
      text: "INR 149.00 debited from A/c no. XX3421 on 11-02-26 12:04:21 IST. Info- UPI/P2M/HEALTHIFYME/440021. -Axis Bank",
      amount: 149,
      merchant: "HEALTHIFYME",
    },
    {
      bank: "Kotak — UPI Autopay mandate pre-debit",
      text: "Rs 599.00 will be auto-debited from your Kotak a/c XX7788 on 15-02-26 for ZEPTO PASS via UPI Autopay mandate.",
      amount: 599,
      merchant: "ZEPTO PASS",
    },
    {
      bank: "Google Play",
      text: "Google Play: Your purchase of Rs 129.00 for YouTube Premium was charged to your card ending 1234 on 06-Feb-26.",
      amount: 129,
      merchant: "YouTube Premium",
    },
  ];

  for (const c of CASES) {
    it(`parses ${c.bank}`, () => {
      const parsed = parse(c.text);
      expect(parsed.type).toBe("transaction");
      expect(parsed.amount).toBe(c.amount);
      expect(parsed.merchantRaw).toBe(c.merchant);
    });
  }

  it("infers the cancellation rail from the message", () => {
    expect(parse(CASES[6].text).rail).toBe("upi-autopay"); // Kotak mandate
    expect(parse(CASES[7].text).rail).toBe("playstore");
    expect(parse(CASES[1].text).rail).toBe("card-si");
  });

  it("never mistakes a scheme tag or date for a merchant", () => {
    // "Info: UPI Ref 958464345865" once resolved to a merchant named "UPI".
    const parsed = parse(
      "INR 730.34 has been debited from a/c XX7823 towards 1MG PHARMACY on 03-Jan-26. Info: UPI Ref 958464345865. -ICICI Bank"
    );
    expect(parsed.merchantRaw).toBe("1MG PHARMACY"); // digit-led brand name
  });

  it("keeps a debit classified as a debit even when it mentions cashback", () => {
    const parsed = parse(
      "Rs.199.00 debited from a/c XX4821 towards SPOTIFY on 02-01-26. You earned Rs 20 cashback."
    );
    expect(parsed.type).toBe("transaction");
    expect(parsed.amount).toBe(199);
  });
});

describe("resolver", () => {
  it("resolves merchants the bank has truncated or suffixed", () => {
    const cases: Array<[string, string]> = [
      ["PRACTO TECHNOLOGIE", "Practo Plus"],
      ["AUDIBLE IN", "Audible"],
      ["LINKEDIN PREMIUM", "LinkedIn Premium"],
      ["HEALTHIFYME", "HealthifyMe Plus"],
      ["TIMES PRIME", "Times Prime"],
      ["NETFLIX INDIA", "Netflix"],
      ["SPTFY*Spotify India", "Spotify"],
    ];
    for (const [raw, canonical] of cases) {
      expect(lookupAlias(raw)?.entry.canonical, raw).toBe(canonical);
    }
  });

  it("tolerates a typo without inventing a merchant", () => {
    expect(lookupAlias("SPOTIFI")?.entry.canonical).toBe("Spotify");
    expect(lookupAlias("SPOTIFI")?.via).toBe("fuzzy");
    // Unrelated strings must stay unresolved rather than snap to a neighbour.
    expect(lookupAlias("CHAI POINT")).toBeUndefined();
    expect(lookupAlias("APOLLO PHARMACY")).toBeUndefined();
  });

  it("does not confuse a brand's one-off purchases with its subscription", () => {
    expect(lookupAlias("ZEPTO PASS")?.entry.canonical).toBe("Zepto Pass");
    expect(lookupAlias("ZEPTO MARKETPLA")).toBeUndefined();
    // A grocery bill is not the BigBasket Star membership. Matching a
    // merchant because a *longer* alias key contains it would bill this
    // ₹533.09 basket as a recurring subscription.
    expect(lookupAlias("BIGBASKET STAR")?.entry.canonical).toBe("BigBasket Star");
    expect(lookupAlias("BIGBASKET")).toBeUndefined();
    expect(lookupAlias("URBAN COMPANY")).toBeUndefined();
  });

  it("still resolves a merchant the bank truncated, via the fuzzy pass", () => {
    // Truncation is real ("BIGBASKET STA"), and must still resolve — that is
    // what the edit-distance pass is for, not the reverse substring match.
    expect(lookupAlias("BIGBASKET STA")?.entry.canonical).toBe("BigBasket Star");
  });

  it("gives unresolved merchants a readable name instead of one UNKNOWN pile", () => {
    expect(prettifyMerchant("CHAI POINT")).toBe("Chai Point");
    expect(prettifyMerchant("SPTFY*SPOTIFY INDIA")).toBe("Spotify India");
    expect(prettifyMerchant("YouTube Premium")).toBe("YouTube Premium");
  });
});

describe("recurrence", () => {
  it("detects monthly cadence with 27-33 day gaps", () => {
    const transactions = [
      { id: "1", timestamp: "2026-01-03T00:00:00+05:30", amount: 99 },
      { id: "2", timestamp: "2026-02-02T00:00:00+05:30", amount: 99 },
      { id: "3", timestamp: "2026-03-01T00:00:00+05:30", amount: 99 },
    ];
    const recurrence = computeRecurrence(transactions);
    expect(recurrence.cadence).toBe("monthly");
    expect(recurrence.medianGapDays).toBeGreaterThanOrEqual(27);
    expect(recurrence.medianGapDays).toBeLessThanOrEqual(33);
  });

  it("assumes annual cadence for a single Feb charge using the 350-380d window", () => {
    const transactions = [{ id: "1", timestamp: "2026-02-14T00:00:00+05:30", amount: 1499 }];
    const recurrence = computeRecurrence(transactions);
    expect(recurrence.cadence).toBe("annual");
    expect(ASSUMED_ANNUAL_PERIOD_DAYS).toBeGreaterThanOrEqual(350);
    expect(ASSUMED_ANNUAL_PERIOD_DAYS).toBeLessThanOrEqual(380);
    expect(recurrence.annualizedSpend).toBe(1499);
  });
});

describe("full pipeline (data/inbox.json)", () => {
  const result = analyzeInbox(inbox);

  function findEntity(nameIncludes: string) {
    const found = result.entities.find((e) => e.entity.name.includes(nameIncludes));
    if (!found) throw new Error(`entity not found: ${nameIncludes}`);
    return found;
  }

  it("flags Hotstar's drift 299 -> 399 -> 499 with the correct % rise", () => {
    const hotstar = findEntity("Hotstar");
    const flaggedDrifts = hotstar.recurrence.drift.filter((d) => d.flagged);
    expect(flaggedDrifts).toHaveLength(2);
    expect(flaggedDrifts[0].fromAmount).toBe(299);
    expect(flaggedDrifts[0].toAmount).toBe(399);
    expect(flaggedDrifts[1].fromAmount).toBe(399);
    expect(flaggedDrifts[1].toAmount).toBe(499);
    expect(flaggedDrifts[1].deltaPercent).toBeCloseTo(25.0626, 3);
  });

  it("computes Swiggy's daysSinceLastPing as > 120 given the dataset", () => {
    const swiggy = findEntity("Swiggy");
    expect(swiggy.sensor.daysSinceLastPing).not.toBeNull();
    expect(swiggy.sensor.daysSinceLastPing as number).toBeGreaterThan(120);
  });

  it("verdicts Netflix as Unknown (sensorType none)", () => {
    const netflix = findEntity("Netflix");
    expect(netflix.entity.sensorType).toBe("none");
    expect(netflix.score.verdict).toBe("Unknown");
  });

  it("totals recovery as Cult.fit + Swiggy annualized + Hotstar drift delta annualized", () => {
    const cult = findEntity("Cult");
    const swiggy = findEntity("Swiggy");
    const hotstar = findEntity("Hotstar");

    expect(cult.score.verdict).toBe("Zombie-medium");
    expect(swiggy.score.verdict).toBe("Zombie-high");
    expect(hotstar.score.verdict).toBe("PriceHike");

    expect(cult.action.recoverableAmount).toBe(399 * 12);
    expect(swiggy.action.recoverableAmount).toBe(99 * 12);
    expect(hotstar.action.recoverableAmount).toBe(100 * 12);

    const expectedTotal = 399 * 12 + 99 * 12 + 100 * 12;
    expect(expectedTotal).toBe(7176);
    expect(result.totalRecoverable).toBe(expectedTotal);
  });
});

describe("bundled demo profiles", () => {
  // Every profile in the demo picker must analyze cleanly — these are the
  // fixtures a judge will actually click through.
  const PROFILES: Array<{ id: string; events: InboxEvent[]; expect: string[] }> = [
    {
      id: "karan",
      events: karanData as InboxEvent[],
      expect: ["YouTube Premium", "HealthifyMe Plus", "Times Prime", "YouTube Music"],
    },
    {
      id: "priya",
      events: priyaData as InboxEvent[],
      expect: ["Practo Plus", "Audible", "LinkedIn Premium", "SonyLIV"],
    },
  ];

  for (const profile of PROFILES) {
    it(`resolves the expected merchants for ${profile.id}`, () => {
      const result = analyzeInbox(profile.events);
      const names = result.entities.map((e) => e.entity.name);
      for (const expected of profile.expect) {
        expect(names, profile.id).toContain(expected);
      }
      expect(result.totalRecoverable).toBeGreaterThan(0);
    });

    it(`leaves no unresolved merchant named after a scheme tag for ${profile.id}`, () => {
      const result = analyzeInbox(profile.events);
      for (const entity of result.unresolved) {
        expect(entity.name.toUpperCase(), profile.id).not.toBe("UPI");
        expect(entity.name.toUpperCase(), profile.id).not.toBe("UNKNOWN");
      }
    });
  }
});

describe("displayed price", () => {
  // A single ₹89 charge was being shown as "₹7/month": the engine assumes an
  // annual renewal when it has only one charge to go on, and the card then
  // divided that annual figure by 12 while hardcoding a "/month" label.
  // The card now shows the amount actually charged, labelled by cadence.
  it("shows the real charged amount, never a derived per-month figure", () => {
    const dashboard = toDashboard(analyzeInbox(karanData as InboxEvent[]));

    for (const sub of dashboard.subscriptions) {
      const latestCharge = sub.charges[sub.charges.length - 1].amount;
      expect(sub.billedAmount, sub.merchant).toBe(latestCharge);
    }

    const ytMusic = dashboard.subscriptions.find((s) => s.merchant === "YouTube Music");
    expect(ytMusic?.billedAmount).toBe(89);
    expect(ytMusic?.cadence).toBe("annual");
    expect(cadenceSuffix(ytMusic!.cadence)).toBe("/year");
  });

  it("labels the period from cadence rather than assuming months", () => {
    expect(cadenceSuffix("monthly")).toBe("/month");
    expect(cadenceSuffix("annual")).toBe("/year");
    // An irregular charge has no meaningful period, so it gets no label.
    expect(cadenceSuffix("irregular")).toBe("");
  });
});
