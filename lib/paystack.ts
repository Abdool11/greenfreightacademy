const PAYSTACK_BASE_URL = "https://api.paystack.co";

export function getPaystackSecretKey(): string {
  return process.env.PAYSTACK_SECRET_KEY || "";
}

export function getPaystackPublicKey(): string {
  return process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";
}

export interface InitializeResponse {
  reference: string;
  access_code: string;
  authorization_url: string;
}

/**
 * Initialize a Paystack transaction.
 * Amount is in the smallest currency unit (cents for ZAR).
 */
export async function initializeTransaction(params: {
  email: string;
  amount: number; // in cents
  currency?: string;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<InitializeResponse> {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured");

  const body: Record<string, unknown> = {
    email: params.email,
    amount: params.amount,
    reference: params.reference,
    currency: params.currency || "ZAR",
  };

  if (params.callbackUrl) body.callback_url = params.callbackUrl;
  if (params.metadata) body.metadata = params.metadata;

  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!data.status || !data.data) {
    throw new Error(data.message || "Paystack initialization failed");
  }

  return {
    reference: data.data.reference,
    access_code: data.data.access_code,
    authorization_url: data.data.authorization_url,
  };
}

export interface VerifyResponse {
  status: string; // "success" | "failed" | "abandoned"
  reference: string;
  amount: number; // in cents
  currency: string;
  transactionId: string;
  gatewayResponse: string;
}

/**
 * Verify a Paystack transaction by reference.
 */
export async function verifyTransaction(reference: string): Promise<VerifyResponse> {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured");

  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const data = await res.json();

  if (!data.status || !data.data) {
    throw new Error(data.message || "Paystack verification failed");
  }

  return {
    status: data.data.status,
    reference: data.data.reference,
    amount: data.data.amount,
    currency: data.data.currency,
    transactionId: String(data.data.id),
    gatewayResponse: data.data.gateway_response || "",
  };
}

/**
 * Verify the Paystack webhook signature.
 * Paystack sends an x-paystack-signature header which is an HMAC-SHA512 hash
 * of the raw request body using the secret key.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secretKey = getPaystackSecretKey();
  if (!secretKey || !signature) return false;

  const crypto = require("crypto");
  const hash = crypto
    .createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");

  return hash === signature;
}
