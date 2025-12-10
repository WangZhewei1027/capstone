import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888af93-d59e-11f0-b3ae-79d1ce7b5503.html';

test.describe('Set Operations Demo - 0888af93-d59e-11f0-b3ae-79d1ce7b5503', () => {
  // Arrays to capture runtime console messages and page errors for each test.
  // We initialize them per test in beforeEach to ensure isolation.
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    // Reset arrays for each test run
    pageErrors = [];
    consoleMessages = [];

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      // store the message for assertions
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Collect console messages and their types
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the application page as-is.
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Ensure there were no uncaught page errors during the test.
    // The application is expected to run without uncaught exceptions.
    expect(pageErrors, `Unexpected page errors: ${JSON.stringify(pageErrors)}`).toHaveLength(0);

    // Also expect no console messages of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors, `Console errors were logged: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
  });

  test('Initial page load: UI elements are present and output is empty', async ({ page }) => {
    // Purpose: Verify the initial state of the page on load (inputs, button, and output container).
    const heading = page.locator('#set-container h2');
    const input1 = page.locator('#inputSet1');
    const input2 = page.locator('#inputSet2');
    const button = page.getByRole('button', { name: 'Perform Set Operations' });
    const output = page.locator('#output');

    await expect(heading).toHaveText('Set Operations Demonstration');
    await expect(input1).toBeVisible();
    await expect(input2).toBeVisible();
    await expect(input1).toHaveAttribute('placeholder', 'Enter Set 1 (comma separated)');
    await expect(input2).toHaveAttribute('placeholder', 'Enter Set 2 (comma separated)');
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    // The output div exists and should be present, default content should be empty or whitespace-only
    await expect(output).toBeVisible();
    const outputText = (await output.innerText()).trim();
    expect(outputText === '' || outputText === '\n' || outputText === null).toBeTruthy();
  });

  test('Basic set operations produce correct union, intersection, difference, and symmetric difference', async ({ page }) => {
    // Purpose: Enter two simple sets and verify all displayed results match the algorithm in the page's script.
    const input11 = page.locator('#inputSet1');
    const input21 = page.locator('#inputSet2');
    const button1 = page.getByRole('button1', { name: 'Perform Set Operations' });
    const output1 = page.locator('#output1');

    // Provide Set 1 = a, b, c and Set 2 = b, c, d
    await input1.fill('a, b, c');
    await input2.fill('b, c, d');

    // Trigger the set operations
    await button.click();

    // Verify the Results header is present
    await expect(output.locator('h3')).toHaveText('Results:');

    // Check exact textual results as produced by the implementation (join(', '))
    await expect(output).toContainText('Union: a, b, c, d');
    await expect(output).toContainText('Intersection: b, c');
    await expect(output).toContainText('Difference (Set 1 - Set 2): a');
    await expect(output).toContainText('Symmetric Difference: a, d');
  });

  test('Handles duplicates and whitespace: duplicates removed and trimming applied', async ({ page }) => {
    // Purpose: Ensure duplicates are removed by the Set and whitespace is trimmed before processing.
    const input12 = page.locator('#inputSet1');
    const input22 = page.locator('#inputSet2');
    const button2 = page.getByRole('button2', { name: 'Perform Set Operations' });
    const output2 = page.locator('#output2');

    // Set 1 contains duplicates and extra whitespace; Set 2 contains overlapping items
    await input1.fill('  a , a ,  b ,  ');
    await input2.fill(' b, c ');

    await button.click();

    // Expect duplicates to be removed and trimmed values to be used.
    // Set1 becomes ['a', 'b']; Set2 ['b', 'c'] => union 'a, b, c', intersection 'b', difference 'a', symmetric 'a, c'
    await expect(output).toContainText('Union: a, b, c');
    await expect(output).toContainText('Intersection: b');
    await expect(output).toContainText('Difference (Set 1 - Set 2): a');
    await expect(output).toContainText('Symmetric Difference: a, c');
  });

  test('Multiple operations update output (idempotence and overwrite)', async ({ page }) => {
    // Purpose: Confirm clicking the button multiple times or after changing inputs overwrites the output appropriately.
    const input13 = page.locator('#inputSet1');
    const input23 = page.locator('#inputSet2');
    const button3 = page.getByRole('button3', { name: 'Perform Set Operations' });
    const output3 = page.locator('#output3');

    // First operation
    await input1.fill('1,2,3');
    await input2.fill('3,4');
    await button.click();

    await expect(output).toContainText('Union: 1, 2, 3, 4');
    await expect(output).toContainText('Intersection: 3');

    // Change inputs and perform again
    await input1.fill('x,y');
    await input2.fill('y,z');
    await button.click();

    // Output should reflect the new operation (not append to previous)
    await expect(output).toContainText('Union: x, y, z');
    await expect(output).toContainText('Intersection: y');

    // Ensure old values are not present in the new output
    const outputHtml = await output.innerHTML();
    expect(outputHtml.includes('1, 2, 3, 4')).toBeFalsy();
  });

  test('Edge case: empty or whitespace-only inputs produce minimal/empty results', async ({ page }) => {
    // Purpose: Check how the app behaves when inputs are empty or contain only commas/whitespace.
    const input14 = page.locator('#inputSet1');
    const input24 = page.locator('#inputSet2');
    const button4 = page.getByRole('button4', { name: 'Perform Set Operations' });
    const output4 = page.locator('#output4');

    // Case 1: both empty
    await input1.fill('');
    await input2.fill('');
    await button.click();

    // The implementation will create arrays like [''] after splitting; join of a set containing '' yields an empty string,
    // so the HTML will show the labels but the values will appear blank. We assert labels exist.
    await expect(output.locator('h3')).toHaveText('Results:');
    await expect(output).toContainText('Union:');
    await expect(output).toContainText('Intersection:');
    await expect(output).toContainText('Difference (Set 1 - Set 2):');
    await expect(output).toContainText('Symmetric Difference:');

    // Case 2: inputs contain only commas and spaces
    await input1.fill(' , , ');
    await input2.fill(' , ');
    await button.click();

    // Still expect same labels; actual values may be blank strings
    await expect(output).toContainText('Union:');
    await expect(output).toContainText('Intersection:');
  });

  test('Accessibility and semantics: controls are reachable and labeled', async ({ page }) => {
    // Purpose: Basic accessibility checks - button has readable name and inputs have placeholders (assistive info).
    const input15 = page.locator('#inputSet1');
    const input25 = page.locator('#inputSet2');
    const button5 = page.getByRole('button5', { name: 'Perform Set Operations' });

    // Inputs have placeholders which help screen reader users and provide context
    await expect(input1).toHaveAttribute('placeholder', 'Enter Set 1 (comma separated)');
    await expect(input2).toHaveAttribute('placeholder', 'Enter Set 2 (comma separated)');

    // Button should be in document and reachable
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });
});