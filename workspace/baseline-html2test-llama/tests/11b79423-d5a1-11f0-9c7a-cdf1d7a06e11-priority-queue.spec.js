import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b79423-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe('Priority Queue App (11b79423-d5a1-11f0-9c7a-cdf1d7a06e11)', () => {

  // Test that the page loads and the static DOM is present even if the script fails.
  test('Initial load: page title and form controls are present', async ({ page }) => {
    // Collect console errors and page errors that occur during load
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message || String(err));
    });

    // Navigate to the page
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Verify the document title is present and correct
    await expect(page).toHaveTitle('Priority Queue');

    // Verify form controls exist and are visible
    const priorityInput = page.locator('#priority');
    const elementsInput = page.locator('#elements');
    const operationSelect = page.locator('#operation');
    const submitButton = page.locator('button[type="submit"]');
    const queueDiv = page.locator('#priority-queue');

    await expect(priorityInput).toBeVisible();
    await expect(elementsInput).toBeVisible();
    await expect(operationSelect).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(queueDiv).toBeVisible();

    // The priority-queue div should initially be empty (script expected to update it)
    const queueText = await queueDiv.innerText();
    // It may be empty string or whitespace - assert it does not contain expected queue text format
    expect(queueText.trim()).toBe('');

    // Assert that at least one page error happened during load (the app script is known to throw)
    expect(pageErrors.length).toBeGreaterThan(0);

    // Confirm that one of the console errors mentions "PriorityQueue" indicating the constructor was not found
    const hasPriorityQueueError = consoleErrors.some(msg => msg.includes('PriorityQueue')) ||
                                  pageErrors.some(msg => msg.includes('PriorityQueue'));
    expect(hasPriorityQueueError).toBeTruthy();
  });

  // Test that user can interact with inputs (typing/selecting) even if script setup failed.
  test('Form inputs accept values and reflect user input', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    const priorityInput1 = page.locator('#priority');
    const elementsInput1 = page.locator('#elements');
    const operationSelect1 = page.locator('#operation');

    // Enter numeric values into inputs and verify their values
    await priorityInput.fill('5');
    await elementsInput.fill('42');

    await expect(priorityInput).toHaveValue('5');
    await expect(elementsInput).toHaveValue('42');

    // Change the operation select and verify selection works
    await operationSelect.selectOption('insert');
    await expect(operationSelect).toHaveValue('insert');

    await operationSelect.selectOption('delete');
    await expect(operationSelect).toHaveValue('delete');

    // Even though the interactive script likely failed, the form controls are still manipulable
  });

  // Test that submitting the form triggers a navigation (default submit) because the script's submit handler likely did not attach.
  test('Submitting the form performs default navigation because submit handler failed to attach', async ({ page }) => {
    // Prepare to capture page errors and console errors for both pre- and post-navigation
    const preConsoleErrors = [];
    const prePageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') preConsoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      prePageErrors.push(err.message || String(err));
    });

    // Load the page
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Fill the form fields
    await page.fill('#priority', '1');
    await page.fill('#elements', '10');
    await page.selectOption('#operation', 'insert');

    // Attempt to submit the form and expect a navigation (because the JS handler that would prevent default likely failed)
    let navigated = false;
    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 3000 }),
        page.click('button[type="submit"]'),
      ]);
      navigated = true;
    } catch (e) {
      // If waitForNavigation times out, it suggests the submit handler was attached and prevented default.
      navigated = false;
    }

    // We expect navigation to have occurred because the script has an early ReferenceError and never attaches the listener
    expect(navigated).toBeTruthy();

    // After navigation the page will have reloaded; set up listeners to capture the ensuing errors
    const postConsoleErrors = [];
    const postPageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') postConsoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      postPageErrors.push(err.message || String(err));
    });

    // Wait a short moment for errors to surface after reload
    await page.waitForTimeout(200);

    // There should be errors after reload as well
    const hadPreError = preConsoleErrors.some(m => m.includes('PriorityQueue')) || prePageErrors.some(m => m.includes('PriorityQueue'));
    const hadPostError = postConsoleErrors.some(m => m.includes('PriorityQueue')) || postPageErrors.some(m => m.includes('PriorityQueue'));

    expect(hadPreError || hadPostError).toBeTruthy();

    // Finally verify that the priority-queue div still has no updated content because the app script did not successfully run
    const queueDiv1 = page.locator('#priority-queue');
    const queueText1 = await queueDiv.innerText();
    expect(queueText.trim()).toBe('');
  });

  // Test the application's error behavior explicitly: assert that a ReferenceError occurs mentioning PriorityQueue
  test('Page throws a ReferenceError about PriorityQueue on load', async ({ page }) => {
    const pageErrors1 = [];
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    const consoleErrors1 = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Wait briefly to allow the error to be emitted
    await page.waitForTimeout(200);

    // There should be at least one page error and/or console error
    expect(pageErrors.length + consoleErrors.length).toBeGreaterThan(0);

    // Check that one of the reported errors mentions "PriorityQueue"
    const errorMessages = [
      ...pageErrors.map(e => (e && (e.message || String(e))) || String(e)),
      ...consoleErrors
    ];
    const found = errorMessages.some(msg => msg.includes('PriorityQueue'));
    expect(found).toBeTruthy();
  });

  // Accessibility/visibility check - labels are associated and inputs are focusable
  test('Accessibility: form labels exist and inputs are focusable', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Ensure labels exist and reference the inputs by id
    const priorityLabel = page.locator('label[for="priority"]');
    const elementsLabel = page.locator('label[for="elements"]');
    const operationLabel = page.locator('label[for="operation"]');

    await expect(priorityLabel).toHaveText(/Priority:/);
    await expect(elementsLabel).toHaveText(/Elements:/);
    await expect(operationLabel).toHaveText(/Operation:/);

    // Ensure inputs can be focused
    await page.focus('#priority');
    await expect(page.locator('#priority')).toBeFocused();

    await page.focus('#elements');
    await expect(page.locator('#elements')).toBeFocused();

    await page.focus('#operation');
    await expect(page.locator('#operation')).toBeFocused();
  });

});