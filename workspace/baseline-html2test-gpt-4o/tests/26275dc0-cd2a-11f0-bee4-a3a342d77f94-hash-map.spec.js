import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/26275dc0-cd2a-11f0-bee4-a3a342d77f94.html';

test.describe('Hash Map Example - 26275dc0-cd2a-11f0-bee4-a3a342d77f94', () => {
  // Per-test holders for runtime observations
  let consoleMessages;
  let pageErrors;
  let dialogMessages;

  // Set up listeners and navigate to the page before each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];
    dialogMessages = [];

    // Capture console messages for later assertions
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (unhandled exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Capture dialogs (alerts) and automatically accept them,
    // but record their texts so tests can assert alert behavior.
    page.on('dialog', async dialog => {
      dialogMessages.push(dialog.message());
      await dialog.accept();
    });

    // Load the application exactly as-is
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // No special teardown required; listeners are bound to the page instance and cleared with it.
    // But we assert that there were no unexpected page errors or console errors during the test run.
    // This helps catch runtime exceptions introduced by the page.
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(pageErrors.length, `Expected no runtime page errors, got: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Expected no console error messages, got: ${consoleErrors.map(c => c.text).join('; ')}`).toBe(0);
  });

  // Page object helper to simplify access to controls
  const pageObjects = {
    keyInput: page => page.locator('#key'),
    valueInput: page => page.locator('#value'),
    addButton: page => page.getByRole('button', { name: 'Add to Hash Map' }),
    searchInput: page => page.locator('#searchKey'),
    getButton: page => page.getByRole('button', { name: 'Get from Hash Map' }),
    output: page => page.locator('#output'),
    heading: page => page.locator('h1'),
  };

  test('Initial load shows expected elements and default state', async ({ page }) => {
    // Verify main title is present
    await expect(pageObjects.heading(page)).toHaveText('Simple Hash Map Example');

    // Verify inputs and buttons are visible
    await expect(pageObjects.keyInput(page)).toBeVisible();
    await expect(pageObjects.valueInput(page)).toBeVisible();
    await expect(pageObjects.searchInput(page)).toBeVisible();
    await expect(pageObjects.addButton(page)).toBeVisible();
    await expect(pageObjects.getButton(page)).toBeVisible();

    // Verify placeholders and required attributes
    await expect(pageObjects.keyInput(page)).toHaveAttribute('placeholder', 'Enter Key');
    await expect(pageObjects.valueInput(page)).toHaveAttribute('placeholder', 'Enter Value');
    await expect(pageObjects.searchInput(page)).toHaveAttribute('placeholder', 'Enter Key to Search');
    await expect(pageObjects.keyInput(page)).toHaveAttribute('required', '');
    await expect(pageObjects.valueInput(page)).toHaveAttribute('required', '');

    // Output should be empty on initial load
    await expect(pageObjects.output(page)).toHaveText('');
  });

  test('Adding a single entry updates the Hash Map display', async ({ page }) => {
    // Fill key and value, click add, and assert output updates correctly.
    await pageObjects.keyInput(page).fill('apple');
    await pageObjects.valueInput(page).fill('red');
    await pageObjects.addButton(page).click();

    // The output should reflect the new entry
    await expect(pageObjects.output(page)).toHaveText(/Hash Map:.*apple: red/);

    // Ensure input values remain (implementation does not clear them)
    await expect(pageObjects.keyInput(page)).toHaveValue('apple');
    await expect(pageObjects.valueInput(page)).toHaveValue('red');
  });

  test('Adding multiple entries shows both entries in display in insertion order', async ({ page }) => {
    // Add first entry
    await pageObjects.keyInput(page).fill('a');
    await pageObjects.valueInput(page).fill('1');
    await pageObjects.addButton(page).click();

    // Add second entry
    await pageObjects.keyInput(page).fill('b');
    await pageObjects.valueInput(page).fill('2');
    await pageObjects.addButton(page).click();

    // Check display contains both entries, expecting insertion order "a: 1, b: 2"
    const out = await pageObjects.output(page).innerText();
    expect(out).toContain('Hash Map:');
    expect(out).toContain('a: 1');
    expect(out).toContain('b: 2');

    // Check ordering as string (exact ordering is implementation dependent,
    // but modern JS objects preserve insertion order).
    expect(out).toMatch(/a: 1\s*,\s*b: 2/);
  });

  test('Getting an existing entry displays the search result and the full hash map', async ({ page }) => {
    // Prepare data
    await pageObjects.keyInput(page).fill('color');
    await pageObjects.valueInput(page).fill('blue');
    await pageObjects.addButton(page).click();

    // Search for the existing key
    await pageObjects.searchInput(page).fill('color');
    await pageObjects.getButton(page).click();

    // Output should show Search Result and Hash Map
    const text = await pageObjects.output(page).innerText();
    expect(text).toContain('Search Result: blue');
    expect(text).toContain('Hash Map:');
    expect(text).toContain('color: blue');
  });

  test('Getting a non-existing key shows "Key not found" in search result', async ({ page }) => {
    // Ensure the map doesn't have the key
    await pageObjects.searchInput(page).fill('missingKey');
    await pageObjects.getButton(page).click();

    // Expect "Key not found" in the Search Result
    const text = await pageObjects.output(page).innerText();
    expect(text).toContain('Search Result: Key not found');
    // Hash Map should still be displayed (possibly empty)
    expect(text).toContain('Hash Map:');
  });

  test('Adding with empty key or value triggers an alert and does not modify the map', async ({ page }) => {
    // Ensure inputs are empty and click add to trigger alert
    await pageObjects.keyInput(page).fill('');
    await pageObjects.valueInput(page).fill('');
    await pageObjects.addButton(page).click();

    // An alert should have been shown and captured
    expect(dialogMessages.length).toBeGreaterThanOrEqual(1);
    expect(dialogMessages[dialogMessages.length - 1]).toBe('Both key and value are required.');

    // Output should remain empty (no entries added)
    await expect(pageObjects.output(page)).toHaveText('');
  });

  test('Searching with empty key triggers an alert and does not modify the map', async ({ page }) => {
    // Ensure search input is empty and click get to trigger alert
    await pageObjects.searchInput(page).fill('');
    await pageObjects.getButton(page).click();

    // An alert should have been shown and captured
    expect(dialogMessages.length).toBeGreaterThanOrEqual(1);
    expect(dialogMessages[dialogMessages.length - 1]).toBe('Please enter a key to search.');

    // Output should remain unchanged (empty)
    await expect(pageObjects.output(page)).toHaveText('');
  });

  test('Overwriting an existing key updates the stored value', async ({ page }) => {
    // Add initial entry
    await pageObjects.keyInput(page).fill('dup');
    await pageObjects.valueInput(page).fill('first');
    await pageObjects.addButton(page).click();

    // Overwrite same key with new value
    await pageObjects.keyInput(page).fill('dup');
    await pageObjects.valueInput(page).fill('second');
    await pageObjects.addButton(page).click();

    // Expect the latest value to appear in the display
    const out = await pageObjects.output(page).innerText();
    expect(out).toContain('dup: second');
    // Ensure 'first' is not present as the value for 'dup'
    expect(out).not.toContain('dup: first');
  });

  test('No unexpected runtime errors or console error messages occurred during interactions', async ({ page }) => {
    // This test performs a few typical interactions and then verifies runtime diagnostics.
    // Add an entry
    await pageObjects.keyInput(page).fill('x');
    await pageObjects.valueInput(page).fill('y');
    await pageObjects.addButton(page).click();

    // Search for it
    await pageObjects.searchInput(page).fill('x');
    await pageObjects.getButton(page).click();

    // Confirm expected output content
    const txt = await pageObjects.output(page).innerText();
    expect(txt).toContain('Search Result: y');
    expect(txt).toContain('Hash Map:');

    // Assert there were no page errors or console errors captured (this is asserted again in afterEach)
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});