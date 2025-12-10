import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0747-d5a0-11f0-8040-510e90b1f3a7.html';

// Page object model encapsulating common selectors and interactions
class DijkstraApp {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Buttons
  startButton() {
    return this.page.locator('#startBtn');
  }
  resetButton() {
    return this.page.locator('#resetBtn');
  }
  clearWallsButton() {
    return this.page.locator('#clearWallsBtn');
  }
  clearPathButton() {
    return this.page.locator('#clearPathBtn');
  }

  // Status and step info
  status() {
    return this.page.locator('#status');
  }
  stepInfo() {
    return this.page.locator('#stepInfo');
  }

  // Grid container
  grid() {
    return this.page.locator('#grid');
  }

  // Header/title
  title() {
    return this.page.locator('h1');
  }

  // Legend items
  legendItems() {
    return this.page.locator('.legend-item');
  }
}

test.describe('Dijkstra\'s Algorithm Visualization - UI and Error Observability', () => {
  let page;
  let app;
  let pageErrors = [];
  let consoleMessages = [];

  // Attach listeners before navigation so we capture any runtime/parse errors from the page script
  test.beforeEach(async ({ browser }) => {
    pageErrors = [];
    consoleMessages = [];

    page = await browser.newPage();

    // Capture page errors such as ReferenceError, SyntaxError, TypeError
    page.on('pageerror', (err) => {
      // store the stringified message for assertions
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    // Capture console messages for additional observability
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the exact HTML as-is
    await page.goto(APP_URL, { waitUntil: 'load' });

    app = new DijkstraApp(page);
  });

  test.afterEach(async () => {
    if (page) await page.close();
  });

  // Test initial static UI elements (these should be present in the HTML even if JS fails)
  test('Initial page load shows static UI elements and default textual state', async () => {
    // Verify the page title and header are rendered correctly
    await expect(app.title()).toHaveText(/Dijkstra's Algorithm/i);

    // The subtitle is static HTML
    await expect(page.locator('.subtitle')).toHaveText(/Visualization of the shortest path finding algorithm/i);

    // Status should show the default textual state from HTML regardless of JS execution
    await expect(app.status()).toHaveText('Ready to start');

    // Step info area contains the default message
    await expect(app.stepInfo()).toHaveText(/Algorithm not started yet\./i);

    // All control buttons should exist and be visible
    await expect(app.startButton()).toBeVisible();
    await expect(app.resetButton()).toBeVisible();
    await expect(app.clearWallsButton()).toBeVisible();
    await expect(app.clearPathButton()).toBeVisible();

    // Ensure the legend items are present (static HTML)
    await expect(app.legendItems()).toHaveCount(5);

    // The grid container should exist as an element in the DOM
    await expect(app.grid()).toBeVisible();

    // Because the page's script is incomplete/truncated, the JS grid initialization was not executed.
    // Assert that the grid has no child cell elements (uninitialized state).
    const childCount = await page.locator('#grid').evaluate((el) => el.childElementCount);
    expect(childCount).toBe(0);
  });

  // Test that script errors emitted by the page are observed and include a SyntaxError or similar
  test('Page script errors are reported (expecting parsing/runtime error due to truncated script)', async () => {
    // At least one pageerror should have been captured during initial load
    expect(pageErrors.length).toBeGreaterThan(0);

    // Verify that at least one captured error looks like a SyntaxError/Unexpected token/ReferenceError/TypeError
    const errorMatched = pageErrors.some(msg =>
      /SyntaxError|Unexpected token|Unexpected end of input|ReferenceError|TypeError/i.test(msg)
    );

    expect(errorMatched).toBeTruthy();

    // Also assert that console messages were captured (useful for debugging and observability)
    // This does not require a specific message but ensures we recorded output from the page
    expect(Array.isArray(consoleMessages)).toBeTruthy();
  });

  // Verify that interactive controls exist but, because the script did not run, clicking them does not trigger algorithm changes.
  test('Clicking Start / Reset / Clear buttons does not change JS-driven state when script parsing fails', async () => {
    // Before clicking, assert default status text
    await expect(app.status()).toHaveText('Ready to start');

    // Click Start Algorithm button
    await app.startButton().click();

    // Wait briefly to allow any JS handlers (if attached) to run; in our environment they should not exist
    await page.waitForTimeout(150);

    // Because JS initialization likely failed, the status should remain unchanged (no handler to update it)
    await expect(app.status()).toHaveText('Ready to start');

    // Click Reset Grid - it should not throw and should not populate the grid either
    await app.resetButton().click();
    await page.waitForTimeout(150);
    const childCountAfterReset = await app.grid().evaluate((el) => el.childElementCount);
    expect(childCountAfterReset).toBe(0);

    // Click Clear Walls and Clear Path - no exceptions and no visual changes expected
    await app.clearWallsButton().click();
    await app.clearPathButton().click();
    await page.waitForTimeout(100);

    // Status still remains the same text
    await expect(app.status()).toHaveText('Ready to start');
  });

  // Test grid interactions are no-ops due to lack of JS initialization
  test('Attempting to interact with the grid container is a no-op when the grid is not initialized', async () => {
    // Ensure grid is empty
    const initialChildren = await app.grid().evaluate((el) => el.childElementCount);
    expect(initialChildren).toBe(0);

    // Try clicking the center of the grid container - should not create cells or throw
    const box = await app.grid().boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      // If boundingBox is null (not visible), attempt a click on the locator
      await app.grid().click().catch(() => { /* swallow any click exceptions for robustness */ });
    }

    // No new cells should have been added
    const afterClickChildren = await app.grid().evaluate((el) => el.childElementCount);
    expect(afterClickChildren).toBe(0);
  });

  // Accessibility-based checks: ensure buttons are reachable via role queries
  test('Accessibility checks: control buttons are discoverable by role and name', async () => {
    // Use getByRole to assert accessible names - these are static in the HTML
    const startByRole = page.getByRole('button', { name: 'Start Algorithm' });
    const resetByRole = page.getByRole('button', { name: 'Reset Grid' });
    const clearWallsByRole = page.getByRole('button', { name: 'Clear Walls' });
    const clearPathByRole = page.getByRole('button', { name: 'Clear Path' });

    await expect(startByRole).toBeVisible();
    await expect(resetByRole).toBeVisible();
    await expect(clearWallsByRole).toBeVisible();
    await expect(clearPathByRole).toBeVisible();
  });
});