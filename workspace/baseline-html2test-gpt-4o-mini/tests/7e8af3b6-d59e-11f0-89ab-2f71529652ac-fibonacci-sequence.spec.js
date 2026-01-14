import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3b6-d59e-11f0-89ab-2f71529652ac.html';

test.describe('Fibonacci Sequence Generator (Application ID: 7e8af3b6-d59e-11f0-89ab-2f71529652ac)', () => {

  // Helper to attach console and page error listeners and return arrays to inspect
  const attachErrorCollectors = (page) => {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      // capture console.error and also any console message of type 'error'
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({ text: msg.text(), location: msg.location() });
        }
      } catch (e) {
        // Guard against any unexpected console inspection errors
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    return { consoleErrors, pageErrors };
  };

  test.beforeEach(async ({ page }) => {
    // Ensure a fresh navigation before each test
    await page.goto('about:blank');
  });

  test('Initial page load: header, input, button and empty result are present and visible', async ({ page }) => {
    // Attach collectors for runtime console and page errors
    const { consoleErrors, pageErrors } = attachErrorCollectors(page);

    // Load the application page exactly as-is
    await page.goto(APP_URL);

    // Verify the main heading is present
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Fibonacci Sequence Generator');

    // Verify the numeric input exists and is visible
    const numberInput = page.locator('input[type="number"]#number');
    await expect(numberInput).toBeVisible();

    // Verify the generate button exists and is visible
    const generateButton = page.locator('button#generate');
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toHaveText('Generate');

    // Verify the result container is present and initially empty
    const resultContainer = page.locator('#resultContainer');
    await expect(resultContainer).toBeVisible();
    await expect(resultContainer).toHaveText(''); // expecting empty on initial load

    // Verify label is associated with the input for accessibility
    const label = page.locator('label[for="number"]');
    await expect(label).toBeVisible();
    await expect(label).toHaveText('Enter the number of terms:');

    // Assert that no console errors or page errors were emitted during load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Generate 1 term: displays single 0', async ({ page }) => {
    // Check for runtime errors produced by the page
    const { consoleErrors, pageErrors } = attachErrorCollectors(page);

    await page.goto(APP_URL);

    const numberInput1 = page.locator('#number');
    const generateButton1 = page.locator('#generate');
    const result = page.locator('#resultContainer');

    // Enter 1 and click Generate
    await numberInput.fill('1');
    await generateButton.click();

    // Expect the result to display the single Fibonacci term "0"
    await expect(result).toHaveText('Fibonacci Sequence: 0');

    // No runtime errors expected
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Generate 2 terms: displays "0, 1"', async ({ page }) => {
    const { consoleErrors, pageErrors } = attachErrorCollectors(page);

    await page.goto(APP_URL);

    await page.locator('#number').fill('2');
    await page.locator('#generate').click();

    await expect(page.locator('#resultContainer')).toHaveText('Fibonacci Sequence: 0, 1');

    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Generate 5 terms: displays first five Fibonacci numbers', async ({ page }) => {
    const { consoleErrors, pageErrors } = attachErrorCollectors(page);

    await page.goto(APP_URL);

    await page.locator('#number').fill('5');
    await page.locator('#generate').click();

    // Expected sequence: 0, 1, 1, 2, 3
    await expect(page.locator('#resultContainer')).toHaveText('Fibonacci Sequence: 0, 1, 1, 2, 3');

    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Negative input: shows "Please enter a positive integer."', async ({ page }) => {
    // This tests the edge-case handling for inputs less than 1
    const { consoleErrors, pageErrors } = attachErrorCollectors(page);

    await page.goto(APP_URL);

    await page.locator('#number').fill('-3');
    await page.locator('#generate').click();

    await expect(page.locator('#resultContainer')).toHaveText('Please enter a positive integer.');

    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Empty input (edge case): behavior when input left blank', async ({ page }) => {
    // The implementation uses parseInt on an empty string (NaN), which leads to specific behavior.
    // This test asserts what the current implementation produces and ensures no runtime errors occur.
    const { consoleErrors, pageErrors } = attachErrorCollectors(page);

    await page.goto(APP_URL);

    // Ensure the input is empty
    await page.locator('#number').fill('');
    await page.locator('#generate').click();

    // Based on the current code, the result becomes "Fibonacci Sequence: " (empty sequence)
    await expect(page.locator('#resultContainer')).toHaveText('Fibonacci Sequence: ');

    // Verify no console or page errors were emitted
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Decimal input: parseInt behavior (e.g., 3.9 -> 3 terms)', async ({ page }) => {
    // Verify parseInt behavior: "3.9" should be parsed as 3 and produce 3 terms
    const { consoleErrors, pageErrors } = attachErrorCollectors(page);

    await page.goto(APP_URL);

    await page.locator('#number').fill('3.9');
    await page.locator('#generate').click();

    // Expect first three Fibonacci numbers: 0, 1, 1
    await expect(page.locator('#resultContainer')).toHaveText('Fibonacci Sequence: 0, 1, 1');

    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Multiple consecutive generations update DOM correctly', async ({ page }) => {
    // Verify that repeated interactions update the result container appropriately each time
    const { consoleErrors, pageErrors } = attachErrorCollectors(page);

    await page.goto(APP_URL);

    const numberInput2 = page.locator('#number');
    const generateButton2 = page.locator('#generate');
    const result1 = page.locator('#resultContainer');

    // First generate 3 terms
    await numberInput.fill('3');
    await generateButton.click();
    await expect(result).toHaveText('Fibonacci Sequence: 0, 1, 1');

    // Then generate 6 terms
    await numberInput.fill('6');
    await generateButton.click();
    // Expected: 0,1,1,2,3,5
    await expect(result).toHaveText('Fibonacci Sequence: 0, 1, 1, 2, 3, 5');

    // Finally, generate 1 term
    await numberInput.fill('1');
    await generateButton.click();
    await expect(result).toHaveText('Fibonacci Sequence: 0');

    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

});