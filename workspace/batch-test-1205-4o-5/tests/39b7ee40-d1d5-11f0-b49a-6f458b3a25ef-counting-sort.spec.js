import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b7ee40-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object for the Counting Sort page
class CountingSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputArray');
    this.sortButton = page.locator('#sortButton');
    this.container = page.locator('#array-container');
    this.barLocator = this.container.locator('.bar');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Set the input value (replacing existing value)
  async setInput(value) {
    await this.input.fill(value);
  }

  // Click the Sort button
  async clickSort() {
    await this.sortButton.click();
  }

  // Return number of bars currently rendered
  async getBarCount() {
    return await this.barLocator.count();
  }

  // Return array of heights (strings) for each bar in DOM order
  async getBarHeights() {
    const count = await this.getBarCount();
    const heights = [];
    for (let i = 0; i < count; i++) {
      heights.push(await this.barLocator.nth(i).evaluate(node => node.style.height));
    }
    return heights;
  }

  // Return an array of numeric heights in pixels (number)
  async getBarHeightsAsNumbers() {
    const heights1 = await this.getBarHeights();
    return heights.map(h => {
      if (!h) return NaN;
      return Number(h.replace('px', ''));
    });
  }

  // Return raw innerHTML of container for debugging/assertion
  async getContainerHTML() {
    return await this.container.evaluate(node => node.innerHTML);
  }
}

test.describe('Counting Sort Visualization (Application ID: 39b7ee40-d1d5-11f0-b49a-6f458b3a25ef)', () => {
  // Ensure each test gets a fresh page and page object
  test.beforeEach(async ({ page }) => {
    // Nothing here; each test will create page object and navigate
  });

  // Test initial page load: input and button visible and container empty
  test('Initial load shows input, button, and an empty array container', async ({ page }) => {
    const app = new CountingSortPage(page);
    await app.goto();

    // Verify input is visible and has placeholder text
    await expect(app.input).toBeVisible();
    await expect(app.input).toHaveAttribute('placeholder', /e\.g\., 4,2,2,8,3,3,1/);

    // Verify sort button is visible and enabled with label "Sort"
    await expect(app.sortButton).toBeVisible();
    await expect(app.sortButton).toHaveText('Sort');
    await expect(app.sortButton).toBeEnabled();

    // On initial load, the container should be empty (no bars)
    const barCount = await app.getBarCount();
    expect(barCount).toBe(0);

    // Container innerHTML should be empty string
    const html = await app.getContainerHTML();
    expect(html.trim()).toBe('');
  });

  // Test a typical user interaction: sorting a well-formed array
  test('Sorting a typical array renders sorted bars with correct heights and order', async ({ page }) => {
    const app1 = new CountingSortPage(page);
    await app.goto();

    // Input a typical array and click Sort
    await app.setInput('4,2,2,8,3,3,1');
    await app.clickSort();

    // Expect 7 bars rendered for sorted output [1,2,2,3,3,4,8]
    const count1 = await app.getBarCount();
    expect(count).toBe(7);

    // Expect the sequence of heights in pixels corresponding to values * 10
    // Sorted values => [1,2,2,3,3,4,8] => heights [10,20,20,30,30,40,80]
    const heights2 = await app.getBarHeights();
    expect(heights).toEqual([
      '10px', '20px', '20px', '30px', '30px', '40px', '80px'
    ]);

    // Also verify the DOM order by checking the nth-child heights from the container
    const numericHeights = await app.getBarHeightsAsNumbers();
    expect(numericHeights).toEqual([10, 20, 20, 30, 30, 40, 80]);
  });

  // Test empty input behavior - note: implementation converts empty string to [0]
  test('Empty input is interpreted as [0] and renders a single zero-height bar', async ({ page }) => {
    const app2 = new CountingSortPage(page);
    await app.goto();

    // Clear input (fill with empty string) and click Sort
    await app.setInput('');
    await app.clickSort();

    // According to implementation: empty string -> [""] -> Number("") => 0 -> arr=[0]
    // So expect exactly one bar with height '0px'
    const count2 = await app.getBarCount();
    expect(count).toBe(1);

    const heights3 = await app.getBarHeights();
    expect(heights[0]).toBe('0px');

    // Confirm container HTML contains one div with class 'bar'
    const html1 = await app.getContainerHTML();
    expect(html).toContain('class="bar"');
  });

  // Test invalid non-numeric input triggers a runtime error (let the error happen and assert it occurs)
  test('Non-numeric input (e.g., "4,2,a") causes a runtime page error (RangeError) and the test captures it', async ({ page }) => {
    const app3 = new CountingSortPage(page);
    await app.goto();

    // Attach a one-time listener to capture the page error
    const pageErrorPromise = page.waitForEvent('pageerror');

    // Provide invalid input containing a non-numeric token and click Sort
    await app.setInput('4,2,a');
    await app.clickSort();

    // Wait for a pageerror to be emitted as the broken code attempts to use Math.max with NaN
    const error = await pageErrorPromise;

    // The error message will come from the runtime (likely a RangeError: Invalid array length or similar).
    // Assert that an error occurred and the message indicates an invalid array length / RangeError / NaN presence.
    expect(error).toBeTruthy();
    const msg = error.message || '';
    // Message should mention 'Invalid' or 'NaN' or 'RangeError' in some form; be permissive
    expect(
      /Invalid array length|invalid array length|RangeError|NaN|invalid array|Invalid|Range error/i.test(msg)
    ).toBeTruthy();
  });

  // Test negative numbers: the implementation only renders non-negative indices (negative numbers are effectively ignored)
  test('Negative numbers in input are effectively ignored by the counting logic and only non-negative results are rendered', async ({ page }) => {
    const app4 = new CountingSortPage(page);
    await app.goto();

    // Provide input with negative numbers and some non-negative numbers
    await app.setInput('-2,-1,0,3');
    await app.clickSort();

    // Implementation specifics:
    // maxElement = Math.max(-2,-1,0,3) => 3 => countArray length = 4
    // countArray[num]++ where num is -2 or -1 will not affect indices 0..3, so only 0 and 3 will be in output.
    // Expect two bars corresponding to values 0 and 3 => heights: '0px' and '30px'
    const count3 = await app.getBarCount();
    expect(count).toBe(2);

    const heights4 = await app.getBarHeights();
    expect(heights).toEqual(['0px', '30px']);

    // Ensure the first bar corresponds to 0 (height 0) followed by 3 (height 30)
    const numericHeights1 = await app.getBarHeightsAsNumbers();
    expect(numericHeights).toEqual([0, 30]);
  });

  // Accessibility and controls sanity: ensure the input is focusable and button is keyboard operable
  test('Input is focusable and Sort button can be activated via keyboard (Enter key)', async ({ page }) => {
    const app5 = new CountingSortPage(page);
    await app.goto();

    // Focus the input and type a value then press Enter to trigger sorting (Enter should click the button by default when focused on input)
    await app.input.focus();
    await app.setInput('3,1,2');

    // Press Enter key - the page's script listens to button click only, pressing Enter won't automatically click the button
    // But some browsers may submit forms; since this is not a form, we simulate keyboard activation of the button by Tab+Enter
    await page.keyboard.press('Tab'); // move focus to the Sort button
    // Ensure the button has focus
    await expect(app.sortButton).toBeFocused();

    // Press Enter to activate the button
    await page.keyboard.press('Enter');

    // Confirm sorting occurred: expected sorted [1,2,3] => heights [10px,20px,30px]
    const heights5 = await app.getBarHeights();
    expect(heights).toEqual(['10px', '20px', '30px']);
  });
});