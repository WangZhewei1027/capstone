import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f658c2-d5a1-11f0-80b9-e1f86cea383f.html';

test.describe('Queue application (90f658c2-d5a1-11f0-80b9-e1f86cea383f)', () => {
  let consoleErrors;
  let pageErrors;
  let dialogs;

  // Setup: capture console errors, page errors, and dialogs for each test.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    dialogs = [];

    // Capture console.error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught page errors (e.g., TypeError during script execution)
    page.on('pageerror', err => {
      // err is an Error
      pageErrors.push(err.message || String(err));
    });

    // Capture dialogs (alerts) and automatically accept them to allow test flow to continue
    page.on('dialog', async dialog => {
      dialogs.push(dialog.message());
      await dialog.accept();
    });

    // Navigate to the page under test
    await page.goto(APP_URL);
  });

  // Teardown: no special teardown required, Playwright handles page lifecycle.

  test.describe('Initial load and runtime errors', () => {
    test('page loads with expected structure and empty queue', async ({ page }) => {
      // Verify the page title and header
      await expect(page).toHaveTitle(/Queue/);
      const header = page.locator('h1');
      await expect(header).toHaveText('Queue');

      // Verify inputs and buttons are present
      await expect(page.locator('#add')).toBeVisible();
      await expect(page.locator('#add-btn')).toBeVisible();

      // The remove input has a problematic id ('remove-btn' is the input)
      await expect(page.locator('#remove-btn')).toBeVisible();
      // There is a remove button with id 'remove-btn-btn' in the HTML
      await expect(page.locator('#remove-btn-btn')).toBeVisible();

      // Verify the queue-items container starts empty
      const itemsHtml = await page.locator('#queue-items').innerHTML();
      expect(itemsHtml.trim()).toBe('');

      // The application contains several implementation errors that cause runtime exceptions.
      // Those errors should be captured by the pageerror handler registered in beforeEach.
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    });

    test('runtime error from broken event listener hookup is reported', async () => {
      // The script attempts to call addEventListener on a null element (nonexistent id 'add-btn-btn'),
      // which causes a TypeError. Assert that such an error was captured.
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);

      // The exact error message can vary across browsers/environments.
      // Check that at least one of the captured page errors mentions addEventListener or null.
      const combined = pageErrors.join(' ').toLowerCase();
      expect(
        /addEventListener|cannot read properties of null|reading 'addEventListener'|null/.test(combined)
      ).toBeTruthy();

      // Also assert that a console.error was emitted (the script runtime error often shows in console)
      // If no console errors are present, at least the pageerror should have been captured above.
      expect(consoleErrors.length + pageErrors.length).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Queue operations and edge cases', () => {
    test('adding single and multiple items updates the DOM with numbered entries', async ({ page }) => {
      // Ensure initial state empty
      await expect(page.locator('#queue-items')).toHaveText('');

      // Add first item
      await page.fill('#add', 'alpha');
      await page.click('#add-btn');

      // After adding, there should be a paragraph with "1. alpha"
      const firstItem = page.locator('#queue-items p').nth(0);
      await expect(firstItem).toHaveText('1. alpha');

      // Add second item
      await page.fill('#add', 'beta');
      await page.click('#add-btn');

      // Verify there are two items numbered correctly
      const items = page.locator('#queue-items p');
      await expect(items).toHaveCount(2);
      await expect(items.nth(0)).toHaveText('1. alpha');
      await expect(items.nth(1)).toHaveText('2. beta');

      // Add an empty string (edge case)
      await page.fill('#add', '');
      await page.click('#add-btn');

      // Adding empty string results in an entry that is blank after the number (implementation allows this)
      await expect(page.locator('#queue-items p')).toHaveCount(3);
      await expect(page.locator('#queue-items p').nth(2)).toHaveText('3. ');
    });

    test('attempting to remove an item triggers alert due to malformed selector and does not remove items', async ({ page }) => {
      // Prepare queue with two items
      await page.fill('#add', 'one');
      await page.click('#add-btn');
      await page.fill('#add', 'two');
      await page.click('#add-btn');

      // Confirm both items present
      await expect(page.locator('#queue-items p')).toHaveCount(2);
      await expect(page.locator('#queue-items p').nth(0)).toHaveText('1. one');
      await expect(page.locator('#queue-items p').nth(1)).toHaveText('2. two');

      // Fill the remove input (has id 'remove-btn' in the HTML)
      await page.fill('#remove-btn', 'one');

      // Click the input element itself because the script (incorrectly) attaches a click handler to the input
      await page.click('#remove-btn');

      // The removal handler attempts to read document.getElementById('remove').value (where 'remove' is the div),
      // resulting in undefined and causing the code to show an alert 'Item not found in the queue.'
      // We captured dialogs in beforeEach; assert the alert message was produced
      expect(dialogs.length).toBeGreaterThanOrEqual(1);
      const foundAlert = dialogs.some(msg => /item not found in the queue/i.test(msg));
      expect(foundAlert).toBeTruthy();

      // Ensure the queue items were not removed because the removal code could not find the item
      await expect(page.locator('#queue-items p')).toHaveCount(2);
      await expect(page.locator('#queue-items p').nth(0)).toHaveText('1. one');
      await expect(page.locator('#queue-items p').nth(1)).toHaveText('2. two');
    });

    test('nonexistent clear button is not present; existing clear button has no effect due to runtime error', async ({ page }) => {
      // The HTML does not contain an element with id 'add-btn-btn' (script attempted to use it and caused an error).
      const addBtnBtnExists = await page.evaluate(() => !!document.getElementById('add-btn-btn'));
      expect(addBtnBtnExists).toBeFalsy();

      // The HTML DOES contain a button with id 'remove-btn-btn', but because the runtime error
      // occurred earlier in the script, the event listener that would have cleared the remove input
      // was never attached. Assert that clicking this button does not clear the input.
      // Set a value in the remove input, click the remove-btn-btn, and assert the value remains.
      await page.fill('#remove-btn', 'keep-me');
      await page.click('#remove-btn-btn');
      const removeInputValue = await page.locator('#remove-btn').inputValue();
      expect(removeInputValue).toBe('keep-me');

      // This demonstrates that handlers expected to be registered later in the script did not run.
    });
  });

  test.describe('Accessibility and basic UI checks', () => {
    test('inputs have placeholders and are focusable', async ({ page }) => {
      // Check placeholder attributes
      await expect(page.locator('#add')).toHaveAttribute('placeholder', 'Add item');
      await expect(page.locator('#remove-btn')).toHaveAttribute('placeholder', 'Remove item');

      // Ensure inputs can be focused sequentially
      await page.focus('#add');
      expect(await page.evaluate(() => document.activeElement.id)).toBe('add');

      await page.focus('#remove-btn');
      expect(await page.evaluate(() => document.activeElement.id)).toBe('remove-btn');
    });
  });
});