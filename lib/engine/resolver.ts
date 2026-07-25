// Resolves raw merchant strings from parsed events onto a canonical set of
// entities via a hardcoded alias map, falling back to fuzzy matching and
// then a readable per-merchant bucket. Pure functions only.

import type { ParsedEvent, Rail, SensorHint } from "./parser";

export type SensorType = "otp" | "receipt" | "delivery" | "login" | "none";

export interface AliasEntry {
  canonical: string;
  sensorType: SensorType;
  rail: Rail;
}

// Keys are normalized (uppercase, alnum-only) merchant *roots*, deliberately
// kept short enough to survive the noise banks append to a merchant string —
// "PRACTO TECHNOLOGIE" and "PRACTO PLUS" both have to reduce to PRACTO.
//
// Specificity still matters where a brand sells both a subscription and
// one-off goods: ZEPTOPASS is the subscription, while a plain "ZEPTO
// MARKETPLACE" grocery charge must NOT be mistaken for it. Keys are matched
// longest-first for the same reason.
export const ALIAS_MAP: Record<string, AliasEntry> = {
  // --- video streaming
  NETFLIX: { canonical: "Netflix", sensorType: "none", rail: "card-si" },
  HOTSTAR: { canonical: "Disney+ Hotstar", sensorType: "login", rail: "upi-autopay" },
  PRIMEVIDEO: { canonical: "Amazon Prime Video", sensorType: "none", rail: "card-si" },
  SONYLIV: { canonical: "SonyLIV", sensorType: "none", rail: "playstore" },
  ZEE5: { canonical: "ZEE5", sensorType: "none", rail: "playstore" },
  JIOCINEMA: { canonical: "JioCinema", sensorType: "none", rail: "upi-autopay" },
  YOUTUBEPREMIUM: { canonical: "YouTube Premium", sensorType: "none", rail: "playstore" },
  YOUTUBEMUSIC: { canonical: "YouTube Music", sensorType: "none", rail: "playstore" },
  APPLETV: { canonical: "Apple TV+", sensorType: "none", rail: "card-si" },
  MUBI: { canonical: "MUBI", sensorType: "none", rail: "card-si" },
  CRUNCHYROLL: { canonical: "Crunchyroll", sensorType: "login", rail: "playstore" },
  LIONSGATEPLAY: { canonical: "Lionsgate Play", sensorType: "none", rail: "playstore" },
  SUNNXT: { canonical: "Sun NXT", sensorType: "none", rail: "playstore" },
  AHAVIDEO: { canonical: "Aha", sensorType: "none", rail: "playstore" },

  // --- music and audio
  SPOTIFY: { canonical: "Spotify", sensorType: "otp", rail: "card-si" },
  SPTFY: { canonical: "Spotify", sensorType: "otp", rail: "card-si" },
  APPLEMUSIC: { canonical: "Apple Music", sensorType: "none", rail: "card-si" },
  JIOSAAVN: { canonical: "JioSaavn", sensorType: "none", rail: "upi-autopay" },
  GAANA: { canonical: "Gaana Plus", sensorType: "none", rail: "upi-autopay" },
  WYNK: { canonical: "Wynk Music", sensorType: "none", rail: "direct" },
  AUDIBLE: { canonical: "Audible", sensorType: "none", rail: "card-si" },
  KUKUFM: { canonical: "Kuku FM", sensorType: "none", rail: "playstore" },
  POCKETFM: { canonical: "Pocket FM", sensorType: "none", rail: "playstore" },
  STORYTEL: { canonical: "Storytel", sensorType: "none", rail: "card-si" },

  // --- food, grocery and delivery
  SWIGGY: { canonical: "Swiggy One", sensorType: "delivery", rail: "upi-autopay" },
  ZOMATO: { canonical: "Zomato Gold", sensorType: "delivery", rail: "upi-autopay" },
  BLINKIT: { canonical: "Blinkit", sensorType: "delivery", rail: "upi-autopay" },
  ZEPTOPASS: { canonical: "Zepto Pass", sensorType: "delivery", rail: "upi-autopay" },
  BIGBASKETSTAR: { canonical: "BigBasket Star", sensorType: "delivery", rail: "upi-autopay" },
  MYPROTEIN: { canonical: "MyProtein", sensorType: "receipt", rail: "card-si" },

  // --- health and fitness
  CULTFIT: { canonical: "Cult.fit", sensorType: "login", rail: "upi-autopay" },
  CUREFIT: { canonical: "Cult.fit", sensorType: "login", rail: "upi-autopay" },
  HEALTHIFYME: { canonical: "HealthifyMe Plus", sensorType: "none", rail: "upi-autopay" },
  PRACTO: { canonical: "Practo Plus", sensorType: "none", rail: "upi-autopay" },
  GYMPASS: { canonical: "Gympass", sensorType: "login", rail: "upi-autopay" },
  FITTR: { canonical: "Fittr", sensorType: "login", rail: "upi-autopay" },

  // --- productivity and work
  CANVA: { canonical: "Canva Pro", sensorType: "login", rail: "upi-autopay" },
  NOTION: { canonical: "Notion Plus", sensorType: "login", rail: "card-si" },
  LINKEDIN: { canonical: "LinkedIn Premium", sensorType: "login", rail: "card-si" },
  ADOBE: { canonical: "Adobe Creative Cloud", sensorType: "login", rail: "card-si" },
  MICROSOFT365: { canonical: "Microsoft 365", sensorType: "login", rail: "card-si" },
  GOOGLEONE: { canonical: "Google One", sensorType: "none", rail: "playstore" },
  ICLOUD: { canonical: "iCloud+", sensorType: "none", rail: "card-si" },
  DROPBOX: { canonical: "Dropbox", sensorType: "login", rail: "card-si" },
  FIGMA: { canonical: "Figma", sensorType: "login", rail: "card-si" },
  GRAMMARLY: { canonical: "Grammarly Premium", sensorType: "login", rail: "card-si" },
  GITHUB: { canonical: "GitHub Pro", sensorType: "login", rail: "card-si" },
  OPENAI: { canonical: "ChatGPT Plus", sensorType: "login", rail: "card-si" },
  ZOOM: { canonical: "Zoom Pro", sensorType: "login", rail: "card-si" },

  // --- telecom and broadband
  JIOFIBER: { canonical: "Jio Fiber", sensorType: "none", rail: "direct" },
  AIRTELXSTREAM: { canonical: "Airtel Xstream", sensorType: "none", rail: "direct" },
  ACTFIBERNET: { canonical: "ACT Fibernet", sensorType: "none", rail: "direct" },
  TATAPLAY: { canonical: "Tata Play", sensorType: "none", rail: "direct" },
  HATHWAY: { canonical: "Hathway", sensorType: "none", rail: "direct" },

  // --- news, reading and learning
  TIMESPRIME: { canonical: "Times Prime", sensorType: "none", rail: "upi-autopay" },
  ETPRIME: { canonical: "ET Prime", sensorType: "login", rail: "card-si" },
  KINDLEUNLIMITED: { canonical: "Kindle Unlimited", sensorType: "none", rail: "card-si" },
  UNACADEMY: { canonical: "Unacademy Plus", sensorType: "login", rail: "upi-autopay" },
  COURSERA: { canonical: "Coursera Plus", sensorType: "login", rail: "card-si" },
  DUOLINGO: { canonical: "Duolingo Super", sensorType: "login", rail: "playstore" },
  // No bare UDEMY key: Udemy charges are almost always one-off course
  // purchases, and billing a course as a recurring subscription would
  // overstate the leak. Same reason there is no bare BIGBASKET or ZEPTO.

  // --- shopping, travel and other
  AMAZON: { canonical: "Amazon Prime", sensorType: "receipt", rail: "upi-autopay" },
  BOOKMYSHOW: { canonical: "BookMyShow Gold", sensorType: "receipt", rail: "upi-autopay" },
  FLIPKARTPLUS: { canonical: "Flipkart Plus", sensorType: "receipt", rail: "upi-autopay" },
  MYNTRAINSIDER: { canonical: "Myntra Insider", sensorType: "delivery", rail: "upi-autopay" },
  UBERONE: { canonical: "Uber One", sensorType: "receipt", rail: "upi-autopay" },
  URBANCOMPANYPLUS: { canonical: "Urban Company Plus", sensorType: "receipt", rail: "upi-autopay" },
};

