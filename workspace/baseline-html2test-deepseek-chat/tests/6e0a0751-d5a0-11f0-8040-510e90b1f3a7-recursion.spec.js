import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0751-d5a0-11f0-8040-510e90b1f3a7.html';

test.describe('Recursion Demonstration App (Application ID: 6e0a0751-d5a0-11f0-8040-510e90b1f3a7)', () => {
  // Containers for console and page errors captured during each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset arrays before each test
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages and page errors for assertions
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application page and wait for load handlers to run
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Ensure no uncaught page errors were observed during the test
    // and no console messages of type 'error' were emitted.
    // These assertions help catch runtime exceptions and JS errors.
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(pageErrors, `Unexpected page errors: ${pageErrors.map(e => String(e)).join('\n')}`).toHaveLength(0);
    expect(errorConsoleMessages, `Unexpected console.error messages: ${errorConsoleMessages.map(m => m.text).join('\n')}`).toHaveLength(0);
  });

  test('Initial load shows default factorial and fibonacci results and empty recursion visual', async ({ page }) => {
    // Verify the factorial initial result (default input value = 5 => 5! = 120)
    const factorialResult = page.locator('#factorialResult');
    await expect(factorialResult).toHaveText('5! = 120');

    // Verify the fibonacci initial result (default input value = 6)
    const fibonacciResult = page.locator('#fibonacciResult');
    await expect(fibonacciResult).toHaveText('Fibonacci sequence up to F(6): 0, 1, 1, 2, 3, 5, 8');

    // Recursion visualization should be empty before user starts it
    const recursionVisual = page.locator('#recursionVisual');
    await expect(recursionVisual).toBeEmpty();

    // Directory tree should be empty before generation (initial state)
    const directoryTree = page.locator('#directoryTree');
    // It's okay if initial directoryTree is empty string; assert it's empty or whitespace
    await expect(directoryTree).toHaveText(/^\s*$/);
  });

  test('Factorial calculator updates result when input changed and button clicked', async ({ page }) => {
    // Locate elements
    const factorialInput = page.locator('#factorialInput');
    const factorialButton = page.getByRole('button', { name: 'Calculate Factorial' });
    const factorialResult = page.locator('#factorialResult');

    // Change to 7 and calculate: expect 7! = 5040
    await factorialInput.fill('7');
    await factorialButton.click();
    await expect(factorialResult).toHaveText('7! = 5040');

    // Edge case: 0! should be 1
    await factorialInput.fill('0');
    await factorialButton.click();
    await expect(factorialResult).toHaveText('0! = 1');

    // Another valid value: 10! = 3628800
    await factorialInput.fill('10');
    await factorialButton.click();
    await expect(factorialResult).toHaveText('10! = 3628800');
  });

  test('Fibonacci generator creates correct sequence for various inputs', async ({ page }) => {
    const fibonacciInput = page.locator('#fibonacciInput');
    const fibonacciButton = page.getByRole('button', { name: 'Calculate Fibonacci' });
    const fibonacciResult = page.locator('#fibonacciResult');

    // Set n = 5 and generate; expect sequence up to F(5)
    await fibonacciInput.fill('5');
    await fibonacciButton.click();
    await expect(fibonacciResult).toHaveText('Fibonacci sequence up to F(5): 0, 1, 1, 2, 3, 5');

    // Edge case: n = 0 => only F(0) = 0
    await fibonacciInput.fill('0');
    await fibonacciButton.click();
    await expect(fibonacciResult).toHaveText('Fibonacci sequence up to F(0): 0');

    // Another value: n = 1 => 0, 1
    await fibonacciInput.fill('1');
    await fibonacciButton.click();
    await expect(fibonacciResult).toHaveText('Fibonacci sequence up to F(1): 0, 1');
  });

  test('Recursion visualization produces expected call, base case and return messages', async ({ page }) => {
    const visualizeButton = page.getByRole('button', { name: 'Start Visualization' });
    const recursionVisual = page.locator('#recursionVisual');

    // Start the visualization
    await visualizeButton.click();

    // Wait for the base case message which indicates recursion reached maxLevel (3)
    // The visualization uses timeouts; allow sufficient timeout to let it render all steps.
    await page.waitForSelector('text=Base case reached at level 3', { timeout: 7000 });

    // Check that initial call message is present
    await expect(recursionVisual).toContainText('Call: recursiveFunction(0)');

    // Check that base case message for level 3 is present
    await expect(recursionVisual).toContainText('Base case reached at level 3');

    // Check that a 'Returning from level 0' is present indicating unwinding
    await expect(recursionVisual).toContainText('Returning from level 0');

    // Ensure that multiple lines were appended (visualization produced output)
    const linesCount = await recursionVisual.evaluate(el => el.children.length);
    expect(linesCount).toBeGreaterThan(0);
  });

  test('Directory tree generator creates a printed tree with folder entries', async ({ page }) => {
    const generateButton = page.getByRole('button', { name: 'Generate Random Tree' });
    const directoryTree = page.locator('#directoryTree');

    // Click to generate a random directory tree
    await generateButton.click();

    // The printed tree should include at least one folder icon and "Folder_" prefix for names
    await expect(directoryTree).toContainText('📁');

    // Text should contain "Folder_" strings indicating generated node names
    const text = await directoryTree.textContent();
    expect(text).toMatch(/Folder_\d+/);

    // The printed tree should not be empty
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('Interactive elements are accessible via roles and have expected accessible names', async ({ page }) => {
    // Verify that the main interactive buttons are discoverable by role and name
    const buttons = [
      'Calculate Factorial',
      'Calculate Fibonacci',
      'Start Visualization',
      'Generate Random Tree'
    ];

    for (const name of buttons) {
      const btn = page.getByRole('button', { name });
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
    }

    // Inputs have expected ids and default values
    const factorialInput = page.locator('#factorialInput');
    const fibonacciInput = page.locator('#fibonacciInput');

    await expect(factorialInput).toBeVisible();
    await expect(fibonacciInput).toBeVisible();

    // Ensure input types are number and have default numeric values
    expect(await factorialInput.getAttribute('type')).toBe('number');
    expect(await fibonacciInput.getAttribute('type')).toBe('number');

    // The default values should match those initialized in the HTML (5 and 6)
    expect(await factorialInput.inputValue()).toBe('5');
    expect(await fibonacciInput.inputValue()).toBe('6');
  });
});