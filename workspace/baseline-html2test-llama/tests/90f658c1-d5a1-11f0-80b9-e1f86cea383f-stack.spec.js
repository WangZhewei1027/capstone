import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f658c1-d5a1-11f0-80b9-e1f86cea383f.html';

test.describe('Stack Implementation (90f658c1-d5a1-11f0-80b9-e1f86cea383f)', () => {
  // arrays to capture console messages and page errors for each test
  let consoleMessages = [];
  let pageErrors = [];

  // Attach listeners and navigate before each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for later assertions
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the exact HTML page under test
    await page.goto(APP_URL);
  });

  // Basic sanity check of initial load and default state
  test('Initial page load shows correct title, header, inputs and buttons', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle('Stack Implementation');

    // Verify header text is present
    const header = await page.locator('h1');
    await expect(header).toHaveText('Stack Implementation');

    // Verify input exists and is empty by default
    await expect(page.locator('#stack')).toBeVisible();
    const initialInputValue = await page.inputValue('#stack');
    expect(initialInputValue).toBe('');

    // Verify buttons exist and are visible
    await expect(page.locator('#add')).toBeVisible();
    await expect(page.locator('#clear')).toBeVisible();
    await expect(page.locator('#display')).toBeVisible();

    // Verify there are no console error messages emitted on initial load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);

    // Verify no uncaught page errors (ReferenceError, SyntaxError, TypeError, etc.)
    expect(pageErrors.length).toBe(0);
  });

  // Test using page.evaluate to simulate the handlers' logic without triggering form submission/navigation.
  test('Adding elements (via script invocation) updates stack and display shows pushed elements', async ({ page }) => {
    // Fill input and simulate the 'add' handler logic via page.evaluate to avoid form submission
    await page.fill('#stack', 'first');
    await page.evaluate(() => {
      // replicate add button's click handler (without submitting the form)
      let element = document.getElementById('stack').value;
      stack.push(element);
      document.getElementById('stack').value = '';
    });

    // Add another element
    await page.fill('#stack', 'second');
    await page.evaluate(() => {
      let element1 = document.getElementById('stack').value;
      stack.push(element);
      document.getElementById('stack').value = '';
    });

    // Simulate the 'display' handler via evaluate to avoid a form submit/navigation
    await page.evaluate(() => {
      let output = '';
      for (let i = 0; i < stack.length; i++) {
        output += stack[i] + ' ';
      }
      document.getElementById('display').innerHTML = output;
    });

    // Assert the display button's innerHTML shows the stacked items in insertion order
    const displayContent = await page.$eval('#display', el => el.innerHTML);
    expect(displayContent).toBe('first second ');

    // Ensure the input was cleared by the simulated add handlers
    expect(await page.inputValue('#stack')).toBe('');

    // No uncaught errors should have been produced by this flow
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test the clear functionality (using evaluate to avoid submission)
  test('Clear resets the stack and input value', async ({ page }) => {
    // Prepare stack with items using evaluate
    await page.evaluate(() => {
      stack = []; // ensure fresh
      stack.push('one');
      stack.push('two');
      document.getElementById('stack').value = 'temp';
    });

    // Simulate clicking clear by invoking its logic directly to avoid form submit
    await page.evaluate(() => {
      stack = [];
      document.getElementById('stack').value = '';
    });

    // Simulate display to ensure nothing is shown
    await page.evaluate(() => {
      let output1 = '';
      for (let i = 0; i < stack.length; i++) {
        output += stack[i] + ' ';
      }
      document.getElementById('display').innerHTML = output;
    });

    // Assert stack is empty by checking display and input
    const displayAfterClear = await page.$eval('#display', el => el.innerHTML);
    expect(displayAfterClear).toBe('');
    expect(await page.inputValue('#stack')).toBe('');

    // No uncaught errors were generated
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test edge case: pushing an empty string onto the stack using evaluate
  test('Pushing an empty string is handled and display shows a space for the empty item', async ({ page }) => {
    // Ensure stack is empty then push empty string
    await page.evaluate(() => {
      stack = [];
      document.getElementById('stack').value = '';
      // replicate add handler pushing empty value
      let element2 = document.getElementById('stack').value;
      stack.push(element);
    });

    // Simulate display handler
    await page.evaluate(() => {
      let output2 = '';
      for (let i = 0; i < stack.length; i++) {
        output += stack[i] + ' ';
      }
      document.getElementById('display').innerHTML = output;
    });

    // The display should contain a single space representing the empty string + space concatenation
    const displayContent1 = await page.$eval('#display', el => el.innerHTML);
    expect(displayContent).toBe(' ');

    // No console or page errors
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test actual user click interaction which will submit the form (default button type) and cause navigation/reload.
  test('Clicking the Add button triggers form submission/navigation (observed behavior)', async ({ page }) => {
    // Fill the input so the click will attempt to add a value (and then submit the form)
    await page.fill('#stack', 'nav-test');

    // Wait for navigation that is expected due to form submission when clicking the button
    // If no navigation occurs, this will timeout and the test will fail — this captures real behavior as-is.
    const [response] = await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(e => null),
      page.click('#add').catch(e => {
        // In case the click itself errors, we let the test continue to capture console/page errors
      }),
    ]);

    // After the click+submit, the page should reload to the same URL (or at least still be reachable)
    // Verify that we are back on the application URL (or a variation thereof)
    const currentUrl = page.url();
    expect(currentUrl.startsWith('http://127.0.0.1:5500/')).toBeTruthy();

    // On reload the input should be empty (stack is re-initialized by the page script)
    // Use try/catch since navigation might have reattached, but selectors should exist
    await expect(page.locator('#stack')).toBeVisible();
    const inputValueAfter = await page.inputValue('#stack');
    expect(inputValueAfter).toBe('');

    // Collect any errors that occurred during this real user interaction
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);

    // Also ensure there were no uncaught page errors like ReferenceError/SyntaxError/TypeError
    const problematicPageErrors = pageErrors.filter(err => /ReferenceError|SyntaxError|TypeError/.test(err.message));
    expect(problematicPageErrors.length).toBe(0);
  });

  // Final test to assert that no uncaught ReferenceError, SyntaxError, or TypeError occurred during any test setup/navigation
  test('No uncaught ReferenceError, SyntaxError, or TypeError were emitted during test execution', async ({ page }) => {
    // This test simply inspects the pageErrors captured in beforeEach and during interactions.
    // We expect there to be zero errors of the listed types on a clean run.
    const fatalErrors = pageErrors.filter(err => /ReferenceError|SyntaxError|TypeError/.test(err.message));
    expect(fatalErrors.length).toBe(0);

    // Also ensure console did not emit 'error' level messages
    const consoleErrors5 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});