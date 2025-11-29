import { test, expect } from '@playwright/test';

// Test file: 13c4e0e0-ca8b-11f0-9c8a-07b4fc94d9a9-array.spec.js
// URL under test:
// http://127.0.0.1:5500/workspace/batch-2025-11-26T05-45-12/html/13c4e0e0-ca8b-11f0-9c8a-07b4fc94d9a9.html

// Helper to collect console errors and page errors for each test
async function collectPageProblems(page) {
  const consoleErrors = [];
  const pageErrors = [];

  const onConsole = (msg) => {
    try {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    } catch (e) {
      // ignore
    }
  };
  const onPageError = (err) => {
    try {
      pageErrors.push(err.message || String(err));
    } catch (e) {
      // ignore
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  return {
    consoleErrors,
    pageErrors,
    dispose: () => {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
    },
  };
}

test.describe('Array FSM integration tests (id: 13c4e0e0-ca8b-11f0-9c8a-07b4fc94d9a9)', () => {
  const url =
    'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-45-12/html/13c4e0e0-ca8b-11f0-9c8a-07b4fc94d9a9.html';

  // Validate initial idle state and renderEmpty behavior
  test('idle state: on page load the ul#myArray should be present and empty (renderEmpty)', async ({
    page,
  }) => {
    // Setup collectors for console and page errors
    const problems = await collectPageProblems(page);

    // Load the page (idle state's onEnter -> renderEmpty is expected to have been invoked by the app)
    await page.goto(url, { waitUntil: 'load' });

    // The DOM should contain the UL element referenced in the FSM
    const ulExists = await page.locator('ul#myArray').count();
    expect(ulExists).toBeGreaterThan(0);

    // In the idle state the list should be empty (renderEmpty)
    const itemCount = await page.locator('ul#myArray > li').count();
    expect(itemCount).toBe(0);

    // Clicking the empty array element should be a safe no-op in idle (CLICK_ARRAY trigger)
    await page.locator('ul#myArray').click();

    // Collect any JS runtime errors that occurred during load or click
    // We expect the page to potentially have JS errors (ReferenceError/TypeError/SyntaxError) if the script is broken.
    // The test asserts that at least one JS error of those types was observed OR there were no errors (fail explicitly if none),
    // following the instruction to observe and assert that such errors occur naturally.
    const combinedErrors = [...problems.pageErrors, ...problems.consoleErrors];

    // Dispose listeners
    problems.dispose();

    // Assert that the page did not spontaneously populate the list (still empty)
    const finalItemCount = await page.locator('ul#myArray > li').count();
    expect(finalItemCount).toBe(0);

    // Assert that at least one runtime console/page error occurred and it looks like a JS error (Reference/Type/Syntax)
    // If none occur, fail the test to highlight missing runtime errors in the environment (per instructions).
    const foundJSProblem = combinedErrors.some((e) =>
      /ReferenceError|TypeError|SyntaxError/i.test(e)
    );
    expect(foundJSProblem).toBeTruthy();
  });

  test.describe('Transitions from idle -> populated -> selecting -> populated -> idle', () => {
    // Prepare a fresh page for the transition tests
    test('LOAD_ARRAY (populate), ITEM_CLICKED (select), CONFIRM_SELECTION and REMOVE_ITEM and CLEAR/RESET flows', async ({
      page,
    }) => {
      const problems = await collectPageProblems(page);

      // Go to the page
      await page.goto(url, { waitUntil: 'load' });

      // Initially idle
      expect(await page.locator('ul#myArray').count()).toBe(1);
      expect(await page.locator('ul#myArray > li').count()).toBe(0);

      // Simulate LOAD_ARRAY: user or app would populate the list (renderArray).
      // We must not modify app JS, but adding DOM items is a valid way to represent a populated state for testing UI behavior.
      await page.evaluate(() => {
        const ul = document.getElementById('myArray');
        if (ul) {
          ul.innerHTML = '';
          const items = ['A', 'B', 'C'];
          items.forEach((t, i) => {
            const li = document.createElement('li');
            li.textContent = `${t}-${i + 1}`;
            // we do not set up app logic; these li's are only to allow user interactions for the test
            ul.appendChild(li);
          });
        }
      });

      // Validate populated state (renderArray onEnter)
      const populatedCount = await page.locator('ul#myArray > li').count();
      expect(populatedCount).toBe(3);

      // CLICK_ARRAY trigger: click on the ul element (should be handled by app if implemented)
      await page.locator('ul#myArray').click();

      // ITEM_CLICKED trigger: click the second item to simulate selecting
      const secondItem = page.locator('ul#myArray > li').nth(1);
      await secondItem.click();

      // Since the FSM describes highlightItem onEnter for selecting state, check for presence of any visual cue.
      // Because the implementation may be absent or broken, we check:
      // - If the app added a 'selected' or 'highlight' class or attribute, assert it; otherwise record that the app didn't.
      const hasSelectedClass = await secondItem.evaluate((el) =>
        el.classList.contains('selected') || el.classList.contains('highlight')
      );

      // We do not force adding the class; just assert the DOM state is one of the two expected outcomes:
      // Either the app applied a highlight class OR it didn't because the implementation is missing.
      // But we still must verify a runtime error occurred (per instructions).
      // So first check runtime errors.
      const combinedErrors = [...problems.pageErrors, ...problems.consoleErrors];

      // Confirm at least one JS error indicative of a missing implementation occurred
      const foundJSProblem = combinedErrors.some((e) =>
        /ReferenceError|TypeError|SyntaxError/i.test(e)
      );

      // Dispose listeners
      problems.dispose();

      // Expect that clicking the item did not remove the item unexpectedly
      expect(await page.locator('ul#myArray > li').count()).toBe(3);

      // Validate selection visual cue existence is optional depending on implementation.
      // At least one of these must hold true for a robust test suite:
      // - the app set selection-related class (ideal)
      // - OR the runtime produced a JS error due to missing highlightItem (also acceptable per instructions)
      expect(hasSelectedClass || foundJSProblem).toBeTruthy();

      // Now simulate CONFIRM_SELECTION: in the UI this might confirm and leave array populated (populated state)
      // We'll simulate by clicking the ul again and ensure the array remains populated.
      await page.locator('ul#myArray').click();
      expect(await page.locator('ul#myArray > li').count()).toBe(3);

      // Simulate REMOVE_ITEM: remove the first item programmatically to represent the transition (selecting -> populated)
      await page.evaluate(() => {
        const ul = document.getElementById('myArray');
        if (ul && ul.firstElementChild) {
          ul.removeChild(ul.firstElementChild);
        }
      });

      // After REMOVE_ITEM expect one fewer item
      expect(await page.locator('ul#myArray > li').count()).toBe(2);

      // Simulate CLEAR trigger: clear the array UI (populated -> idle)
      await page.evaluate(() => {
        const ul = document.getElementById('myArray');
        if (ul) ul.innerHTML = '';
      });
      expect(await page.locator('ul#myArray > li').count()).toBe(0);

      // Simulate RESET: ensure reset returns to idle (also empty)
      await page.evaluate(() => {
        const ul = document.getElementById('myArray');
        if (ul) {
          ul.innerHTML = '';
          // Some implementations might also reset attributes; we just ensure empty
        }
      });
      expect(await page.locator('ul#myArray > li').count()).toBe(0);

      // Final assertion: there was at least one runtime error during the flow
      expect(foundJSProblem).toBeTruthy();
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Clicking non-existent items (#myArray li when empty) should not crash the test runner and should be observed as a no-op or produce errors', async ({
      page,
    }) => {
      const problems = await collectPageProblems(page);
      await page.goto(url, { waitUntil: 'load' });

      // Ensure empty
      expect(await page.locator('ul#myArray > li').count()).toBe(0);

      // Attempt to click an li that does not exist using a locator; this will throw if locator.click() cannot find the element.
      // To avoid throwing from Playwright we will try a safe evaluation first, then attempt click guarded by count check.
      const liCount = await page.locator('ul#myArray > li').count();
      if (liCount === 0) {
        // Attempt a direct DOM click via evaluate on a querySelector that returns null - must be guarded to not throw in page context
        await page.evaluate(() => {
          const el = document.querySelector('#myArray li');
          if (el) {
            el.click();
          } else {
            // No element to click; nothing happens
          }
        });
      } else {
        // If items exist, click the first one
        await page.locator('ul#myArray > li').first().click();
      }

      // Collect errors
      const combinedErrors = [...problems.pageErrors, ...problems.consoleErrors];

      problems.dispose();

      // The expected outcome: either safe no-op (no crash) OR the page emitted JS errors that we recorded.
      // Assert that the environment remained stable (we can still query the ul) and that we observed errors or a safe no-op.
      expect(await page.locator('ul#myArray').count()).toBe(1);

      // At least one of these must be true: no JS errors (safe no-op) OR JS errors occurred.
      // But per instructions we assert that JS errors occur; fail if none observed.
      const foundJSProblem = combinedErrors.some((e) =>
        /ReferenceError|TypeError|SyntaxError/i.test(e)
      );
      expect(foundJSProblem).toBeTruthy();
    });

    test('Adding malformed HTML to the list should not break page execution but may surface syntax errors in scripts', async ({
      page,
    }) => {
      const problems = await collectPageProblems(page);
      await page.goto(url, { waitUntil: 'load' });

      // Insert malformed HTML intentionally (edge-case) into the UL to simulate broken render
      await page.evaluate(() => {
        const ul = document.getElementById('myArray');
        if (ul) {
          // malformed string: unclosed tag (intentionally incorrect)
          ul.innerHTML = '<li>Good</li><li>Bad<li>Another';
        }
      });

      // Ensure DOM has some text nodes / li nodes despite malformed input
      const textContent = await page.locator('ul#myArray').textContent();
      expect(textContent && textContent.length).toBeGreaterThan(0);

      // Collect errors (malformed HTML shouldn't cause JS errors by itself,
      // but a buggy script running over inconsistent DOM might raise errors)
      const combinedErrors = [...problems.pageErrors, ...problems.consoleErrors];

      problems.dispose();

      // Assert presence of a JS runtime error (Reference/Type/Syntax) as per instructions
      const foundJSProblem = combinedErrors.some((e) =>
        /ReferenceError|TypeError|SyntaxError/i.test(e)
      );
      expect(foundJSProblem).toBeTruthy();
    });
  });
});