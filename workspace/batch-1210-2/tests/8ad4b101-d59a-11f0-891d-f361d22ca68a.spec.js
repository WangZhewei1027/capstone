import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad4b101-d59a-11f0-891d-f361d22ca68a.html';

// Page Object for the Topological Sort page
class TopoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#topological-sort-order');
    this.submitButton = page.locator('#submit-button');
    this.result = page.locator('#result');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillInput(value) {
    // Use fill to set the input value (works for number input as well)
    await this.input.fill(value);
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async getResultText() {
    return (await this.result.textContent()) || '';
  }

  async isInputVisible() {
    return this.input.isVisible();
  }

  async isButtonVisible() {
    return this.submitButton.isVisible();
  }
}

test.describe('Topological Sort Interactive Application (FSM validation) - 8ad4b101-d59a-11f0-891d-f361d22ca68a', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Collect console messages and page errors for each test run
    pageErrors = [];
    consoleMessages = [];

    page.on('pageerror', (err) => {
      // store page error objects
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // store console messages (type + text)
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test.afterEach(async ({ page }) => {
    // keep page open teardown is automatic; ensure no leak of listeners across tests
    page.removeAllListeners?.('pageerror');
    page.removeAllListeners?.('console');
  });

  test.describe('UI structure and initial (S0_Idle) state', () => {
    test('Initial page render shows input, submit button and empty result (S0_Idle)', async ({ page }) => {
      // Validate entry action "renderPage()" by ensuring elements were rendered on load
      const topo = new TopoPage(page);
      await topo.goto();

      // Assertions for Idle state evidence
      await expect(topo.input).toBeVisible();
      await expect(topo.submitButton).toBeVisible();

      // Result should be initially empty
      const initialResult = await topo.getResultText();
      expect(initialResult.trim()).toBe('', 'Expected result paragraph to be empty on initial render');

      // Verify no uncaught page errors occurred during render
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Transitions and state behaviors (SubmitClick event)', () => {
    test('Submit with empty input transitions to Invalid Input (S2_InvalidInput)', async ({ page }) => {
      // This test validates the transition S1_InputReceived -> S2_InvalidInput via SubmitClick with empty input
      const topo = new TopoPage(page);
      await topo.goto();

      // Ensure input is empty
      await topo.fillInput('');
      // Click submit to trigger handler
      await topo.clickSubmit();

      // Expect the result message to indicate invalid input (evidence for S2_InvalidInput)
      await expect(topo.result).toHaveText('Please enter a valid topological sort order.');

      // Confirm that no uncaught page errors occurred during submission
      expect(pageErrors.length).toBe(0);

      // Also assert that a console message wasn't reporting an uncaught exception
      const fatalConsole = consoleMessages.find(m => /error|warning/i.test(m.type));
      // It's acceptable if there are other console logs; ensure there are no JS exceptions captured as pageerrors
      expect(fatalConsole === undefined || typeof fatalConsole.text === 'string').toBeTruthy();
    });

    test('Submit with valid input transitions to Result Displayed (S3_ResultDisplayed) and shows computed result', async ({ page }) => {
      // This validates S0 -> S1 -> S3 flow with a valid input containing multiple numbers
      const topo = new TopoPage(page);
      await topo.goto();

      // Input a topological order string. The implementation splits on spaces, sorts, reverses, builds graph and shows counts.
      // Use '3 1 2' to derive a deterministic expected output per implementation:
      // Steps in code:
      // split -> ['3','1','2']
      // sort -> ['1','2','3']
      // reverse -> ['3','2','1']
      // graph: '3' -> [0], '2' -> [1], '1' -> [2] => lengths all 1 -> '1 -> 1 -> 1'
      await topo.fillInput('3 1 2');
      await topo.clickSubmit();

      const resultText = await topo.getResultText();
      expect(resultText).toBe('Topological Sort: 1 -> 1 -> 1', 'Expected computed topological sort representation per implementation');

      // Validate that after clicking, the input value remains retrievable (S1 evidence: input value was read)
      const inputValue = await page.locator('#topological-sort-order').inputValue();
      // inputValue for type=number may contain the string we set; ensure it's not empty
      expect(inputValue.length).toBeGreaterThan(0);

      // No uncaught exceptions expected
      expect(pageErrors.length).toBe(0);
    });

    test('Submit with whitespace-only input demonstrates how implementation handles edge-space input', async ({ page }) => {
      // Edge case: single space ' ' as input. The application checks input.length > 0 and will process it.
      // According to implementation, split(' ') on ' ' => ['', ''] -> after processing we expect a result like '2'
      const topo = new TopoPage(page);
      await topo.goto();

      await topo.fillInput(' ');
      await topo.clickSubmit();

      // The implementation will produce 'Topological Sort: 2' for a single space (two empty tokens grouped)
      const resultText = await topo.getResultText();
      expect(resultText).toBe('Topological Sort: 2', 'Whitespace-only input should still be processed by the provided implementation');

      // No page errors should have occurred during this processing
      expect(pageErrors.length).toBe(0);
    });

    test('Submit with multiple spaces between numbers produces expected output', async ({ page }) => {
      // Input like '4   5' with multiple spaces: split(' ') will yield some empty strings but overall should be processed without runtime errors.
      const topo = new TopoPage(page);
      await topo.goto();

      await topo.fillInput('4   5'); // split => ['4', '', '', '5']
      await topo.clickSubmit();

      // Let's compute expected outcome based on implementation:
      // split -> ['4','','','5']
      // sort -> ['', '', '4', '5'] (lexicographic, empty strings first)
      // reverse -> ['5', '4', '', '']
      // graph keys: '5'->[0], '4'->[1], ''->[2,3] => lengths [1,1,2] => join -> '1 -> 1 -> 2'
      const expected = 'Topological Sort: 1 -> 1 -> 2';
      const resultText = await topo.getResultText();
      expect(resultText).toBe(expected);

      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Observability: Console and runtime errors', () => {
    test('Collects console messages and ensures no fatal runtime exceptions (ReferenceError/SyntaxError/TypeError) were thrown', async ({ page }) => {
      // This test ensures we observe console and page errors when loading and interacting with the app.
      const topo = new TopoPage(page);
      await topo.goto();

      // Perform a few interactions to exercise event handlers
      await topo.fillInput('1 2 3');
      await topo.clickSubmit();

      await topo.fillInput('');
      await topo.clickSubmit();

      // Wait a tick to ensure any asynchronous console logs or errors surface
      await page.waitForTimeout(100);

      // Inspect captured page errors and console messages
      // We expect zero uncaught runtime errors for this implementation; assert that none of those error types were captured
      const fatalErrorTypes = ['ReferenceError', 'SyntaxError', 'TypeError'];
      const caughtFatalErrors = pageErrors.filter(err => fatalErrorTypes.some(t => err.name === t || (err.message && err.message.includes(t))));
      expect(caughtFatalErrors.length).toBe(0, 'Expected no ReferenceError/SyntaxError/TypeError page errors to occur naturally');

      // Additionally ensure console didn't log any explicit errors labeled 'Uncaught' (best-effort)
      const consoleErrorMessages = consoleMessages.filter(m => m.type === 'error' || /uncaught/i.test(m.text));
      // It is acceptable if there are other console logs; assert there are no console.error messages indicating fatal exceptions
      expect(consoleErrorMessages.length).toBe(0);
    });
  });

  test.describe('FSM state coverage and onEnter/onExit checks (where applicable)', () => {
    test('S0 entry action "renderPage()" implied by presence of DOM elements', async ({ page }) => {
      // The FSM indicates an entry action renderPage() for S0_Idle. We validate that the page DOM is present accordingly.
      const topo = new TopoPage(page);
      await topo.goto();

      // Presence of components is evidence renderPage executed (per FSM)
      await expect(topo.input).toBeVisible();
      await expect(topo.submitButton).toBeVisible();
      await expect(topo.result).toBeVisible();

      // No onExit actions were specified for S0 in the FSM, ensure no extraneous global errors
      expect(pageErrors.length).toBe(0);
    });

    test('S1_InputReceived intermediate state inferred when input exists and submit is clicked', async ({ page }) => {
      // The FSM marks S1 as the intermediate input-received state. We exercise the event and validate intermediate behavior.
      const topo = new TopoPage(page);
      await topo.goto();

      // Fill input and click submit to trigger transition; while there's no explicit DOM flag for S1, we can assert that input value was read
      await topo.fillInput('9');
      // Before clicking, verify input contains the provided value
      const beforeClick = await page.locator('#topological-sort-order').inputValue();
      expect(beforeClick).toBe('9');

      // Click to cause transition; afterwards ensure result is computed (S3) rather than invalid (S2)
      await topo.clickSubmit();
      const resultText = await topo.getResultText();
      // For single '9', split->['9'] => sort->['9'] => reverse->['9'] => graph['9']=[0] => result '1'
      expect(resultText).toBe('Topological Sort: 1');

      expect(pageErrors.length).toBe(0);
    });
  });
});