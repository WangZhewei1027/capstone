import { test, expect } from '@playwright/test';

test.describe('Counting Sort Visualization - e03a205d-cd32-11f0-a949-f901cf5609c9', () => {
  // URL of the served HTML application
  const APP_URL =
    'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a205d-cd32-11f0-a949-f901cf5609c9.html';

  // Arrays to collect runtime console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  // Attach listeners and navigate fresh for every test
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen to console messages and capture errors
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // if something odd happens while reading console, capture it too
        consoleErrors.push(`console-listen-error: ${String(e)}`);
      }
    });

    // Listen to uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // Navigate to the app page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Ensure tests validate that no unexpected runtime errors were emitted
    // (This asserts the page ran without console "error" messages or uncaught exceptions)
    expect(consoleErrors, 'No console.error messages should be emitted during the test').toEqual([]);
    expect(pageErrors, 'No uncaught page errors should be emitted during the test').toEqual([]);
  });

  test.describe('Initial load and UI structure', () => {
    test('Initial page load shows input, button, and empty output section', async ({ page }) => {
      // Verify page title is present
      await expect(page.locator('h1')).toHaveText('Counting Sort Demonstration');

      // Verify input exists and has expected placeholder
      const input = page.locator('#arrayInput');
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute(
        'placeholder',
        'e.g. 4, 2, 2, 8, 3, 3, 1'
      );

      // Verify sort button exists and is enabled
      const sortButton = page.locator('#sortButton');
      await expect(sortButton).toBeVisible();
      await expect(sortButton).toBeEnabled();
      await expect(sortButton).toHaveText('Sort using Counting Sort');

      // Verify output section is present and initially empty
      const outputSection = page.locator('#output-section');
      await expect(outputSection).toBeVisible();
      // There should be no .step elements initially
      await expect(page.locator('#output-section .step')).toHaveCount(0);

      // Verify error message area is present and initially empty
      const errorMessage = page.locator('#error-message');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toHaveText('');

      // Accessibility attributes checks
      await expect(page.locator('#input-section')).toHaveAttribute('aria-label', 'Input Section');
      await expect(outputSection).toHaveAttribute('aria-live', 'polite');
    });
  });

  test.describe('Successful sorting flow and visual output', () => {
    test('Sorting a valid array produces the expected number of steps and the correct final sorted array', async ({ page }) => {
      // Input the sample array and trigger sort
      const sample = '4, 2, 2, 8, 3, 3, 1';
      await page.fill('#arrayInput', sample);
      await page.click('#sortButton');

      // After clicking, the script builds many .step elements synchronously.
      // For the provided input we expect 27 steps (computed from the algorithm flow).
      const steps = page.locator('#output-section .step');
      await expect(steps).toHaveCount(27);

      // Verify some key step titles are present (original array, determine range, final sorted)
      const titles = page.locator('#output-section .step .step-title');
      // Collect the text content of all step titles
      const titleCount = await titles.count();
      const titleTexts = [];
      for (let i = 0; i < titleCount; i++) {
        titleTexts.push((await titles.nth(i).innerText()).trim());
      }

      // Basic expectations on the presence of important steps
      expect(titleTexts.some((t) => t.includes('Original Array')), 'Should include Original Array step').toBeTruthy();
      expect(titleTexts.some((t) => t.includes('Determine Range')), 'Should include Determine Range step').toBeTruthy();
      expect(titleTexts.some((t) => t.includes('Sorted Array')), 'Should include Sorted Array step').toBeTruthy();

      // Verify the final step displays the fully sorted array: [1,2,2,3,3,4,8]
      const lastStepIndex = (await steps.count()) - 1;
      const lastStep = steps.nth(lastStepIndex);
      const finalElements = lastStep.locator('.array-container .element');
      const finalCount = await finalElements.count();
      // Expect 7 elements in the final sorted result
      expect(finalCount).toBe(7);

      const finalValues = [];
      for (let i = 0; i < finalCount; i++) {
        finalValues.push((await finalElements.nth(i).innerText()).trim());
      }

      expect(finalValues).toEqual(['1', '2', '2', '3', '3', '4', '8']);
    });

    test('Counting steps and cumulative steps are rendered (presence of count-element elements)', async ({ page }) => {
      // Use a smaller array to ensure count display exists
      const sample1 = '2 1 2';
      await page.fill('#arrayInput', sample);
      await page.click('#sortButton');

      // There should be several .count-element nodes across steps
      const countElements = page.locator('#output-section .count-element');
      // At least one count-element should be present
      await expect(countElements).toHaveCountGreaterThan(0);

      // Verify that one of the step titles mentions "Count Frequencies"
      const anyCountFrequency = page.locator('#output-section .step .step-title', {
        hasText: 'Count Frequencies',
      });
      await expect(anyCountFrequency).toBeVisible();

      // Verify at least one cumulative step includes "Cumulative Count"
      const anyCumulative = page.locator('#output-section .step .step-title', {
        hasText: 'Cumulative Count',
      });
      await expect(anyCumulative).toBeVisible();
    });
  });

  test.describe('Error handling and edge cases', () => {
    test('Invalid input containing non-numeric tokens shows a helpful error and produces no steps', async ({ page }) => {
      // Enter invalid input and click sort
      await page.fill('#arrayInput', '4, a, 2');
      await page.click('#sortButton');

      // Expect the specific error message to be shown
      const errorMessage1 = page.locator('#error-message');
      await expect(errorMessage).toHaveText(
        'Please enter a valid list of non-negative integers separated by commas or spaces.'
      );

      // Ensure no steps were rendered
      await expect(page.locator('#output-section .step')).toHaveCount(0);
    });

    test('Empty input yields an informative error message and no visualization', async ({ page }) => {
      // Ensure the input is empty
      await page.fill('#arrayInput', '');
      await page.click('#sortButton');

      // Because parseInput returns null on empty input, we expect the same invalid input error message
      await expect(page.locator('#error-message')).toHaveText(
        'Please enter a valid list of non-negative integers separated by commas or spaces.'
      );

      // No steps should be rendered
      await expect(page.locator('#output-section .step')).toHaveCount(0);
    });

    test('Input with more than 50 numbers shows a size limit error', async ({ page }) => {
      // Build a string of 51 ones separated by spaces
      const overLimit = new Array(51).fill('1').join(' ');
      await page.fill('#arrayInput', overLimit);
      await page.click('#sortButton');

      await expect(page.locator('#error-message')).toHaveText(
        'Please enter 50 or fewer numbers for visualization.'
      );

      // No steps should be rendered
      await expect(page.locator('#output-section .step')).toHaveCount(0);
    });
  });

  test.describe('Accessibility and ARIA checks', () => {
    test('Error container has role=alert and input aria-describedby points to it', async ({ page }) => {
      // Check that the error message node has role alert and aria-live already set
      const error = page.locator('#error-message');
      await expect(error).toHaveAttribute('role', 'alert');

      // The input should reference the error-message via aria-describedby
      await expect(page.locator('#arrayInput')).toHaveAttribute('aria-describedby', 'error-message');

      // Ensure the output section uses aria-live polite for updates
      await expect(page.locator('#output-section')).toHaveAttribute('aria-live', 'polite');
    });
  });
});