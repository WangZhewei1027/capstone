import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd73f27-d59e-11f0-ae0b-570552a0b645.html';

/**
 * Page Object encapsulating selectors and common interactions for the Union-Find app.
 */
class UnionFindPage {
  constructor(page) {
    this.page = page;
    // Inputs and buttons
    this.numElementsInput = page.locator('#num-elements');
    this.initBtn = page.locator('#init-btn');
    this.element1Input = page.locator('#element1');
    this.element2Input = page.locator('#element2');
    this.unionBtn = page.locator('#union-btn');
    this.findElementInput = page.locator('#find-element');
    this.findBtn = page.locator('#find-btn');
    this.resetBtn = page.locator('#reset-btn');
    this.setsContainer = page.locator('#sets-container');
    this.log = page.locator('#log');
    this.speedSlowBtn = page.locator('#speed-slow');
    this.speedMediumBtn = page.locator('#speed-medium');
    this.speedFastBtn = page.locator('#speed-fast');
    this.sets = page.locator('.set');
    this.logEntries = page.locator('.log-entry');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for initial DOMContentLoaded init to complete and update visualization
    await this.page.waitForSelector('#sets-container');
    // The app init adds a log entry; wait for that to appear to ensure initialization finished
    await expect(this.logEntries.first()).toBeVisible();
  }

  // Helpers for interacting
  async setNumElements(n) {
    await this.numElementsInput.fill(String(n));
  }

  async clickInit() {
    await this.initBtn.click();
  }

  async clickUnion(x, y) {
    await this.element1Input.fill(String(x));
    await this.element2Input.fill(String(y));
    await this.unionBtn.click();
  }

