# GFA → BetterDriver Canonical Certificate Contract V2

**Status:** GFA implementation branch; Preview-only until all contract tests pass and the named GFA authority approves activation.

> **GFA is the canonical authority for certificate lifecycle, certificate reference and number, private PDF, official public verification and certificate-status decisions. BetterDriver may hold only the signed minimum projection described below.**

This document is deliberately sufficient for a BetterDriver integration team to implement its limited presentation layer. It does not include GFA source, database access, private keys, service-role credentials, storage credentials, environment values or customer data.

## 1. Scope and non-negotiable boundaries

| GFA owns | BetterDriver may do | BetterDriver must not do |
|---|---|---|
| Completion-evidence intake, professional review decision, certificate lifecycle, certificate reference/number, official PDF, QR, public verification and private-document access. | Submit signed evidence, retain the signed minimal status projection, show My Certificate and open a GFA-scoped handoff URL. | Create a canonical certificate, allocate a certificate number, retain a GFA PDF, present a static GFA document URL, query GFA’s database or share browser sessions/credentials. |

The contract is academy/certification only. It does not carry SafeFreight incidents, behaviour, transgressions, risk profiles, RTMS material or incident-linked CPD evidence.

## 2. Cryptographic profile

| Property | Required value |
|---|---|
| JWT signature | `RS256` only |
| BetterDriver issuer | `betterdriver` |
| BetterDriver signing-key ID | `betterdriver-certificate-contract-v2` |
| GFA status issuer | `gfa-certificate-registry` |
| GFA response key ID | `gfa-certificate-status-v1` |
| BetterDriver completion audience | `gfa-certificate-registry-v2` |
| BetterDriver status-lookup audience | `gfa-certificate-status-lookup-v2` |
| BetterDriver browser-handoff audience | `gfa-certificate-handoff-v2` |
| GFA status response audience | `betterdriver-gfa-certificate-status-v1` |
| Transport | HTTPS with `Authorization: Bearer <signed-JWT>` |
| Replay protection | Unique `jti`; duplicate completion evidence is idempotent; browser handoff is one-time. |
| Handoff expiry | Maximum five minutes; GFA rejects a longer signed handoff assertion. |

GFA verifies BetterDriver’s public key. BetterDriver verifies GFA’s separately distributed public key. Neither side shares a private key, generic bearer secret, database credential or browser session.

## 3. Versioned completion-evidence intake

**Endpoint:** `POST /api/integrations/certificates/completion-evidence`

This endpoint accepts learning-completion evidence only. It does **not** issue a certificate automatically. GFA records the evidence and creates a `PENDING_REVIEW` canonical certificate record. An authorised GFA administrator must make the issue or NOT_ELIGIBLE decision.

### Required signed JWT claims

```json
{
  "iss": "betterdriver",
  "aud": "gfa-certificate-registry-v2",
  "kid": "betterdriver-certificate-contract-v2",
  "jti": "opaque-unique-event-reference",
  "exp": 0,
  "iat": 0,
  "schema_version": "1.0",
  "event_type": "bd.learning_completion_evidence.v1",
  "occurred_at": "2026-09-12T10:30:00Z",
  "driver_ref": "opaque-betterdriver-driver-reference",
  "company_ref": "opaque-betterdriver-company-reference",
  "enrolment_ref": "opaque-betterdriver-enrolment-reference",
  "completion_evidence_ref": "opaque-completion-evidence-reference",
  "programme_code": "approved-programme-code",
  "programme_version": "approved-programme-version",
  "assessment_summary": { "status": "COMPLETE", "evidence_version": "1.0" }
}
```

All `*_ref` values are opaque references, not raw ID numbers, emails, phone numbers or database keys. GFA verifies the reference against a pre-created GFA mapping. A missing, inactive or mismatched mapping is rejected without state change.

### GFA response

A successful response contains only `{ "ok": true, "statusAssertion": "<GFA-signed-JWT>" }`. The signed assertion has `event_type=gfa.certificate_status.v1` and minimal fields: `certificate_ref`, `certificate_version`, approved qualification title, lifecycle status, issue/expiry dates where applicable, official GFA public verification URL where issued, and `document_access` availability/method. It contains no GFA database key, private document URL, learner identity number or full internal record.

## 4. Status lookup

**Endpoint:** `POST /api/integrations/certificates/status`

