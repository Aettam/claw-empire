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

test.describe("Error States", () => {
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("unauthenticated API request is rejected", async ({ request }) => {
    // Without calling /api/auth/session first (no session cookie), mutations should fail
    const res = await request.post("/api/agents", {
      data: { name: "NoAuth", role: "junior" },
    });
    expect(res.status()).toBe(401);

    // Verify server still works after the rejected request
    const healthRes = await request.get("/api/auth/session");
    expect(healthRes.ok()).toBe(true);
  });

  test("non-existent agent detail returns 404", async ({ request }) => {
    await bootstrap(request);
    const res = await request.get("/api/agents/non-existent-agent-id-00000");
    expect(res.status()).toBe(404);
  });

  test("OAuth status endpoint responds without crash when no providers configured", async ({ page, request }) => {
    await bootstrap(request);
    const oauthRes = await request.get("/api/oauth/status");
    expect(oauthRes.ok()).toBe(true);
    const body = await oauthRes.json();
    expect(body).toHaveProperty("providers");

    // Also verify the settings view loads without crashing
    await waitForApp(page, request);
    const settingsBtn = page.getByRole("navigation").getByRole("button", { name: "Settings" });
    await settingsBtn.click();
    await expect(settingsBtn).toHaveClass(/\bactive\b/);
  });
});
