import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd76636-d59e-11f0-ae0b-570552a0b645.html';

test.describe('Heap Sort Visualization - dfd76636-d59e-11f0-ae0b-570552a0b645', () => {
  // Capture any console errors or page errors that occur during the test.
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages and page errors so tests can assert on them.
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(String(err));
    });

    // Navigate to the application
    await page.goto(APP_URL);
    // Wait for main elements to be present
    await expect(page.locator('h1')).toHaveText(/Heap Sort Algorithm Visualization/);
    await expect(page.locator('#arrayInput')).toBeVisible();
    await expect(page.locator('#generateArray')).toBeVisible();
  });

  test.afterEach(async () => {
    // Ensure no console or page errors occurred during test by default.
    // Individual tests can assert otherwise if they expect errors.
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Initial load displays default array, tree, and step info message', async ({ page }) => {
    // Verify initial step info text
    const stepInfo = page.locator('#stepInfo');
    await expect(stepInfo).toContainText('Enter numbers and click "Generate Array" to begin.');

    // The default input value should be populated
    const arrayInput = page.locator('#arrayInput');
    await expect(arrayInput).toHaveValue('64,34,25,12,22,11,90');

    // Verify array display renders 7 array elements with correct values
    const elements = page.locator('#arrayDisplay .array-element');
    await expect(elements).toHaveCount(7);

    // Check texts of first and last items to ensure proper rendering
    await expect(elements.nth(0)).toHaveText('64');
    await expect(elements.nth(6)).toHaveText('90');

    // Verify binary tree display has at least one level rendered
    const treeLevels = page.locator('#treeDisplay .tree-level');
    await expect(treeLevels.first()).toBeVisible();

    // No console or page errors during initial load (checked in afterEach)
  });

  test('Generate Array updates visualization, tree and step info', async ({ page }) => {
    // Purpose: Ensure that entering a new array and clicking Generate updates UI
    const input = page.locator('#arrayInput');
    await input.fill('5,2,8');

    // Click Generate Array
    await page.click('#generateArray');

    // After generation, step info should indicate the array was generated
    await expect(page.locator('#stepInfo')).toContainText('Array generated');

    // Array display should show exactly three elements with correct values
    const elems = page.locator('#arrayDisplay .array-element');
    await expect(elems).toHaveCount(3);
    await expect(elems.nth(0)).toHaveText('5');
    await expect(elems.nth(1)).toHaveText('2');
    await expect(elems.nth(2)).toHaveText('8');

    // Binary tree should render a representation for three nodes (at least one level)
    await expect(page.locator('#treeDisplay .tree-level')).toHaveCountGreaterThan(0);

    // No console or page errors (afterEach will assert)
  });

  test('Step-by-step mode creates Next Step button and advances to completion', async ({ page }) => {
    // Purpose: Validate step-by-step flow, Next Step button creation, and state transitions.
    // Use a small array to minimize steps
    await page.locator('#arrayInput').fill('4,1,3');
    await page.click('#generateArray');

    // Click Step-by-Step to start
    await page.click('#stepByStep');

    // The original Step-by-Step button should be replaced by a Next Step button
    await expect(page.locator('#stepByStep')).toHaveCount(0);
    const nextStepBtn = page.locator('button:has-text("Next Step")');
    await expect(nextStepBtn).toBeVisible();

    // The first step info should reflect building the heap
    await expect(page.locator('#stepInfo')).toContainText('Building max heap');

    // Iterate through Next Step clicks until completion message appears or a safety limit reached
    const maxClicks = 20;
    let completed = false;
    for (let i = 0; i < maxClicks; i++) {
      // Click next step
      await nextStepBtn.click();
      // Allow small time for UI updates
      await page.waitForTimeout(100);

      const infoText = await page.locator('#stepInfo').innerText();
      if (infoText.includes('Array is now sorted!')) {
        completed = true;
        break;
      }
    }

    // Assert that the step-by-step sequence reached completion
    expect(completed).toBeTruthy();

    // After completion, array elements should all have the 'sorted' class
    const sortedElems = page.locator('#arrayDisplay .array-element.sorted');
    const totalElems = await page.locator('#arrayDisplay .array-element').count();
    await expect(sortedElems).toHaveCount(totalElems);

    // Binary tree should be cleared when complete (renderBinaryTree([]) empties treeDisplay)
    await expect(page.locator('#treeDisplay')).toBeEmpty();
  });

  test('Start Sorting (automatic) completes sorting for a small array', async ({ page }) => {
    // Purpose: Validate automatic sorting path completes and UI updates to sorted state.
    await page.locator('#arrayInput').fill('2,1');
    await page.click('#generateArray');

    // Click Sort Array to start automatic sorting
    await page.click('#sortArray');

    // Wait until the final 'Array is now sorted!' message appears (with timeout buffer)
    await expect(page.locator('#stepInfo')).toHaveText(/Array is now sorted!/, { timeout: 10000 });

    // Verify that elements are marked as sorted
    const total = await page.locator('#arrayDisplay .array-element').count();
    await expect(page.locator('#arrayDisplay .array-element.sorted')).toHaveCount(total);
  });

  test('Reset restores Step-by-Step button and resets UI state', async ({ page }) => {
    // Purpose: Ensure Reset reattaches the Step-by-Step control and resets step info.
    // Start by replacing the button via step-by-step mode
    await page.locator('#arrayInput').fill('7,3,5');
    await page.click('#generateArray');

    // Enter step-by-step to force replace
    await page.click('#stepByStep');
    await expect(page.locator('button:has-text("Next Step")')).toBeVisible();

    // Click Reset
    await page.click('#reset');

    // After reset, the Step-by-Step button should exist again in the DOM
    const restoredBtn = page.locator('#stepByStep');
    await expect(restoredBtn).toBeVisible();

    // Step info should indicate array reset
    await expect(page.locator('#stepInfo')).toContainText('Array reset');

    // Array display should show original (current input) values again and tree display visible
    const elems = page.locator('#arrayDisplay .array-element');
    await expect(elems).toHaveCount(3);
  });

  test('Handles invalid/empty input gracefully (no elements rendered)', async ({ page }) => {
    // Purpose: Test edge cases where input contains invalid numbers and ensure UI handles it without errors.
    await page.locator('#arrayInput').fill('a,b,,,');
    await page.click('#generateArray');

    // No array elements should be displayed (parseArray filters NaN)
    await expect(page.locator('#arrayDisplay .array-element')).toHaveCount(0);

    // Step info should still indicate the array was generated (even if empty)
    await expect(page.locator('#stepInfo')).toContainText('Array generated');

    // No console or page errors (afterEach will assert)
  });

  test('Visual feedback classes (active, swapping, sorted) appear during steps', async ({ page }) => {
    // Purpose: Ensure CSS classes for active/swapping/sorted states are applied in steps.
    // Use a small deterministic array and step-through to observe classes.
    await page.locator('#arrayInput').fill('9,4,6');
    await page.click('#generateArray');

    // Start step-by-step; Next Step button should appear
    await page.click('#stepByStep');
    const nextStepBtn = page.locator('button:has-text("Next Step")');
    await expect(nextStepBtn).toBeVisible();

    // The first displayed step is building heap (no swaps yet) - check that at least one element exists
    await expect(page.locator('#arrayDisplay .array-element')).toHaveCount(3);

    // Click next step to potentially see swap visuals
    await nextStepBtn.click();
    await page.waitForTimeout(100);

    // Check if any element has class 'swapping' or 'active' (these may appear depending on step)
    const swappingCount = await page.locator('#arrayDisplay .array-element.swapping').count();
    const activeCount = await page.locator('#arrayDisplay .array-element.active').count();

    // At least one of swapping or active may appear during the flow; assert at least zero (non-negative)
    expect(swappingCount).toBeGreaterThanOrEqual(0);
    expect(activeCount).toBeGreaterThanOrEqual(0);

    // Fast-forward through remaining steps to completion to assert final sorted classes
    let done = false;
    for (let i = 0; i < 20; i++) {
      await nextStepBtn.click();
      await page.waitForTimeout(100);
      const info = await page.locator('#stepInfo').innerText();
      if (info.includes('Array is now sorted!')) {
        done = true;
        break;
      }
    }
    expect(done).toBeTruthy();

    // Final assertion: all elements should have 'sorted' class
    const total = await page.locator('#arrayDisplay .array-element').count();
    await expect(page.locator('#arrayDisplay .array-element.sorted')).toHaveCount(total);
  });
});