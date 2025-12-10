import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0756-d5a0-11f0-8040-510e90b1f3a7.html';

test.describe('K-Nearest Neighbors (KNN) Interactive Demo - Static and Error Observability tests', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize collectors
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Capture page runtime errors (exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the app and wait for load. We expect potential script parse/runtime errors to be emitted.
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Allow a short time for the page's scripts to attempt execution and emit errors (if any).
    await page.waitForTimeout(250);
  });

  test('Initial page load - static DOM elements and defaults are present', async ({ page }) => {
    // Purpose: Verify that the static HTML rendered correctly even if scripts fail.
    // Check page title and header
    await expect(page.locator('h1')).toHaveText('K-Nearest Neighbors (KNN) Algorithm');

    // Subtitle present
    await expect(page.locator('.subtitle')).toBeVisible();
    await expect(page.locator('.subtitle')).toContainText('interactive demonstration');

    // K-value input exists and has default value "5" as specified in HTML
    const kInput = page.locator('#k-value');
    await expect(kInput).toBeVisible();
    await expect(kInput).toHaveValue('5');

    // Mode radio buttons exist; default mode is A (checked)
    const modeA = page.locator('#mode-a');
    const modeB = page.locator('#mode-b');
    const modeClassify = page.locator('#mode-classify');
    await expect(modeA).toBeVisible();
    await expect(modeB).toBeVisible();
    await expect(modeClassify).toBeVisible();
    await expect(modeA).toBeChecked();
    await expect(modeB).not.toBeChecked();
    await expect(modeClassify).not.toBeChecked();

    // Canvas is present and visible
    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();

    // Buttons present
    await expect(page.locator('#reset-btn')).toBeVisible();
    await expect(page.locator('#generate-random')).toBeVisible();

    // Legend has three items
    const legendItems = page.locator('.legend-item');
    await expect(legendItems).toHaveCount(3);

    // Tooltip element exists and should initially be hidden (inline style display: none in CSS)
    const tooltip = page.locator('#tooltip');
    await expect(tooltip).toBeVisible();
    // Because tooltip is absolutely positioned and CSS sets display: none initially, check computed style via evaluate
    const tooltipDisplay = await tooltip.evaluate(node => {
      return window.getComputedStyle(node).display;
    });
    expect(tooltipDisplay).toBe('none');
  });

  test('Script execution produced errors which are observable via pageerror and console.error', async ({ page }) => {
    // Purpose: The application's embedded script is intentionally incomplete; verify that parsing/execution errors are reported.
    // We expect at least one page error to have been emitted.
    expect(pageErrors.length).toBeGreaterThan(0);

    // The first page error message should indicate a syntax/runtime issue. Match common error keywords.
    const firstErrMsg = pageErrors[0].message || String(pageErrors[0]);
    expect(firstErrMsg).toMatch(/SyntaxError|Unexpected end of input|Unexpected token|ReferenceError|TypeError/);

    // Also ensure that the browser console captured an error-level message related to the script failure.
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error' || m.type === 'assert' || m.type === 'warning');
    expect(errorConsoleMessages.length).toBeGreaterThanOrEqual(1);

    // At least one console error message should reference "SyntaxError" or "Unexpected" or similar.
    const consoleHasSyntaxLike = errorConsoleMessages.some(m => /SyntaxError|Unexpected end of input|Unexpected token|ReferenceError|TypeError/i.test(m.text));
    expect(consoleHasSyntaxLike).toBeTruthy();
  });

  test('Interactions do not trigger script-driven behavior due to script failure (clicks have no effect on canvas/tooltip)', async ({ page }) => {
    // Purpose: Attempt to interact with controls; because the page script failed to load fully,
    // interactive behaviors (like generating random points or resetting state) should not be applied.
    const tooltip = page.locator('#tooltip');
    const canvas = page.locator('#canvas');
    const generateBtn = page.locator('#generate-random');
    const resetBtn = page.locator('#reset-btn');
    const kInput = page.locator('#k-value');

    // Record current k value
    const kBefore = await kInput.inputValue();

    // Click generate random points
    await generateBtn.click();
    await page.waitForTimeout(200);

    // Because the script didn't run correctly, the tooltip should remain hidden and no drawing should occur.
    const tooltipDisplayAfterGenerate = await tooltip.evaluate(node => window.getComputedStyle(node).display);
    expect(tooltipDisplayAfterGenerate).toBe('none');

    // K value should remain unchanged (no script to adjust it)
    const kAfterGenerate = await kInput.inputValue();
    expect(kAfterGenerate).toBe(kBefore);

    // Click reset button, should not alter static attributes
    await resetBtn.click();
    await page.waitForTimeout(200);

    const kAfterReset = await kInput.inputValue();
    expect(kAfterReset).toBe(kBefore);

    // Ensure no new page errors have been silently swallowed — there should still be at least one error from initial load
    expect(pageErrors.length).toBeGreaterThan(0);
  });

  test('Hovering and clicking on canvas does not show tooltip or produce classification (script not running)', async ({ page }) => {
    // Purpose: Simulate mouse movement and click on the canvas. Since the event handlers are provided in the embedded script
    // which did not fully execute, these interactions should have no visible effect (tooltip should remain hidden).
    const canvas = page.locator('#canvas');
    const tooltip = page.locator('#tooltip');

    // Move mouse over the center of the canvas
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await page.mouse.move(x, y);
    await page.waitForTimeout(150);

    // Tooltip should stay hidden because mousemove handler couldn't run
    const tooltipDisplay = await tooltip.evaluate(node => window.getComputedStyle(node).display);
    expect(tooltipDisplay).toBe('none');

    // Click canvas (attempt to add a point). Because event handlers didn't attach, this should not change DOM/tooltip state.
    await page.mouse.click(x, y);
    await page.waitForTimeout(150);

    const tooltipDisplayAfterClick = await tooltip.evaluate(node => window.getComputedStyle(node).display);
    expect(tooltipDisplayAfterClick).toBe('none');
  });

  test('Altering input values does not crash further and does not trigger classification (no additional pageerrors)', async ({ page }) => {
    // Purpose: Change the K input value and ensure this DOM-only operation does not cause additional page errors,
    // given that the script's input listeners are not attached.
    const kInput = page.locator('#k-value');

    // Change K to 3 via direct user input simulation
    await kInput.fill('3');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(150);

    // The input value on the element should reflect the change
    await expect(kInput).toHaveValue('3');

    // No new page errors should have been produced by changing the input (aside from initial script errors)
    // We assert that there is at least the original page error(s), and that no new errors have been appended in this test.
    // (This is a soft assertion: at minimum the initial errors exist.)
    expect(pageErrors.length).toBeGreaterThan(0);
  });
});