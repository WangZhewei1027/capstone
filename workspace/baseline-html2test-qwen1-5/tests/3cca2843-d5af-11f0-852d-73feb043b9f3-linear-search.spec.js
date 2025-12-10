import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/3cca2843-d5af-11f0-852d-73feb043b9f3.html';

// Helper: try multiple selectors and return the first locator that exists on the page, or null
async function findFirstExisting(page, selectors) {
  for (const sel of selectors) {
    const locator = page.locator(sel);
    if (await locator.count() > 0) return locator;
  }
  return null;
}

test.describe('Linear Search App (3cca2843-d5af-11f0-852d-73feb043b9f3)', () => {
  // Arrays to collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        // ignore any unexpected console callback errors
      }
    });

    // Capture runtime page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the app page
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // Small sanity: make sure page closed properly
    await page.close();
  });

  test('Initial page load: document and basic elements or error presence', async ({ page }) => {
    // Purpose: verify the page loads and either exposes expected interactive elements or reports runtime errors.
    // Check basic document state
    const title = await page.title().catch(() => '');
    expect(typeof title).toBe('string');

    // Try to find common interactive controls that a linear search app might expose
    const arrayInput = await findFirstExisting(page, [
      'input#array', 'input[name="array"]', 'textarea#array', '#array-input', 'input.array-input'
    ]);
    const targetInput = await findFirstExisting(page, [
      'input#target', 'input[name="target"]', '#target-input', 'input.target-input'
    ]);
    const searchButton = await findFirstExisting(page, [
      'button#search', 'button#search-btn', 'button#run', 'button.search-btn', 'input[type="submit"]'
    ]);
    const resultNode = await findFirstExisting(page, [
      '#result', '#output', '.result', '#index', '#answer', '#result-text'
    ]);

    // Assert: at least one of the following is true:
    //  - the app exposes interactive controls (we consider arrayInput + targetInput + searchButton as sufficient)
    //  - OR there are page errors captured (so we explicitly assert that errors were observed)
    const controlsPresent = !!arrayInput && !!targetInput && !!searchButton;
    if (!controlsPresent) {
      // If controls are missing, assert that pageErrors contains something to explain missing functionality
      // This aligns with requirement to observe and assert runtime errors if the implementation is broken.
      expect(pageErrors.length, 'No controls found and no runtime page errors were reported').toBeGreaterThan(0);
    } else {
      // If controls are present, assert they are visible and the result area exists or will be created.
      await expect(arrayInput).toBeVisible();
      await expect(targetInput).toBeVisible();
      await expect(searchButton).toBeVisible();
      // The result node might not be present until after search; if it's present check visibility
      if (resultNode) {
        await expect(resultNode).toBeVisible();
      }
    }
  });

  test('Function linearSearch exists on window and behaves as expected (if defined)', async ({ page }) => {
    // Purpose: check whether the linearSearch function is defined globally and validate its behavior directly.
    // We do this by calling the function in the page context if it exists.
    const hasFunction = await page.evaluate(() => {
      return typeof window.linearSearch === 'function';
    }).catch(() => false);

    if (!hasFunction) {
      // If the function is not present, assert that there was an error (the test requirement allows asserting errors)
      expect(pageErrors.length, 'linearSearch not found; expected page to report errors if implementation is missing').toBeGreaterThan(0);
      return;
    }

    // If function exists, run several direct tests via evaluate
    const results = await page.evaluate(() => {
      const res = {};
      // basic positive test
      try {
        res.basic = window.linearSearch([3, 2, 8, 5], 8);
      } catch (e) {
        res.basic = { error: e.toString() };
      }
      // not found test
      try {
        res.notFound = window.linearSearch([1, 2, 3], 9);
      } catch (e) {
        res.notFound = { error: e.toString() };
      }
      // empty array
      try {
        res.empty = window.linearSearch([], 1);
      } catch (e) {
        res.empty = { error: e.toString() };
      }
      // multiple occurrences: expect first index returned
      try {
        res.multiple = window.linearSearch([5, 2, 5, 5], 5);
      } catch (e) {
        res.multiple = { error: e.toString() };
      }
      return res;
    });

    // Validate results - depending on implementation errors may have occurred; assert accordingly.
    // If errors occurred inside the function they will be strings in the result; fail accordingly.
    for (const key of Object.keys(results)) {
      const value = results[key];
      expect(value, `Expected linearSearch to produce a result for ${key}`).not.toBeUndefined();
    }

    // The expected correct behavior (based on typical linear search):
    // - basic: index 2 for [3,2,8,5], target 8 -> index 2
    // - notFound: -1
    // - empty: -1
    // - multiple: index 0
    // However, the provided implementation in the exercise contains an off-by-one in the loop (`arr.length - 1`),
    // so some of these expectations may not hold. We will accept either the "correct" numeric outcomes OR detect
    // that the implementation returned unexpected numbers and assert that an implementation bug is observable.
    const basic = results.basic;
    const notFound = results.notFound;
    const empty = results.empty;
    const multiple = results.multiple;

    // If any of these are objects with an error property, fail explicitly to surface the exception message.
    for (const [name, val] of Object.entries({ basic, notFound, empty, multiple })) {
      if (val && typeof val === 'object' && 'error' in val) {
        // Surface the exact error in the assertion message
        throw new Error(`linearSearch threw an error for case "${name}": ${val.error}`);
      }
    }

    // Now check logical expectations, but be tolerant: if they don't match, we assert that the implementation is buggy.
    const mismatches = [];
    if (basic !== 2) mismatches.push(`basic expected 2 but got ${basic}`);
    if (notFound !== -1) mismatches.push(`notFound expected -1 but got ${notFound}`);
    if (empty !== -1) mismatches.push(`empty expected -1 but got ${empty}`);
    if (multiple !== 0) mismatches.push(`multiple expected 0 but got ${multiple}`);

    // If mismatches exist, we assert that they are present so test output documents the implementation issues.
    if (mismatches.length > 0) {
      // Fail the test with a helpful message describing the mismatches
      throw new Error('linearSearch did not behave as expected: ' + mismatches.join('; '));
    }
  });

  test('Interactive UI: perform search via UI controls and verify DOM updates (if controls exist)', async ({ page }) => {
    // Purpose: simulate a user filling the array and target fields, clicking the search button,
    // and verifying that the displayed result matches expectations.
    const arrayInput = await findFirstExisting(page, [
      'input#array', 'input[name="array"]', 'textarea#array', '#array-input', 'input.array-input'
    ]);
    const targetInput = await findFirstExisting(page, [
      'input#target', 'input[name="target"]', '#target-input', 'input.target-input'
    ]);
    const searchButton = await findFirstExisting(page, [
      'button#search', 'button#search-btn', 'button#run', 'button.search-btn', 'input[type="submit"]'
    ]);
    const resultNode = await findFirstExisting(page, [
      '#result', '#output', '.result', '#index', '#answer', '#result-text'
    ]);

    // If the UI controls are not present we treat this as an implementation problem and assert that a runtime error was captured.
    const controlsPresent = !!arrayInput && !!targetInput && !!searchButton;
    if (!controlsPresent) {
      expect(pageErrors.length, 'No UI controls found and no runtime errors were reported').toBeGreaterThan(0);
      return;
    }

    // Fill in values and perform a search
    // We assume array is entered as comma-separated values by the UI.
    await arrayInput.fill('3,2,8,5');
    await targetInput.fill('8');

    // Click the search button
    await searchButton.click();

    // Allow some time for DOM updates if the app is async (small timeout)
    await page.waitForTimeout(200);

    // If a result node exists, assert its content, otherwise try to read console logs for printed output
    if (resultNode) {
      // Expect the result node to contain a numeric index (as text) or explanatory text that includes the index.
      const text = (await resultNode.innerText()).trim();
      // Accept either '2' or phrases containing '2' for index
      const containsIndex2 = text.includes('2');
      if (!containsIndex2) {
        // If the result does not include expected value, fail and include the full text for debugging.
        throw new Error(`Expected result to include index 2 but got: "${text}"`);
      }
    } else {
      // Try to infer result from console logs
      const foundConsole = consoleMessages.find((m) => /index|result|found|search/i.test(m.text));
      expect(foundConsole, 'No result element and no console output indicating the result was found').toBeTruthy();
    }
  });

  test('Edge cases and invalid input handling through UI (if present)', async ({ page }) => {
    // Purpose: verify how the application handles empty arrays, non-numeric inputs, and edge cases.
    const arrayInput = await findFirstExisting(page, [
      'input#array', 'input[name="array"]', 'textarea#array', '#array-input', 'input.array-input'
    ]);
    const targetInput = await findFirstExisting(page, [
      'input#target', 'input[name="target"]', '#target-input', 'input.target-input'
    ]);
    const searchButton = await findFirstExisting(page, [
      'button#search', 'button#search-btn', 'button#run', 'button.search-btn', 'input[type="submit"]'
    ]);
    const resultNode = await findFirstExisting(page, [
      '#result', '#output', '.result', '#index', '#answer', '#result-text'
    ]);

    const controlsPresent = !!arrayInput && !!targetInput && !!searchButton;
    if (!controlsPresent) {
      // If controls are missing, expect an implementation error was logged
      expect(pageErrors.length, 'No UI controls found and no runtime errors were reported').toBeGreaterThan(0);
      return;
    }

    // Case 1: empty array
    await arrayInput.fill('');
    await targetInput.fill('1');
    await searchButton.click();
    await page.waitForTimeout(150);
    if (resultNode) {
      const text = (await resultNode.innerText()).trim();
      // Expect something that indicates not found; often '-1' or 'not found'
      const indicatesNotFound = text.includes('-1') || /not found/i.test(text) || /notfound/i.test(text) || /no.*match/i.test(text);
      expect(indicatesNotFound, `Expected empty array search to indicate not found, got: "${text}"`).toBeTruthy();
    } else {
      // If result node not present, at least no uncaught exception should have occurred during the operation
      // If an exception did occur we already capture it in pageErrors; assert none occurred for graceful handling
      expect(pageErrors.length, 'Expected no uncaught exceptions for empty array search').toBe(0);
    }

    // Case 2: non-numeric values and target text
    await arrayInput.fill('a,b,c,a');
    await targetInput.fill('a');
    await searchButton.click();
    await page.waitForTimeout(150);
    if (resultNode) {
      const text = (await resultNode.innerText()).trim();
      const containsIndex0 = text.includes('0');
      if (!containsIndex0) {
        // The app may coerce types differently; ensure either correct index or a clear not found
        const indicatesNotFound = text.includes('-1') || /not found/i.test(text);
        expect(indicatesNotFound || containsIndex0, `Unexpected handling of non-numeric inputs: "${text}"`).toBeTruthy();
      }
    } else {
      // No DOM update; check that no runtime exceptions were thrown
      expect(pageErrors.length, 'Expected no uncaught exceptions for non-numeric input search').toBe(0);
    }
  });

  test('Accessibility smoke: inputs have accessible names and buttons are focusable (if present)', async ({ page }) => {
    // Purpose: quick accessibility checks for presence of accessible names and focusability.
    const inputs = await page.locator('input, textarea').all();
    if (inputs.length === 0) {
      // If no inputs, assert we observed an implementation issue
      expect(pageErrors.length, 'No form inputs found on page and no runtime errors were reported').toBeGreaterThan(0);
      return;
    }
    // Ensure at least one input has an accessible name (aria-label, aria-labelledby or associated label)
    let hasAccessibleName = false;
    for (const input of inputs) {
      const name = await input.getAttribute('aria-label') || await input.getAttribute('aria-labelledby') || '';
      if (name && name.trim().length > 0) {
        hasAccessibleName = true;
        break;
      }
      // Check for associated label element
      const id = await input.getAttribute('id');
      if (id) {
        const label = await page.locator(`label[for="${id}"]`);
        if (await label.count() > 0) {
          hasAccessibleName = true;
          break;
        }
      }
    }
    expect(hasAccessibleName, 'Expected at least one input to have an accessible name (aria-label or associated label)').toBeTruthy();

    // Buttons should be focusable
    const buttons = await page.locator('button, input[type="submit"], input[type="button"]').all();
    if (buttons.length > 0) {
      // Focus each button to ensure no runtime exceptions are thrown when focusing
      for (const btn of buttons) {
        await btn.focus();
      }
    } else {
      // No buttons found -> check for runtime errors
      expect(pageErrors.length, 'No buttons found and no runtime errors were reported').toBeGreaterThan(0);
    }
  });

  test('Report captured console messages and page errors for debugging', async ({ page }) => {
    // Purpose: make the collected console and error info available as test assertions.
    // This test intentionally asserts that our collectors are arrays and exposes their lengths.
    expect(Array.isArray(consoleMessages)).toBe(true);
    expect(Array.isArray(pageErrors)).toBe(true);

    // If there are any uncaught page errors, make the test fail with detailed error info so failures are visible.
    if (pageErrors.length > 0) {
      const messages = pageErrors.map((e, i) => `Error ${i + 1}: ${e && e.message ? e.message : String(e)}`).join('\n');
      throw new Error('Uncaught exceptions were observed on the page:\n' + messages);
    }

    // If there are console messages of type 'error', fail to make them visible during test runs
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error' || /error/i.test(m.text));
    if (consoleErrors.length > 0) {
      const combined = consoleErrors.map((c) => `${c.type}: ${c.text}`).join('\n');
      throw new Error('Console error messages observed:\n' + combined);
    }

    // If no errors, assert at least some console messages (informational) may have been logged by the app.
    // This is a soft assertion: it's okay if there are none, so we simply ensure the property exists.
    expect(consoleMessages).toBeTruthy();
  });
});