import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b6f7e0-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe('Array Demo (11b6f7e0-d5a1-11f0-9c7a-cdf1d7a06e11) - UI and state tests', () => {
  // Attach listeners and navigate before each test so we start from a clean state.
  test.beforeEach(async ({ page }) => {
    // Capture console error messages and page errors for assertions
    page.context()._playwright_console_errors = [];
    page.context()._playwright_page_errors = [];

    page.on('console', msg => {
      // Store only console error messages for later assertions
      if (msg.type() === 'error') {
        page.context()._playwright_console_errors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    page.on('pageerror', error => {
      // Store uncaught page errors
      page.context()._playwright_page_errors.push({
        message: error.message,
        stack: error.stack,
      });
    });

    await page.goto(APP_URL);
  });

  // Helper to access commonly used elements via a page object pattern
  const getElements = async (page) => {
    const input = await page.locator('#input');
    const addBtn = await page.locator('#add-btn');
    const clearBtn = await page.locator('#clear-btn');
    const arrayDiv = await page.locator('#array');
    const title = await page.locator('h1');
    return { input, addBtn, clearBtn, arrayDiv, title };
  };

  test('Initial load: page elements are visible and array is empty', async ({ page }) => {
    // Purpose: Verify initial UI and default state on first load
    const { input, addBtn, clearBtn, arrayDiv, title } = await getElements(page);

    // Title should be present and correct
    await expect(title).toBeVisible();
    await expect(title).toHaveText('Array Demo');

    // Input and buttons should be visible and enabled
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Enter elements to create an array');
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeEnabled();
    await expect(clearBtn).toBeVisible();
    await expect(clearBtn).toBeEnabled();

    // Array container should be empty initially
    await expect(arrayDiv).toBeVisible();
    await expect(arrayDiv).toHaveText('', { timeout: 100 }); // empty string expected

    // Verify no console errors or uncaught page errors occurred on load
    const consoleErrors = page.context()._playwright_console_errors;
    const pageErrors = page.context()._playwright_page_errors;
    expect(Array.isArray(consoleErrors)).toBeTruthy();
    expect(Array.isArray(pageErrors)).toBeTruthy();
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Add element: clicking Add Element appends item and clears input', async ({ page }) => {
    // Purpose: Ensure addElement works - DOM updates and input cleared
    const { input, addBtn, arrayDiv } = await getElements(page);

    await input.fill('apple');
    await addBtn.click();

    // After adding, input should be cleared
    await expect(input).toHaveValue('');

    // Array should have one child with correct text '1. apple'
    const item = arrayDiv.locator('div').nth(0);
    await expect(item).toHaveText('1. apple');
    await expect(arrayDiv.locator('div')).toHaveCount(1);

    // Ensure no errors were logged during the interaction
    expect(page.context()._playwright_console_errors.length).toBe(0);
    expect(page.context()._playwright_page_errors.length).toBe(0);
  });

  test('Add multiple elements: maintains insertion order and correct indexing', async ({ page }) => {
    // Purpose: Validate ordering and numbering when multiple elements are added
    const { input, addBtn, arrayDiv } = await getElements(page);

    await input.fill('first');
    await addBtn.click();

    await input.fill('second');
    await addBtn.click();

    await input.fill('third');
    await addBtn.click();

    const items = arrayDiv.locator('div');
    await expect(items).toHaveCount(3);

    await expect(items.nth(0)).toHaveText('1. first');
    await expect(items.nth(1)).toHaveText('2. second');
    await expect(items.nth(2)).toHaveText('3. third');

    // No console or page errors should have occurred
    expect(page.context()._playwright_console_errors.length).toBe(0);
    expect(page.context()._playwright_page_errors.length).toBe(0);
  });

  test('Clear array: Clear Array button empties the displayed list and resets state', async ({ page }) => {
    // Purpose: Ensure clearArray removes all elements from the DOM
    const { input, addBtn, clearBtn, arrayDiv } = await getElements(page);

    // Add two items first
    await input.fill('one');
    await addBtn.click();
    await input.fill('two');
    await addBtn.click();

    await expect(arrayDiv.locator('div')).toHaveCount(2);

    // Click clear and verify empty
    await clearBtn.click();
    await expect(arrayDiv.locator('div')).toHaveCount(0);
    await expect(arrayDiv).toHaveText('', { timeout: 100 });

    // Clicking clear again when empty should not throw or change state
    await clearBtn.click();
    await expect(arrayDiv.locator('div')).toHaveCount(0);

    // No runtime errors occurred
    expect(page.context()._playwright_console_errors.length).toBe(0);
    expect(page.context()._playwright_page_errors.length).toBe(0);
  });

  test('Edge cases: adding empty string and whitespace-only strings are allowed and rendered', async ({ page }) => {
    // Purpose: Verify behavior when adding empty string and whitespace-only strings
    const { input, addBtn, arrayDiv, clearBtn } = await getElements(page);

    // Add an empty string (input left blank)
    await input.fill(''); // explicit
    await addBtn.click();

    // The display should show "1. " (index + '. ' + element which is empty)
    await expect(arrayDiv.locator('div').nth(0)).toHaveText('1. ');

    // Clear for next check
    await clearBtn.click();

    // Add a whitespace-only string
    await input.fill('   '); // three spaces
    await addBtn.click();

    // The text content should contain the spaces after the prefix. We assert startsWith prefix and contains spaces.
    const whitespaceItem = arrayDiv.locator('div').nth(0);
    const text = await whitespaceItem.textContent();
    // Expect prefix '1.' and then at least one space in the remainder
    expect(text.startsWith('1.')).toBeTruthy();
    // Remaining part after '1. ' should include the spaces we entered
    // Because textContent preserves spaces, there should be at least one space character after '1.'
    expect(/\s{1,}/.test(text.replace(/^1\./, ''))).toBeTruthy();

    // No runtime errors occurred during these edge interactions
    expect(page.context()._playwright_console_errors.length).toBe(0);
    expect(page.context()._playwright_page_errors.length).toBe(0);
  });

  test('Keyboard accessibility: pressing Enter in the input does not add an item (no enter handler present)', async ({ page }) => {
    // Purpose: Validate keyboard behavior: form submission via Enter is not implemented, so nothing should be added
    const { input, arrayDiv } = await getElements(page);

    await input.focus();
    // Press Enter - application only responds to Add button, so nothing should be added
    await input.press('Enter');

    await expect(arrayDiv.locator('div')).toHaveCount(0);

    // Also ensure no errors were triggered by keyboard interaction
    expect(page.context()._playwright_console_errors.length).toBe(0);
    expect(page.context()._playwright_page_errors.length).toBe(0);
  });

  test('Robustness: rapid add/clear operations do not produce runtime errors', async ({ page }) => {
    // Purpose: Stress test quick user interactions to ensure no uncaught exceptions
    const { input, addBtn, clearBtn, arrayDiv } = await getElements(page);

    // Rapidly add items
    for (let i = 0; i < 5; i++) {
      await input.fill(`item-${i}`);
      await addBtn.click();
    }
    await expect(arrayDiv.locator('div')).toHaveCount(5);

    // Rapidly clear and add again multiple times
    for (let cycle = 0; cycle < 3; cycle++) {
      await clearBtn.click();
      await expect(arrayDiv.locator('div')).toHaveCount(0);
      await input.fill(`cycle-${cycle}`);
      await addBtn.click();
      await expect(arrayDiv.locator('div')).toHaveCount(1);
    }

    // Final state should reflect last addition
    await expect(arrayDiv.locator('div').nth(0)).toHaveText('1. cycle-2');

    // Ensure no console errors or uncaught page errors occurred during rapid operations
    expect(page.context()._playwright_console_errors.length).toBe(0);
    expect(page.context()._playwright_page_errors.length).toBe(0);
  });

  test('Capture and report any console or page errors encountered during typical flows', async ({ page }) => {
    // Purpose: Centralized assertion that no runtime errors are emitted in normal use cases.
    // Perform typical scenario: add, add, clear, add
    const { input, addBtn, clearBtn, arrayDiv } = await getElements(page);

    await input.fill('alpha');
    await addBtn.click();
    await input.fill('beta');
    await addBtn.click();
    await clearBtn.click();
    await input.fill('gamma');
    await addBtn.click();

    // Verify final content correctness
    await expect(arrayDiv.locator('div')).toHaveCount(1);
    await expect(arrayDiv.locator('div').nth(0)).toHaveText('1. gamma');

    // Assert there were no console error messages or uncaught page errors during the scenario
    const consoleErrors1 = page.context()._playwright_console_errors;
    const pageErrors1 = page.context()._playwright_page_errors;
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});