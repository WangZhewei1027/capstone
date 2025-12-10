import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6a6e4-d5a1-11f0-80b9-e1f86cea383f.html';

test.describe('Adjacency Matrix App - UI and behavior', () => {
  // Arrays to capture console errors and page errors for each test
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset arrays before each test
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Listen for uncaught exceptions in the page (pageerror)
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack
      });
    });

    // Navigate to the app before each test
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test we assert there were no unexpected console/page errors
    // Tests that expect errors will check and assert them explicitly themselves.
    // If a test did not expect errors, it should assert these arrays are empty.
  });

  test.describe('Initial load and default state', () => {
    test('should load the page and show the default UI elements', async ({ page }) => {
      // Ensure the page title and heading are present
      await expect(page).toHaveTitle(/Adjacency Matrix/);
      const heading = await page.locator('h1');
      await expect(heading).toHaveText('Adjacency Matrix');

      // Check that inputs exist and have default values
      const rowsInput = page.locator('#rows');
      const colsInput = page.locator('#columns');
      await expect(rowsInput).toHaveValue('3');
      await expect(colsInput).toHaveValue('3');

      // Buttons should be visible and enabled
      const generateBtn = page.locator('#generate-btn');
      const clearBtn = page.locator('#clear-btn');
      await expect(generateBtn).toBeVisible();
      await expect(clearBtn).toBeVisible();
      await expect(generateBtn).toBeEnabled();
      await expect(clearBtn).toBeEnabled();

      // Matrix container should be empty on initial load
      const containerHtml = await page.locator('#matrix-container').innerHTML();
      expect(containerHtml.trim()).toBe('');

      // No console or page errors on a clean initial load
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Matrix generation and clearing', () => {
    test('should generate a 3x3 adjacency matrix when functions are invoked', async ({ page }) => {
      // Purpose: Call the page's generateMatrix and printMatrix functions directly
      // This avoids form submission that would reload the page. It uses functions
      // already defined on the page without redefining or patching them.
      await page.evaluate(() => {
        // Read the input values from the DOM to mimic user-provided values
        const rows = parseInt(document.getElementById('rows').value);
        const columns = parseInt(document.getElementById('columns').value);
        // Call the existing global functions defined by the page
        generateMatrix(rows, columns);
        printMatrix();
      });

      // After generating, verify the DOM has the expected number of <td> cells
      const containerHtml1 = await page.locator('#matrix-container').innerHTML();
      // Expect 9 <td> elements for a 3x3 matrix
      const tdMatches = containerHtml.match(/<td>/g) || [];
      expect(tdMatches.length).toBe(9);

      // Validate specific cell values are correct according to i + j
      // The printMatrix implementation prints rows of td elements in order
      // We'll extract all <td> text nodes to validate content sequence
      const tdTexts = await page.locator('#matrix-container td').allTextContents();
      // Cell [0,0] -> 0
      expect(tdTexts[0].trim()).toBe('0');
      // Cell [2,2] for a 3x3 -> 2 + 2 = 4, index 8
      expect(tdTexts[8].trim()).toBe('4');

      // No console or page errors should have happened during direct invocation
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('clicking the Generate button triggers form submission/navigation', async ({ page }) => {
      // Purpose: Verify clicking the generate button will run its click handler and then
      // because the button is inside a form with default type 'submit', it will submit
      // and likely reload the page. We wait for navigation to confirm the submit occurred.

      // Use Promise.all to click and wait for navigation to complete
      const [response] = await Promise.all([
        page.waitForNavigation({ waitUntil: 'load' }),
        page.click('#generate-btn')
      ]);

      // After navigation, the page should be reloaded and the matrix container should be empty
      const containerHtmlAfter = await page.locator('#matrix-container').innerHTML();
      expect(containerHtmlAfter.trim()).toBe('');

      // Ensure no unexpected errors occurred during click+navigation
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('clear button clears the matrix (via click which submits and reloads)', async ({ page }) => {
      // Purpose: Ensure the clear button handler empties the matrix container.
      // Because buttons are inside a form and may cause navigation, we will populate
      // the matrix first using functions, then click the clear button and wait for reload.

      // Populate the matrix first (direct invocation)
      await page.evaluate(() => {
        generateMatrix(2, 2);
        printMatrix();
      });

      // Ensure matrix is present before clearing
      const preClearCells = await page.locator('#matrix-container td').count();
      expect(preClearCells).toBeGreaterThan(0);

      // Click the clear button and wait for navigation (because it's inside a form)
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'load' }),
        page.click('#clear-btn')
      ]);

      // After reload, matrix container should be empty
      const containerHtmlAfter1 = await page.locator('#matrix-container').innerHTML();
      expect(containerHtmlAfter.trim()).toBe('');

      // No unexpected errors were emitted during clear
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Edge cases and error observation', () => {
    test('generating a 0x0 matrix results in no rendered cells', async ({ page }) => {
      // Purpose: Edge case where rows and columns are zero -> expect empty render
      await page.evaluate(() => {
        generateMatrix(0, 0);
        printMatrix();
      });

      const containerHtml2 = await page.locator('#matrix-container').innerHTML();
      expect(containerHtml.trim()).toBe('');

      // No errors should occur for zero-sized matrix
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('attempting to generate with negative rows causes an error in the page context', async ({ page }) => {
      // Purpose: Trigger a RangeError by calling generateMatrix with a negative array size.
      // We schedule the invocation inside a setTimeout so the thrown exception is uncaught
      // in the page context and will be emitted as a 'pageerror' event.
      const pageErrorPromise = page.waitForEvent('pageerror');

      await page.evaluate(() => {
        // Schedule an asynchronous call that will throw inside the page (uncaught)
        setTimeout(() => {
          // This should throw a RangeError for invalid array length
          generateMatrix(-1, 3);
          // Note: we do not catch the error deliberately so it surfaces as an uncaught error
        }, 0);
      });

      // Await the pageerror event to capture the thrown error
      const captured = await pageErrorPromise;
      expect(captured).toBeTruthy();
      // The message should indicate an invalid array length or similar RangeError
      expect(captured.message).toMatch(/(Invalid array length|RangeError|invalid array length)/i);

      // The pageErrors listener should have recorded this as well
      // Wait a tick to ensure listener processed the error
      await page.waitForTimeout(50);
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);
      expect(pageErrors[pageErrors.length - 1].message).toMatch(/(Invalid array length|RangeError|invalid array length)/i);
    });
  });
});