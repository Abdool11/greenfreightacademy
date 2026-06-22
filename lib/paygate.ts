import crypto from "crypto";

const PAYGATE_BASE_URL = "https://secure.paygate.co.za/payweb3";

export function getPaygateId(): string {
  return process.env.PAYGATE_ID || "";
}

export function getPaygateKey(): string {
  return process.env.PAYGATE_ENCRYPTION_KEY || "";
}

/**
 * Calculate MD5 checksum for Paygate PayWeb3.
 * Concatenates all non-empty field values in order, appends the encryption key, then MD5.
 */
export function calculateChecksum(fields: string[], encryptionKey: string): string {
  const data = fields.filter((f) => f !== "").join("") + encryptionKey;
  return crypto.createHash("md5").update(data).digest("hex");
}

/**
 * Validate the checksum returned in a Paygate ITN (notify) payload.
 * Fields are in the exact order Paygate sends them (excluding CHECKSUM).
 */
export function validateNotifyChecksum(
  params: Record<string, string>,
  encryptionKey: string
): boolean {
  const orderedKeys = [
    "PAYGATE_ID",
    "PAY_REQUEST_ID",
    "REFERENCE",
    "TRANSACTION_STATUS",
    "RESULT_CODE",
    "AUTH_CODE",
    "CURRENCY",
    "AMOUNT",
    "RESULT_DESC",
    "TRANSACTION_ID",
    "RISK_INDICATOR",
    "PAY_METHOD",
    "PAY_METHOD_DETAIL",
    "USER1",
    "USER2",
    "USER3",
    "VAULT_ID",
    "PAYMENT_TOKEN",
  ];

  const values: string[] = [];
  for (const key of orderedKeys) {
    if (key in params && params[key] !== undefined && params[key] !== "") {
      values.push(params[key]);
    }
  }

  const expected = calculateChecksum(values, encryptionKey);
  return expected === params.CHECKSUM;
}

export interface InitiateResponse {
  PAYGATE_ID: string;
  PAY_REQUEST_ID: string;
  REFERENCE: string;
  CHECKSUM: string;
}

/**
 * Initiate a PayWeb3 transaction.
 * Returns the PAY_REQUEST_ID and CHECKSUM needed to redirect the user.
 */
export async function initiatePayment(params: {
  paygateId: string;
  reference: string;
  amount: number; // in cents
  currency: string;
  returnUrl: string;
  notifyUrl: string;
  transactionDate: string;
  locale: string;
  country: string;
  email: string;
  encryptionKey: string;
}): Promise<InitiateResponse> {
  const fields: Record<string, string> = {
    PAYGATE_ID: params.paygateId,
    REFERENCE: params.reference,
    AMOUNT: String(params.amount),
    CURRENCY: params.currency,
    RETURN_URL: params.returnUrl,
    TRANSACTION_DATE: params.transactionDate,
    LOCALE: params.locale,
    COUNTRY: params.country,
    EMAIL: params.email,
    NOTIFY_URL: params.notifyUrl,
  };

  const checksum = calculateChecksum(
    [
      fields.PAYGATE_ID,
      fields.REFERENCE,
      fields.AMOUNT,
      fields.CURRENCY,
      fields.RETURN_URL,
      fields.TRANSACTION_DATE,
      fields.LOCALE,
      fields.COUNTRY,
      fields.EMAIL,
      fields.NOTIFY_URL,
    ],
    params.encryptionKey
  );

  const body = new URLSearchParams({ ...fields, CHECKSUM: checksum }).toString();

  const res = await fetch(`${PAYGATE_BASE_URL}/initiate.trans`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  const parsed = new URLSearchParams(text);

  const result: Record<string, string> = {};
  for (const [key, value] of parsed.entries()) {
    result[key] = value;
  }

  if (result.PAY_REQUEST_ID) {
    return {
      PAYGATE_ID: result.PAYGATE_ID,
      PAY_REQUEST_ID: result.PAY_REQUEST_ID,
      REFERENCE: result.REFERENCE,
      CHECKSUM: result.CHECKSUM,
    };
  }

  throw new Error(`Paygate initiate failed: ${text}`);
}

/**
 * Query a PayWeb3 transaction status.
 */
export async function queryPayment(params: {
  paygateId: string;
  payRequestId: string;
  reference: string;
  encryptionKey: string;
}): Promise<Record<string, string>> {
  const checksum = calculateChecksum(
    [params.paygateId, params.payRequestId, params.reference],
    params.encryptionKey
  );

  const body = new URLSearchParams({
    PAYGATE_ID: params.paygateId,
    PAY_REQUEST_ID: params.payRequestId,
    REFERENCE: params.reference,
    CHECKSUM: checksum,
  }).toString();

  const res = await fetch(`${PAYGATE_BASE_URL}/query.trans`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  const parsed = new URLSearchParams(text);

  const result: Record<string, string> = {};
  for (const [key, value] of parsed.entries()) {
    result[key] = value;
  }

  return result;
}
