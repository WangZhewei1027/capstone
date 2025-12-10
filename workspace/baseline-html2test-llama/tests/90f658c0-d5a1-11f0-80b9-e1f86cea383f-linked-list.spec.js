import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f658c0-d5a1-11f0-80b9-e1f86cea383f.html';

test.describe('Linked List App (90f658c0-d5a1-11f0-80b9-e1f86cea383f)', () => {
  // Navigate to the page before each test
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Basic sanity checks for initial page load and default state
  test('loads page and displays the main UI elements', async ({ page }) => {
    // Verify page title contains "Linked List"
    await expect(page).toHaveTitle(/Linked List/i);

    // Verify input field is visible and has the expected placeholder
    const input = page.locator('#name');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Enter node name');

    // Verify Add button is visible and has correct text
    const addButton = page.locator('#add');
    await expect(addButton).toBeVisible();
    await expect(addButton).toHaveText('Add');

    // Verify the list container exists and initially has no list items
    const listItems = page.locator('#list li');
    await expect(page.locator('#list')).toBeVisible();
    await expect(listItems).toHaveCount(0);
  });

  // Test adding nodes: the implementation logs to the console but does not update the DOM.
  test('adding a node clears the input and logs the list contents to console (DOM not updated by implementation)', async ({ page }) => {
    const input1 = page.locator('#name');
    const addButton1 = page.locator('#add');
    const listUL = page.locator('#list');

    // Collect console messages emitted after page load
    const consoleMessages = [];
    page.on('console', (msg) => {
      // Capture only log messages (printList uses console.log)
      consoleMessages.push(msg.text());
    });

    // Type a name and click Add
    await input.fill('Alice');
    await addButton.click();

    // After clicking Add, the implementation clears the input
    await expect(input).toHaveValue('');

    // The implementation clears innerHTML of the UL and does not create LI elements
    await expect(listUL).toBeVisible();
    await expect(page.locator('#list li')).toHaveCount(0);

    // At least one console.log should have been emitted by printList with the added name followed by a space.
    // Wait a short time for console events to arrive.
    await page.waitForTimeout(100);
    // Find a console message that contains "Alice "
    const found = consoleMessages.find(msg => msg.includes('Alice'));
    expect(found).toBeTruthy();

    // Add another node to verify cumulative logging (the console should now contain "Alice Bob " after adding "Bob")
    await input.fill('Bob');
    await addButton.click();

    await expect(input).toHaveValue('');
    await page.waitForTimeout(100);
    const foundCumulative = consoleMessages.find(msg => msg.includes('Alice Bob'));
    expect(foundCumulative).toBeTruthy();
  });

  // Test behavior when clicking the UL element: implementation attempts to remove first child
  // but if there are no children this will cause a runtime TypeError.
  test('clicking on the empty list UL triggers a runtime error (TypeError) due to a bug in the implementation', async ({ page }) => {
    // Prepare to capture an uncaught page error that the page will throw when clicking the UL with no children.
    const errorPromise = page.waitForEvent('pageerror');

    // Click directly on the UL area to trigger the listener
    await page.click('#list');

    // Wait for the pageerror to occur and assert about its message.
    const error = await errorPromise;
    expect(error).toBeDefined();

    // The exact message varies by engine; assert it mentions inability to access parentNode or undefined parent.
    const message = (error && error.message) ? error.message : '';
    // message should contain indication of trying to read 'parentNode' of undefined or similar
    expect(message.toLowerCase()).toMatch(/parent|parentnode|cannot read|undefined/);
  });

  // Edge case: clicking Add with empty input should not add nodes or log new messages.
  test('clicking Add with an empty input does nothing (no new console logs and no DOM changes)', async ({ page }) => {
    const input2 = page.locator('#name');
    const addButton2 = page.locator('#add');
    const listItems1 = page.locator('#list li');

    // Capture console messages before the action
    const consoleMessages1 = [];
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    // Ensure input is empty
    await input.fill('');
    // Record the count of console messages seen so far
    const beforeCount = consoleMessages.length;

    // Click Add with empty input
    await addButton.click();

    // Wait briefly to allow any console logs to appear
    await page.waitForTimeout(100);

    // Expect no new console messages were produced by clicking Add with empty input
    expect(consoleMessages.length).toBe(beforeCount);

    // Expect no list items were created
    await expect(listItems).toHaveCount(0);
  });

  // Interaction: after adding nodes, clicking the UL still triggers the same runtime error because the DOM is never populated by the implementation.
  test('after adding nodes, clicking the UL still triggers runtime error because DOM is not populated by implementation', async ({ page }) => {
    const input3 = page.locator('#name');
    const addButton3 = page.locator('#add');

    // Add a node (this only updates internal LinkedList and logs to console, it does not create LI elements)
    await input.fill('Charlie');
    await addButton.click();
    await input.fill('Delta');
    await addButton.click();

    // Verify there are still no LI elements in the UL (implementation bug)
    await expect(page.locator('#list li')).toHaveCount(0);

    // Clicking the UL should cause the same TypeError as before (because there are no children to remove)
    const [error] = await Promise.all([
      page.waitForEvent('pageerror'),
      page.click('#list'),
    ]);

    expect(error).toBeDefined();
    const message1 = (error && error.message1) ? error.message1 : '';
    expect(message.toLowerCase()).toMatch(/parent|parentnode|cannot read|undefined/);
  });
});