import { describe, test, expect } from "bun:test";
import { api, expectStatus } from "./helpers";

describe("API Integration Tests", () => {
  let analysisId: string;
  const sessionId = "550e8400-e29b-41d4-a716-446655440000"; // Valid UUID for testing

  test("Create analysis", async () => {
    const res = await api("/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        document_type: "contractor_estimate",
        document_text: "Sample contractor estimate document with pricing details",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    analysisId = data.id;
    expect(data.id).toBeDefined();
    expect(data.session_id).toBe(sessionId);
  });

  test("Get analysis by ID", async () => {
    const res = await api(`/api/analyses/${analysisId}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(analysisId);
    expect(data.document_type).toBe("contractor_estimate");
  });

  test("List analyses by session_id", async () => {
    const res = await api(`/api/analyses?session_id=${sessionId}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.analyses).toBeDefined();
    expect(Array.isArray(data.analyses)).toBe(true);
  });

  test("Get usage for session", async () => {
    const res = await api(`/api/usage?session_id=${sessionId}`);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.analyses_used).toBeDefined();
    expect(data.limit).toBeDefined();
  });

  test("Get nonexistent analysis returns 404", async () => {
    const res = await api("/api/analyses/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 404);
  });

  test("Get analysis with invalid UUID format returns 400", async () => {
    const res = await api("/api/analyses/invalid-uuid");
    await expectStatus(res, 400);
  });

  test("Create analysis without session_id returns 400", async () => {
    const res = await api("/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_type: "contractor_estimate",
        document_text: "Sample text",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create analysis without document_type returns 400", async () => {
    const res = await api("/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        document_text: "Sample text",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create analysis without document_text returns 400", async () => {
    const res = await api("/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        document_type: "contractor_estimate",
      }),
    });
    await expectStatus(res, 400);
  });

  test("List analyses without session_id returns 400", async () => {
    const res = await api("/api/analyses");
    await expectStatus(res, 400);
  });

  test("Get usage without session_id returns 400", async () => {
    const res = await api("/api/usage");
    await expectStatus(res, 400);
  });
});
