import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCliSessionMock = vi.fn();
const db = {
  user: { findUnique: vi.fn() },
  workspace: { findMany: vi.fn() },
  project: { findMany: vi.fn() },
  area: { findMany: vi.fn() },
  resource: { findMany: vi.fn() },
};

vi.mock("@/lib/cli-api", () => ({
  requireCliSession: requireCliSessionMock,
}));

vi.mock("@/server/db", () => ({ db }));

describe("cli list routes", () => {
  beforeEach(() => {
    requireCliSessionMock.mockReset();
    requireCliSessionMock.mockResolvedValue({
      claims: { userId: "user_123", email: "user@example.com" },
    });
    Object.values(db).forEach((model) => {
      Object.values(model).forEach((fn) => fn.mockReset());
    });
  });

  it("returns the CLI session user and workspaces", async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: "user_123", email: "user@example.com" });
    db.workspace.findMany.mockResolvedValueOnce([{ id: "ws_1", name: "Personal", slug: "personal" }]);

    const { GET } = await import("@/app/api/cli/me/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      user: { id: "user_123", email: "user@example.com" },
      workspaces: [{ id: "ws_1", name: "Personal", slug: "personal" }],
    });
  });

  it("lists projects filtered by workspace id", async () => {
    db.project.findMany.mockResolvedValueOnce([{ id: "p_1", title: "Roadmap", icon: "" }]);

    const { GET } = await import("@/app/api/cli/projects/route");
    const response = await GET(new Request("http://app.test/api/cli/projects?workspace_id=ws_1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.projects).toEqual([{ id: "p_1", title: "Roadmap", icon: "" }]);
    expect(db.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: "ws_1" }),
      })
    );
  });

  it("lists areas and resources for the CLI user", async () => {
    db.area.findMany.mockResolvedValueOnce([{ id: "a_1", title: "Ops", icon: "" }]);
    db.resource.findMany.mockResolvedValueOnce([{ id: "r_1", title: "Docs", icon: "" }]);

    const { GET: getAreas } = await import("@/app/api/cli/areas/route");
    const { GET: getResources } = await import("@/app/api/cli/resources/route");

    const areasResponse = await getAreas(new Request("http://app.test/api/cli/areas"));
    const resourcesResponse = await getResources(new Request("http://app.test/api/cli/resources"));

    await expect(areasResponse.json()).resolves.toEqual({ areas: [{ id: "a_1", title: "Ops", icon: "" }] });
    await expect(resourcesResponse.json()).resolves.toEqual({ resources: [{ id: "r_1", title: "Docs", icon: "" }] });
  });
});
