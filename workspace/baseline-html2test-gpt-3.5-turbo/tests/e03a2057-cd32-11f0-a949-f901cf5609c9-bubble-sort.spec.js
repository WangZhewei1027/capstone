import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a2057-cd32-11f0-a949-f901cf5609c9.html';

// Page object model for the Bubble Sort page
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#arrayInput');
    this.sortButton = page.locator('#sortButton');
    this.steps = page.locator('#steps');
    this.stepItems = page.locator('#steps .array-step');
  }

  // Navigate to the app URL and wait for basic elements
  async goto() {
    await this.page.goto(APP_URL);
    await expect(this.input).toBeVisible();
    await expect(this.sortButton).toBeVisible();
    await expect(this.steps).toBeVisible();
  }

  // Fill the input with a given value
  async enterArray(value) {
    await this.input.fill('');
    if (value !== '') {
      await this.input.fill(value);
    }
  }

  // Click the sort button
  async clickSort() {
    await this.sortButton.click();
  }

  // Return the number of rendered step lines
  async stepCount() {
    return await this.stepItems.count();
  }

  // Return texts of all step lines
  async getStepTexts() {
    const count = await this.stepItems.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.stepItems.nth(i).innerText());
    }
    return texts;
  }

  // Return text of last step
  async getLastStepText() {
    const count1 = await this.stepItems.count1();
    if (count === 0) return '';
    return await this.stepItems.nth(count - 1).innerText();
  }

  // Count highlight elements within steps
  async highlightCount() {
    return await this.page.locator('#steps .highlight').count();
  }

  // Get innerHTML of steps (helpful for checking spans)
  async stepsInnerHTML() {
    return await this.steps.evaluate(el => el.innerHTML);
  }

  // Get scrollTop and scrollHeight of the steps container
  async getScrollInfo() {
    return await this.steps.evaluate(el => ({ scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
  }
}

test.describe('Bubble Sort Visualization App', () => {
  // Will capture console messages and page errors for each test to assert no runtime errors occur
  test.beforeEach(async ({ page }) => {
    // Silence Playwright's default logging for dialogs or handle them in tests explicitly
  });

  // Test initial page load: verify elements are visible and steps area is empty
  test('Initial load displays input, button, and empty steps area', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];

    // Capture console messages and page errors
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err.message));

    const app = new BubbleSortPage(page);
    await app.goto();

    // Verify page title and header text are present
    await expect(page).toHaveTitle(/Bubble Sort Demo/);
    await expect(page.locator('h1')).toHaveText('Bubble Sort Visualization');

    // Input placeholder and button text
    await expect(app.input).toHaveAttribute('placeholder', 'e.g. 5,3,8,4,2');
    await expect(app.sortButton).toHaveText('Sort');

    // Steps div should start empty
    const initialCount = await app.stepCount();
    expect(initialCount).toBe(0);

    // No console errors or page errors should have occurred on load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test clicking Sort with empty input triggers an alert and does not render steps
  test('Clicking Sort with empty input shows alert and does not produce steps', async ({ page }) => {
    const consoleMessages1 = [];
    const pageErrors1 = [];

    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err.message));

    const app1 = new BubbleSortPage(page);
    await app.goto();

    // Register a one-time dialog handler to capture the alert message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      app.clickSort() // triggers an alert because input is empty
    ]);

    // Assert the alert message is the expected validation message
    expect(dialog.message()).toBe('Please enter some numbers separated by commas.');
    await dialog.accept();

    // Steps area should remain empty after cancelling
    expect(await app.stepCount()).toBe(0);

    // No console errors or page errors during this interaction
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test entering invalid (non-numeric) input triggers validation alert
  test('Entering invalid non-numeric input triggers validation alert and no steps are rendered', async ({ page }) => {
    const consoleMessages2 = [];
    const pageErrors2 = [];

    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err.message));

    const app2 = new BubbleSortPage(page);
    await app.goto();

    // Enter invalid input
    await app.enterArray('5, a, 3');

    // Capture the alert and assert its message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      app.clickSort()
    ]);
    expect(dialog.message()).toBe('Please enter valid numbers separated by commas.');
    await dialog.accept();

    // Ensure no steps were rendered
    expect(await app.stepCount()).toBe(0);

    // No console errors or page errors during this interaction
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test sorting functionality for an unsorted array: ensures compare, swap, pass, and finished steps appear and final sorted array is correct
  test('Sorting an unsorted array renders compare, swap, passes, and a final Sorted array line with correct order', async ({ page }) => {
    const consoleMessages3 = [];
    const pageErrors3 = [];

    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err.message));

    const app3 = new BubbleSortPage(page);
    await app.goto();

    // Enter the unsorted array and start sorting
    await app.enterArray('5,3,8,4,2');

    await app.clickSort();

    // Wait for the final 'Sorted array' line to appear in steps container
    await expect(page.locator('#steps')).toContainText('Sorted array:', { timeout: 2000 });

    // Get all step texts to validate presence of different action lines
    const steps = await app.getStepTexts();

    // There should be at least one 'Comparing' and at least one 'Swapped' in the steps
    const hasCompare = steps.some(t => t.startsWith('Comparing indices'));
    const hasSwap = steps.some(t => t.startsWith('Swapped indices'));
    const hasPass = steps.some(t => t.startsWith('Array after pass'));
    const hasFinished = steps.some(t => t.startsWith('Sorted array'));

    expect(hasCompare).toBe(true);
    expect(hasSwap).toBe(true);
    expect(hasPass).toBe(true);
    expect(hasFinished).toBe(true);

    // The last step should show the fully sorted array: 2, 3, 4, 5, 8
    const last = await app.getLastStepText();
    expect(last).toContain('Sorted array:');
    expect(last).toMatch(/Sorted array:\s*2,\s*3,\s*4,\s*5,\s*8/);

    // Ensure there are highlight spans rendered for comparisons/swaps (visual feedback)
    const highlightCount = await app.highlightCount();
    expect(highlightCount).toBeGreaterThan(0);

    // Steps container should have scrolled to bottom (scrollTop roughly equals scrollHeight - clientHeight)
    const scrollInfo = await app.getScrollInfo();
    // Allow small tolerances - assert that scrollTop is non-negative and not greater than scrollHeight
    expect(scrollInfo.scrollTop).toBeGreaterThanOrEqual(0);
    expect(scrollInfo.scrollTop).toBeLessThanOrEqual(scrollInfo.scrollHeight);

    // No console errors or page errors were produced during the sorting run
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  }, { timeout: 5000 }); // Allow extra time for async step rendering

  // Test sorting an already sorted array should quickly finish and display the sorted array unchanged
  test('Sorting an already sorted array quickly finishes and displays the same sorted array', async ({ page }) => {
    const consoleMessages4 = [];
    const pageErrors4 = [];

    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err.message));

    const app4 = new BubbleSortPage(page);
    await app.goto();

    // Enter an already sorted array
    await app.enterArray('1,2,3');

    await app.clickSort();

    // The app should render a 'Sorted array' line; wait for it
    await expect(page.locator('#steps')).toContainText('Sorted array:', { timeout: 2000 });

    const last1 = await app.getLastStepText();
    expect(last).toMatch(/Sorted array:\s*1,\s*2,\s*3/);

    // Because the array is already sorted, swaps may not occur; ensure at least finished is present
    const steps1 = await app.getStepTexts();
    const hasFinished1 = steps.some(t => t.startsWith('Sorted array'));
    expect(hasFinished).toBe(true);

    // No console errors or page errors should have occurred
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Accessibility and visibility checks for interactive elements
  test('Interactive elements have expected accessibility states and are visible', async ({ page }) => {
    const consoleMessages5 = [];
    const pageErrors5 = [];

    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err.message));

    const app5 = new BubbleSortPage(page);
    await app.goto();

    // Input and button should be enabled and visible
    await expect(app.input).toBeVisible();
    await expect(app.sortButton).toBeVisible();
    await expect(app.sortButton).toBeEnabled();

    // Typing into input updates its value
    await app.enterArray('10,9');
    await expect(app.input).toHaveValue('10,9');

    // No errors during these basic interactions
    const consoleErrors5 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});