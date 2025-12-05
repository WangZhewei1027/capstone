import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d560a80-d1d8-11f0-bbda-359f3f96b638.html';

test.describe('Binary Search Tree Visualization - FSM Tests (Application ID: 2d560a80-d1d8-11f0-bbda-359f3f96b638)', () => {
  // Collect runtime console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console events
    page.on('console', msg => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        // ignore any unexpected console access errors
      }
    });

    // Listen to uncaught exceptions in the page
    page.on('pageerror', error => {
      // error is an Error object in most engines; store its message
      pageErrors.push(String(error && error.message ? error.message : error));
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // Nothing special to teardown; page fixture will be closed by Playwright
    // But include a short check that the page is still reachable
    await expect(page).toHaveURL(/127\.0\.0\.1/);
  });

  test('Initial load shows input, insert button and empty tree (S0_Idle)', async ({ page }) => {
    // This test validates the Idle state (S0_Idle) UI elements and that no unexpected errors occurred on load.

    // Verify input exists and has correct placeholder and type
    const input = page.locator('#inputValue');
    await expect(input).toHaveAttribute('placeholder', 'Enter a number');
    await expect(input).toHaveAttribute('type', 'number');

    // Verify Insert button exists and is clickable
    const insertButton = page.locator("button[onclick='insertNode()']");
    await expect(insertButton).toBeVisible();
    await expect(insertButton).toHaveText('Insert');

    // Verify tree container exists and is initially empty
    const treeContainer = page.locator('#treeContainer');
    await expect(treeContainer).toBeVisible();
    await expect(treeContainer.locator('.node')).toHaveCount(0);

    // There should be no page-level errors on a clean load
    expect(pageErrors.length).toBe(0);

    // No console messages with type 'error' should have been emitted
    const errorConsole = consoleMessages.find(m => m.type === 'error');
    expect(errorConsole).toBeUndefined();
  });

  test('Calling missing entry action renderPage() should produce a ReferenceError (verify onEnter action from FSM)', async ({ page }) => {
    // FSM listed renderPage() as an entry action. The implementation does not define renderPage.
    // We attempt to invoke it and assert that a ReferenceError occurs naturally in the page context.

    // Call the non-existent function and expect an error to be thrown by the page
    let thrown = null;
    try {
      // This will reject because renderPage is not defined in the page
      await page.evaluate(() => {
        // Intentionally call the missing function to observe a runtime ReferenceError in the page
        // This mirrors verifying onEnter actions that are declared in FSM but missing in implementation
        // Do not catch the error here; let it bubble up so pageerror handlers can capture it too.
        // eslint-disable-next-line no-undef
        renderPage();
      });
    } catch (e) {
      thrown = e;
    }

    // The evaluate call should have thrown an error
    expect(thrown).not.toBeNull();
    // Error message contents may vary between engines; check for mention of "renderPage" or "is not defined"
    const message = String(thrown && thrown.message ? thrown.message : thrown);
    expect(message).toMatch(/renderPage|is not defined|ReferenceError/i);

    // The pageerror listener should have captured at least one error mentioning renderPage
    const hasRenderPageError = pageErrors.some(err => /renderPage/i.test(err));
    expect(hasRenderPageError).toBeTruthy();

    // Console messages may also include an error; verify that if an error-type console message is present it references renderPage
    const consoleErrorMessage = consoleMessages.find(m => m.type === 'error' && /renderPage/i.test(m.text));
    // It's acceptable if there is no console.error message; many engines only emit pageerror events.
    // But if there is a console error entry, it should reference the missing function.
    if (consoleErrorMessage) {
      expect(consoleErrorMessage.text).toMatch(/renderPage/i);
    }
  });

  test('Inserting numbers updates the BST and DOM (Transition S0_Idle -> S1_TreeUpdated)', async ({ page }) => {
    // This test exercises the InsertNode event and validates the resulting tree structure.
    // We'll insert the values 5, 3, 7 and inspect the DOM for the expected in-order layout [3,5,7].

    const input1 = page.locator('#inputValue');
    const insertButton1 = page.locator("button[onclick='insertNode()']");
    const treeNodes = () => page.locator('#treeContainer .node');

    // Insert 5
    await input.fill('5');
    await insertButton.click();
    // After insertion input should be cleared
    await expect(input).toHaveValue('');

    // Insert 3
    await input.fill('3');
    await insertButton.click();
    await expect(input).toHaveValue('');

    // Insert 7
    await input.fill('7');
    await insertButton.click();
    await expect(input).toHaveValue('');

    // We expect three nodes rendered
    await expect(treeNodes()).toHaveCount(3);

    // The implementation adds nodes in in-order traversal order, so texts should be '3','5','7'
    const texts = await Promise.all([
      treeNodes().nth(0).textContent(),
      treeNodes().nth(1).textContent(),
      treeNodes().nth(2).textContent(),
    ]);
    // Trim whitespace and ensure numeric characters remain
    const trimmed = texts.map(t => (t || '').trim());
    expect(trimmed).toEqual(['3', '5', '7']);

    // Check connecting lines: child nodes (3 and 7) should contain a span.line element; root (5) should not
    const node0Lines = await treeNodes().nth(0).locator('.line').count(); // node 3
    const node1Lines = await treeNodes().nth(1).locator('.line').count(); // node 5 (root)
    const node2Lines = await treeNodes().nth(2).locator('.line').count(); // node 7

    expect(node0Lines).toBeGreaterThanOrEqual(1); // 3 should have a connecting line to its parent (5)
    expect(node1Lines).toBe(0); // root should not have a line attached
    expect(node2Lines).toBeGreaterThanOrEqual(1); // 7 should have a connecting line to its parent (5)

    // Ensure no unexpected page errors occurred during normal insertion/draw
    // (This test is independent of renderPage() missing test)
    expect(pageErrors.length).toBe(0);
  });

  test('Inserting non-numeric input has no effect (edge case) and duplicates are accepted to the right', async ({ page }) => {
    // Validate behavior for non-number insertion: nothing should be added.
    // Also validate duplicate insertion behavior (duplicates go to the right subtree).

    const input2 = page.locator('#inputValue');
    const insertButton2 = page.locator("button[onclick='insertNode()']");
    const treeNodes1 = () => page.locator('#treeContainer .node');

    // Start with a clean insertion of 10
    await input.fill('10');
    await insertButton.click();
    await expect(treeNodes()).toHaveCount(1);

    // Attempt to insert an empty value - should not change tree
    await input.fill(''); // empty input
    await insertButton.click();
    await expect(treeNodes()).toHaveCount(1);

    // Attempt to insert a non-numeric string via evaluate to simulate a user typing non-number into number input
    // Note: number input may restrict typing, but we can still attempt an invalid value programmatically
    await page.evaluate(() => {
      const el = document.getElementById('inputValue');
      // Force a non-numeric string into the input's value attribute (simulating edge case)
      el.value = 'abc';
    });
    await insertButton.click();
    // Tree should remain unchanged because parseInt('abc') is NaN and insertNode checks isNaN
    await expect(treeNodes()).toHaveCount(1);

    // Now test duplicate behavior: insert 10 again; implementation places duplicates to the right
    await input.fill('10');
    await insertButton.click();
    // There should now be two nodes with textContent '10'
    await expect(treeNodes()).toHaveCount(2);

    const texts1 = await page.locator('#treeContainer .node').allTextContents();
    // Both entries should be '10' (in-order traversal for duplicates will show duplicates together)
    const tens = texts.filter(t => t.trim() === '10');
    expect(tens.length).toBe(2);

    // No page errors expected from these operations
    expect(pageErrors.length).toBe(0);
  });

  test('drawTree() is defined and can be invoked directly without throwing', async ({ page }) => {
    // Validate that drawTree exists on the page and can be called (this corresponds to S1_TreeUpdated entry action in FSM)

    // Ensure drawTree is a function
    const drawType = await page.evaluate(() => typeof drawTree);
    expect(drawType).toBe('function');

    // Call drawTree directly; it should execute without throwing an uncaught exception
    let threw = false;
    try {
      await page.evaluate(() => {
        // call drawTree to ensure it runs in isolation
        drawTree();
      });
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(false);

    // No page errors should have been emitted by this call
    expect(pageErrors.length).toBe(0);
  });

  test('Observes console output and page errors during interactions', async ({ page }) => {
    // This test aggregates console and page error observations across a sample interaction flow.

    // Clear previous arrays (although beforeEach already reset them)
    consoleMessages = [];
    pageErrors = [];

    // Perform a sequence: attempt to call missing function (renderPage) to create a page error,
    // then perform a valid insertion to exercise normal console behavior.
    // 1) Trigger the missing renderPage to capture the ReferenceError
    let refErrorThrown = false;
    try {
      await page.evaluate(() => {
        // eslint-disable-next-line no-undef
        renderPage();
      });
    } catch (e) {
      refErrorThrown = true;
    }
    expect(refErrorThrown).toBe(true);

    // 2) Perform a valid insertion (value 42)
    await page.locator('#inputValue').fill('42');
    await page.locator("button[onclick='insertNode()']").click();

    // Give short time for any asynchronous console messages (if any)
    await page.waitForTimeout(100);

    // The pageErrors array should include at least the earlier ReferenceError
    const hasRenderPageError1 = pageErrors.some(err => /renderPage/i.test(err));
    expect(hasRenderPageError).toBeTruthy();

    // The DOM should reflect the successful insertion as well
    await expect(page.locator('#treeContainer .node')).toHaveCount(1);
    const content = (await page.locator('#treeContainer .node').nth(0).textContent()) || '';
    expect(content.trim()).toBe('42');

    // There might be console messages emitted; ensure none are unhandled errors besides the expected renderPage error
    const otherErrorConsoles = consoleMessages.filter(m => m.type === 'error' && !/renderPage/i.test(m.text));
    // It's acceptable if there are none; if there are, surface them for debugging (fail the test)
    expect(otherErrorConsoles.length).toBe(0);
  });
});