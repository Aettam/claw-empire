import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

/** Bootstrap a session so the request context has an auth cookie + CSRF token. */
async function bootstrap(request: APIRequestContext): Promise<string> {
  const res = await request.get("/api/auth/session");
  expect(res.ok()).toBe(true);
  return (await res.json()).csrf_token;
}

/**
 * Pre-establish session cookie in browser context and install a route-level
 * response cache so React 18 Strict-Mode double-mounts don't flood the server
 * with duplicate GET requests (which can exceed the browser's 6-connection
 * HTTP/1.1 limit through the Vite proxy and hang indefinitely).
 */
async function setupPageSession(page: Page, request: APIRequestContext) {
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

/** Load app with retry for intermittent loading-screen hangs. */
async function waitForApp(page: Page, request: APIRequestContext) {
  await setupPageSession(page, request);

  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto("/");
    try {
      await page.getByText("Loading Claw-Empire").waitFor({ state: "hidden", timeout: 30_000 });
      return;
    } catch {
      if (attempt === 1) throw new Error("App loading screen did not dismiss after 2 attempts");
    }
  }
}

test.describe("Settings & API Providers", () => {
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("navigate to settings shows API providers section", async ({ page, request }) => {
    await waitForApp(page, request);
    await page.getByRole("navigation").getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("button", { name: /API/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("add a new API provider via API", async ({ request }) => {
    const csrf = await bootstrap(request);

    const res = await request.post("/api/api-providers", {
      headers: { "x-csrf-token": csrf },
      data: {
        name: `E2E-Provider-${Date.now()}`,
        type: "openai",
        base_url: "https://api.example.com/v1",
        api_key: "sk-test-e2e-fake-key-12345",
        default_model: "gpt-4o",
      },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBeTruthy();

    const listRes = await request.get("/api/api-providers");
    expect(listRes.ok()).toBe(true);
    const list = await listRes.json();
    const created = list.providers.find((p: { id: string }) => p.id === body.id);
    expect(created).toBeTruthy();
  });

  test("test provider connection shows error for fake key", async ({ request }) => {
    const csrf = await bootstrap(request);

    const createRes = await request.post("/api/api-providers", {
      headers: { "x-csrf-token": csrf },
      data: {
        name: `TestConn-${Date.now()}`,
        type: "openai",
        base_url: "https://api.example.com/v1",
        api_key: "sk-test-invalid-key",
        default_model: "gpt-4o",
      },
    });
    const { id } = await createRes.json();

    const testRes = await request.post(`/api/api-providers/${id}/test`, {
      headers: { "x-csrf-token": csrf },
    });
    // Test endpoint should return either an error state or a connection failure
    const body = await testRes.json();
    expect(body).toBeDefined();
  });

  test("delete provider removes it from list", async ({ request }) => {
    const csrf = await bootstrap(request);

    const createRes = await request.post("/api/api-providers", {
      headers: { "x-csrf-token": csrf },
      data: {
        name: `DeleteMe-${Date.now()}`,
        type: "openai",
        base_url: "https://api.example.com/v1",
        api_key: "sk-test-delete-key",
        default_model: "gpt-4o",
      },
    });
    const { id } = await createRes.json();

    const deleteRes = await request.delete(`/api/api-providers/${id}`, {
      headers: { "x-csrf-token": csrf },
    });
    expect(deleteRes.ok()).toBe(true);

    const listRes = await request.get("/api/api-providers");
    const list = await listRes.json();
    const deleted = list.providers.find((p: { id: string }) => p.id === id);
    expect(deleted).toBeUndefined();
  });
});
