/**
 * Tests for /api/admin/certificate-template (GET, POST)
 * ════════════════════════════════════════════════════════════════════════════
 * Covers:
 *  GET  — auth check, returns current template URL, returns null when not set
 *  POST — auth check, missing file → 400, wrong type → 400, successful upload → 200
 *         text_positions saved when provided
 */

import { NextRequest } from "next/server";

// ── Environment ──────────────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-service-key";

// ── Mock GFA auth ─────────────────────────────────────────────────────────────
const mockGetAdminSession = jest.fn();
jest.mock("@/lib/auth", () => ({
  getAdminSession: mockGetAdminSession,
}));

// ── Supabase mock ─────────────────────────────────────────────────────────────
const mockStorageUpload = jest.fn();
const mockGetPublicUrl = jest.fn();

// Queue for .from() calls
type ChainResult = { data: unknown; error: unknown };
const fromQueue: Array<() => ChainResult> = [];

function makeChain(resolveWith: () => ChainResult) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "limit", "single", "insert", "update", "delete", "upsert", "in"];
  methods.forEach(m => {
    chain[m] = jest.fn(() => chain);
  });
  chain.then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolveWith()).then(resolve);
  return chain;
}

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() =>
      makeChain(() => {
        const next = fromQueue.shift();
        return next ? next() : { data: null, error: null };
      }),
    ),
    storage: {
      from: jest.fn(() => ({
        upload: mockStorageUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const certTemplateRoute = require("../app/api/admin/certificate-template/route");

// ── Helpers ──────────────────────────────────────────────────────────────────
const MOCK_ADMIN = { id: "admin-uuid-1", email: "admin@gfa.co.za", role: "admin" };
const PUBLIC_URL = "https://storage.example.com/certificate-templates/cert-bg.png";

function makeGetRequest() {
  return new NextRequest("http://localhost/api/admin/certificate-template", { method: "GET" });
}

function makePostRequest(formData: FormData) {
  return new NextRequest("http://localhost/api/admin/certificate-template", {
    method: "POST",
    body: formData,
  });
}

// ── GET tests ────────────────────────────────────────────────────────────────
describe("GET /api/admin/certificate-template", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fromQueue.length = 0;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAdminSession.mockResolvedValueOnce(null);
    const res = await certTemplateRoute.GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns current template URL when a template has been uploaded", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    fromQueue.push(() => ({
      data: [
        { key: "certificate_template_url", value: PUBLIC_URL },
        { key: "certificate_text_positions", value: '{"nameY":280}' },
      ],
      error: null,
    }));

    const res = await certTemplateRoute.GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.templateUrl).toBe(PUBLIC_URL);
    expect(body.usingDefault).toBe(false);
    expect(body.textPositions).toEqual({ nameY: 280 });
  });

  it("returns null templateUrl when no template has been uploaded", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    fromQueue.push(() => ({ data: [], error: null }));

    const res = await certTemplateRoute.GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.templateUrl).toBeNull();
    expect(body.usingDefault).toBe(true);
  });
});

// ── POST tests ───────────────────────────────────────────────────────────────
describe("POST /api/admin/certificate-template", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fromQueue.length = 0;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAdminSession.mockResolvedValueOnce(null);
    const res = await certTemplateRoute.POST(makePostRequest(new FormData()));
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is provided", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    const res = await certTemplateRoute.POST(makePostRequest(new FormData()));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when file type is not PNG or JPEG", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    const formData = new FormData();
    formData.append("file", new File(["pdf content"], "template.pdf", { type: "application/pdf" }));
    const res = await certTemplateRoute.POST(makePostRequest(formData));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("PNG");
  });

  it("uploads file and returns 200 with url on success", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    mockStorageUpload.mockResolvedValueOnce({ data: { path: "certificate-bg-123.png" }, error: null });
    mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: PUBLIC_URL } });
    // upsert for certificate_template_url
    fromQueue.push(() => ({ data: null, error: null }));

    const formData = new FormData();
    formData.append("file", new File([new Uint8Array([137, 80, 78, 71])], "template.png", { type: "image/png" }));

    const res = await certTemplateRoute.POST(makePostRequest(formData));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.url).toBe(PUBLIC_URL);
    expect(mockStorageUpload).toHaveBeenCalledTimes(1);
  });

  it("saves text_positions when provided", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    mockStorageUpload.mockResolvedValueOnce({ data: { path: "certificate-bg-456.png" }, error: null });
    mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: PUBLIC_URL } });
    // Two upserts: one for URL, one for positions
    fromQueue.push(() => ({ data: null, error: null }));
    fromQueue.push(() => ({ data: null, error: null }));

    const formData = new FormData();
    formData.append("file", new File([new Uint8Array([137, 80, 78, 71])], "template.png", { type: "image/png" }));
    formData.append("text_positions", JSON.stringify({ nameY: 300, programmeY: 380 }));

    const res = await certTemplateRoute.POST(makePostRequest(formData));
    expect(res.status).toBe(200);
    // Both upserts should have been called (URL + positions)
    expect(mockStorageUpload).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when storage upload fails", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    mockStorageUpload.mockResolvedValueOnce({ data: null, error: { message: "bucket not found" } });

    const formData = new FormData();
    formData.append("file", new File([new Uint8Array([137, 80, 78, 71])], "template.png", { type: "image/png" }));

    const res = await certTemplateRoute.POST(makePostRequest(formData));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Upload failed");
  });
});
