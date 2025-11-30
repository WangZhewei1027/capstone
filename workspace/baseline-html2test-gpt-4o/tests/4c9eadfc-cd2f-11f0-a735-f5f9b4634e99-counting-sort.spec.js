import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9eadfc-cd2f-11f0-a735-f5f9b4634e99.html';

// Simple Page Object for the Counting Sort page
class CountingSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#arrayInput');
    this.button = page.locator('button', { hasText: 'Visualize Counting Sort' });
    this.barContainer = page.locator('#barContainer');
    this.bars = () => this.barContainer.locator('.bar');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async enterArray(text) {
    await this.input.fill(text);
  }

  async clickVisualize() {
    await this.button.click();
  }

  async getBarCount() {
    return await this.bars().count();
  }

  // returns array of strings for innerText of bars in DOM order
  async getBarTexts() {
    const count = await this.getBarCount();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.bars().nth(i).innerText());
    }
    return texts;
  }

  // returns array of computed heights (as strings, e.g., '45px')
  async getBarHeights() {
    const count = await this.getBarCount();
    const heights = [];
    for (let i = 0; i < count; i++) {
      heights.push(await this.bars().nth(i).evaluate(el => getComputedStyle(el).height));
    }
    return heights;
  }
}

test.describe('Counting Sort Visualization App', () => {
  // Ensure each test gets a fresh page
  test.beforeEach(async ({ page }) => {
    // Nothing else to set up here; tests call page.goto themselves via Page Object
  });

  // Test initial page load and default state
  test('Initial load shows input, button and empty container', async ({ page }) => {
    const app = new CountingSortPage(page);
    await app.goto();

    // Title check
    await expect(page.locator('h1')).toHaveText('Counting Sort Visualization');

    // Input visible and empty with placeholder
    await expect(app.input).toBeVisible();
    await expect(app.input).toHaveValue('');
    await expect(app.input).toHaveAttribute('placeholder', 'Enter numbers separated by commas');

    // Button visible and enabled
    await expect(app.button).toBeVisible();
    await expect(app.button).toBeEnabled();

    // No bars initially
    await expect(app.barContainer).toBeVisible();
    await expect(app.bars()).toHaveCount(0);
  });

  // Test successful sorting and DOM updates for a simple input
  test('Visualize sorts a small array and creates bars with correct order and heights', async ({ page }) => {
    const app = new CountingSortPage(page);
    await app.goto();

    // Capture console errors to assert none occur for valid input
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg));

    // Enter a simple unsorted array and click visualize
    await app.enterArray('3, 1, 2');
    await app.clickVisualize();

    // Expect three bars in ascending order (counting sort produces stable sorted output)
    await expect(app.bars()).toHaveCount(3);

    const texts = await app.getBarTexts();
    expect(texts).toEqual(['1', '2', '3']); // Sorted ascending order

    // Heights should be value * 15 px
    const heights = await app.getBarHeights();
    expect(heights).toEqual(['15px', '30px', '45px']);

    // Ensure no console errors were emitted during the successful run
    const errorConsoleMsgs = consoleMessages.filter(m => m.type() === 'error' || m.type() === 'warning');
    expect(errorConsoleMsgs.length).toBe(0);
  });

  // Test handling of zeros and duplicates
  test('Handles zeros and duplicate values correctly', async ({ page }) => {
    const app = new CountingSortPage(page);
    await app.goto();

    await app.enterArray('0,2,0,1');
    await app.clickVisualize();

    // Expect four bars sorted: 0,0,1,2
    await expect(app.bars()).toHaveCount(4);
    const texts = await app.getBarTexts();
    expect(texts).toEqual(['0', '0', '1', '2']);

    // Heights: 0 -> 0px, 1 -> 15px, 2 -> 30px
    const heights = await app.getBarHeights();
    expect(heights).toEqual(['0px', '0px', '15px', '30px']);
  });

  // Edge case: Empty input should produce a runtime error in the page code (do not patch)
  test('Empty input causes a runtime error (observes pageerror)', async ({ page }) => {
    const app = new CountingSortPage(page);
    await app.goto();

    // Prepare to capture the pageerror event which should be triggered by the broken runtime path
    const [pageError] = await Promise.all([
      page.waitForEvent('pageerror'),
      // Click without entering any numbers — the app will attempt to parse and will likely throw
      app.clickVisualize()
    ]);

    // Assert that an Error was thrown on the page
    expect(pageError).toBeTruthy();
    expect(pageError.name).toBeDefined();
    expect(pageError.message).toBeDefined();
    // We expect some kind of invalid array length or NaN-related error; ensure message is not empty
    expect(pageError.message.length).toBeGreaterThan(0);
  });

  // Edge case: Non-numeric input should produce a runtime error (do not patch)
  test('Non-numeric input causes a runtime error (observes pageerror)', async ({ page }) => {
    const app = new CountingSortPage(page);
    await app.goto();

    // Start waiting for pageerror before the click to ensure we capture the exception
    const waitForError = page.waitForEvent('pageerror');

    // Provide non-numeric input and trigger visualize
    await app.enterArray('a, b, hello');
    await app.clickVisualize();

    const pageError = await waitForError;

    // Assert that an Error was thrown on the page
    expect(pageError).toBeTruthy();
    expect(pageError.name).toBeDefined();
    expect(pageError.message).toBeDefined();
    expect(pageError.message.length).toBeGreaterThan(0);
  });

  // Accessibility and visual checks: Ensure bars have text content readable and container updates
  test('After visualization, bars are visible and have readable text content', async ({ page }) => {
    const app = new CountingSortPage(page);
    await app.goto();

    await app.enterArray('4,2,1');
    await app.clickVisualize();

    // Bars should be visible and contain text nodes
    const count = await app.getBarCount();
    expect(count).toBe(3);

    for (let i = 0; i < count; i++) {
      const bar = app.bars().nth(i);
      await expect(bar).toBeVisible();
      const text = await bar.innerText();
      // Each bar should show a numeric label
      expect(text).toMatch(/^\d+$/);
    }
  });
});