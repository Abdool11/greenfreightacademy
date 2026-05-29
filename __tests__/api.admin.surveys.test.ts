/**
 * Tests for /api/admin/surveys (GET, POST, PUT) and /api/admin/surveys/[id] (PATCH, DELETE)
 * ════════════════════════════════════════════════════════════════════════════
 * Covers:
 *  GET  — auth check, returns all questions, filters by type
 *  POST — auth check, validation (type, question_en, question_type), creates question
 *  PUT  — auth check, validation, bulk reorder
 *  PATCH — auth check, updates a question
 *  DELETE — auth check, deletes a question
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

// ── Chainable Supabase mock ──────────────────────────────────────────────────
// Strategy: each test sets `nextResult` before calling the route.
// The chain resolves to `nextResult` when awaited.
// For routes that call Supabase multiple times (e.g. POST auto-assigns order),
// we use a queue.

type ChainResult = { data: unknown; error: unknown };
const resultQueue: Array<() => ChainResult> = [];

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
        const next = resultQueue.shift();
        return next ? next() : { data: null, error: null };
      }),
    ),
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const surveysRoute = require("../app/api/admin/surveys/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const surveyIdRoute = require("../app/api/admin/surveys/[id]/route");

// ── Helpers ──────────────────────────────────────────────────────────────────
const MOCK_ADMIN = { id: "admin-uuid-1", email: "admin@gfa.co.za", role: "admin" };

const MOCK_QUESTIONS = [
  {
    id: "q-uuid-1",
    type: "pre",
    question_en: "How many years have you been driving professionally?",
    question_zu: "Iminyaka emingaki usebenza njengomshayeli?",
    question_type: "multiple_choice",
    options_json: [{ value: "0-2", label_en: "0–2 years", label_zu: "Iminyaka 0–2" }],
    order_index: 0,
    is_active: true,
  },
  {
    id: "q-uuid-2",
    type: "post",
    question_en: "How confident are you in eco-driving techniques?",
    question_zu: "Uzizwa uqinisekile kangakanani?",
    question_type: "scale",
    options_json: null,
    order_index: 0,
    is_active: true,
  },
];

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/admin/surveys");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), { method: "GET" });
}

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/surveys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePutRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/surveys", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/surveys/q-uuid-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest() {
  return new NextRequest("http://localhost/api/admin/surveys/q-uuid-1", {
    method: "DELETE",
  });
}

// ── GET tests ────────────────────────────────────────────────────────────────
describe("GET /api/admin/surveys", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resultQueue.length = 0;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAdminSession.mockResolvedValueOnce(null);
    const res = await surveysRoute.GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns all questions when authenticated", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    resultQueue.push(() => ({ data: MOCK_QUESTIONS, error: null }));

    const res = await surveysRoute.GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.surveys).toHaveLength(2);
    expect(body.surveys[0].type).toBe("pre");
    expect(body.surveys[1].type).toBe("post");
  });

  it("returns empty array when no questions exist", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    resultQueue.push(() => ({ data: [], error: null }));

    const res = await surveysRoute.GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.surveys).toEqual([]);
  });
});

// ── POST tests ───────────────────────────────────────────────────────────────
describe("POST /api/admin/surveys", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resultQueue.length = 0;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAdminSession.mockResolvedValueOnce(null);
    const res = await surveysRoute.POST(makePostRequest({ type: "pre", question_en: "Test?", question_type: "scale" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    const res = await surveysRoute.POST(makePostRequest({ type: "pre" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("required");
  });

  it("returns 400 when type is invalid", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    const res = await surveysRoute.POST(makePostRequest({ type: "invalid", question_en: "Test?", question_type: "scale" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("pre");
  });

  it("returns 400 when question_type is invalid", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    const res = await surveysRoute.POST(makePostRequest({ type: "pre", question_en: "Test?", question_type: "rating" }));
    expect(res.status).toBe(400);
  });

  it("creates a new question and returns 201", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    // First call: auto-assign order_index (get last)
    resultQueue.push(() => ({ data: { order_index: 2 }, error: null }));
    // Second call: insert
    resultQueue.push(() => ({
      data: { id: "q-uuid-new", type: "pre", question_en: "New question?", question_type: "scale", order_index: 3, is_active: true },
      error: null,
    }));

    const res = await surveysRoute.POST(makePostRequest({
      type: "pre",
      question_en: "New question?",
      question_zu: "",
      question_type: "scale",
    }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.survey.question_en).toBe("New question?");
    expect(body.survey.type).toBe("pre");
  });

  it("returns 400 when request body is invalid JSON", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    const req = new NextRequest("http://localhost/api/admin/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-valid-json",
    });
    const res = await surveysRoute.POST(req);
    expect(res.status).toBe(400);
  });
});

// ── PUT (bulk reorder) tests ──────────────────────────────────────────────────
describe("PUT /api/admin/surveys (bulk reorder)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resultQueue.length = 0;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAdminSession.mockResolvedValueOnce(null);
    const res = await surveysRoute.PUT(makePutRequest({ reorder: [{ id: "q-uuid-1", order_index: 0 }] }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when reorder array is missing", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    const res = await surveysRoute.PUT(makePutRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 200 { ok: true } when reorder is valid", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    // Each update call resolves via the chain
    resultQueue.push(() => ({ data: null, error: null }));
    resultQueue.push(() => ({ data: null, error: null }));

    const res = await surveysRoute.PUT(makePutRequest({
      reorder: [
        { id: "q-uuid-1", order_index: 1 },
        { id: "q-uuid-2", order_index: 0 },
      ],
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});

// ── PATCH /api/admin/surveys/[id] tests ──────────────────────────────────────
describe("PATCH /api/admin/surveys/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resultQueue.length = 0;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAdminSession.mockResolvedValueOnce(null);
    const res = await surveyIdRoute.PATCH(makePatchRequest({ question_en: "Updated?" }), { params: { id: "q-uuid-1" } });
    expect(res.status).toBe(401);
  });

  it("updates a question and returns 200", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    resultQueue.push(() => ({
      data: { ...MOCK_QUESTIONS[0], question_en: "Updated question?" },
      error: null,
    }));

    const res = await surveyIdRoute.PATCH(
      makePatchRequest({ question_en: "Updated question?" }),
      { params: { id: "q-uuid-1" } },
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.survey.question_en).toBe("Updated question?");
  });
});

// ── DELETE /api/admin/surveys/[id] tests ─────────────────────────────────────
describe("DELETE /api/admin/surveys/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resultQueue.length = 0;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAdminSession.mockResolvedValueOnce(null);
    const res = await surveyIdRoute.DELETE(makeDeleteRequest(), { params: { id: "q-uuid-1" } });
    expect(res.status).toBe(401);
  });

  it("returns 200 { ok: true } on successful delete", async () => {
    mockGetAdminSession.mockResolvedValueOnce(MOCK_ADMIN);
    resultQueue.push(() => ({ data: null, error: null }));

    const res = await surveyIdRoute.DELETE(makeDeleteRequest(), { params: { id: "q-uuid-1" } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
