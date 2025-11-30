import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/html2test/html/262736b3-cd2a-11f0-bee4-a3a342d77f94.html';

// Page Object for interacting with the Deque demo page
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#element-input');
    this.display = page.locator('#deque-display');
    // Buttons addressed by accessible name (their visible text)
    this.addFrontButton = page.getByRole('button', { name: 'Add to Front' });
    this.addBackButton = page.getByRole('button', { name: 'Add to Back' });
    this.removeFrontButton = page.getByRole('button', { name: 'Remove from Front' });
    this.removeBackButton = page.getByRole('button', { name: 'Remove from Back' });
  }

  async goto() {
    await this.page.goto(BASE_URL);
  }

  async fillInput(value) {
    await this.input.fill(value);
  }

  async clickAddFront() {
    await this.addFrontButton.click();
  }

  async clickAddBack() {
    await this.addBackButton.click();
  }

  async clickRemoveFront() {
    await this.removeFrontButton.click();
  }

  async clickRemoveBack() {
    await this.removeBackButton.click();
  }

  async getDisplayText() {
    return (await this.display.textContent())?.trim();
  }

  async isButtonVisibleAndEnabled(locator) {
    return {
      visible: await locator.isVisible(),
      enabled: await locator.isEnabled()
    };
  }
}

test.describe('Deque Demonstration - UI and behavior', () => {
  // Capture console and page errors for each test. We'll assert none occur.
  test.beforeEach(async ({ page }) => {
    // No global setup here; navigation is done in each test via page object.
  });

  test.afterEach(async ({ page }) => {
    // Ensure page is closed by Playwright fixtures; additional cleanup not required.
  });

  test('Initial page load shows expected elements and empty state', async ({ page }) => {
    // Purpose: Verify initial page load renders the expected UI and default state.
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const deque = new DequePage(page);
    await deque.goto();

    // Check the title is visible in the DOM (basic page sanity).
    await expect(page.locator('h1')).toHaveText(/Deque/i);

    // Input should be present and have the placeholder text
    await expect(deque.input).toBeVisible();
    await expect(deque.input).toHaveAttribute('placeholder', 'Enter element');

    // All buttons exist, visible, and enabled
    const addFrontState = await deque.isButtonVisibleAndEnabled(deque.addFrontButton);
    const addBackState = await deque.isButtonVisibleAndEnabled(deque.addBackButton);
    const removeFrontState = await deque.isButtonVisibleAndEnabled(deque.removeFrontButton);
    const removeBackState = await deque.isButtonVisibleAndEnabled(deque.removeBackButton);

    expect(addFrontState.visible).toBe(true);
    expect(addFrontState.enabled).toBe(true);
    expect(addBackState.visible).toBe(true);
    expect(addBackState.enabled).toBe(true);
    expect(removeFrontState.visible).toBe(true);
    expect(removeFrontState.enabled).toBe(true);
    expect(removeBackState.visible).toBe(true);
    expect(removeBackState.enabled).toBe(true);

    // Initial display should indicate an empty deque
    await expect(deque.display).toHaveText('Deque is empty');

    // Assert no page errors or console errors happened during load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Add to Back clears input and updates display', async ({ page }) => {
    // Purpose: Verify adding an element to the back appends it and clears the input field.
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err.message));

    const deque = new DequePage(page);
    await deque.goto();

    // Enter a value and click "Add to Back"
    await deque.fillInput('alpha');
    await deque.clickAddBack();

    // Display should now show that element
    await expect(deque.display).toHaveText('alpha');

    // Input should be cleared after adding
    await expect(deque.input).toHaveValue('');

    // Add a second element to back and ensure order is preserved
    await deque.fillInput('beta');
    await deque.clickAddBack();
    await expect(deque.display).toHaveText('alpha, beta');

    // No runtime errors in console or page
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Add to Front prepends element correctly', async ({ page }) => {
    // Purpose: Verify addFront places new element at the beginning of the deque.
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err.message));

    const deque = new DequePage(page);
    await deque.goto();

    // Start with some elements at the back
    await deque.fillInput('A');
    await deque.clickAddBack();
    await deque.fillInput('B');
    await deque.clickAddBack();
    await expect(deque.display).toHaveText('A, B');

    // Now add to front
    await deque.fillInput('C');
    await deque.clickAddFront();
    await expect(deque.display).toHaveText('C, A, B');

    // Input cleared after adding to front
    await expect(deque.input).toHaveValue('');

    // No console/page errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Remove from Front and Remove from Back follow deque ordering', async ({ page }) => {
    // Purpose: Validate that removing from front/back returns elements in correct order (through display changes).
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err.message));

    const deque = new DequePage(page);
    await deque.goto();

    // Build deque: addBack A, addBack B, addBack C  => A, B, C
    await deque.fillInput('A');
    await deque.clickAddBack();
    await deque.fillInput('B');
    await deque.clickAddBack();
    await deque.fillInput('C');
    await deque.clickAddBack();
    await expect(deque.display).toHaveText('A, B, C');

    // Remove from front -> should remove 'A'
    await deque.clickRemoveFront();
    await expect(deque.display).toHaveText('B, C');

    // Remove from back -> should remove 'C'
    await deque.clickRemoveBack();
    await expect(deque.display).toHaveText('B');

    // Remove remaining front -> should remove 'B' and show empty message
    await deque.clickRemoveFront();
    await expect(deque.display).toHaveText('Deque is empty');

    // No console/page errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Edge cases: adding empty input does nothing; removing from empty keeps empty state', async ({ page }) => {
    // Purpose: Test edge behaviors: clicking add with empty input, and removing when the deque is already empty.
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err.message));

    const deque = new DequePage(page);
    await deque.goto();

    // Ensure starting empty
    await expect(deque.display).toHaveText('Deque is empty');

    // Ensure input is empty
    await expect(deque.input).toHaveValue('');

    // Click Add to Front/Back with empty input - should do nothing
    await deque.clickAddFront();
    await expect(deque.display).toHaveText('Deque is empty');

    await deque.clickAddBack();
    await expect(deque.display).toHaveText('Deque is empty');

    // Removing from front/back on empty deque should keep it empty (no exceptions thrown)
    await deque.clickRemoveFront();
    await expect(deque.display).toHaveText('Deque is empty');

    await deque.clickRemoveBack();
    await expect(deque.display).toHaveText('Deque is empty');

    // No console/page errors occurred during these edge interactions
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Accessibility and content checks: display updates and buttons labeled correctly', async ({ page }) => {
    // Purpose: Check button accessible names and that the display element updates visibly after actions.
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err.message));

    const deque = new DequePage(page);
    await deque.goto();

    // Verify buttons have the expected accessible names (matching their visible text)
    await expect(deque.addFrontButton).toHaveText('Add to Front');
    await expect(deque.addBackButton).toHaveText('Add to Back');
    await expect(deque.removeFrontButton).toHaveText('Remove from Front');
    await expect(deque.removeBackButton).toHaveText('Remove from Back');

    // Perform an action and assert the display is visible and has changed content
    await deque.fillInput('X');
    await deque.clickAddBack();

    const displayText = await deque.getDisplayText();
    expect(displayText).toBe('X');

    // Ensure the display element is attached to the DOM and visible
    await expect(deque.display).toBeVisible();

    // No console/page errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});