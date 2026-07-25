// Resolves raw merchant strings from parsed events onto a canonical set of
// entities via a hardcoded alias map, falling back to normalized-token
// matching, then an `unresolved` bucket. Pure functions only.

import type { ParsedEvent, Rail, SensorHint } from "./parser";

export type SensorType = "otp" | "receipt" | "delivery" | "login" | "none";

export interface AliasEntry {
  canonical: string;
  sensorType: SensorType;
  rail: Rail;
}

// ~15 hardcoded merchants. Keys are normalized (uppercase, alnum-only)
// tokens used for both exact and substring matching.
export const ALIAS_MAP: Record<string, AliasEntry> = {
  NETFLIX: { canonical: "Netflix", sensorType: "none", rail: "card-si" },
  HOTSTAR: { canonical: "Disney+ Hotstar", sensorType: "login", rail: "upi-autopay" },
  SWIGGY: { canonical: "Swiggy One", sensorType: "delivery", rail: "upi-autopay" },
  CULTFIT: { canonical: "Cult.fit", sensorType: "login", rail: "upi-autopay" },
  AMAZON: { canonical: "Amazon Prime", sensorType: "receipt", rail: "upi-autopay" },
  SPOTIFY: { canonical: "Spotify", sensorType: "otp", rail: "card-si" },
  CANVA: { canonical: "Canva Pro", sensorType: "login", rail: "upi-autopay" },
  ZOMATO: { canonical: "Zomato Gold", sensorType: "delivery", rail: "upi-autopay" },
  YOUTUBEPREMIUM: { canonical: "YouTube Premium", sensorType: "none", rail: "playstore" },
  JIOFIBER: { canonical: "Jio Fiber", sensorType: "none", rail: "direct" },
  AIRTELXSTREAM: { canonical: "Airtel Xstream", sensorType: "none", rail: "direct" },
  SONYLIV: { canonical: "SonyLIV", sensorType: "none", rail: "playstore" },
  ZEE5: { canonical: "ZEE5", sensorType: "none", rail: "playstore" },
  GYMPASS: { canonical: "Gympass", sensorType: "login", rail: "upi-autopay" },
  BLINKIT: { canonical: "Blinkit", sensorType: "delivery", rail: "upi-autopay" },
  MYPROTEIN: { canonical: "MyProtein", sensorType: "receipt", rail: "card-si" },
  HEALTHIFYMEPLUS: { canonical: "HealthifyMe Plus", sensorType: "none", rail: "upi-autopay" },
  BOOKMYSHOWGOLD: { canonical: "BookMyShow Gold", sensorType: "receipt", rail: "upi-autopay" },
  TIMESPRIME: { canonical: "Times Prime", sensorType: "none", rail: "upi-autopay" },
  APPLEMUSIC: { canonical: "Apple Music", sensorType: "none", rail: "card-si" },
  NOTIONLABS: { canonical: "Notion Plus", sensorType: "login", rail: "card-si" },
  PRACTOPLUS: { canonical: "Practo Plus", sensorType: "none", rail: "upi-autopay" },
  AUDIBLE: { canonical: "Audible", sensorType: "none", rail: "card-si" },
  LINKEDINPREMIUM: { canonical: "LinkedIn Premium", sensorType: "login", rail: "card-si" },
};

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

function normalize(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function lookupAlias(merchantRaw: string): { key: string; entry: AliasEntry } | undefined {
  const normalized = normalize(merchantRaw);
  if (ALIAS_MAP[normalized]) return { key: normalized, entry: ALIAS_MAP[normalized] };
  for (const key of Object.keys(ALIAS_MAP)) {
    if (normalized.includes(key)) return { key, entry: ALIAS_MAP[key] };
  }
  return undefined;
}

// Best-effort merchant identification for usage pings, which are far more
// free-form than bank SMS and often don't match the transaction merchant
// regex. Falls back to scanning the raw text for a known alias substring.
function matchAliasInText(text: string): { key: string; entry: AliasEntry } | undefined {
  const normalizedText = normalize(text);
  for (const key of Object.keys(ALIAS_MAP)) {
    if (normalizedText.includes(key)) return { key, entry: ALIAS_MAP[key] };
  }
  return undefined;
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
        const key = normalize(merchantRaw) || "UNRESOLVED";
        const entity = getOrCreate(unresolved, key, merchantRaw, "none", event.rail ?? "direct", true);
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
