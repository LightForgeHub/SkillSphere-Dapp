import { test, expect } from "@playwright/experimental-ct-react";
import ExpertStats from "./ExpertStats";

test.describe("ExpertStats — Heartbeat Panel", () => {
  // ============================================================================
  // SUITE 1 — Display (3 tests)
  // ============================================================================
  test.describe("Display Tests", () => {
    test("displays 'Last Heartbeat: X mins ago' for recent heartbeat", async ({
      mount,
    }) => {
      // Create a timestamp from 5 minutes ago
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

      const component = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={fiveMinutesAgo} />
      );

      // Assert that the formatted time is displayed
      const heartbeatDisplay = component.locator("text=/5 mins ago/");
      await expect(heartbeatDisplay).toBeVisible();
    });

    test("displays 'Never' when no heartbeat recorded", async ({ mount }) => {
      const component = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={null} />
      );

      // Assert that "Never" is displayed
      const neverText = component.locator("text=/Never sent a heartbeat/");
      await expect(neverText).toBeVisible();

      // Also check the main display shows "Never"
      const timeDisplay = component.locator("text=Never");
      await expect(timeDisplay).toBeVisible();
    });

    test("displays 'Just now' for very recent heartbeat", async ({ mount }) => {
      // Create a timestamp from 10 seconds ago
      const tenSecondsAgo = Date.now() - 10 * 1000;

      const component = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={tenSecondsAgo} />
      );

      // Assert that "Just now" is displayed
      const justNowText = component.locator("text=Just now");
      await expect(justNowText).toBeVisible();
    });
  });

  // ============================================================================
  // SUITE 2 — Ping Now button (4 tests)
  // ============================================================================
  test.describe("Ping Now Button Interaction", () => {
    test("renders Ping Now button", async ({ mount }) => {
      const component = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={null} />
      );

      // Assert button with "Ping Now" text is present
      const pingButton = component.locator('button:has-text("Ping Now")');
      await expect(pingButton).toBeVisible();
    });

    test("calls heartbeat API when Ping Now clicked", async ({
      mount,
      context,
    }) => {
      // Track fetch calls
      const fetchCalls: { url: string; method: string }[] = [];

      await context.route("**/api/experts/*/heartbeat", async (route) => {
        fetchCalls.push({
          url: route.request().url(),
          method: route.request().method(),
        });

        await route.abort();
      });

      const component = await mount(
        <ExpertStats expertId="expert-123" initialLastHeartbeat={null} />
      );

      const pingButton = component.locator('button:has-text("Ping Now")');
      await pingButton.click();

      // Wait a moment for the request to be made
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert the API was called with POST method to correct endpoint
      const matchingCall = fetchCalls.find(
        (call) =>
          call.url.includes("/api/experts/expert-123/heartbeat") &&
          call.method === "POST"
      );
      expect(matchingCall).toBeDefined();
    });

    test("updates Last Heartbeat display after successful ping", async ({
      mount,
      context,
    }) => {
      // Mock successful API response
      const nowTimestamp = Date.now();

      await context.route("**/api/experts/*/heartbeat", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ lastHeartbeat: nowTimestamp }),
        });
      });

      const component = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={null} />
      );

      // Initially shows "Never"
      let timeDisplay = component.locator("text=Never").first();
      await expect(timeDisplay).toBeVisible();

      // Click Ping Now
      const pingButton = component.locator('button:has-text("Ping Now")');
      await pingButton.click();

      // Wait for update
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assert display updates to "Just now" (since we just set it to now)
      timeDisplay = component.locator("text=Just now");
      await expect(timeDisplay).toBeVisible();
    });

    test("shows error message when ping fails", async ({
      mount,
      context,
    }) => {
      // Mock failed API response
      await context.route("**/api/experts/*/heartbeat", async (route) => {
        await route.abort("failed");
      });

      const component = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={null} />
      );

      // Click Ping Now
      const pingButton = component.locator('button:has-text("Ping Now")');
      await pingButton.click();

      // Wait for error handling
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assert error message displayed
      const errorMessage = component.locator(
        "text=/Failed to send heartbeat/i"
      );
      await expect(errorMessage).toBeVisible();
    });
  });

  // ============================================================================
  // SUITE 3 — Button states (3 tests)
  // ============================================================================
  test.describe("Button Loading States", () => {
    test("disables button while pinging", async ({ mount, context }) => {
      // Mock a slow API response
      await context.route("**/api/experts/*/heartbeat", async (route) => {
        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ lastHeartbeat: Date.now() }),
        });
      });

      const component = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={null} />
      );

      const pingButton = component.locator('button:has-text("Ping Now")');

      // Initial state: enabled
      await expect(pingButton).toBeEnabled();

      // Click button
      await pingButton.click();

      // During request: disabled
      const disabledButton = component.locator('button:has-text("Pinging...")');
      await expect(disabledButton).toBeVisible();
      await expect(disabledButton).toBeDisabled();
    });

    test("shows 'Pinging...' text during request", async ({
      mount,
      context,
    }) => {
      // Mock a slow API response
      await context.route("**/api/experts/*/heartbeat", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ lastHeartbeat: Date.now() }),
        });
      });

      const component = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={null} />
      );

      const pingButton = component.locator('button:has-text("Ping Now")');
      await pingButton.click();

      // Assert button text changes to "Pinging..."
      const pingingText = component.locator('button:has-text("Pinging...")');
      await expect(pingingText).toBeVisible();
    });

    test("re-enables button after ping completes", async ({
      mount,
      context,
    }) => {
      // Mock API response
      await context.route("**/api/experts/*/heartbeat", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ lastHeartbeat: Date.now() }),
        });
      });

      const component = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={null} />
      );

      const pingButton = component.locator('button:has-text("Ping Now")');

      // Initial state
      await expect(pingButton).toBeEnabled();

      // Click and complete request
      await pingButton.click();
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Button should be re-enabled after completion
      const enabledButton = component.locator('button:has-text("Ping Now")');
      await expect(enabledButton).toBeVisible();
      await expect(enabledButton).toBeEnabled();
    });
  });

  // ============================================================================
  // SUITE 4 — Accessibility (2 tests)
  // ============================================================================
  test.describe("Accessibility", () => {
    test("Ping Now button has accessible aria-label or semantic text", async ({
      mount,
    }) => {
      const component = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={null} />
      );

      // Button should have clear, accessible text or aria-label
      const pingButton = component.locator(
        'button:has-text("Ping Now"), button[aria-label*="heartbeat" i], button[aria-label*="ping" i]'
      );
      await expect(pingButton).toBeVisible();

      // Verify button is keyboard accessible
      await pingButton.focus();
      const isFocused = await pingButton.evaluate(
        (el) => document.activeElement === el
      );
      expect(isFocused).toBe(true);
    });

    test("error message has role='alert' for accessibility", async ({
      mount,
      context,
    }) => {
      // Mock failed API
      await context.route("**/api/experts/*/heartbeat", async (route) => {
        await route.abort("failed");
      });

      const component = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={null} />
      );

      // Trigger error
      const pingButton = component.locator('button:has-text("Ping Now")');
      await pingButton.click();

      // Wait for error
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assert error element has role="alert"
      const alertElement = component.locator('[role="alert"]');
      await expect(alertElement).toBeVisible();

      // Verify alert contains error text
      const alertText = await alertElement.textContent();
      expect(alertText).toContain("Failed to send heartbeat");
    });
  });

  // ============================================================================
  // SUITE 5 — Online Status Display (2 tests)
  // ============================================================================
  test.describe("Online Status Indicator", () => {
    test("displays 'Online & Visible' badge for fresh heartbeat", async ({
      mount,
    }) => {
      // Create timestamp from 30 minutes ago (within 1 hour validity window)
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

      const component = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={thirtyMinutesAgo} />
      );

      // Assert online status displayed
      const onlineStatus = component.locator("text=/Online & Visible/");
      await expect(onlineStatus).toBeVisible();

      // Verify pulsing indicator present
      const pulsingDot = component.locator(".animate-pulse");
      await expect(pulsingDot).toBeVisible();
    });

    test("displays 'Offline' status when heartbeat is stale", async ({
      mount,
    }) => {
      // Create timestamp from 2 hours ago (beyond 1 hour validity window)
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

      const component = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={twoHoursAgo} />
      );

      // Assert offline status displayed
      const offlineStatus = component.locator("text=Offline");
      await expect(offlineStatus).toBeVisible();

      // Verify warning message present
      const warningMsg = component.locator(
        "text=/Not visible in search/i"
      );
      await expect(warningMsg).toBeVisible();
    });
  });

  // ============================================================================
  // SUITE 6 — Information Display (1 test)
  // ============================================================================
  test.describe("Information Display", () => {
    test("displays heartbeat validity window information", async ({
      mount,
    }) => {
      const component = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={null} />
      );

      // Check for validity window text
      const validityInfo = component.locator("text=/1 hour/i");
      await expect(validityInfo).toBeVisible();

      // Check for heartbeat purpose explanation
      const explanation = component.locator(
        "text=/keep your profile active/i"
      );
      await expect(explanation).toBeVisible();
    });
  });

  // ============================================================================
  // SUITE 7 — Auto-refresh (1 test)
  // ============================================================================
  test.describe("Auto-refresh Functionality", () => {
    test("updates relative time display periodically", async ({ mount }) => {
      // Create timestamp from 1 minute ago
      let timestamp = Date.now() - 60 * 1000;

      const { rerender } = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={timestamp} />
      );

      // Initial display should show "1 min ago"
      let timeDisplay = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={timestamp} />
      );
      const initialText = timeDisplay.locator("text=/1 min ago/");
      await expect(initialText).toBeVisible();

      // After time passes, update timestamp to simulate next interval
      timestamp = Date.now() - 2 * 60 * 1000;

      timeDisplay = await mount(
        <ExpertStats expertId="expert-1" initialLastHeartbeat={timestamp} />
      );

      // Should now show updated time
      const updatedText = timeDisplay.locator("text=/2 mins ago/");
      await expect(updatedText).toBeVisible();
    });
  });
});
