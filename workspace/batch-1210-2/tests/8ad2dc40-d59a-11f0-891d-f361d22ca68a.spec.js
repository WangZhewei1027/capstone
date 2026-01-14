import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad2dc40-d59a-11f0-891d-f361d22ca68a.html';

/**
 * Page object for the Binary Search Tree demo page.
 * Encapsulates navigation, listeners for console and page errors,
 * and helpful accessors for assertions.
 */
class BSTPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleMessages = [];
    this.pageErrors = [];

    // Attach listeners early so messages during navigation are captured.
    this.page.on('console', msg => {
      // Capture console text for inspection
      try {
        this.consoleMessages.push(msg.text());
      } catch (e) {
        // Best-effort: ignore if text() fails for some console types
        this.consoleMessages.push(String(msg));
      }
    });

    this.page.on('pageerror', error => {
      // Capture unhandled exceptions from the page
      this.pageErrors.push(error);
    });
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getTitle() {
    return this.page.title();
  }

  async getH1Text() {
    return this.page.locator('h1').innerText();
  }

  async getTreeInnerHTML() {
    return this.page.locator('#tree').innerHTML();
  }

  /**
   * Extract numeric keys from console messages that came from the in-order traversal logs.
   * The page logs lines like: "<key>  ->  <node.right>"
   * We filter for messages that contain the arrow "->" to reduce noise,
   * then extract the first integer found in each message.
   * Returns an array of numbers in the order they were logged.
   */
  getTraversalKeysFromConsole() {
    const arrowMessages = this.consoleMessages.filter(m => m.includes('->'));
    const keys = arrowMessages.map(m => {
      const match = m.match(/(-?\d+)/); // match first integer (positive/negative)
      return match ? Number(match[1]) : null;
    }).filter(k => k !== null);
    return keys;
  }

  /**
   * Utility to get raw captured console messages (for debugging assertions).
   */
  getRawConsoleMessages() {
    return this.consoleMessages.slice();
  }

  getPageErrors() {
    return this.pageErrors.slice();
  }
}

test.describe('Binary Search Tree Application - FSM State: S0_Idle', () => {
  // Each test gets a fresh page and BSTPage instance via Playwright fixtures.
  test.describe('Static rendering and FSM "Idle" state checks', () => {
    test('renders page title, header, and tree container (Idle state evidence)', async ({ page }) => {
      // Validate static DOM content asserted by the FSM evidence.
      const bst = new BSTPage(page);
      await bst.goto();

      // Title
      await expect(bst.getTitle()).resolves.toBe('Binary Search Tree');

      // Header H1
      await expect(bst.getH1Text()).resolves.toBe('Binary Search Tree');

      // Tree container exists and starts empty (implementation does not render nodes to DOM)
      const treeHtml = await bst.getTreeInnerHTML();
      expect(treeHtml).toBe('');
    });

    test('entry action "renderPage" is not defined on the global scope', async ({ page }) => {
      // The FSM listed an entry action "renderPage()". The implementation does not define it.
      // Ensure renderPage is not present as a function on window (i.e., not called by the page implicitly).
      const bst = new BSTPage(page);
      await bst.goto();

      // typeof renderPage should be 'undefined' (safe check that does not throw).
      const typeofRenderPage = await page.evaluate(() => typeof window.renderPage);
      expect(typeofRenderPage).toBe('undefined');

      // Also verify that attempting to access window.renderPage directly from window returns undefined
      const direct = await page.evaluate(() => window.renderPage === undefined);
      expect(direct).toBe(true);
    });

    test('bst variable declared with let is not exposed on window (scoped variable check)', async ({ page }) => {
      // The implementation uses "let bst = new BinarySearchTree();" at top-level script.
      // In browser scripts, top-level let does not create a window property. Confirm that.
      const bst = new BSTPage(page);
      await bst.goto();

      const bstOnWindow = await page.evaluate(() => ('bst' in window) ? window.bst : undefined);
      // Expect that window.bst is either undefined or not present because 'let' does not attach to window.
      expect(bstOnWindow).toBeUndefined();
    });
  });

  test.describe('Runtime behavior: in-order traversal and runtime errors', () => {
    test('in-order traversal logs keys in ascending order to console', async ({ page }) => {
      // The script performs an in-order traversal on load and logs each node's key.
      const bst = new BSTPage(page);
      await bst.goto();

      // Give the page a small moment to emit console messages during/after load.
      // Most console logs occur synchronously during parsing, so this is precautionary.
      await page.waitForTimeout(100);

      // Extract keys from console messages that contain the traversal arrow "->"
      const keys = bst.getTraversalKeysFromConsole();

      // The expected in-order traversal of [10,20,5,15,25] is [5,10,15,20,25]
      expect(keys).toEqual([5, 10, 15, 20, 25]);

      // For clarity, also assert that the raw console contains messages with "->"
      const raw = bst.getRawConsoleMessages();
      const hasArrowMessage = raw.some(m => m.includes('->'));
      expect(hasArrowMessage).toBe(true);
    });

    test('no unhandled page errors occurred during normal page load', async ({ page }) => {
      // Confirm that the page did not emit unexpected runtime exceptions on load.
      const bst = new BSTPage(page);
      await bst.goto();

      // Wait briefly to allow any asynchronous errors to surface.
      await page.waitForTimeout(100);

      const errors = bst.getPageErrors();
      // The implementation is valid JS and should not produce page errors on load.
      expect(errors.length).toBe(0);
    });

    test('calling missing entry action "renderPage()" from page context throws (ReferenceError)', async ({ page }) => {
      // Edge case: Verify behavior when the missing entry action is invoked.
      // We intentionally attempt to call renderPage() inside page.evaluate and assert it rejects.
      // This test DOES NOT modify the page environment; it simply attempts to call the undefined identifier.
      await page.goto(APP_URL);

      // Attempting to call an undefined identifier renderPage will throw in the page context.
      // We assert that the promise rejects. The exact error message can vary by engine,
      // so we only assert that an exception is thrown.
      await expect(page.evaluate(() => {
        // This will throw a ReferenceError in the page context because renderPage is not defined.
        // We purposely do NOT define or patch renderPage.
        // eslint-disable-next-line no-undef
        return renderPage();
      })).rejects.toThrow();
    });
  });

  test.describe('FSM coverage checks (states/transitions)', () => {
    test('FSM has a single initial Idle state present in DOM evidence', async ({ page }) => {
      // The FSM extraction reported one state S0_Idle with evidence of the DOM elements.
      // Validate that those DOM elements exist on the loaded page to satisfy the state's evidence.
      const bst = new BSTPage(page);
      await bst.goto();

      await expect(bst.getTitle()).resolves.toBe('Binary Search Tree');
      await expect(bst.getH1Text()).resolves.toBe('Binary Search Tree');

      // #tree exists
      const treeLocator = page.locator('#tree');
      await expect(treeLocator).toHaveCount(1);
    });

    test('no transitions/events are defined in the FSM - page has no interactive controls', async ({ page }) => {
      // The FSM extraction indicated zero transitions/events and the HTML has no inputs/buttons.
      // Validate that there are no interactive controls typically used for user actions.
      const bst = new BSTPage(page);
      await bst.goto();

      // Check commonly interactive elements are absent or empty
      const buttons = await page.locator('button').count();
      const inputs = await page.locator('input, textarea, select').count();
      const links = await page.locator('a').count();

      expect(buttons).toBe(0);
      expect(inputs).toBe(0);
      // There might be anchors elsewhere; FSM said none were present — assert anchor count is small (0 expected).
      expect(links).toBe(0);
    });
  });
});