// Longest-first so a specific key (ZEPTOPASS) always beats a shorter one
// that happens to be a prefix of the same string.
const ALIAS_KEYS_BY_SPECIFICITY = Object.keys(ALIAS_MAP).sort(
  (a, b) => b.length - a.length
);

export interface ResolvedTransaction {
  id: string;
  timestamp: string;
  amount: number;
  maskedAccount?: string;
}

export interface ResolvedUsagePing {
  id: string;
  timestamp: string;
  sensorHint: SensorHint;
}

export interface Entity {
  id: string;
  name: string;
  sensorType: SensorType;
  rail: Rail;
  isUnresolved: boolean;
  transactions: ResolvedTransaction[];
  usagePings: ResolvedUsagePing[];
}

export interface ResolverResult {
  entities: Entity[];
  unresolved: Entity[];
}

export interface AliasMatch {
  key: string;
  entry: AliasEntry;
  /** How the match was made — surfaced for explainability. */
  via: "exact" | "substring" | "fuzzy";
}

function normalize(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Levenshtein distance, iterative single-row. Used only as a last resort and
// only against short alias keys, so the O(n*m) cost is negligible.
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous = current;
  }

  return previous[b.length];
}

/**
 * Three escalating passes: exact key, substring in either direction, then a
 * typo-tolerant comparison. Fuzzy matching is deliberately conservative —
 * one edit for a short key, two for a long one — because a wrong merchant is
 * worse than an unresolved one in a tool people act on.
 */
