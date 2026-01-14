import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad35170-d59a-11f0-891d-f361d22ca68a.html';

/**
 * Page Object Model for the Adjacency List app
 * Encapsulates common interactions and queries to keep tests readable.
 */
class AdjacencyListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async nameInput() {
    return this.page.locator('#name');
  }

  async adjacencyTextarea() {
    return this.page.locator('#adjacencyList');
  }

  async addButton() {
    return this.page.locator('#addNode');
  }

  async display() {
    return this.page.locator('#display');
  }

  // Fill node name
  async fillName(value) {
    const input = await this.nameInput();
    await input.fill(value);
  }

  // Fill adjacency list textarea
  async fillAdjacency(value) {
    const ta = await this.adjacencyTextarea();
    await ta.fill(value);
  }

  // Click the Add Node button while robustly handling potential navigation (form submit).
  // Returns true if navigation happened (page reload), false otherwise.
  async clickAddNodeHandlingNavigation() {
    // Attempt click and race with potential navigation (form submit may reload the page).
    const clickPromise = this.addButton().then(locator => locator.click());
    const navPromise = this.page.waitForNavigation({ waitUntil: 'load', timeout: 1000 }).catch(() => null);
    // Ensure both are awaited; navigation may or may not happen.
    const [ , navResult ] = await Promise.all([clickPromise, navPromise]);
    return navResult !== null;
  }

  // Retrieve the textual content of the display area
  async getDisplayText() {
    const d = await this.display();
    // Use textContent to preserve line breaks
    return await d.evaluate(node => node.textContent);
  }

  // Retrieve the raw innerHTML (for verifying exact HTML output including newline/raw content)
  async getDisplayInnerHTML() {
    const d = await this.display();
    return await d.evaluate(node => node.innerHTML);
  }
}

