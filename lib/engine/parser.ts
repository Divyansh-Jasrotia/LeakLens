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
}

// --- regex templates, modeled on the transaction-sms-parser approach:
// amount extraction (Rs./INR/₹ with commas), debit keywords, UPI autopay
// mandate language, and account mask patterns like a/c XX1234.

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;

const DEBIT_RE =
  /\b(debited|spent|charged|paid towards|paid to|payment of|auto-?debited)\b/i;

const PROMO_RE =
  /\b(cashback|flat \S+ off|% ?off|use code|coupon|limited period|hurry|discount code|sale ends|off on your)\b/i;

const MANDATE_RE = /\b(upi autopay|autopay|mandate|e-mandate)\b/i;
const PLAYSTORE_RE = /\b(google play|play store)\b/i;
const CARD_RE = /\bcard\b/i;

const ACCOUNT_MASK_RE = /a\/c\s*(?:no\.?)?\s*[x*]+\s*(\d{2,6})/i;
const CARD_MASK_RE = /card\s*(?:no\.?|ending)?\s*[x*]*\s*(\d{3,6})/i;

const MERCHANT_RE =
  /\b(?:for|towards|to|at)\s+([A-Z][A-Za-z0-9+.&'* ]{1,40}?)(?=\s+(?:on|via|thru|UPI|mandate|Ref|Ref\.)\b|[.,]|$)/;

const OTP_RE = /\botp\b/i;
const LOGIN_RE = /\b(logged in|login alert|new device)\b/i;
const DELIVERY_RE = /\b(delivered|out for delivery)\b/i;
const RECEIPT_RE = /\b(order confirmed|order placed|order has been placed|booking confirmed|receipt|invoice)\b/i;

function parseAmount(text: string): number | undefined {
  const m = text.match(AMOUNT_RE);
  if (!m) return undefined;
  const cleaned = m[1].replace(/,/g, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

function parseMaskedAccount(text: string): string | undefined {
  const acct = text.match(ACCOUNT_MASK_RE);
  if (acct) return acct[1];
  const card = text.match(CARD_MASK_RE);
  if (card) return card[1];
  return undefined;
}

function parseRail(text: string): Rail | undefined {
  if (MANDATE_RE.test(text)) return "upi-autopay";
  if (PLAYSTORE_RE.test(text)) return "playstore";
  if (CARD_RE.test(text)) return "card-si";
  if (ACCOUNT_MASK_RE.test(text)) return "direct";
  return undefined;
}

function parseMerchantRaw(text: string): string | undefined {
  const m = text.match(MERCHANT_RE);
  if (!m) return undefined;
  return m[1].trim();
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

  if (PROMO_RE.test(text)) {
    return { ...base, type: "promo" };
  }

  const amount = parseAmount(text);
  if (DEBIT_RE.test(text) && amount !== undefined) {
    return {
      ...base,
      type: "transaction",
      amount,
      merchantRaw: parseMerchantRaw(text),
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
      merchantRaw: parseMerchantRaw(text),
    };
  }

  return { ...base, type: "noise" };
}

export function parseInbox(events: InboxEvent[]): ParsedEvent[] {
  return events.map(parseEvent);
}
