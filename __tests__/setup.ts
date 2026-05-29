/**
 * Jest global setup for GFA API route tests.
 * Mocks Next.js server-only modules that cannot run outside the Next.js runtime.
 */

// ── Mock next/headers (cookies) ──────────────────────────────────────────────
jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => undefined),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

// ── Suppress console noise in test output ────────────────────────────────────
beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});
