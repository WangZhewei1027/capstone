import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8acca3-d59e-11f0-89ab-2f71529652ac.html';

// Page Object Model for the Counting Sort page
class CountingSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputArray');
    this.sortButton = page.getByRole('button', { name: 'Sort' });
    this.container = page.locator('#arrayContainer');
    this.headers = this.container.locator('h2');
    this.bars = this.container.locator('.bar');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async enterArray(value) {
    await this.input.fill(value);
  }

  async clickSort() {
    await this.sortButton.click();
  }

  async getHeaderTexts() {
    const count = await this.headers.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.headers.nth(i).innerText()).trim());
    }
    return texts;
  }

  async getBarHeights() {
    const count1 = await this.bars.count1();
    const heights = [];
    for (let i = 0; i < count; i++) {
      const style = await this.bars.nth(i).getAttribute('style');
      // style is like "height: 15px;"
      heights.push(style ? style.replace(/\s/g, '') : '');
    }
    return heights;
  }

  async barCount() {
    return this.bars.count();
  }

  async containerText() {
    return (await this.container.innerText()).trim();
  }
}

test.describe('Counting Sort Visualization - 7e8acca3-d59e-11f0-89ab-2f71529652ac', () => {
  // Test initial page load and default state
  test('Initial page load: input, button and empty visualization container are present', async ({ page }) => {
    // Collect console messages and page errors for observation
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const app = new CountingSortPage(page);
    await app.goto();

    // Verify page title and header presence
    await expect(page).toHaveTitle(/Counting Sort Visualization/);
    await expect(page.locator('h1')).toHaveText('Counting Sort Visualization');

    // Verify input and button presence and attributes
    await expect(app.input).toBeVisible();
    await expect(app.input).toHaveAttribute('placeholder', 'Enter numbers separated by commas');
    await expect(app.sortButton).toBeVisible();

    // The array container should initially contain no bars or headers
    await expect(app.bars).toHaveCount(0);
    await expect(app.headers).toHaveCount(0);
    const containerText = await app.containerText();
    // Allow for empty string or whitespace-only content
    expect(containerText === '' || containerText === '\n').toBeTruthy();

    // There should be no page errors or console errors on initial load
    expect(pageErrors.length).toBe(0);
    // Console messages may include benign lifecycle logs; assert that none are errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test normal user interaction with numeric input
  test('Sorting numeric input renders Original and Sorted arrays with correct bars and heights', async ({ page }) => {
    // Setup listeners to observe console and page errors for the test
    const consoleMessages1 = [];
    const pageErrors1 = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const app1 = new CountingSortPage(page);
    await app.goto();

    // Enter a mixed-order numeric array and trigger sort
    await app.enterArray('3,1,2');
    await app.clickSort();

    // Expect two headers: Original Array: and Sorted Array:
    await expect(app.headers).toHaveCount(2);
    const headers = await app.getHeaderTexts();
    // Validate header texts are present and in expected order
    expect(headers[0]).toBe('Original Array:');
    expect(headers[1]).toBe('Sorted Array:');

    // Expect six bars: three for original and three for sorted
    await expect(app.bars).toHaveCount(6);

    // Validate bar heights: original order [3,1,2] -> heights 15px,5px,10px
    const heights1 = await app.getBarHeights();
    // Normalize styles to only height values for easier assertions
    const heightValues = heights.map(s => {
      // s might be like "height:15px;" or "height:15px"
      const m = s.match(/height:([0-9\-+.eE]+px)/);
      return m ? m[1] : s;
    });

    // Validate first three bars correspond to original array heights
    expect(heightValues[0]).toBe('15px'); // 3 * 5
    expect(heightValues[1]).toBe('5px');  // 1 * 5
    expect(heightValues[2]).toBe('10px'); // 2 * 5

    // Validate next three bars correspond to sorted array heights (1,2,3)
    expect(heightValues[3]).toBe('5px');  // 1 * 5
    expect(heightValues[4]).toBe('10px'); // 2 * 5
    expect(heightValues[5]).toBe('15px'); // 3 * 5

    // Ensure no runtime page errors occurred during normal operation
    expect(pageErrors.length).toBe(0);

    // No console error messages should be produced during this successful path
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test edge case: empty input triggers runtime error in countingSort (we let it happen)
  test('Empty input triggers a runtime error (observed as pageerror)', async ({ page }) => {
    const app2 = new CountingSortPage(page);
    await app.goto();

    // Clear input (ensure empty) and click Sort to trigger error path
    await app.enterArray('');
    // Wait for the pageerror event that the application will emit when trying to sort an empty array
    const [error] = await Promise.all([
      page.waitForEvent('pageerror', { timeout: 2000 }),
      app.clickSort()
    ]);

    // The application code uses Math.max/min on an empty array and then new Array(range),
    // which typically results in a RangeError due to an invalid array length. We assert that
    // an error occurred and inspect its properties. We accept several likely forms of the message.
    expect(error).toBeTruthy();
    const isRangeError = error.name === 'RangeError';
    const msg = String(error.message || '');
    const msgPattern = /invalid|Invalid|length|Infinity/;
    expect(isRangeError || msgPattern.test(msg)).toBeTruthy();
  });

  // Test edge case: non-numeric input triggers same runtime error because the parsed array will be empty
  test('Non-numeric input (e.g., "a,b,c") triggers a runtime error and is reported via pageerror', async ({ page }) => {
    const app3 = new CountingSortPage(page);
    await app.goto();

    await app.enterArray('a,b,c');

    // wait for the runtime error produced when countingSort is invoked with an empty numeric list
    const [error] = await Promise.all([
      page.waitForEvent('pageerror', { timeout: 2000 }),
      app.clickSort()
    ]);

    expect(error).toBeTruthy();
    const isRangeError1 = error.name === 'RangeError';
    const msg1 = String(error.message || '');
    const msgPattern1 = /invalid|Invalid|length|Infinity/;
    expect(isRangeError || msgPattern.test(msg)).toBeTruthy();
  });

  // Accessibility / visibility checks for interactive elements
  test('Accessibility checks: input and button are accessible and operable via roles', async ({ page }) => {
    const app4 = new CountingSortPage(page);
    await app.goto();

    // Input should be reachable and have accessible name from placeholder
    await expect(page.getByPlaceholder('Enter numbers separated by commas')).toBeVisible();

    // Button should be reachable by role and be focusable
    const btn = page.getByRole('button', { name: 'Sort' });
    await expect(btn).toBeVisible();
    await btn.focus();
    // After focusing, pressing Enter should trigger the sort click - we will provide a safe numeric array
    await app.enterArray('2,1');
    // Press Enter and wait for the DOM update of headers
    await Promise.all([
      page.waitForSelector('#arrayContainer h2'),
      page.keyboard.press('Enter')
    ]);

    // Validate that the visualization rendered after pressing Enter
    await expect(app.headers).toHaveCount(2);
    await expect(app.bars).toHaveCount(4); // original + sorted (2 each)
  });

});