import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7673402-d5b8-11f0-9ee1-ef07bdc6053d.html';

test.describe('Union-Find (Disjoint Set) Visualization - f7673402-d5b8-11f0-9ee1-ef07bdc6053d', () => {
  // Shared variables to collect runtime console messages and page errors for each test
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  // Setup a fresh page and listeners before each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages and errors
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') {
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', err => {
      // pageerror events capture uncaught exceptions (ReferenceError, TypeError, etc.)
      pageErrors.push(err);
    });

    // Navigate to the app page
    await page.goto(APP_URL);
    // Wait for the main UI to be present
    await page.waitForSelector('#unionInput');
    await page.waitForSelector('#findInput');
    await page.waitForSelector('button[onclick="performUnion()"]');
    await page.waitForSelector('button[onclick="performFind()"]');
    await page.waitForSelector('#output');
  });

  test.afterEach(async ({}, testInfo) => {
    // If there were any pageErrors, annotate them for easier debugging in test output
    if (pageErrors.length > 0) {
      for (const e of pageErrors) {
        testInfo.attach('pageerror', { body: String(e), contentType: 'text/plain' });
      }
    }
    if (consoleErrors.length > 0) {
      testInfo.attach('consoleErrors', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
    }
  });

  test.describe('Initial (Idle) state and DOM sanity checks', () => {
    test('Idle state: inputs and buttons exist and output is empty', async ({ page }) => {
      // Verify inputs, buttons and output are present and initial state (Idle)
      const unionInput = page.locator('#unionInput');
      const findInput = page.locator('#findInput');
      const unionButton = page.locator('button[onclick="performUnion()"]');
      const findButton = page.locator('button[onclick="performFind()"]');
      const output = page.locator('#output');

      await expect(unionInput).toBeVisible();
      await expect(findInput).toBeVisible();
      await expect(unionButton).toBeVisible();
      await expect(findButton).toBeVisible();

      // The Idle state expected evidence: output should be empty string initially
      await expect(output).toHaveText('');

      // Verify there were no uncaught runtime errors on initial load
      expect(pageErrors.length).toBe(0);
      // Also assert there were no console error messages
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Union operation transitions (S0_Idle -> S1_UnionPerformed)', () => {
    test('Perform union with valid input updates output and internal DS state', async ({ page }) => {
      // This test validates the transition from Idle to Union Performed (S1_UnionPerformed)
      const unionInput = page.locator('#unionInput');
      const unionButton = page.locator('button[onclick="performUnion()"]');
      const output = page.locator('#output');

      // Enter a valid pair "1,2" and click "Union"
      await unionInput.fill('1,2');
      await unionButton.click();

      // The FSM evidence expects output.innerHTML to report the union result
      await expect(output).toHaveText('Union performed on elements 1 and 2.');

      // Verify the underlying disjoint set changed as expected:
      // After union(1,2), find(2) should return 1 (root of 2 becomes 1).
      const rootOf2 = await page.evaluate(() => {
        // Read the global ds variable created by the page script
        // We only read; do not modify the page state
        return ds.find(2);
      });
      expect(rootOf2).toBe(1);

      // Also check that the parent array reflects the union
      const parentArray = await page.evaluate(() => ds.parent.slice());
      // parent[1] should be 1 (root), parent[2] should be 1
      expect(parentArray[1]).toBe(1);
      expect(parentArray[2]).toBe(1);

      // No uncaught page errors should have occurred during this operation
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });

    test('Union with non-numeric or incomplete input shows error message (edge case)', async ({ page }) => {
      // This test checks the invalid input path for the union operation
      const unionInput = page.locator('#unionInput');
      const unionButton = page.locator('button[onclick="performUnion()"]');
      const output = page.locator('#output');

      // Provide invalid input
      await unionInput.fill('a,b');
      await unionButton.click();
      await expect(output).toHaveText('Please enter valid two numbers.');

      // Also test when only one number is provided
      await unionInput.fill('3');
      await unionButton.click();
      await expect(output).toHaveText('Please enter valid two numbers.');

      // Confirm no uncaught runtime exceptions
      expect(pageErrors.length).toBe(0);
    });

    test('Union with same element (e.g., 4,4) should still show performed message and not corrupt DS', async ({ page }) => {
      const unionInput = page.locator('#unionInput');
      const unionButton = page.locator('button[onclick="performUnion()"]');
      const output = page.locator('#output');

      // Perform union on the same element
      await unionInput.fill('4,4');
      await unionButton.click();

      // Should still display a performed message (the implementation writes message without checking equality)
      await expect(output).toHaveText('Union performed on elements 4 and 4.');

      // Check that find(4) returns 4 and parent[4] is 4 (no change)
      const root4 = await page.evaluate(() => ds.find(4));
      expect(root4).toBe(4);
      const parent4 = await page.evaluate(() => ds.parent[4]);
      expect(parent4).toBe(4);

      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Find operation transitions (S0_Idle -> S2_FindPerformed)', () => {
    test('Perform find on an element after union returns correct root and updates output', async ({ page }) => {
      // Prepare: union 5 and 6, then find 6
      const unionInput = page.locator('#unionInput');
      const unionButton = page.locator('button[onclick="performUnion()"]');
      const findInput = page.locator('#findInput');
      const findButton = page.locator('button[onclick="performFind()"]');
      const output = page.locator('#output');

      // union 5,6
      await unionInput.fill('5,6');
      await unionButton.click();
      await expect(output).toHaveText('Union performed on elements 5 and 6.');

      // Now find(6)
      await findInput.fill('6');
      await findButton.click();

      // The FSM evidence expects output.innerHTML: "The root of 6 is 5."
      await expect(output).toHaveText('The root of 6 is 5.');

      // Also verify ds.find(6) returns 5
      const root6 = await page.evaluate(() => ds.find(6));
      expect(root6).toBe(5);

      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });

    test('Find with invalid input shows an error message', async ({ page }) => {
      const findInput = page.locator('#findInput');
      const findButton = page.locator('button[onclick="performFind()"]');
      const output = page.locator('#output');

      // Non-numeric input
      await findInput.fill('x');
      await findButton.click();
      await expect(output).toHaveText('Please enter a valid number.');

      // Empty input
      await findInput.fill('');
      await findButton.click();
      await expect(output).toHaveText('Please enter a valid number.');

      expect(pageErrors.length).toBe(0);
    });

    test('Find on out-of-range element produces "undefined" root in output (edge case)', async ({ page }) => {
      // This checks how the implementation handles indices outside the ds size (size is 10)
      const findInput = page.locator('#findInput');
      const findButton = page.locator('button[onclick="performFind()"]');
      const output = page.locator('#output');

      // Find a large index (20) which is out of range; implementation will likely return undefined
      await findInput.fill('20');
      await findButton.click();

      // Expect the output to reflect the value found (likely "The root of 20 is undefined.")
      await expect(output).toHaveText('The root of 20 is undefined.');

      // Confirm that calling ds.find(20) from the page returns undefined (consistent with the output)
      const root20 = await page.evaluate(() => ds.find(20));
      expect(root20).toBeUndefined();

      // There should be no uncaught exceptions thrown by this behavior
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Runtime errors and console diagnostics', () => {
    test('No uncaught ReferenceError, SyntaxError, or TypeError occurred during interactions', async ({ page }) => {
      // After running previous interactions (each test sets up its own fresh page),
      // here we explicitly perform a set of operations and then assert that no fatal errors occurred.
      const unionInput = page.locator('#unionInput');
      const unionButton = page.locator('button[onclick="performUnion()"]');
      const findInput = page.locator('#findInput');
      const findButton = page.locator('button[onclick="performFind()"]');
      const output = page.locator('#output');

      // Perform a sequence of valid and invalid operations
      await unionInput.fill('0,1');
      await unionButton.click();
      await findInput.fill('1');
      await findButton.click();
      await expect(output).toHaveText(/The root of 1 is/);

      await unionInput.fill('bad,input');
      await unionButton.click();
      await expect(output).toHaveText('Please enter valid two numbers.');

      await findInput.fill('not-a-number');
      await findButton.click();
      await expect(output).toHaveText('Please enter a valid number.');

      // Inspect captured pageErrors for any ReferenceError/SyntaxError/TypeError
      const fatalErrors = pageErrors.filter(err => {
        const name = err && err.name ? err.name : '';
        return name === 'ReferenceError' || name === 'SyntaxError' || name === 'TypeError';
      });

      // Assert that no such fatal errors were thrown by the page during these interactions.
      // This validates that the implementation runs without uncaught runtime exceptions in these flows.
      expect(fatalErrors.length).toBe(0);

      // Additionally ensure there are no console.error messages
      const consoleErrCount = consoleMessages.filter(m => m.type === 'error').length;
      expect(consoleErrCount).toBe(0);
    });
  });
});