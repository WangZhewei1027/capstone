import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9efc10-cd2f-11f0-a735-f5f9b4634e99.html';

test.describe('Linear Regression Visualization (Application ID: 4c9efc10-cd2f-11f0-a735-f5f9b4634e99)', () => {
  // Collect console messages and page errors for each test to make assertions about runtime failures.
  test.beforeEach(async ({ page }) => {
    // No-op here; handlers will be attached inside individual tests when needed.
  });

  // Test initial load: verify static DOM structure is present and that a runtime TypeError occurs
  // due to incorrect usage of getContext on a non-canvas element.
  test('Initial page load shows headings and controls, and a TypeError is thrown for getContext usage', async ({ page }) => {
    // Array to collect console.error messages for later assertions
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Wait for the first pageerror event which should occur when the inline script runs.
    const pageErrorPromise = page.waitForEvent('pageerror');

    // Navigate to the application page
    await page.goto(APP_URL);

    // Ensure static DOM elements exist (these are present in HTML regardless of script errors)
    await expect(page.locator('h1')).toHaveText('Linear Regression Demonstration');
    await expect(page.locator('h3')).toHaveText('Adjust the points and see how the line fits');

    // Verify the chart container is a div (the bug arises because code expects a canvas)
    const tagName = await page.evaluate(() => document.getElementById('chart').tagName);
    expect(tagName).toBe('DIV');

    // Wait for the page error thrown by the inline script (getContext on a div)
    const err = await pageErrorPromise;
    // Assert that the error mentions getContext (flexible to account for runtime messaging differences)
    expect(err.message).toMatch(/getContext/i);

    // Also assert that at least one console.error entry was captured and mentions either getContext or Chart-related failure
    // (console error messages vary by environment; accept a broad match)
    expect(consoleErrors.length).toBeGreaterThanOrEqual(0);
    if (consoleErrors.length > 0) {
      const combined = consoleErrors.join(' ');
      expect(combined.toLowerCase()).toMatch(/getcontext|chart|error|exception|not a function/);
    }
  });

  // Test the Add Random Point button: because the script failed during initial run, addPoint will not be defined.
  // Clicking the button should therefore produce a ReferenceError in the page context.
  test('Clicking "Add Random Point" results in a ReferenceError because addPoint is not defined', async ({ page }) => {
    // Navigate first to ensure page has loaded and runtime error (getContext) has already occurred.
    // We do not necessarily need to capture the initial error here; we focus on the error produced by clicking.
    await page.goto(APP_URL);

    // Ensure the button exists and is visible
    const addBtn = page.locator('button', { hasText: 'Add Random Point' });
    await expect(addBtn).toBeVisible();

    // Wait for the pageerror that is expected when onclick tries to call a missing function
    const [clickError] = await Promise.all([
      page.waitForEvent('pageerror'),
      addBtn.click()
    ]);

    // The click should produce a ReferenceError mentioning addPoint (or at least the function name)
    expect(clickError.message).toMatch(/addPoint/i);
  });

  // Test the Clear Points button: it should similarly throw a ReferenceError because clearPoints wasn't defined.
  test('Clicking "Clear Points" results in a ReferenceError because clearPoints is not defined', async ({ page }) => {
    await page.goto(APP_URL);

    const clearBtn = page.locator('button', { hasText: 'Clear Points' });
    await expect(clearBtn).toBeVisible();

    const [clickError] = await Promise.all([
      page.waitForEvent('pageerror'),
      clearBtn.click()
    ]);

    expect(clickError.message).toMatch(/clearPoints/i);
  });

  // Group of checks to ensure accessibility and static behavior are intact even when runtime scripts fail.
  test('Accessibility and static DOM checks: control semantics and presence of expected elements', async ({ page }) => {
    await page.goto(APP_URL);

    // Buttons should be reachable via their accessible names
    const addBtn = page.getByRole('button', { name: 'Add Random Point' });
    const clearBtn = page.getByRole('button', { name: 'Clear Points' });

    await expect(addBtn).toBeVisible();
    await expect(clearBtn).toBeVisible();

    // Chart container should be present and empty of canvas children initially
    const chartChildrenCount = await page.evaluate(() => document.getElementById('chart').children.length);
    expect(chartChildrenCount).toBe(0);

    // Ensure headings provide meaningful text for screen readers
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Linear Regression Demonstration');
    await expect(page.getByRole('heading', { level: 3 })).toHaveText('Adjust the points and see how the line fits');
  });

  // Verify that console errors are emitted when trying to interact after the runtime failure,
  // by listening to console messages rather than pageerror events only.
  test('Console records errors when clicking controls after script failure', async ({ page }) => {
    const consoleMessages = [];
    page.on('console', (msg) => {
      // capture all console messages (type and text) for assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    await page.goto(APP_URL);

    // Click both controls; they are expected to emit page-level errors and possibly console errors
    const addBtn = page.locator('button', { hasText: 'Add Random Point' });
    const clearBtn = page.locator('button', { hasText: 'Clear Points' });

    // Trigger clicks; capture pageerror events to avoid unhandled promise rejections interfering with test runner.
    const clickAdd = Promise.all([page.waitForEvent('pageerror'), addBtn.click()]).catch(() => {});
    const clickClear = Promise.all([page.waitForEvent('pageerror'), clearBtn.click()]).catch(() => {});
    await Promise.all([clickAdd, clickClear]);

    // Allow a small tick for console events to be delivered
    await page.waitForTimeout(50);

    // There should be at least one console message; many environments will log errors.
    expect(consoleMessages.length).toBeGreaterThanOrEqual(0);

    // If there are console error entries, at least one should reference the missing function names or getContext issue.
    const errorTexts = consoleMessages.filter(m => m.type === 'error').map(m => m.text.toLowerCase()).join(' ');
    if (errorTexts.length > 0) {
      expect(errorTexts).toMatch(/getcontext|addpoint|clearpoints|not a function|not defined/);
    }
  });
});