export function lookupAlias(merchantRaw: string): AliasMatch | undefined {
  const normalized = normalize(merchantRaw);
  if (!normalized) return undefined;

  const exact = ALIAS_MAP[normalized];
  if (exact) return { key: normalized, entry: exact, via: "exact" };

  for (const key of ALIAS_KEYS_BY_SPECIFICITY) {
    // Forward only: the merchant string may carry extra words around a key
    // ("NETFLIXINDIA", "CULTFIT MEMBERSHIP", "HOTSTAR SUBS").
    //
    // The reverse — treating a merchant as a match because a *longer* key
    // contains it — is deliberately not done. It reads a generic brand as a
    // specific product: a plain "BIGBASKET" grocery bill would resolve to
    // the "BigBasket Star" membership and be billed as a subscription.
    // Genuine truncation is handled by the edit-distance pass below.
    if (normalized.includes(key)) {
      return { key, entry: ALIAS_MAP[key], via: "substring" };
    }
  }

  for (const key of ALIAS_KEYS_BY_SPECIFICITY) {
    if (key.length < 5) continue;
    const budget = key.length >= 8 ? 2 : 1;
    if (Math.abs(normalized.length - key.length) > budget) continue;
    if (editDistance(normalized, key) <= budget) {
      return { key, entry: ALIAS_MAP[key], via: "fuzzy" };
    }
  }

  return undefined;
}

// Best-effort merchant identification for usage pings, which are far more
// free-form than bank SMS and often don't match the transaction merchant
// templates. Scans the raw text for a known alias substring.
function matchAliasInText(text: string): AliasMatch | undefined {
  const normalizedText = normalize(text);
  for (const key of ALIAS_KEYS_BY_SPECIFICITY) {
    if (normalizedText.includes(key)) {
      return { key, entry: ALIAS_MAP[key], via: "substring" };
    }
  }
  return undefined;
}

/**
 * Turns a raw bank merchant string into something readable for the
 * unresolved bucket, so an unknown charge still shows a name the user can
 * recognise rather than being merged into one anonymous "UNKNOWN" pile.
 * "SPTFY*SPOTIFY INDIA" -> "Spotify India", "CHAI POINT" -> "Chai Point".
 */
export function prettifyMerchant(raw: string): string {
  // Drop the acquirer/processor prefix that card networks prepend.
  const withoutProcessor = raw.includes("*") ? raw.slice(raw.indexOf("*") + 1) : raw;

  const words = withoutProcessor
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      // Leave mixed-case brand spellings (YouTube, BookMyShow) alone; only
      // fix the ALL-CAPS that banks emit.
      word === word.toUpperCase()
        ? word.charAt(0) + word.slice(1).toLowerCase()
        : word
    );

  return words.join(" ") || raw;
}

export function resolveEntities(events: ParsedEvent[]): ResolverResult {
  const entities = new Map<string, Entity>();
  const unresolved = new Map<string, Entity>();

  function getOrCreate(
    map: Map<string, Entity>,
    key: string,
    name: string,
    sensorType: SensorType,
    rail: Rail,
    isUnresolvedBucket: boolean
  ): Entity {
    let entity = map.get(key);
    if (!entity) {
      entity = {
        id: key,
        name,
        sensorType,
        rail,
        isUnresolved: isUnresolvedBucket,
        transactions: [],
        usagePings: [],
      };
      map.set(key, entity);
    }
    return entity;
  }

  for (const event of events) {
    if (event.type === "transaction") {
      const merchantRaw = event.merchantRaw ?? "UNKNOWN";
      const match = lookupAlias(merchantRaw);
      if (match) {
        const entity = getOrCreate(
          entities,
          match.key,
          match.entry.canonical,
          match.entry.sensorType,
          match.entry.rail,
          false
        );
        entity.transactions.push({
          id: event.id,
          timestamp: event.timestamp,
          amount: event.amount!,
          maskedAccount: event.maskedAccount,
        });
      } else {
        // Still bucketed per merchant, and under a readable name.
        const key = normalize(merchantRaw) || "UNRESOLVED";
        const entity = getOrCreate(
          unresolved,
          key,
          prettifyMerchant(merchantRaw),
          "none",
          event.rail ?? "direct",
          true
        );
        entity.transactions.push({
          id: event.id,
          timestamp: event.timestamp,
          amount: event.amount!,
          maskedAccount: event.maskedAccount,
        });
      }
    } else if (event.type === "usagePing") {
      const merchantRaw = event.merchantRaw;
      const match = merchantRaw ? lookupAlias(merchantRaw) : undefined;
      const senderMatch = event.sender ? lookupAlias(event.sender) : undefined;
      const fallbackMatch = match ?? senderMatch ?? matchAliasInText(event.rawText);
      if (fallbackMatch) {
        const entity = getOrCreate(
          entities,
          fallbackMatch.key,
          fallbackMatch.entry.canonical,
          fallbackMatch.entry.sensorType,
          fallbackMatch.entry.rail,
          false
        );
        entity.usagePings.push({
          id: event.id,
          timestamp: event.timestamp,
          sensorHint: event.sensorHint!,
        });
      }
      // Usage pings that can't be tied to a known merchant carry no
      // signal we can act on, so they're dropped rather than bucketed.
    }
  }

  return { entities: [...entities.values()], unresolved: [...unresolved.values()] };
}
