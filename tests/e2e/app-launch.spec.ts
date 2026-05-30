import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

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

/**
 * Wait for app bootstrap to finish (loading screen disappears).
 * If the app gets stuck on the loading screen, reload once and retry.
 */
async function waitForApp(page: Page, request: APIRequestContext) {
  await setupPageSession(page, request);

  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto("/");
    try {
      await page.getByText("Loading Claw-Empire").waitFor({ state: "hidden", timeout: 30_000 });
      return; // success
    } catch {
      if (attempt === 0) continue; // retry with a fresh page load
      throw new Error("App loading screen did not dismiss after 2 attempts");
    }
  }
}

/** Click a sidebar nav button by its accessible name. */
function sidebarButton(page: Page, name: string) {
  return page.getByRole("navigation").getByRole("button", { name });
}

test.describe("App Launch", () => {
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("loads and shows office view by default", async ({ page, request }) => {
    await waitForApp(page, request);
    // "Office" nav item should have the active class
    const officeBtn = sidebarButton(page, "Office");
    await expect(officeBtn).toBeVisible();
    await expect(officeBtn).toHaveClass(/\bactive\b/);
  });

  test("sidebar navigation works", async ({ page, request }) => {
    await waitForApp(page, request);

    const views = ["Agents", "Library", "Dashboard", "Tasks", "Hermes", "Settings", "Office"];

    for (const label of views) {
      const btn = sidebarButton(page, label);
      await btn.click();
      await expect(btn).toHaveClass(/\bactive\b/);
    }
  });

  test("header bar renders with company name", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Claw-Empire").first()).toBeVisible({ timeout: 45_000 });
  });
});
