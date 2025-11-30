import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0cd82-cd2f-11f0-a440-159d7b77af86.html';

// Page Object for the Heap application
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.numberInput = page.locator('#numberInput');
    this.submitButton = page.locator('button[type="submit"]');
    this.toggleButton = page.locator('button[onclick="toggleHeapType()"]');
    this.heapTitle = page.locator('#heap h2');
    this.heapList = page.locator('#heapList');
    this.form = page.locator('#heapForm');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async insertNumber(value) {
    // Fill number input and submit the form
    await this.numberInput.fill(String(value));
    await this.submitButton.click();
  }

  async clickToggle() {
    await this.toggleButton.click();
  }

  async getHeapListText() {
    // Return the textual representation shown in the UI
    const txt = await this.heapList.textContent();
    return txt === null ? '' : txt.trim();
  }

  async getHeapTitleText() {
    const txt = await this.heapTitle.textContent();
    return txt === null ? '' : txt.trim();
  }

  async getToggleButtonText() {
    const txt = await this.toggleButton.textContent();
    return txt === null ? '' : txt.trim();
  }

  async submitEmpty() {
    // Clear input then click submit to trigger browser validation behaviour
    await this.numberInput.fill('');
    await this.submitButton.click();
  }
}

test.describe('Heap (Min/Max) Visualization - E2E tests', () => {
  let consoleErrors;
  let pageErrors;

  // Setup: for each test, open the page and attach listeners to capture console errors and page errors.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  // Teardown: if any console or page errors were recorded unexpectedly, print them to help debugging.
  test.afterEach(async ({}, testInfo) => {
    if (consoleErrors.length > 0) {
      // Attach console errors to the test output for visibility
      for (const err of consoleErrors) {
        testInfo.attach('console.error', { body: err });
      }
    }
    if (pageErrors.length > 0) {
      for (const err of pageErrors) {
        testInfo.attach('page.error', { body: String(err) });
      }
    }
  });

  test('Initial page load shows Min Heap UI with expected default texts', async ({ page }) => {
    // Purpose: Verify the initial/default state of the application loads correctly
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Title should indicate Min Heap by default
    await expect(heapPage.heapTitle).toHaveText('Min Heap');

    // Toggle button should prompt to toggle to Max Heap initially
    await expect(heapPage.toggleButton).toHaveText('Toggle to Max Heap');

    // Heap list should be empty on initial load
    const listText = await heapPage.getHeapListText();
    expect(listText).toBe('', 'Heap list should be empty on initial load');

    // Ensure no console or page errors occurred during load
    expect(consoleErrors.length, 'No console errors on initial load').toBe(0);
    expect(pageErrors.length, 'No page errors on initial load').toBe(0);
  });

  test('Inserting a single number updates Min Heap display', async ({ page }) => {
    // Purpose: Validate insertion flow and DOM update for a single numeric insertion
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    await heapPage.insertNumber(5);

    // Expect the heap list to display the inserted value
    // The display() uses join(', ') so a single element will be "5"
    await expect(heapPage.heapList).toHaveText('5');

    // Ensure no console or page errors occurred during insertion
    expect(consoleErrors.length, 'No console errors after inserting 5').toBe(0);
    expect(pageErrors.length, 'No page errors after inserting 5').toBe(0);
  });

  test('Inserting multiple numbers maintains Min Heap ordering (bubbleUp)', async ({ page }) => {
    // Purpose: Insert multiple values and assert the internal ordering visible in the UI respects the MinHeap bubbleUp logic
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Insert values 10, 4, 7 sequentially
    await heapPage.insertNumber(10);
    await heapPage.insertNumber(4);
    await heapPage.insertNumber(7);

    // For MinHeap, the expected array after these inserts is [4, 10, 7]
    // The UI displays "4, 10, 7"
    await expect(heapPage.heapList).toHaveText('4, 10, 7');

    // No console/page errors expected
    expect(consoleErrors.length, 'No console errors after multiple inserts').toBe(0);
    expect(pageErrors.length, 'No page errors after multiple inserts').toBe(0);
  });

  test('Toggle to Max Heap resets the heap and updates UI text', async ({ page }) => {
    // Purpose: Verify toggling the heap type clears the current heap and updates UI labels/buttons
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Precondition: Insert some values into MinHeap
    await heapPage.insertNumber(2);
    await heapPage.insertNumber(1);

    // Verify some content exists before toggling
    const beforeText = await heapPage.getHeapListText();
    expect(beforeText.length).toBeGreaterThan(0);

    // Toggle to Max Heap
    await heapPage.clickToggle();

    // After toggling, title should be "Max Heap" and button should prompt to toggle to Min Heap
    await expect(heapPage.heapTitle).toHaveText('Max Heap');
    await expect(heapPage.toggleButton).toHaveText('Toggle to Min Heap');

    // Heap should be reinitialized and thus empty
    const afterText = await heapPage.getHeapListText();
    expect(afterText).toBe('', 'Heap should be cleared after toggling heap type');

    // Now insert numbers into MaxHeap and verify max-heap behavior
    await heapPage.insertNumber(3);
    await heapPage.insertNumber(9);

    // For MaxHeap, inserting 3 then 9 results in [9, 3] (display "9, 3")
    await expect(heapPage.heapList).toHaveText('9, 3');

    // No console/page errors expected
    expect(consoleErrors.length, 'No console errors after toggling and inserting into MaxHeap').toBe(0);
    expect(pageErrors.length, 'No page errors after toggling and inserting into MaxHeap').toBe(0);
  });

  test('Submitting the form with empty required input does not insert a value (browser validation)', async ({ page }) => {
    // Purpose: Ensure browser enforces required attribute and no insertion occurs when the input is empty
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Ensure heap is empty to start
    expect(await heapPage.getHeapListText()).toBe('');

    // Attempt to submit with an empty required input. Browser should prevent submission and the heap should remain unchanged.
    // In Playwright, clicking the submit button will trigger the browser validation; no 'submit' event should fire if validation fails.
    await heapPage.numberInput.fill(''); // make sure empty
    await heapPage.submitButton.click();

    // Heap should remain empty
    expect(await heapPage.getHeapListText()).toBe('', 'Heap should remain unchanged when submitting empty required input');

    // No console/page errors expected
    expect(consoleErrors.length, 'No console errors when submitting empty required input').toBe(0);
    expect(pageErrors.length, 'No page errors when submitting empty required input').toBe(0);
  });

  test('Inserting a decimal number is parsed by parseInt and stored as integer', async ({ page }) => {
    // Purpose: Validate parseInt behavior on numeric input (e.g., 4.7 -> 4)
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Enter a decimal number (number input allows decimals), parseInt in code will convert to integer
    await heapPage.insertNumber('4.7');

    // The UI should show "4" because parseInt("4.7", 10) === 4
    await expect(heapPage.heapList).toHaveText('4');

    // No console/page errors expected
    expect(consoleErrors.length, 'No console errors when inserting decimal number').toBe(0);
    expect(pageErrors.length, 'No page errors when inserting decimal number').toBe(0);
  });

  test('Inserting empty string via programmatic fill results in NaN if submission bypasses validation (edge behavior)', async ({ page }) => {
    // Purpose: Edge case exploration - although browser prevents empty submission, this test documents behavior if an empty string were parsed.
    // We will simulate filling with an explicit empty string and then call the form submit via JS (not allowed per instructions to modify environment).
    // Therefore this test will instead assert that the browser validation prevents such a submission and no NaN shows up.
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Clear input and click submit - browser validation prevents submission
    await heapPage.numberInput.fill('');
    await heapPage.submitButton.click();

    // Ensure the UI did not change and no "NaN" was inserted
    const displayed = await heapPage.getHeapListText();
    expect(displayed).not.toBe('NaN', 'No NaN should be displayed because browser validation prevents empty submission');
    expect(displayed).toBe('', 'Heap remains empty after attempted empty submission');

    // No console/page errors expected
    expect(consoleErrors.length, 'No console errors during empty submission edge case').toBe(0);
    expect(pageErrors.length, 'No page errors during empty submission edge case').toBe(0);
  });

  test('Accessibility and visibility checks for key interactive elements', async ({ page }) => {
    // Purpose: Ensure key controls are visible and accessible: number input, submit, toggle, heap title
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Elements should be visible and enabled
    await expect(heapPage.numberInput).toBeVisible();
    await expect(heapPage.submitButton).toBeVisible();
    await expect(heapPage.toggleButton).toBeVisible();
    await expect(heapPage.heapTitle).toBeVisible();

    // Input should be enabled for interaction
    await expect(heapPage.numberInput).toBeEditable();

    // No console/page errors expected
    expect(consoleErrors.length, 'No console errors during accessibility checks').toBe(0);
    expect(pageErrors.length, 'No page errors during accessibility checks').toBe(0);
  });
});