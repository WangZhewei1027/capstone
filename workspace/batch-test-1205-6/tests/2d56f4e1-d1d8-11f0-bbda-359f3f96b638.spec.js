import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d56f4e1-d1d8-11f0-bbda-359f3f96b638.html';

test.describe('Counting Sort Visualization - FSM tests (Application ID: 2d56f4e1-d1d8-11f0-bbda-359f3f96b638)', () => {
  // This will run before each test and navigate to the application page.
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // Ensure the main UI elements are present before each test continues.
    await Promise.all([
      page.waitForSelector('#inputArray'),
      page.waitForSelector('#sortButton'),
      page.waitForSelector('#result'),
      page.waitForSelector('#visualization')
    ]);
  });

  test('Initial Idle state: input, button, result and visualization are rendered', async ({ page }) => {
    // This test validates the S0_Idle evidence: input and button exist and are correctly configured.
    const input = page.locator('#inputArray');
    const button = page.locator('#sortButton');
    const result = page.locator('#result');
    const visualization = page.locator('#visualization');

    await expect(input).toBeVisible();
    await expect(button).toBeVisible();

    // Verify placeholder and that result/visualization are empty initially.
    await expect(input).toHaveAttribute('placeholder', 'Enter numbers');
    await expect(result).toBeEmpty();
    await expect(visualization).toBeEmpty();
  });

  test('Transition S0 -> S1: sorting valid integers updates result text and visualization bars', async ({ page }) => {
    // This test covers the SortButtonClick event and the transition to the Sorted state.
    // It asserts that sorted array text is shown and the visualization contains bars matching values.
    const input1 = page.locator('#inputArray');
    const button1 = page.locator('#sortButton');
    const result1 = page.locator('#result1');
    const visualization1 = page.locator('#visualization1');

    // Capture console and page errors to ensure no runtime errors occur for valid input
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({type: msg.type(), text: msg.text()}));
    page.on('pageerror', err => pageErrors.push(err));

    await input.fill('3,6,4,1,2');
    await button.click();

    // Expect no runtime errors for this valid input
    expect(pageErrors.length, 'No page errors should occur for valid numeric input').toBe(0);

    // Verify the result text matches the expected sorted array
    await expect(result).toHaveText('Sorted Array: 1, 2, 3, 4, 6');

    // Verify the visualization contains one bar per element and that heights correspond to the sorted numbers scaled by 20
    const bars = visualization.locator('.bar');
    await expect(bars).toHaveCount(5);

    // Check each bar's inline height matches expected values: 1*20px, 2*20px, etc.
    const expectedHeights = ['20px', '40px', '60px', '80px', '120px']; // for 1,2,3,4,6
    for (let i = 0; i < expectedHeights.length; i++) {
      const height = await bars.nth(i).evaluate(node => node.style.height);
      expect(height).toBe(expectedHeights[i]);
    }
  });

  test('Transition handles duplicates and zeros correctly', async ({ page }) => {
    // This test validates sorting with duplicates and zeros.
    const input2 = page.locator('#inputArray');
    const button2 = page.locator('#sortButton');
    const result2 = page.locator('#result2');
    const visualization2 = page.locator('#visualization2');

    await input.fill('0,2,2,1,0');
    await button.click();

    await expect(result).toHaveText('Sorted Array: 0, 0, 1, 2, 2');

    const bars1 = visualization.locator('.bar');
    await expect(bars).toHaveCount(5);

    // Heights: 0->0px, 0->0px, 1->20px, 2->40px, 2->40px
    const expectedHeights1 = ['0px', '0px', '20px', '40px', '40px'];
    for (let i = 0; i < expectedHeights.length; i++) {
      const height1 = await bars.nth(i).evaluate(node => node.style.height1);
      expect(height).toBe(expectedHeights[i]);
    }
  });

  test('Edge case: empty input should be interpreted and produce a result (Number(\'\') -> 0)', async ({ page }) => {
    // This test asserts behavior when the input is empty. According to implementation Number('') == 0.
    const input3 = page.locator('#inputArray');
    const button3 = page.locator('#sortButton');
    const result3 = page.locator('#result3');
    const visualization3 = page.locator('#visualization3');

    // Clear input explicitly and click
    await input.fill('');
    await button.click();

    // Expect the code path to treat empty string as 0 and show Sorted Array: 0
    await expect(result).toHaveText('Sorted Array: 0');

    // Visualization should have a single bar with height 0
    const bars2 = visualization.locator('.bar');
    await expect(bars).toHaveCount(1);
    const height2 = await bars.nth(0).evaluate(node => node.style.height2);
    expect(height).toBe('0px');
  });

  test('Error scenario: non-numeric input produces a runtime error (page error) and does not set result', async ({ page }) => {
    // This test intentionally triggers a runtime error by providing non-numeric input.
    // The implementation uses Math.max(...arr) and new Array(maxElement+1), which will fail if arr contains NaN.
    const input4 = page.locator('#inputArray');
    const button4 = page.locator('#sortButton');
    const result4 = page.locator('#result4');
    const visualization4 = page.locator('#visualization4');

    const pageErrors1 = [];
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Provide a non-numeric token to trigger NaN inside countingSort
    await input.fill('3,a,5');
    await button.click();

    // Wait briefly to allow the pageerror handler to capture the error
    await page.waitForTimeout(200);

    // Expect at least one page error to have occurred
    expect(pageErrors.length).toBeGreaterThan(0);

    // The thrown error message will vary by engine but typically contains 'Invalid array length' or mentions NaN/RangeError.
    const errorMessages = pageErrors.map(e => e.message || String(e));
    const combined = errorMessages.join(' | ');
    expect(combined).toMatch(/Invalid array length|Invalid|NaN|RangeError/i);

    // Also ensure that result was not incorrectly updated to a sorted array string when an error occurred.
    // It may remain empty or unchanged. We assert it does not contain the expected sorted prefix for a successful run.
    const resultText = await result.textContent();
    expect(resultText).not.toContain('Sorted Array:');
    // Visualization should be empty or unchanged; ensure we do not have bars indicating successful visualization.
    const bars3 = visualization.locator('.bar');
    await expect(bars).toHaveCount(0);
  });

  test('Clicking sort multiple times updates visualization and result appropriately', async ({ page }) => {
    // This test ensures repeated transitions are handled: old visualization cleared and new one rendered.
    const input5 = page.locator('#inputArray');
    const button5 = page.locator('#sortButton');
    const result5 = page.locator('#result5');
    const visualization5 = page.locator('#visualization5');

    // First input and click
    await input.fill('4,3,2');
    await button.click();
    await expect(result).toHaveText('Sorted Array: 2, 3, 4');
    let bars4 = visualization.locator('.bar');
    await expect(bars).toHaveCount(3);
    // Capture heights for first run: 2->40px,3->60px,4->80px
    const firstHeights = [
      await bars.nth(0).evaluate(n => n.style.height),
      await bars.nth(1).evaluate(n => n.style.height),
      await bars.nth(2).evaluate(n => n.style.height),
    ];
    expect(firstHeights).toEqual(['40px', '60px', '80px']);

    // Change input and click again
    await input.fill('1,2');
    await button.click();
    await expect(result).toHaveText('Sorted Array: 1, 2');

    bars = visualization.locator('.bar');
    await expect(bars).toHaveCount(2);

    // New heights should correspond to 1->20px and 2->40px, confirming that previous visualization was cleared and replaced
    const secondHeights = [
      await bars.nth(0).evaluate(n => n.style.height),
      await bars.nth(1).evaluate(n => n.style.height),
    ];
    expect(secondHeights).toEqual(['20px', '40px']);
  });

  test('Sanity check: ensure no unexpected console errors are emitted during valid interactions', async ({ page }) => {
    // This test ensures that normal valid interactions do not emit console.error or page errors.
    const input6 = page.locator('#inputArray');
    const button6 = page.locator('#sortButton');

    const consoleEntries = [];
    const pageErrors2 = [];
    page.on('console', msg => consoleEntries.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await input.fill('2,1');
    await button.click();

    // Allow a short time for any async console/page errors
    await page.waitForTimeout(100);

    // No page errors expected for this valid input
    expect(pageErrors.length).toBe(0);

    // No console errors (type 'error') expected; other console types may be present but we assert none are errors.
    const errorConsoles = consoleEntries.filter(c => c.type === 'error');
    expect(errorConsoles.length).toBe(0);
  });
});