  async clickFind(x) {
    await this.findElementInput.fill(String(x));
    await this.findBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async clickSpeedFast() {
    await this.speedFastBtn.click();
  }

  async clickSpeedMedium() {
    await this.speedMediumBtn.click();
  }

  async clickSpeedSlow() {
    await this.speedSlowBtn.click();
  }

  // Query helper: find a set element by title text (e.g., 'Set with root 0')
  setByRootText(rootText) {
    // Use Playwright's locator with hasText option to locate exact set block
    return this.page.locator('.set', { hasText: rootText });
  }

  // Get number of .set blocks
  async countSets() {
    return await this.sets.count();
  }

  // Wait for a log entry containing text
  async waitForLogEntryContains(text, timeout = 3000) {
    await expect(this.log).toContainText(text, { timeout });
  }

  // Return the latest log text
  async latestLogText() {
    const count = await this.logEntries.count();
    if (count === 0) return '';
    return await this.logEntries.nth(count - 1).innerText();
  }
}

test.describe('Union-Find (Disjoint Set) Visualization - dfd73f27-d59e-11f0-ae0b-570552a0b645', () => {
  let pageErrors = [];
  let consoleErrors = [];

  // Setup: capture console.error and page errors for each test and navigate to the page.
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Capture uncaught page errors (unhandled exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    // Capture console messages and specifically note error-level logs
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const ufPage = new UnionFindPage(page);
    await ufPage.goto();
  });

  // Teardown: assert there are no unexpected page errors or console.error messages
  test.afterEach(async () => {
    // Assert no uncaught page errors occurred during the test run.
    // If there are errors, the assertions below will fail and surface them.
    expect(pageErrors, `Expect no uncaught page errors; actual: ${pageErrors.join(' | ')}`).toHaveLength(0);
    expect(consoleErrors, `Expect no console.error messages; actual: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });

  test.describe('Initial page and default state', () => {
    // Test the initial page load: title, subtitle, default values, and visualization count
    test('should load and initialize with default 10 elements and show 10 sets', async ({ page }) => {
      const ufPage = new UnionFindPage(page);

      // Verify page title and subtitle texts exist
      await expect(page.locator('h1')).toHaveText('Union-Find (Disjoint Set) Visualization');
      await expect(page.locator('.subtitle')).toContainText('Interactive demonstration of the Union-Find');

      // Default number of elements should be 10
      await expect(ufPage.numElementsInput).toHaveValue('10');

      // The initialization invoked on DOMContentLoaded should have added a log entry
      await expect(ufPage.log).toContainText('Initialized Union-Find with 10 elements');

      // There should be 10 set blocks (each element its own set initially)
      await expect(ufPage.sets).toHaveCount(10);

      // Each set title should contain "Set with root X"
      for (let i = 0; i < 10; i++) {
        const setLocator = ufPage.setByRootText(`Set with root ${i}`);
        await expect(setLocator).toBeVisible();
        // Each leader element should be present inside its set
        await expect(setLocator.locator('.element', { hasText: String(i) })).toBeVisible();
        // Leader elements have the 'leader' class
        await expect(setLocator.locator('.element', { hasText: String(i) })).toHaveClass(/leader/);
      }
    });
  });

  test.describe('Initialization and reconfiguration', () => {
    test('should allow changing the number of elements and re-initialize', async ({ page }) => {
      const ufPage = new UnionFindPage(page);

      // Set elements to 5 and click initialize
      await ufPage.setNumElements(5);
      await ufPage.clickInit();

      // Wait for the new init log entry and verify text
      await ufPage.waitForLogEntryContains('Initialized Union-Find with 5 elements');

      // Expect 5 sets now
      await expect(ufPage.sets).toHaveCount(5);
    });

    test('reset button should re-run initialization when uf exists', async ({ page }) => {
      const ufPage = new UnionFindPage(page);

      // Change size to 3 and init
      await ufPage.setNumElements(3);
      await ufPage.clickInit();
      await ufPage.waitForLogEntryContains('Initialized Union-Find with 3 elements');

      // Perform a union to change state
      await ufPage.clickUnion(0, 1);
      // animation speed default is 800ms so wait sufficiently for the union log
      await ufPage.waitForLogEntryContains('Union(0, 1):');

      // Now click reset which internally calls init()
      await ufPage.clickReset();
      await ufPage.waitForLogEntryContains('Initialized Union-Find with 3 elements');

      // After reset, sets should reflect 3 separate sets (initial state)
      await expect(ufPage.sets).toHaveCount(3);
    });
  });

  test.describe('Union and Find operations', () => {
    // Test that union merges sets and logs appropriately
    test('union merges two sets and updates the visualization and logs', async ({ page }) => {
      const ufPage = new UnionFindPage(page);

      // Use 6 elements for a clearer check
      await ufPage.setNumElements(6);
      await ufPage.clickInit();
      await ufPage.waitForLogEntryContains('Initialized Union-Find with 6 elements');

      // Perform union(0,1)
      await ufPage.clickUnion(0, 1);

      // Wait for union log message (allow some time for animation delay)
      await ufPage.waitForLogEntryContains('Union(0, 1): Elements 0 and 1 are now in the same set', 3000);

      // After union, number of sets should be 5
      await expect(ufPage.sets).toHaveCount(5);

      // There should be a set with root 0 that contains both 0 and 1
      const setRoot0 = ufPage.setByRootText('Set with root 0');
      await expect(setRoot0.locator('.element', { hasText: '0' })).toBeVisible();
      await expect(setRoot0.locator('.element', { hasText: '1' })).toBeVisible();
    });

    // Test find operation logs and highlights the path to the root
    test('find highlights path to root and logs the result', async ({ page }) => {
      const ufPage = new UnionFindPage(page);

      // Initialize 4 elements and create a small tree: union 0-1, union 1-2 --> root maybe 0
      await ufPage.setNumElements(4);
      await ufPage.clickInit();
      await ufPage.waitForLogEntryContains('Initialized Union-Find with 4 elements');

      await ufPage.clickUnion(0, 1);
      await ufPage.waitForLogEntryContains('Union(0, 1):', 3000);

      await ufPage.clickUnion(1, 2);
      await ufPage.waitForLogEntryContains('Union(1, 2):', 3000);

      // Now perform find on element 2
      await ufPage.clickFind(2);

      // The find operation has a delay; wait for the find log entry
      await ufPage.waitForLogEntryContains('Find(2): Element 2 belongs to set with root', 3000);

      // After the find, elements on the path (2 and its parent chain) should get 'selected' class briefly.
      // We look for at least the element '2' to have class 'selected' while the animation is in progress.
      const selectedElements = page.locator('.element.selected');
      // Wait for at least one element to get the 'selected' state
      await expect(selectedElements).toHaveCountGreaterThan(0);

      // After a little longer than the path highlight duration (animationSpeed * 2 = default 1600ms + buffer),
      // the 'selected' highlights should disappear. Wait up to 3s for them to disappear.
      await page.waitForTimeout(2000);
      await expect(page.locator('.element.selected')).toHaveCount(0);
    });
  });

  test.describe('Animation speed controls', () => {
    test('should update animation speed and toggle disabled state on speed buttons', async ({ page }) => {
      const ufPage = new UnionFindPage(page);

      // Click Fast: expect fast button to become disabled, others enabled
      await ufPage.clickSpeedFast();
      await expect(ufPage.speedFastBtn).toBeDisabled();
      await expect(ufPage.speedMediumBtn).not.toBeDisabled();
      await expect(ufPage.speedSlowBtn).not.toBeDisabled();

      // Click Slow: expect slow to become disabled
      await ufPage.clickSpeedSlow();
      await expect(ufPage.speedSlowBtn).toBeDisabled();
      await expect(ufPage.speedFastBtn).not.toBeDisabled();
      await expect(ufPage.speedMediumBtn).not.toBeDisabled();

      // Click Medium: expect medium to become disabled
      await ufPage.clickSpeedMedium();
      await expect(ufPage.speedMediumBtn).toBeDisabled();
      await expect(ufPage.speedFastBtn).not.toBeDisabled();
      await expect(ufPage.speedSlowBtn).not.toBeDisabled();
    });
  });

  test.describe('Validation and edge cases (alerts)', () => {
    test('should show an alert when initializing with an invalid number of elements', async ({ page }) => {
      const ufPage = new UnionFindPage(page);

      // Listen for dialog and capture its message
      let dialogMessage = '';
      page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      // Enter invalid number (0) and click initialize
      await ufPage.setNumElements(0);
      await ufPage.clickInit();

      // Give some time for dialog to appear and be handled
      await page.waitForTimeout(200);

      expect(dialogMessage).toContain('Please enter a number between 1 and 20');
    });

    test('should alert when performing union with invalid element indices', async ({ page }) => {
      const ufPage = new UnionFindPage(page);

      // Ensure a known size
      await ufPage.setNumElements(3);
      await ufPage.clickInit();
      await ufPage.waitForLogEntryContains('Initialized Union-Find with 3 elements');

      // Attempt union with an out-of-range index (e.g., 0 and 5)
      let dialogMessage = '';
      page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      await ufPage.element1Input.fill('0');
      await ufPage.element2Input.fill('5');
      await ufPage.unionBtn.click();

      await page.waitForTimeout(200);
      expect(dialogMessage).toContain('Please enter valid element numbers between 0 and 2');
    });

    test('should alert when union is attempted on identical elements', async ({ page }) => {
      const ufPage = new UnionFindPage(page);

      // Ensure initialization exists
      await ufPage.setNumElements(4);
      await ufPage.clickInit();
      await ufPage.waitForLogEntryContains('Initialized Union-Find with 4 elements');

      let dialogMessage = '';
      page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      // Enter same element for union
      await ufPage.element1Input.fill('2');
      await ufPage.element2Input.fill('2');
      await ufPage.unionBtn.click();

      await page.waitForTimeout(200);
      expect(dialogMessage).toContain('Elements must be different for union operation');
    });
  });

  test.describe('Accessibility and DOM stability checks', () => {
    test('operation log should scroll and append messages in order', async ({ page }) => {
      const ufPage = new UnionFindPage(page);

      // Initialize to ensure consistent starting point
      await ufPage.setNumElements(5);
      await ufPage.clickInit();
      await ufPage.waitForLogEntryContains('Initialized Union-Find with 5 elements');

      // Perform two operations to append log entries
      await ufPage.clickUnion(0, 1);
      await ufPage.waitForLogEntryContains('Union(0, 1):', 3000);

      await ufPage.clickFind(1);
      await ufPage.waitForLogEntryContains('Find(1):', 3000);

      // Verify last log entry corresponds to the most recent operation
      const latest = await ufPage.latestLogText();
      expect(latest).toMatch(/Find\(1\):/);
    });
  });
});