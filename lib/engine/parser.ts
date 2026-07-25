// Parses raw inbox events (Indian bank/UPI SMS + usage pings) into a
// classified, structured form. Pure functions only — no React, no I/O.

export type Rail = "upi-autopay" | "card-si" | "playstore" | "direct";
export type SensorHint = "otp" | "receipt" | "delivery" | "login";
export type ParsedEventType = "transaction" | "usagePing" | "promo" | "noise";

export interface InboxEvent {
  id: string;
  ts: string; // ISO 8601
  channel: "sms" | "email";
  sender?: string;
  body: string;
}

export interface ParsedEvent {
  id: string;
  timestamp: string;
  type: ParsedEventType;
  rawText: string;
  sender?: string;
  merchantRaw?: string;
  amount?: number;
  maskedAccount?: string;
  rail?: Rail;
  sensorHint?: SensorHint;
  /** Which merchant template matched, for debugging and the UI's parse log. */
  template?: string;
}

// --- amounts -------------------------------------------------------------
// Two passes: currency-prefixed first (Rs. / INR / ₹), then a bare number
// following a debit verb, which SBI and several UPI templates emit
// ("debited by 299.0 on date 07Feb26").

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;

const BARE_AMOUNT_RE =
  /\b(?:debited|credited|charged|spent|paid)\s+(?:by|with|for|of)?\s*([\d,]+(?:\.\d{1,2})?)\b/i;

// --- classification ------------------------------------------------------

const DEBIT_RE =
  /\b(debited|spent|charged|paid towards|paid to|payment of|auto-?debited|used (?:for|at|on)|purchase of|standing instruction|trf to|transfer to)\b/i;

const PROMO_RE =
  /\b(cashback|flat \S+ off|% ?off|use code|coupon|limited period|hurry|discount code|sale ends|off on your)\b/i;

const MANDATE_RE = /\b(upi autopay|autopay|mandate|e-mandate|standing instruction)\b/i;
const PLAYSTORE_RE = /\b(google play|play store)\b/i;
const CARD_RE = /\bcard\b/i;

// Covers "a/c XX4821", "A/C X1234", "Acct XX8734", "Account no. XX3421".
const ACCOUNT_MASK_RE =
  /\b(?:a\/c|acct?|account)\s*(?:no\.?)?\s*[x*]+\s*(\d{2,6})/i;
const CARD_MASK_RE = /card\s*(?:no\.?|ending)?\s*[x*]*\s*(\d{3,6})/i;

const OTP_RE = /\botp\b/i;
const LOGIN_RE = /\b(logged in|login alert|new device)\b/i;
const DELIVERY_RE = /\b(delivered|out for delivery)\b/i;
const RECEIPT_RE =
  /\b(order confirmed|order placed|order has been placed|booking confirmed|receipt|invoice)\b/i;

// --- merchant extraction -------------------------------------------------
// Indian bank SMS puts the merchant in one of a handful of shapes. Each
// template below handles one shape; they are tried in order and the first
// non-empty result wins. Adding support for another bank means adding one
// entry here, not touching the pipeline.

// Routing/scheme tags that appear as UPI path segments and are never the
// merchant.
const UPI_TAGS = new Set([
  "UPI", "P2M", "P2A", "P2P", "CR", "DR", "MANDATE", "AUTOPAY", "COLLECT",
  "PAY", "ACH", "NACH", "SI", "POS", "ATM", "IMPS", "NEFT", "RTGS", "ECOM",
  "DEBIT", "CREDIT", "PURCHASE", "REF", "REFNO",
]);

