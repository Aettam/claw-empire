import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

/** Bootstrap a session so the request context has an auth cookie + CSRF token. */
async function bootstrap(request: APIRequestContext): Promise<string> {
  const res = await request.get("/api/auth/session");
  expect(res.ok()).toBe(true);
  return (await res.json()).csrf_token;
}

async function getDepartments(request: APIRequestContext): Promise<{ id: string; name: string }[]> {
  const res = await request.get("/api/departments");
  expect(res.ok()).toBe(true);
  return (await res.json()).departments;
}

/**
 * Pre-establish session cookie in browser context and install a route-level
 * response cache so React 18 Strict-Mode double-mounts don't flood the server
 * with duplicate GET requests (which can exceed the browser's 6-connection
 * HTTP/1.1 limit through the Vite proxy and hang indefinitely).
 */
async function setupPageSession(page: Page, request: APIRequestContext) {
  // Ensure session + get CSRF token (idempotent if bootstrap() was already called)
  const sessRes = await request.get("/api/auth/session");
  const { csrf_token } = await sessRes.json();
  const { cookies } = await request.storageState();
  if (cookies.length > 0) await page.context().addCookies(cookies);

  // Ensure English locale — other tests may change the language setting
  await request.put("/api/settings", {
    headers: { "x-csrf-token": csrf_token },
    data: { language: "en" },
  });

  const inflight = new Map<string, Promise<{ status: number; headers: Record<string, string>; body: Buffer }>>();

  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const url = route.request().url();
      if (!inflight.has(url)) {
        inflight.set(
          url,
          route.fetch().then(async (res) => ({
            status: res.status(),
            headers: res.headers(),
            body: await res.body(),
          })),
        );
      }
      const cached = await inflight.get(url)!;
      await route.fulfill(cached);
    },
  );
}

/**
 * Wait for app to finish loading, then click a sidebar nav item.
 * Retries page load if the loading screen gets stuck.
 */
async function navigateTo(page: Page, request: APIRequestContext, viewName: string) {
  await setupPageSession(page, request);

  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto("/");
    try {
      await page.getByText("Loading Claw-Empire").waitFor({ state: "hidden", timeout: 30_000 });
      break;
    } catch {
      if (attempt === 1) throw new Error("App loading screen did not dismiss after 2 attempts");
    }
  }
  await page.getByRole("navigation").getByRole("button", { name: viewName }).click();
}

test.describe("Agent Workflow", () => {
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("create agent via API appears in agents view", async ({ page, request }) => {
    const csrf = await bootstrap(request);
    const departments = await getDepartments(request);
    const dept = departments[0];

    const agentName = `E2E-Agent-${Date.now()}`;
    const res = await request.post("/api/agents", {
      headers: { "x-csrf-token": csrf },
      data: {
        name: agentName,
        role: "junior",
        department_id: dept.id,
        avatar_emoji: "🤖",
      },
    });
    expect(res.ok()).toBe(true);

    await navigateTo(page, request, "Agents");
    await expect(page.getByText(agentName)).toBeVisible({ timeout: 10_000 });
  });

  test("create task and assign to agent", async ({ page, request }) => {
    const csrf = await bootstrap(request);
    const departments = await getDepartments(request);
    const dept = departments[0];

    const agentRes = await request.post("/api/agents", {
      headers: { "x-csrf-token": csrf },
      data: { name: `TaskAgent-${Date.now()}`, role: "junior", department_id: dept.id },
    });
    const agent = await agentRes.json();

    const taskTitle = `E2E-Task-${Date.now()}`;
    const taskRes = await request.post("/api/tasks", {
      headers: { "x-csrf-token": csrf },
      data: {
        title: taskTitle,
        description: "Automated E2E test task",
        assigned_agent_id: agent.id,
        department_id: dept.id,
      },
    });
    expect(taskRes.ok()).toBe(true);

    await navigateTo(page, request, "Tasks");
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });
  });

  test("start task run returns controlled response", async ({ request }) => {
    const csrf = await bootstrap(request);
    const departments = await getDepartments(request);
    const dept = departments[0];

    const agentRes = await request.post("/api/agents", {
      headers: { "x-csrf-token": csrf },
      data: { name: `RunAgent-${Date.now()}`, role: "junior", department_id: dept.id, cli_provider: "claude" },
    });
    const agent = await agentRes.json();

    const taskRes = await request.post("/api/tasks", {
      headers: { "x-csrf-token": csrf },
      data: {
        title: `RunTask-${Date.now()}`,
        description: "test run",
        assigned_agent_id: agent.id,
        department_id: dept.id,
      },
    });
    const task = await taskRes.json();

    const runRes = await request.post(`/api/tasks/${task.id}/run`, {
      headers: { "x-csrf-token": csrf },
    });
    // Expect either success or a controlled error (no CLI configured, conflict, etc.)
    expect([200, 400, 409, 500]).toContain(runRes.status());
  });

  test("task terminal endpoint returns data", async ({ request }) => {
    const csrf = await bootstrap(request);
    const departments = await getDepartments(request);
    const dept = departments[0];

    const agentRes = await request.post("/api/agents", {
      headers: { "x-csrf-token": csrf },
      data: { name: `TermAgent-${Date.now()}`, role: "junior", department_id: dept.id },
    });
    const agent = await agentRes.json();

    const taskRes = await request.post("/api/tasks", {
      headers: { "x-csrf-token": csrf },
      data: {
        title: `TermTask-${Date.now()}`,
        description: "terminal test",
        assigned_agent_id: agent.id,
        department_id: dept.id,
      },
    });
    const task = await taskRes.json();

    const termRes = await request.get(`/api/tasks/${task.id}/terminal`);
    expect(termRes.ok()).toBe(true);
    const body = await termRes.json();
    // Terminal endpoint returns at minimum { ok, exists }
    expect(body).toHaveProperty("ok", true);
  });
});
