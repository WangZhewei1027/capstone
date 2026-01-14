import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6f502-d5a1-11f0-80b9-e1f86cea383f.html';

test.describe('Counting Sort - UI and runtime behavior (90f6f502-d5a1-11f0-80b9-e1f86cea383f)', () => {
  // Utility to collect page errors and console messages for assertions
  async function attachCollectors(page) {
    const pageErrors = [];
    const consoleMessages = [];

    page.on('pageerror', (err) => {
      // Capture any uncaught exceptions on the page
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // Capture console messages for inspection
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    return { pageErrors, consoleMessages };
  }

  test('loads page and shows basic UI elements; shows alert on load when inputs are empty', async ({ page }) => {
    // Collect runtime errors and console messages
    const { pageErrors, consoleMessages } = await attachCollectors(page);

    // Prepare to capture the alert that runs immediately on page load.
    let dialogMessage = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      // Accept the alert so the page can continue
      await dialog.accept();
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Verify main heading and descriptive paragraph are present
    await expect(page.locator('h1')).toHaveText('Counting Sort');
    await expect(page.locator('p')).toContainText('Counting sort');

    // Verify the form controls exist and are visible
    const textarea = page.locator('#input-array');
    const numberInput = page.locator('#max-value');
    const sortButton = page.locator('#sort-button');
    const output = page.locator('#output');
    const form = page.locator('#counting-sort-form');

    await expect(form).toBeVisible();
    await expect(textarea).toBeVisible();
    await expect(numberInput).toBeVisible();
    await expect(sortButton).toBeVisible();

    // Because the inline script runs on load and checks for empty inputs, it should have shown an alert
    // Assert that the alert was triggered with the expected message
    expect(dialogMessage).toBe('Please enter the array and the maximum value');

    // The script returned early on load (due to missing inputs), so the output should remain empty
    await expect(output).toHaveText('');

    // There should be no unexpected page errors thrown during the normal early-return path
    expect(pageErrors.length).toBe(0);

    // Log at least that console messages were captured (not required to be non-empty)
    // This assertion is not strict; it's primarily to ensure we can inspect console messages
    expect(Array.isArray(consoleMessages)).toBeTruthy();
  });

  test('filling inputs and clicking Sort does not cause sorting because the implementation executes only on load; form submission reloads and re-triggers validation alert', async ({ page }) => {
    // Collect runtime errors and console messages
    const { pageErrors, consoleMessages } = await attachCollectors(page);

    // Capture the initial alert on first load
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Load the page
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Fill the inputs AFTER the initial script has already run and returned.
    // Note: Because the implementation runs only at load time, filling these inputs now will not trigger the sorting logic.
    await page.fill('#input-array', '3 1 2');
    await page.fill('#max-value', '3');

    // Add a listener for the dialog that will appear if the page reloads and the script runs again.
    // Clicking the button inside the form will submit the form (button defaults to type="submit") and thus will navigate.
    let reloadDialogMessage = null;
    page.once('dialog', async (dialog) => {
      reloadDialogMessage = dialog.message();
      await dialog.accept();
    });

    // Clicking the sort button will submit the form. Since it's a plain static HTML file, this typically triggers a navigation/reload.
    // Wait for navigation to complete to observe post-submit state.
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      page.click('#sort-button'),
    ]);

    // After navigation, the inline script executes again during the reload.
    // Because the reloaded page still reads element values from the freshly loaded DOM (which are blank in static HTML),
    // it will likely show the same alert again indicating missing inputs.
    expect(reloadDialogMessage).toBe('Please enter the array and the maximum value');

    // After reload the output should still be empty because the page's script returned early again
    await expect(page.locator('#output')).toHaveText('');

    // Verify there were no uncaught runtime exceptions during this interaction
    expect(pageErrors.length).toBe(0);

    // Ensure form controls are present again after reload
    await expect(page.locator('#input-array')).toBeVisible();
    await expect(page.locator('#max-value')).toBeVisible();

    // The console messages array should be accessible for debugging if needed
    expect(Array.isArray(consoleMessages)).toBeTruthy();
  });

  test('form and labels are accessible and inputs are editable; output remains unchanged when interacting due to script design', async ({ page }) => {
    // Collect runtime errors and console messages
    const { pageErrors } = await attachCollectors(page);

    // Handle alert on page load
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Load the page
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Accessibility checks: labels are connected to inputs via for attributes
    const inputArrayLabel = page.locator('label[for="input-array"]');
    const maxValueLabel = page.locator('label[for="max-value"]');

    await expect(inputArrayLabel).toBeVisible();
    await expect(inputArrayLabel).toContainText('Enter the array elements:');

    await expect(maxValueLabel).toBeVisible();
    await expect(maxValueLabel).toContainText('Enter the maximum value in the array:');

    // Verify that the inputs can be focused and typed into
    const textarea1 = page.locator('#input-array');
    const numberInput1 = page.locator('#max-value');

    await textarea.focus();
    await textarea.fill('5 2'); // editable
    await expect(textarea).toHaveValue('5 2');

    await numberInput.focus();
    await numberInput.fill('5');
    await expect(numberInput).toHaveValue('5');

    // Because the implementation runs only on load, typing into fields after load does not update the output
    await expect(page.locator('#output')).toHaveText('');

    // There should be no unexpected uncaught exceptions recorded during these interactions
    expect(pageErrors.length).toBe(0);
  });

  test('verifies that clicking Sort without a dialog handler would show an alert (confirm behavior by intercepting dialog)', async ({ page }) => {
    // Attach collectors
    const { pageErrors } = await attachCollectors(page);

    // Set up a dialog listener for the initial load
    page.once('dialog', async (dialog) => {
      // Intentionally dismiss the dialog this time to simulate different user action
      await dialog.dismiss();
    });

    // Load the page
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Now fill inputs and attempt to submit; because the page reloads and its script performs the validation immediately,
    // a dialog will appear on reload. We'll accept it to allow execution flow to continue.
    await page.fill('#input-array', '1 2');
    await page.fill('#max-value', '2');

    // Prepare to capture the reload alert
    let reloadDialogSeen = false;
    page.once('dialog', async (dialog) => {
      reloadDialogSeen = true;
      await dialog.accept();
    });

    // Submit the form (button is a submit button) and wait for the page to reload
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      page.click('#sort-button'),
    ]);

    // Assert that the reload triggered the validation alert again
    expect(reloadDialogSeen).toBe(true);

    // Output should remain empty because of the script early return behavior
    await expect(page.locator('#output')).toHaveText('');

    // No unexpected page errors
    expect(pageErrors.length).toBe(0);
  });
});