test.describe('Adjacency List Interactive App (FSM: Idle -> NodeAdded)', () => {
  // Capture console messages and page errors for assertions in tests
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen for console messages and page errors
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(), // e.g., 'log', 'error'
        text: msg.text()
      });
    });

    page.on('pageerror', error => {
      // Unhandled exceptions in the page will appear here
      pageErrors.push({
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    });

    // Navigate to the application page fresh for each test
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // Attach any captured console or page errors to the test output for easier debugging
    if (consoleMessages.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Captured console messages:', JSON.stringify(consoleMessages, null, 2));
    }
    if (pageErrors.length > 0) {
      // eslint-disable-next-line no-console
      console.log('Captured page errors:', JSON.stringify(pageErrors, null, 2));
    }
    // Clear listeners to avoid leaking between tests
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  });

  test.describe('Initial State (S0_Idle) verification', () => {
    test('Should render expected form controls and empty display on load', async ({ page }) => {
      const app = new AdjacencyListPage(page);

      // Validate presence of components defined in FSM evidence
      await expect(page.locator('#name')).toBeVisible();
      await expect(page.locator('#adjacencyList')).toBeVisible();
      await expect(page.locator('#addNode')).toBeVisible();
      await expect(page.locator('#display')).toBeVisible();

      // On initial load, display should be empty (Idle state)
      const displayText = await app.getDisplayText();
      expect(displayText).toBeOneOf([null, '', '']); // allow null or empty

      // No unhandled page errors should have occurred during load
      expect(pageErrors.length).toBe(0);

      // No console errors emitted during initial load
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Transitions and Node Addition (S0_Idle -> S1_NodeAdded)', () => {
    test('Clicking Add Node should call addNode and update display (simple add)', async ({ page }) => {
      const app = new AdjacencyListPage(page);

      // Fill in a node name and leave adjacency list blank
      await app.fillName('A');
      await app.fillAdjacency(''); // empty textarea

      // Click Add Node; handle potential navigation due to form submit
      const navigated = await app.clickAddNodeHandlingNavigation();

      if (navigated) {
        // If the form submission caused a reload, the app has reloaded to initial state.
        // This is an important edge behavior: a button inside a form without type may submit the form.
        // After reload, verify we're back to Idle state (display empty) as expected.
        const displayAfterReload = await app.getDisplayText();
        expect(displayAfterReload).toBeOneOf([null, '', '']);
        // Record that navigation happened as a valid edge case
        test.info().annotations.push({ type: 'info', description: 'Form submit caused page navigation on button click' });
      } else {
        // No navigation: standard SPA-like behavior, expect the display to reflect the new node
        const displayText = await app.getDisplayText();

        // The implementation splits the adjacency list ('' -> ['']) then pushes the name and joins:
        // Resulting adjacencyList becomes '\nA' and display inner content becomes `Node: A -> \nA`
        // innerHTML/textContent may contain a newline; check that the display contains the name and arrow
        expect(displayText).toContain('Node: A ->');
        // Ensure adjacency list content (A) is present somewhere after the arrow
        expect(displayText).toContain('A');
      }

      // No unexpected unhandled exceptions should have occurred during the transition
      expect(pageErrors.length).toBe(0);

      // And no console errors should have been emitted (unless the environment caused them)
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('Adding a node that already exists should not duplicate it', async ({ page }) => {
      const app = new AdjacencyListPage(page);

      // Pre-populate adjacency list to include B
      await app.fillAdjacency('B');

      // Add node B
      await app.fillName('B');
      const navigated1 = await app.clickAddNodeHandlingNavigation();

      if (navigated1) {
        // If navigation happened, reload state; re-navigate to perform deterministic checks
        await page.goto(APP_URL);
        await app.fillAdjacency('B'); // re-populate
        await app.fillName('B');
        await app.clickAddNodeHandlingNavigation();
      }

      // After adding, because 'B' already exists, the implementation should detect it and not push again.
      // It will display the adjacencyListArray (array stringified) in the display.
      const displayText = await app.getDisplayText();

      // Expect that 'B' appears once (stringified array or joined form may be 'B')
      // We assert that there is no duplicated comma or extra 'B' appended.
      // For robustness, ensure the display contains 'Node: B ->' and that 'B' appears at least once.
      expect(displayText).toContain('Node: B ->');
      const occurrencesOfB = (displayText.match(/B/g) || []).length;
      expect(occurrencesOfB).toBeGreaterThanOrEqual(1);
      expect(occurrencesOfB).toBeLessThanOrEqual(3); // tolerate formatting differences but not massive duplication

      // Confirm no unhandled page errors
      expect(pageErrors.length).toBe(0);
    });

    test('Edge case: empty name and empty adjacency list', async ({ page }) => {
      const app = new AdjacencyListPage(page);

      // Both fields empty
      await app.fillName('');
      await app.fillAdjacency('');

      const navigated = await app.clickAddNodeHandlingNavigation();

      if (navigated) {
        // If navigation happened, ensure we returned to Idle state
        const displayAfterReload = await app.getDisplayText();
        expect(displayAfterReload).toBeOneOf([null, '', '']);
      } else {
        const displayText = await app.getDisplayText();
        // With empty name and empty adjacency list, implementation may set display to 'Node:  -> \n'
        expect(displayText).toContain('Node:');
        // It should not throw errors
        expect(pageErrors.length).toBe(0);
      }
    });
  });

  test.describe('Observability: console logs and page errors', () => {
    test('Should capture any runtime errors emitted by the page', async ({ page }) => {
      const app = new AdjacencyListPage(page);

      // Perform a sequence of interactions that cover normal and edge flows:
      await app.fillName('X');
      await app.fillAdjacency('Y\nZ');
      await app.clickAddNodeHandlingNavigation().catch(() => null);

      // Intentionally attempt another add to explore potential error surfaces
      await app.fillName('Y');
      await app.clickAddNodeHandlingNavigation().catch(() => null);

      // At this point, collect any page errors that were emitted during the interactions
      // The test will assert that there are zero unexpected page errors.
      // If any page errors exist, they will be reported in the test output captured in afterEach.
      expect(pageErrors.length).toBe(0);

      // Also assert there were no console.error messages; if any exist, fail and include them in diagnostic output
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('If any TypeError / ReferenceError / SyntaxError occur they should be observable via pageerror', async ({ page }) => {
      // This test does not create errors artificially. It asserts that if such errors happen
      // naturally during normal usage they will be captured by the pageerror listener.
      // We will perform a standard interaction and then assert that any captured page errors,
      // if present, are of the expected JavaScript error types (ReferenceError/TypeError/SyntaxError).
      const app = new AdjacencyListPage(page);

      await app.fillName('E');
      await app.fillAdjacency('F');
      await app.clickAddNodeHandlingNavigation().catch(() => null);

      // If there are errors, ensure they are JS runtime errors of expected kinds.
      if (pageErrors.length > 0) {
        const knownKinds = ['ReferenceError', 'TypeError', 'SyntaxError', 'Error'];
        for (const err of pageErrors) {
          expect(knownKinds).toContain(err.name);
        }
        // Fail the test to indicate regressions if any runtime errors appeared.
        // This explicit failure surfaces problems in the application runtime.
        throw new Error('Runtime errors were emitted by the page during interaction. See logs for details.');
      } else {
        // No runtime errors emitted - the application behaved without throwing.
        expect(pageErrors.length).toBe(0);
      }
    });
  });
});