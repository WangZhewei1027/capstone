import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d567fb1-d1d8-11f0-bbda-359f3f96b638.html';

test.describe('Union-Find Visualization - FSM based E2E tests', () => {
  // Capture console messages and page errors for each test
  test.beforeEach(async ({ page }) => {
    // No-op here; per-test listeners will be attached inside tests where needed
  });

  // Validate Idle state (S0_Idle) UI elements are present and ensure there's no unexpected runtime error
  test('S0_Idle: initial render shows inputs, buttons and output container; no runtime errors on load', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Load the page exactly as-is
    const response = await page.goto(APP_URL);
    expect(response && response.ok()).toBeTruthy();

    // Verify expected DOM elements from FSM evidence
    const elA = page.locator('#elementA');
    const elB = page.locator('#elementB');
    const unionButton = page.locator('button.button', { hasText: 'Union' });
    const findButton = page.locator('button.button', { hasText: 'Find' });
    const output = page.locator('#output');

    await expect(elA).toBeVisible();
    await expect(elB).toBeVisible();
    await expect(unionButton).toBeVisible();
    await expect(findButton).toBeVisible();
    await expect(output).toBeVisible();

    // The FSM entry action mentions renderPage(); the implementation does not define renderPage.
    // We assert that no ReferenceError occurred on load (i.e., renderPage wasn't invoked causing an error).
    // Also assert that renderPage is not defined on window to reflect the actual implementation.
    const renderPageType = await page.evaluate(() => typeof window.renderPage);
    expect(renderPageType).toBe('undefined');

    // Allow a brief moment for any async errors to surface
    await page.waitForTimeout(200);

    // Assert that no page errors were thrown during load
    expect(pageErrors.length).toBe(0);

    // Assert there are no console messages of type 'error' from the page load
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Test transition: S0_Idle -> S1_UnionCompleted via UnionClick
  test('Transition UnionClick: performing union updates output and internal sets (S1_UnionCompleted)', async ({ page }) => {
    const consoleMessages1 = [];
    const pageErrors1 = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);

    // Fill inputs with distinct element names and click Union
    await page.fill('#elementA', 'A');
    await page.fill('#elementB', 'B');

    // Click the Union button (uses onclick="union()")
    await page.click('button.button:has-text("Union")');

    // Wait for output to be populated
    const output1 = page.locator('#output1');
    await expect(output).toContainText('Union: A and B completed.');

    // The output also includes JSON from uf.getSets()
    const outputText = await output.innerText();
    expect(outputText).toMatch(/Union:\s*A\s*and\s*B\s*completed\./);
    // JSON should show A and B in same set (order may vary but both keys present)
    expect(outputText).toContain('"A"');
    expect(outputText).toContain('"B"');

    // Ensure that no runtime page errors occurred during the union operation
    expect(pageErrors.length).toBe(0);

    // No console errors expected
    const errorConsoleMessages1 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);

    // Verify idempotency of union: repeating the same union should not throw and sets remain consistent
    await page.click('button.button:has-text("Union")');
    await expect(output).toContainText('Union: A and B completed.');
    const outputAfterSecondUnion = await output.innerText();
    expect(outputAfterSecondUnion).toContain('"A"');
    expect(outputAfterSecondUnion).toContain('"B"');
  });

  // Test transition: S0_Idle -> S2_FindCompleted via FindClick
  test('Transition FindClick: performing find returns expected root and displays sets (S2_FindCompleted)', async ({ page }) => {
    const consoleMessages2 = [];
    const pageErrors2 = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);

    // Prepare a union to create a non-trivial structure
    await page.fill('#elementA', 'X');
    await page.fill('#elementB', 'Y');
    await page.click('button.button:has-text("Union")');

    // Now set elementA to X and trigger Find (Find uses elementA || elementB)
    await page.fill('#elementA', 'X');
    await page.click('button.button:has-text("Find")');

    const output2 = page.locator('#output2');
    await expect(output).toContainText('The root of X is');

    const outputText1 = await output.innerText();
    // The root of X should be either "X" or "Y" depending on union-by-rank; ensure root exists in message
    expect(/The root of X is [^\s.]+/.test(outputText)).toBeTruthy();

    // Ensure the JSON sets are shown
    expect(outputText).toContain('"X"');
    expect(outputText).toContain('"Y"');

    // Ensure no runtime errors occurred
    expect(pageErrors.length).toBe(0);
    const errorConsoleMessages2 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Edge cases and error scenarios
  test('Edge Cases: union/find with empty inputs and self-union', async ({ page }) => {
    const consoleMessages3 = [];
    const pageErrors3 = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);

    const output3 = page.locator('#output3');

    // 1) Union with empty inputs
    await page.fill('#elementA', '');
    await page.fill('#elementB', '');
    await page.click('button.button:has-text("Union")');
    await expect(output).toContainText('Union:  and  completed.');

    const out1 = await output.innerText();
    // getSets may include an empty string key represented as "" in JSON
    expect(out1).toMatch(/Union:\s*and\s*completed\./);

    // 2) Self-union: set elementA to "Z" and union Z with Z
    await page.fill('#elementA', 'Z');
    await page.fill('#elementB', 'Z');
    await page.click('button.button:has-text("Union")');
    await expect(output).toContainText('Union: Z and Z completed.');

    const out2 = await output.innerText();
    // JSON should include "Z"
    expect(out2).toContain('"Z"');

    // 3) Find when both inputs empty (Find uses elementA || elementB). With both empty the find will use empty string.
    await page.fill('#elementA', '');
    await page.fill('#elementB', '');
    await page.click('button.button:has-text("Find")');
    await expect(output).toContainText('The root of');

    // Ensure no unexpected runtime page errors happened
    expect(pageErrors.length).toBe(0);
    const errorConsoleMessages3 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Validate that functions referenced by FSM entry/exit (like renderPage) are not present and their absence didn't break behavior
  test('Verify FSM referenced functions (renderPage) are not present and do not cause errors', async ({ page }) => {
    const pageErrors4 = [];
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);

    // Confirm renderPage is not defined on window (implementation difference from FSM)
    const renderPageDefined = await page.evaluate(() => typeof window.renderPage !== 'undefined');
    expect(renderPageDefined).toBe(false);

    // Confirm there were no page errors due to missing renderPage during load
    expect(pageErrors.length).toBe(0);
  });

  // Observability test: collect all console and page errors during a sequence of actions and assert none occurred
  test('Observability: running a sequence of operations should not emit console errors or page errors', async ({ page }) => {
    const consoleMessages4 = [];
    const pageErrors5 = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);

    // Sequence: union A-B, union B-C, find C, find A
    await page.fill('#elementA', 'A');
    await page.fill('#elementB', 'B');
    await page.click('button.button:has-text("Union")');

    await page.fill('#elementA', 'B');
    await page.fill('#elementB', 'C');
    await page.click('button.button:has-text("Union")');

    // Find C (will pick elementA value which we'll set to C)
    await page.fill('#elementA', 'C');
    await page.click('button.button:has-text("Find")');
    await expect(page.locator('#output')).toContainText('The root of C is');

    // Find A
    await page.fill('#elementA', 'A');
    await page.click('button.button:has-text("Find")');
    await expect(page.locator('#output')).toContainText('The root of A is');

    // Small wait to let any async logs surface
    await page.waitForTimeout(100);

    // No uncaught page errors expected
    expect(pageErrors.length).toBe(0);

    // No console errors expected
    const errorConsoleMessages4 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });
});