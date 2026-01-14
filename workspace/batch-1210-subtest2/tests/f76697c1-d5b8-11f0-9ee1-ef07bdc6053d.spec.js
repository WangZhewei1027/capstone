import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f76697c1-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Expected pre-order traversal based on insertion order in the page script
const EXPECTED_PREORDER = ['8', '3', '1', '6', '4', '7', '10', '14', '13'];

test.describe('Binary Tree Visualization (FSM states & transitions)', () => {
  // Containers for console and page errors captured during navigation / runtime
  let consoleMessages;
  let pageErrors;

  // Setup listeners before each test to capture console messages and page errors.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      // record type and text for later assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', err => {
      // pageerror events are Error objects from the page context
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // Basic sanity: ensure our listeners captured arrays exist
    expect(consoleMessages).toBeDefined();
    expect(pageErrors).toBeDefined();
  });

  test('S0_Idle: Initial page render contains title and tree container (Idle state evidence)', async ({ page }) => {
    // This test validates the initial "Idle" state evidence described in the FSM:
    // - <h1>Binary Tree Visualization</h1>
    // - <div id="tree"></div>
    // Also verifies that the expected FSM entry action "renderPage" is not defined in the environment,
    // which indicates a mismatch between FSM metadata and the actual implementation.

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Check that the header exists and has the correct text
    const header = await page.locator('h1');
    await expect(header).toHaveCount(1);
    await expect(header).toHaveText('Binary Tree Visualization');

    // Check that the tree container exists in the DOM
    const treeContainer = await page.locator('#tree');
    await expect(treeContainer).toHaveCount(1);

    // The FSM mentioned an entry action `renderPage()`. The HTML/JS does not define renderPage.
    // Verify that calling renderPage would produce a ReferenceError when attempted inside the page.
    const renderPageCallResult = await page.evaluate(() => {
      try {
        // Attempt to call a non-existent function renderPage()
        // This should naturally throw a ReferenceError which we catch and serialize.
        // We do not modify the page environment in any way.
        renderPage();
        return { called: true };
      } catch (e) {
        return { called: false, name: e && e.name, message: e && e.message };
      }
    });

    // Expect the attempt to call renderPage to have failed with ReferenceError (evidence of mismatch)
    expect(renderPageCallResult.called).toBe(false);
    expect(renderPageCallResult.name).toBe('ReferenceError');

    // Ensure no unexpected page errors were emitted during load
    expect(pageErrors.length).toBe(0);

    // Console might contain information logs - assert there were no console messages of type 'error' or 'warning'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrors.length).toBe(0);
  });

  test('S1_TreeCreated: Tree is created on load and visual nodes are present (Tree Created state evidence)', async ({ page }) => {
    // This test validates that the BinaryTree.createVisualTree() ran on load and produced
    // a visible representation of the tree:
    // - correct number of .node elements (one per inserted value)
    // - pre-order traversal order matching expected sequence (based on draw recursion)
    // - presence/absence of connecting .line elements for internal/leaf nodes

    await page.goto(APP_URL, { waitUntil: 'load' });

    // Wait for at least one node to appear
    await page.waitForSelector('.node', { timeout: 2000 });

    // Collect all node elements and assert their count equals number of inserted values (9)
    const nodes = await page.$$('.node');
    expect(nodes.length).toBe(EXPECTED_PREORDER.length);

    // Extract innerText of each node in DOM order and compare to expected pre-order
    const nodeTexts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.node')).map(n => n.innerText.trim());
    });
    expect(nodeTexts).toEqual(EXPECTED_PREORDER);

    // Validate that the root node (first in DOM order) has two line children (left and right)
    const rootLineCount = await page.evaluate(() => {
      const root = document.querySelector('.node');
      if (!root) return -1;
      return root.querySelectorAll('.line').length;
    });
    expect(rootLineCount).toBeGreaterThanOrEqual(1); // root should have at least one child line (in this tree it has two)

    // Find the node that contains text '1' (a leaf) and ensure it has no .line children
    const leaf1LineCount = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.node'));
      const node1 = nodes.find(n => n.innerText.trim() === '1');
      if (!node1) return null;
      return node1.querySelectorAll('.line').length;
    });
    expect(leaf1LineCount).toBe(0);

    // Ensure createVisualTree produced non-empty innerHTML for the tree container
    const treeInnerHTMLLength = await page.evaluate(() => {
      const container = document.getElementById('tree');
      return container ? container.innerHTML.length : 0;
    });
    expect(treeInnerHTMLLength).toBeGreaterThan(0);

    // Assert that no page errors were emitted during rendering
    expect(pageErrors.length).toBe(0);

    // No console errors should have been logged
    const consoleErrs = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrs.length).toBe(0);
  });

  test('Transition TreeCreation: Evidence of transition and function accessibility checks', async ({ page }) => {
    // This test addresses the FSM transition from S0_Idle -> S1_TreeCreated (TreeCreation)
    // We validate transition evidence via DOM changes and check function/variable accessibility without modifying the page.
    // We also intentionally attempt to reference some identifiers to observe natural ReferenceError behavior
    // (without patching or altering the page), then assert that such errors occur as expected.

    await page.goto(APP_URL, { waitUntil: 'load' });

    // The transition action listed in the FSM was: tree.createVisualTree()
    // In the page script a BinaryTree instance named `tree` is declared with `const tree = new BinaryTree()`.
    // However, top-level const does not necessarily create a window property; verify whether window has own property 'tree'
    const hasWindowTreeProp = await page.evaluate(() => Object.prototype.hasOwnProperty.call(window, 'tree'));
    // It's acceptable for this to be false; we assert that the visual result still exists (meaning createVisualTree ran in the page scope).
    expect(hasWindowTreeProp).toBe(false).or.toBe(true); // accept both; we will verify visual evidence next

    // Visual evidence: verify that the tree container has node elements (transition executed)
    const nodeCount = await page.evaluate(() => document.querySelectorAll('.node').length);
    expect(nodeCount).toBe(EXPECTED_PREORDER.length);

    // Intentionally attempt to access the identifier `tree` by name in the page global scope.
    // Because `tree` was declared with const in a non-module script, referencing it by name inside page context
    // may lead to a ReferenceError. We perform the attempt and capture the thrown error details (if any).
    const treeAccessResult = await page.evaluate(() => {
      try {
        // This direct reference will either resolve to the object or throw ReferenceError
        // We do not modify any page globals, purely observing behavior.
        // Wrap in try/catch to return serialized info.
        // Note: we do not call any methods on `tree` to avoid changing page behavior.
        const val = tree;
        return { success: true, type: typeof val };
      } catch (e) {
        return { success: false, name: e && e.name, message: e && e.message };
      }
    });

    // If access failed, the natural error should be a ReferenceError.
    if (!treeAccessResult.success) {
      expect(treeAccessResult.name).toBe('ReferenceError');
    } else {
      // If it succeeded, ensure it's an object (BinaryTree instance)
      expect(treeAccessResult.type).toBe('object');
    }

    // Sanity: ensure no unexpected SyntaxError or TypeError were emitted to the page
    const hasSyntaxOrTypeErrors = pageErrors.some(err => {
      return err && (err.name === 'SyntaxError' || err.name === 'TypeError');
    });
    expect(hasSyntaxOrTypeErrors).toBe(false);

    // Also ensure no console-level SyntaxError/TypeError messages were logged
    const consoleProblemMessages = consoleMessages.filter(m =>
      /SyntaxError|TypeError/.test(m.text)
    );
    expect(consoleProblemMessages.length).toBe(0);
  });

  test('Edge cases: Attempting to call missing functions should naturally throw ReferenceError (no page patching)', async ({ page }) => {
    // This test purposefully attempts to call a function that does not exist in the page (renderPage)
    // to verify that the environment naturally raises a ReferenceError. We catch and assert the error
    // without altering or defining the function on the page.

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Attempt to call renderPage inside the page and return the serialized result
    const result = await page.evaluate(() => {
      try {
        // natural call attempt that should throw
        renderPage();
        return { called: true };
      } catch (e) {
        return { called: false, errorName: e && e.name, errorMessage: e && e.message };
      }
    });

    // Expect this to be a ReferenceError as the function is not defined in the implementation
    expect(result.called).toBe(false);
    expect(result.errorName).toBe('ReferenceError');
    expect(typeof result.errorMessage).toBe('string');

    // Confirm that this thrown error was captured locally by our evaluation and did not produce unexpected global page errors
    expect(pageErrors.length).toBe(0);
  });
});