// Trailing boilerplate — once one of these tokens appears, the merchant name
// has ended. This is what lets a single capture handle "TIMES PRIME on
// 09-02-26", "LINKEDIN PREMIUM Ref No 5043", and "YouTube Premium was
// charged" without a per-bank terminator list.
const STOP_WORDS = new Set([
  "on", "via", "thru", "through", "ref", "refno", "reference", "upi",
  "mandate", "autopay", "was", "is", "has", "have", "been", "will", "be",
  "avl", "bal", "balance", "lmt", "limit", "not", "if", "call", "sms", "fwd",
  "forward", "info", "dt", "date", "std", "standing", "instruction", "txn",
  "id", "no", "dear", "your", "you", "charged", "debited", "credited",
  "using", "and", "the", "at", "from", "to", "for", "of", "by", "with",
  "toward", "towards", "trf", "transfer", "a\\c", "ac", "acct", "account",
  "card", "bank", "block", "dispute", "customer", "user",
]);

const CURRENCY_TOKENS = new Set(["rs", "rs.", "inr", "₹"]);

function cleanMerchant(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  const tokens = raw.trim().split(/\s+/);
  // "used for Rs 1,499.00 ... at AUDIBLE" — a keyword can lead into the
  // amount rather than the merchant. Reject those outright so the caller
  // can fall through to the next candidate.
  const first = tokens[0]?.toLowerCase() ?? "";
  if (CURRENCY_TOKENS.has(first) || /^[\d,]+(\.\d+)?$/.test(first)) return undefined;
  // Nor is a date ("07Feb26", "15-04-26") a merchant.
  if (/^\d{1,2}[-/]?[a-z]{3}[-/]?\d{2,4}$/i.test(first)) return undefined;

  const kept: string[] = [];

  for (const token of tokens) {
    const bare = token.replace(/[^A-Za-z0-9&'.*+@_-]/g, "");
    if (!bare) break;
    // Stop at boilerplate, but only after we already have something — a
    // merchant legitimately named e.g. "The Whole Truth" keeps its article.
    if (kept.length > 0 && STOP_WORDS.has(bare.toLowerCase())) break;
    // Stop at reference/transaction numbers.
    if (/^\d{4,}$/.test(bare)) break;
    kept.push(bare);
    if (kept.length >= 6) break;
  }

  const name = kept.join(" ").replace(/[.\-_]+$/, "").trim();
  // Reject captures with no letters at all (pure ref numbers, masks).
  if (!/[A-Za-z]{2}/.test(name)) return undefined;
  // A lone scheme tag or filler word is not a merchant. Without this,
  // "Info: UPI Ref 958464345865" yields the merchant "UPI".
  if (kept.length === 1) {
    const only = kept[0];
    if (STOP_WORDS.has(only.toLowerCase()) || UPI_TAGS.has(only.toUpperCase())) {
      return undefined;
    }
  }
  return name;
}

interface MerchantTemplate {
  name: string;
  extract: (text: string) => string | undefined;
}

export const MERCHANT_TEMPLATES: MerchantTemplate[] = [
  {
    // ICICI / Axis / SBI structured UPI field:
    //   "Info: UPI/NETFLIX INDIA/504312"
    //   "Info- UPI/P2M/HEALTHIFYME/440021"
    // Take the first path segment that is a name rather than a scheme tag
    // or a reference number.
    name: "upi-path",
    extract: (text) => {
      const m = text.match(/\bUPI[/\\]([A-Za-z0-9@ _-]+(?:[/\\][A-Za-z0-9@ _-]+)*)/i);
      if (!m) return undefined;
      for (const segment of m[1].split(/[/\\]/)) {
        const candidate = segment.trim();
        if (!candidate) continue;
        if (UPI_TAGS.has(candidate.toUpperCase())) continue;
        if (/^\d+$/.test(candidate)) continue;
        if (!/[A-Za-z]{2}/.test(candidate)) continue;
        return candidate;
      }
      return undefined;
    },
  },
  {
    // UPI virtual payment address: "netflix@paytm", "swiggy.upi@icici"
    name: "vpa",
    extract: (text) => {
      const m = text.match(/\b([A-Za-z][A-Za-z0-9._-]{2,})@[A-Za-z]{3,}\b/);
      return m?.[1]?.replace(/[._-]+$/, "");
    },
  },
  {
    // Keyword-led merchant, the most common shape across HDFC, PNB, SBI,
    // Kotak and Google Play:
    //   "towards SPTFY*Spotify India on 02-01-26"
    //   "to CHAI POINT thru UPI:607991656753"
    //   "at AUDIBLE IN."
    //   "transfer to LINKEDIN PREMIUM Ref No 5043"
    //   "for YouTube Premium was charged"
    name: "keyword-led",
    extract: (text) => {
      // Walk every keyword hit rather than trusting the first: "used for Rs
      // 1,499.00 ... at AUDIBLE IN" leads with the amount, and the real
      // merchant is behind the second keyword.
      // The name may lead with a digit — 1MG, 5Paisa, 91Springboard are all
      // real Indian merchants — so long as a letter follows.
      const matches = text.matchAll(
        /\b(?:towards|transfer to|trf to|paid to|to|at|for)\s+((?:[A-Z]|\d+[A-Za-z])[A-Za-z0-9+.&'*@_-]*(?:\s+[A-Za-z0-9+.&'*@_-]+){0,5})/g
      );
      for (const match of matches) {
        if (cleanMerchant(match[1])) return match[1];
      }
      return undefined;
    },
  },
  {
    // Last resort: a bank's free-text "Info" field with no UPI structure.
    name: "info-field",
    extract: (text) => {
      const m = text.match(/\binfo[:\-]\s*([A-Za-z0-9 .*&'@_-]{3,40})/i);
      return m?.[1];
    },
  },
];

function parseAmount(text: string): number | undefined {
  const match = text.match(AMOUNT_RE) ?? text.match(BARE_AMOUNT_RE);
  if (!match) return undefined;
  const value = Number.parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : undefined;
}

function parseMaskedAccount(text: string): string | undefined {
  return text.match(ACCOUNT_MASK_RE)?.[1] ?? text.match(CARD_MASK_RE)?.[1];
}

function parseRail(text: string): Rail | undefined {
  if (MANDATE_RE.test(text)) return "upi-autopay";
  if (PLAYSTORE_RE.test(text)) return "playstore";
  if (CARD_RE.test(text)) return "card-si";
  if (ACCOUNT_MASK_RE.test(text)) return "direct";
  return undefined;
}

function parseMerchant(text: string): { merchantRaw?: string; template?: string } {
  for (const template of MERCHANT_TEMPLATES) {
    const cleaned = cleanMerchant(template.extract(text));
    if (cleaned) return { merchantRaw: cleaned, template: template.name };
  }
  return {};
}

function parseSensorHint(text: string): SensorHint | undefined {
  if (OTP_RE.test(text)) return "otp";
  if (LOGIN_RE.test(text)) return "login";
  if (DELIVERY_RE.test(text)) return "delivery";
  if (RECEIPT_RE.test(text)) return "receipt";
  return undefined;
}

export function parseEvent(event: InboxEvent): ParsedEvent {
  const text = event.body;
  const base = { id: event.id, timestamp: event.ts, rawText: text, sender: event.sender };

  const amount = parseAmount(text);
  const isDebit = DEBIT_RE.test(text) && amount !== undefined;
  // A real debit carries an account or card mask. That mask is what lets a
  // genuine charge keep its classification even when the bank tacks a
  // "you earned cashback" line onto the end of it.
  const hasMask = parseMaskedAccount(text) !== undefined;

  if (PROMO_RE.test(text) && !(isDebit && hasMask)) {
    return { ...base, type: "promo" };
  }

  if (isDebit) {
    return {
      ...base,
      type: "transaction",
      amount,
      ...parseMerchant(text),
      maskedAccount: parseMaskedAccount(text),
      rail: parseRail(text),
    };
  }

  const sensorHint = parseSensorHint(text);
  if (sensorHint) {
    return {
      ...base,
      type: "usagePing",
      sensorHint,
      ...parseMerchant(text),
    };
  }

  return { ...base, type: "noise" };
}

export function parseInbox(events: InboxEvent[]): ParsedEvent[] {
  return events.map(parseEvent);
}