BetterDriver supplies a signed JWT with `event_type=bd.gfa_certificate_status_lookup.v1`, the status-lookup audience, `jti`, `driver_ref`, and an optional `certificate_ref`. GFA proves the mapping and returns one signed minimal GFA status assertion. BetterDriver must not derive status from a local record when GFA is reachable.

## 5. Scoped driver handoff to My Certificate

The driver’s BetterDriver session is never accepted by GFA. BetterDriver first makes a signed server-to-server handoff request.

**Create handoff endpoint:** `POST /api/integrations/certificates/handoff`

The signed assertion contains:

```json
{
  "iss": "betterdriver",
  "aud": "gfa-certificate-handoff-v2",
  "kid": "betterdriver-certificate-contract-v2",
  "jti": "one-time-handoff-event-reference",
  "iat": 0,
  "exp": 0,
  "schema_version": "1.0",
  "event_type": "bd.gfa_certificate_handoff.v1",
  "occurred_at": "2026-09-12T10:30:00Z",
  "driver_ref": "opaque-betterdriver-driver-reference",
  "certificate_ref": "gfa_cert_opaque-reference",
  "action": "view"
}
```

`action` is exactly `view` or `download`. The signed lifetime must not exceed five minutes. GFA validates issuer, audience, key ID, expiry, `jti`, active mapping, certificate ownership, current lifecycle and current document availability.

GFA returns only an opaque `handoffUrl` and expiry. The URL contains no driver ID, certificate number, certificate reference, raw JWT or signed storage URL. The driver opens that URL from BetterDriver. GFA redeems it once, rechecks that the certificate is still issued/current, then redirects to a short-lived private GFA storage URL. A replay, expiry, wrong driver, revoked, superseded or expired certificate fails without serving the document.

## 6. Official public verification

**GFA host:** `https://greenfreightacademy.co.za/registry`

The certificate QR code resolves to the GFA `/verify?certificate=GFA-YYYY-########` surface. The public API accepts only an exact certificate number in `POST /api/public/certificates/verify`. It does not accept name, ID number, mobile number, employer, partial search or bulk lookup. It returns only minimal status, certificate number, programme and issue/expiry date. It never returns a private PDF, document link, external reference, learner identity data or BetterDriver data.

## 7. Certificate lifecycle vocabulary

| GFA status | Driver-facing meaning | BetterDriver presentation rule |
|---|---|---|
| `PENDING_REVIEW` | Completion evidence received; GFA has not issued a certificate. | Show pending, no document action. |
| `ISSUED` | GFA certificate is current and its GFA PDF is available. | May offer My Certificate through scoped handoff only. |
| `SUPERSEDED` | This record has been replaced. | Do not present as current or offer document access. |
| `EXPIRED` | The recorded validity period ended. | Do not present as current or offer document access. |
| `REVOKED` | GFA invalidated the record. | Do not present as current or offer document access. |
| `NOT_ELIGIBLE` | GFA decided not to issue. | Do not present a certificate or document action. |

## 8. Certificate PDF and notification policy

GFA renders and stores the private PDF using the approved clean GFA Quotation design language: existing GFA header, navy/green hierarchy, straight line/border system, whitespace, controlled metadata panel and official GFA QR verification. It intentionally excludes quotation pricing, VAT, payment terms, client address blocks, commercial-document wording, curved/swooping motifs, certification-authority signature block and BetterDriver issuer branding.

Certificate-ready messaging is outside this GFA branch. If later approved, the message must link to BetterDriver My Certificate and must not attach the PDF, expose a static document URL, include an access token, certificate number, full ID, assessment data or SafeFreight material.

## 9. Preview acceptance and rollback

Before BetterDriver implements or enables this contract, GFA must provide Preview evidence for: valid/replayed/expired evidence handling; GFA pending/issue/not-eligible decision; rendered private PDF; exact-number verification; no identity enumeration; signed status projection; driver A/B cross-access denial; one-time/expired document handoff; and type/build success.

Keep `ENABLE_GFA_CERTIFICATE_CONTRACT_V2=false` outside the approved Preview. Roll back presentation safely by disabling that flag and reverting the feature branch. Do not delete canonical GFA certificate, lifecycle, audit or storage records as part of rollback.

## 10. BetterDriver implementation prerequisites

BetterDriver work remains blocked until it receives this document with the GFA feature branch/commit, Preview URL/evidence, GFA public verification URL, the non-secret GFA public-key distribution mechanism, mapping-provisioning process and named go/no-go decision. BetterDriver must not replace its mock registry or send certificate-ready WhatsApp messaging before those prerequisites are met.
