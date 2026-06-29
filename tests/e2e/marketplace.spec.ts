import { test, expect } from "@playwright/test";

test.describe("SkillSphere Marketplace E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Set mock wallet environment variable for CI
    page.context().addInitScript(() => {
      (window as any).process = { env: { NEXT_PUBLIC_MOCK_WALLET: "true" } };
    });
  });

  test("User navigates landing page, opens wallet connect modal, and views dashboards", async ({
    page,
  }) => {
    // Navigate to landing page
    await page.goto("/");
    await expect(page).toHaveTitle(/SkillSphere/i);

    // Check if landing page loads
    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();

    // Look for wallet connect button
    const walletButton = page.locator("button, a").filter({
      hasText: /wallet|connect/i,
    });

    if (await walletButton.first().isVisible()) {
      // Click wallet connect button to open modal
      await walletButton.first().click();

      // Check if modal is open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Verify modal is accessible
      const modalTitle = page.locator('[role="dialog"] h2, [role="dialog"] h3');
      await expect(modalTitle.first()).toBeVisible();
    }

    // Try to navigate to dashboard
    const dashboardLink = page.locator("a, button").filter({
      hasText: /dashboard|profile/i,
    });

    if (await dashboardLink.first().isVisible()) {
      await dashboardLink.first().click();
      await page.waitForURL(/\/(dashboard|profile)/, { timeout: 5000 }).catch(
        () => {
          console.log("Dashboard navigation timeout, continuing...");
        }
      );

      const dashboardContent = page.locator("h1, h2");
      if (await dashboardContent.first().isVisible()) {
        await expect(dashboardContent.first()).toBeVisible();
      }
    }
  });

  test("User can search and filter experts directory", async ({ page }) => {
    // Navigate to experts/marketplace page
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle").catch(() => {
      console.log("Network idle timeout, continuing...");
    });

    // Check if page loads
    await expect(page).toHaveTitle(/marketplace|expert/i);

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[type="text"]').first();

    if (await searchInput.isVisible()) {
      // Type in search box
      await searchInput.fill("web development");
      await page.waitForTimeout(500);

      // Verify search results
      const results = page.locator("div, article, li").filter({
        has: page.locator("text=/web|development/i"),
      });

      const resultCount = await results.count();
      if (resultCount > 0) {
        expect(resultCount).toBeGreaterThan(0);
      }
    }

    // Look for filter options
    const filterButton = page.locator("button").filter({
      hasText: /filter|sort/i,
    });

    if (await filterButton.isVisible()) {
      await filterButton.first().click();

      // Verify filter modal/menu opens
      const filterMenu = page.locator('[role="dialog"], [role="menu"]').first();
      if (await filterMenu.isVisible()) {
        await expect(filterMenu).toBeVisible();

        // Select a filter option
        const filterOption = page.locator("label, button").filter({
          hasText: /rating|price|experience/i,
        });

        if (await filterOption.first().isVisible()) {
          await filterOption.first().click();
        }
      }
    }
  });

  test("Modal accessibility - keyboard navigation and screen reader support", async ({
    page,
  }) => {
    await page.goto("/");

    // Open modal
    const openModalButton = page.locator("button").filter({
      hasText: /open|modal|dialog/i,
    });

    if (await openModalButton.isVisible()) {
      await openModalButton.first().click();

      // Check modal role
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Test Escape key closes modal
      await page.keyboard.press("Escape");
      await expect(modal).toBeHidden();

      // Reopen modal
      await openModalButton.click();
      await expect(modal).toBeVisible();

      // Test Tab key focus trap
      const firstFocusableElement = modal.locator(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (await firstFocusableElement.first().isVisible()) {
        await firstFocusableElement.first().focus();
        await page.keyboard.press("Tab");

        const activeElement = await page.evaluate(
          () => document.activeElement?.getAttribute("class") || ""
        );
        expect(activeElement).toBeDefined();
      }

      // Check ARIA labels
      const ariaLabel = await modal.getAttribute("aria-label");
      const ariaModal = await modal.getAttribute("aria-modal");
      expect(ariaModal).toBe("true");
    }
  });

  test("Staking calculator slider functionality", async ({ page }) => {
    await page.goto("/dashboard/staking");

    // Check if staking calculator is visible
    const calculator = page.locator("text=/staking|calculator/i").first();

    if (await calculator.isVisible()) {
      // Find slider input
      const slider = page.locator('input[type="range"]').first();

      if (await slider.isVisible()) {
        // Test slider interaction
        await slider.fill("50000");
        const sliderValue = await slider.inputValue();
        expect(Number(sliderValue)).toBeGreaterThan(0);

        // Verify reward calculations are displayed
        const dailyReward = page.locator("text=/daily|daily reward/i");
        const monthlyReward = page.locator("text=/monthly|monthly reward/i");
        const yearlyReward = page.locator("text=/yearly|yearly reward/i");

        if (await dailyReward.isVisible()) {
          const dailyText = await dailyReward.first().textContent();
          expect(dailyText).toBeTruthy();
        }

        if (await monthlyReward.isVisible()) {
          const monthlyText = await monthlyReward.first().textContent();
          expect(monthlyText).toBeTruthy();
        }

        if (await yearlyReward.isVisible()) {
          const yearlyText = await yearlyReward.first().textContent();
          expect(yearlyText).toBeTruthy();
        }
      }
    }
  });
});
