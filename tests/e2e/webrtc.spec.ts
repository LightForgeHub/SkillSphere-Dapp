import { test, expect } from "@playwright/test";

test.describe("WebRTC Signaling & Video Call E2E", () => {
  test("Signaling API Endpoint (GET/POST/DELETE)", async ({ request }) => {
    // 1. Clear signals for the session
    const deleteRes = await request.delete("/api/session/test-session-api/signal");
    expect(deleteRes.ok()).toBeTruthy();

    // 2. Poll signals before any are sent, should be empty
    const getResBefore = await request.get("/api/session/test-session-api/signal?role=seeker");
    expect(getResBefore.ok()).toBeTruthy();
    const dataBefore = await getResBefore.json();
    expect(dataBefore.signals).toEqual([]);

    // 3. Post a signal from the seeker
    const postRes = await request.post("/api/session/test-session-api/signal", {
      data: {
        sender: "seeker",
        type: "offer",
        data: { sdp: "v=0\r\no=- 4323214567..." }
      }
    });
    expect(postRes.ok()).toBeTruthy();

    // 4. Poll signals as the expert, should receive seeker's signal
    const getResAfter = await request.get("/api/session/test-session-api/signal?role=expert");
    expect(getResAfter.ok()).toBeTruthy();
    const dataAfter = await getResAfter.json();
    expect(dataAfter.signals.length).toBe(1);
    expect(dataAfter.signals[0].sender).toBe("seeker");
    expect(dataAfter.signals[0].type).toBe("offer");
    expect(dataAfter.signals[0].data.sdp).toContain("v=0");
  });

  test("Two-party WebRTC Room Connection", async ({ browser }) => {
    // Tab A: Seeker Context
    const contextA = await browser.newContext({
      permissions: ["camera", "microphone"],
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
    });
    const pageA = await contextA.newPage();
    
    // Tab B: Expert Context
    const contextB = await browser.newContext({
      permissions: ["camera", "microphone"],
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
    });
    const pageB = await contextB.newPage();

    // Clear any existing signals for our test session room
    const cleanContext = await browser.newContext();
    const cleanPage = await cleanContext.newPage();
    await cleanPage.goto("http://localhost:3000/");
    await cleanPage.evaluate(() => fetch("/api/session/test-session-e2e/signal", { method: "DELETE" }));
    await cleanPage.close();
    await cleanContext.close();

    // Seeker joins the session
    await pageA.goto("http://localhost:3000/session/test-session-e2e?role=seeker");
    
    // Confirm wait/loading state for peer is visible
    const waitingTag = pageA.locator("text=/Waiting for peer/i");
    await expect(waitingTag).toBeVisible();

    // Expert joins the session
    await pageB.goto("http://localhost:3000/session/test-session-e2e?role=expert");

    // Expect both tabs to transition to connected state
    const statusA = pageA.locator("text=/Connected/i").first();
    await expect(statusA).toBeVisible({ timeout: 15000 });

    const statusB = pageB.locator("text=/Connected/i").first();
    await expect(statusB).toBeVisible({ timeout: 15000 });

    // Clean up contexts
    await contextA.close();
    await contextB.close();
  });
});
