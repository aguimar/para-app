import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCliSessionMock = vi.fn();
const db = {
  workspace: { findUnique: vi.fn() },
  note: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  project: { findUnique: vi.fn() },
  area: { findUnique: vi.fn() },
  resource: { findUnique: vi.fn() },
};

vi.mock("@/lib/cli-api", () => ({
  requireCliSession: requireCliSessionMock,
}));

vi.mock("@/server/db", () => ({ db }));

describe("cli note routes", () => {
  beforeEach(() => {
    requireCliSessionMock.mockReset();
    requireCliSessionMock.mockResolvedValue({
      claims: { userId: "user_123", email: "user@example.com" },
    });
    Object.values(db).forEach((model) => {
      Object.values(model).forEach((fn) => fn.mockReset());
    });
  });

  it("lists notes with query filters", async () => {
    db.note.findMany.mockResolvedValueOnce([{ id: "n_1", title: "Alpha", category: "INBOX", projectId: null, areaId: null, resourceId: null }]);

    const { GET } = await import("@/app/api/cli/notes/route");
    const response = await GET(new Request("http://app.test/api/cli/notes?workspace_id=ws_1&query=alpha&category=INBOX"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      notes: [{ id: "n_1", title: "Alpha", category: "INBOX", projectId: null, areaId: null, resourceId: null }],
    });
  });

  it("creates a note in an owned workspace", async () => {
    db.workspace.findUnique.mockResolvedValueOnce({ id: "ws_1", userId: "user_123" });
    db.note.create.mockResolvedValueOnce({ id: "n_1", title: "Alpha", category: "INBOX", projectId: null, areaId: null, resourceId: null });

    const { POST } = await import("@/app/api/cli/notes/route");
    const response = await POST(
      new Request("http://app.test/api/cli/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspace_id: "ws_1", title: "Alpha", category: "INBOX" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      note: { id: "n_1", title: "Alpha", category: "INBOX", projectId: null, areaId: null, resourceId: null },
    });
  });

  it("returns a note by id for the CLI user", async () => {
    db.note.findUnique.mockResolvedValueOnce({
      id: "n_1",
      title: "Alpha",
      category: "INBOX",
      projectId: null,
      areaId: null,
      resourceId: null,
      workspace: { userId: "user_123" },
    });

    const { GET } = await import("@/app/api/cli/notes/[id]/route");
    const response = await GET(new Request("http://app.test/api/cli/notes/n_1"), {
      params: Promise.resolve({ id: "n_1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      note: { id: "n_1", title: "Alpha", category: "INBOX", projectId: null, areaId: null, resourceId: null },
    });
  });

  it("moves a note into a project destination", async () => {
    db.note.findUnique.mockResolvedValueOnce({ id: "n_1", workspaceId: "ws_1", workspace: { userId: "user_123" } });
    db.project.findUnique.mockResolvedValueOnce({ id: "p_1", workspaceId: "ws_1", workspace: { userId: "user_123" } });
    db.note.update.mockResolvedValueOnce({ id: "n_1", title: "Alpha", category: "PROJECT", projectId: "p_1", areaId: null, resourceId: null });

    const { POST } = await import("@/app/api/cli/notes/[id]/move/route");
    const response = await POST(
      new Request("http://app.test/api/cli/notes/n_1/move", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: "PROJECT", project_id: "p_1" }),
      }),
      { params: Promise.resolve({ id: "n_1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      note: { id: "n_1", title: "Alpha", category: "PROJECT", projectId: "p_1", areaId: null, resourceId: null },
    });
  });

  it("archives a note", async () => {
    db.note.findUnique.mockResolvedValueOnce({ id: "n_1", workspace: { userId: "user_123" } });
    db.note.update.mockResolvedValueOnce({ id: "n_1", title: "Alpha", category: "ARCHIVE", projectId: null, areaId: null, resourceId: null });

    const { POST } = await import("@/app/api/cli/notes/[id]/archive/route");
    const response = await POST(new Request("http://app.test/api/cli/notes/n_1/archive", { method: "POST" }), {
      params: Promise.resolve({ id: "n_1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      note: { id: "n_1", title: "Alpha", category: "ARCHIVE", projectId: null, areaId: null, resourceId: null },
    });
  });
});
