import { test, expect } from '@playwright/test';

// URL of the served HTML for this interactive application
const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad32a61-d59a-11f0-891d-f361d22ca68a.html';

// Page Object for the Adjacency Matrix page
class AdjacencyMatrixPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.rowsInput = page.locator('#rows');
    this.columnsInput = page.locator('#columns');
    this.form = page.locator('#matrix-form');
    this.submitButton = page.locator('button[type="submit"]');
    this.resultDiv = page.locator('#result');
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillDimensions(rows, columns) {
    await this.rowsInput.fill(String(rows));
    await this.columnsInput.fill(String(columns));
  }

  async submitForm() {
    // Use click on the submit button to trigger form submit
    await this.submitButton.click();
  }

  async getResultText() {
    return (await this.resultDiv.textContent()) || '';
  }

  async getResultInnerHTML() {
    return (await this.page.locator('#result').innerHTML()) || '';
  }
}

test.describe('Adjacency Matrix interactive app (FSM validation)', () => {
  // Collect console messages and page errors for each test
  test.beforeEach(async ({ page }) => {
    // Ensure a fresh page for each test
    // Nothing to setup beyond navigation in each test to keep tests isolated
  });

  // Test the initial Idle state (S0_Idle)
  test('Initial Idle state renders page and form elements (S0_Idle)', async ({ page }) => {
    // Observe console and page errors
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const app = new AdjacencyMatrixPage(page);
    // Navigate to the application page
    await app.goto();

    // Verify the entry evidence from FSM: heading and form exist
    await expect(app.heading).toHaveText('Adjacency Matrix');
    await expect(app.form).toBeVisible();

    // Verify inputs and submit button are present as described in components
    await expect(app.rowsInput).toBeVisible();
    await expect(app.columnsInput).toBeVisible();
    await expect(app.submitButton).toBeVisible();
    await expect(app.resultDiv).toBeVisible();

    // Verify result div is initially empty (no matrix generated yet)
    const initialResult = await app.getResultText();
    expect(initialResult.trim()).toBe('', 'Result div should be empty in Idle state');

    // Assert that there were no uncaught page errors during initial render
    expect(pageErrors.length).toBe(0);

    // Optionally assert that no console.error messages were emitted
    const consoleErrorMsgs = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrorMsgs.length).toBe(0);
  });

  // Test the transition: submit form with valid positive integers -> Matrix Generated (S1_MatrixGenerated)
  test('Submit form with valid integers generates an adjacency matrix (S0_Idle -> S1_MatrixGenerated)', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const app = new AdjacencyMatrixPage(page);
    await app.goto();

    // Prepare a 2x3 matrix and submit
    await app.fillDimensions(2, 3);
    await app.submitForm();

    // After submission, resultDiv should contain a table representation created by the script
    // The implementation constructs matrix rows as "0 | 1 | 2" and "3 | 4 | 5" for 2 rows and 3 columns
    // Wait for the resultDiv to contain some content
    await expect(app.resultDiv).not.toBeEmpty({ timeout: 2000 });

    const resultHTML = await app.getResultInnerHTML();
    // The implementation wraps the matrixHtml inside a <table> tag string; check for table existence
    expect(resultHTML).toContain('<table>');

    // Check that the textual representation of the matrix is present in the rendered result
    const resultText = await app.getResultText();
    // The rows are joined with ' | ', check for the expected row strings
    expect(resultText).toContain('0 | 1 | 2');
    expect(resultText).toContain('3 | 4 | 5');

    // There should be no uncaught page errors as the script runs normally
    expect(pageErrors.length).toBe(0);

    // No console error messages are expected
    const consoleErrorMsgs = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrorMsgs.length).toBe(0);
  });

  // Edge case: submit with zero rows (expect alert and no matrix generation)
  test('Submitting zero rows triggers alert and prevents matrix generation (edge case)', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    const dialogs = [];

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    page.on('dialog', async (dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      // Dismiss the dialog to allow test to continue
      await dialog.dismiss();
    });

    const app = new AdjacencyMatrixPage(page);
    await app.goto();

    // Fill rows as 0 and columns as 3 to trigger the validation branch that calls alert(...)
    await app.fillDimensions(0, 3);

    // Click submit to trigger the form submit handler
    await app.submitForm();

    // Expect an alert dialog to have been shown with the specified message
    // The implementation shows: 'Please enter a positive number for both rows and columns.'
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    expect(dialogs[0].message).toContain('Please enter a positive number for both rows and columns.');

    // Ensure result remains empty (matrix should not be generated)
    const resultText = await app.getResultText();
    expect(resultText.trim()).toBe('');

    // No uncaught page errors expected
    expect(pageErrors.length).toBe(0);

    // No console errors expected for this validation path
    const consoleErrorMsgs = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrorMsgs.length).toBe(0);
  });

  // Edge case: negative columns triggers alert and prevents matrix generation
  test('Submitting negative columns triggers alert and prevents matrix generation (edge case)', async ({ page }) => {
    const dialogs = [];
    const pageErrors = [];

    page.on('dialog', async (dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.dismiss();
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const app = new AdjacencyMatrixPage(page);
    await app.goto();

    // Negative columns should cause the same alert behavior
    await app.fillDimensions(2, -1);
    await app.submitForm();

    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    expect(dialogs[0].message).toContain('Please enter a positive number for both rows and columns.');

    // Result div should remain empty
    const resultText = await app.getResultText();
    expect(resultText.trim()).toBe('');

    // No uncaught page errors expected
    expect(pageErrors.length).toBe(0);
  });

  // Edge case: decimal inputs should be parsed with parseInt (truncation)
  test('Decimal dimensions are parsed with parseInt (truncated) and matrix generated accordingly', async ({ page }) => {
    const pageErrors = [];
    const consoleMessages = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    const app = new AdjacencyMatrixPage(page);
    await app.goto();

    // Fill with decimals: rows = 1.9 -> parseInt -> 1, columns = 2.7 -> parseInt -> 2
    await app.fillDimensions('1.9', '2.7');
    await app.submitForm();

    // Expect a 1x2 matrix (values: 0 | 1)
    await expect(app.resultDiv).not.toBeEmpty({ timeout: 2000 });
    const resultText = await app.getResultText();
    expect(resultText).toContain('0 | 1');

    // Ensure that there were no uncaught page errors
    expect(pageErrors.length).toBe(0);

    // No console error messages expected
    const consoleErrorMsgs = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrorMsgs.length).toBe(0);
  });

  // Edge case: try to submit with empty required fields - browser validation should prevent submit
  test('Submitting with empty required fields should not trigger form submit (browser validation)', async ({ page }) => {
    const pageErrors = [];
    const consoleMessages = [];
    let submitEventFired = false;

    // Attempt to detect whether the submit event handler is invoked by instrumenting page to add a listener
    // NOTE: We do NOT modify or patch existing functions per instructions. Instead, we observe side effects:
    // If no matrix appears after clicking submit, we infer that the browser prevented submission due to 'required' attributes.
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    const app = new AdjacencyMatrixPage(page);
    await app.goto();

    // Ensure inputs are empty
    await app.rowsInput.fill('');
    await app.columnsInput.fill('');

    // Click submit button; browser validation should block submission and thus no matrix will be generated
    await app.submitButton.click();

    // Wait briefly for any potential submission side effects
    await page.waitForTimeout(300);

    const resultText = await app.getResultText();
    // Since required attributes are present, the form should not have been submitted and result should still be empty
    expect(resultText.trim()).toBe('', 'Form should not submit when required fields are empty');

    // No uncaught page errors expected
    expect(pageErrors.length).toBe(0);

    // No console errors expected
    const consoleErrorMsgs = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrorMsgs.length).toBe(0);
  });

  // Additional test: small 1x1 matrix generation and content verification
  test('Generate a 1x1 matrix and verify the single cell content', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const app = new AdjacencyMatrixPage(page);
    await app.goto();

    // Fill 1 row and 1 column
    await app.fillDimensions(1, 1);
    await app.submitForm();

    // Expect table to contain "0"
    await expect(app.resultDiv).not.toBeEmpty();
    const resultText = await app.getResultText();
    expect(resultText).toContain('0');

    // No uncaught page errors expected
    expect(pageErrors.length).toBe(0);
  });
});