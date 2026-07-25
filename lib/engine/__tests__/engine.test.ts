import { describe, expect, it } from "vitest";
import { parseEvent, type InboxEvent } from "../parser";
import { computeRecurrence, ASSUMED_ANNUAL_PERIOD_DAYS } from "../recurrence";
import { analyzeInbox } from "../index";
import inboxData from "../../../data/inbox.json";

const inbox = inboxData as InboxEvent[];

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
