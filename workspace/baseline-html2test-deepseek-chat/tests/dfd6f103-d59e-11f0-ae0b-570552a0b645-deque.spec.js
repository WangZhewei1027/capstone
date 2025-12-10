import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd6f103-d59e-11f0-ae0b-570552a0b645.html';

test.describe('Deque Data Structure Visualizer - End-to-End', () => {
  // Arrays to collect console and page errors for each test
  let consoleErrors;
  let pageErrors;

  // Page Object to encapsulate interactions and queries
  class DequePage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
      this.page = page;
      // Locators
      this.elementValueInput = page.locator('#elementValue');
      this.elementCountInput = page.locator('#elementCount');
      this.addFrontButton = page.getByRole('button', { name: 'Add to Front' });
      this.addBackButton = page.getByRole('button', { name: 'Add to Back' });
      this.generateButton = page.getByRole('button', { name: 'Generate Elements' });
      this.showDetailsButton = page.getByRole('button', { name: 'Show Details' });
      this.dequeElements = page.locator('#dequeElements');
      this.messageArea = page.locator('#messageArea');
      this.dequeSize = page.locator('#dequeSize');
      this.isEmpty = page.locator('#isEmpty');
      this.operations = page.locator('.operations');
      this.clearButtonOperation = this.operations.getByText('Clear Deque');
    }

    // Navigate to the app and wait for initial rendering
    async goto() {
      await this.page.goto(APP_URL);
      // Wait until initial renderDeque runs (onload triggers renderDeque)
      await this.page.waitForSelector('#dequeElements');
      // Give a short moment for any asynchronous UI updates
      await this.page.waitForTimeout(50);
    }

    // Helper to click an operation by its visible text (inside the operations area)
    async clickOperation(text) {
      await this.operations.getByText(text).click();
      // small wait for UI update
      await this.page.waitForTimeout(50);
    }

    // Add value to the front via control-group button
    async addToFront(value) {
      await this.elementValueInput.fill(value);
      await this.addFrontButton.click();
      await this.page.waitForTimeout(50);
    }

    // Add value to the back via control-group button
    async addToBack(value) {
      await this.elementValueInput.fill(value);
      await this.addBackButton.click();
      await this.page.waitForTimeout(50);
    }

    // Generate random elements using the controls
    async generateRandom(count) {
      await this.elementCountInput.fill(String(count));
      await this.generateButton.click();
      await this.page.waitForTimeout(50);
    }

    // Get the displayed message area text
    async getMessageText() {
      return (await this.messageArea.textContent())?.trim() ?? '';
    }

    // Get computed color of message area (useful to distinguish error/info)
    async getMessageColor() {
      return await this.page.evaluate((selector) => {
        const el = document.querySelector(selector);
        return window.getComputedStyle(el).color;
      }, '#messageArea');
    }

    // Get deque size text as number
    async getDequeSize() {
      const text = (await this.dequeSize.textContent())?.trim() ?? '0';
      return parseInt(text, 10);
    }

    // Get isEmpty display text
    async getIsEmptyText() {
      return (await this.isEmpty.textContent())?.trim() ?? '';
    }

    // Return an array representing current deque elements:
    // [{ text: 'A', classes: 'deque-element front', positionText: 'Front' }, ...]
    async getDequeElements() {
      const elements = await this.dequeElements.locator('.deque-element').elementHandles();
      const results = [];
      for (const el of elements) {
        const text = (await el.$eval('.value', node => node.textContent?.trim())).trim();
        const positionText = await el.$eval('.position', node => node.textContent?.trim());
        const className = await (await el.getProperty('className')).jsonValue();
        results.push({ text, positionText, className });
      }
      return results;
    }

    // Click clear via operations area
    async clearDeque() {
      await this.clickOperation('Clear Deque');
    }

    // Use the 'Show Details' button in controls
    async showDetails() {
      await this.showDetailsButton.click();
      await this.page.waitForTimeout(50);
    }

    // Click pop front/back operations
    async popFrontViaOperation() {
      await this.clickOperation('Pop Front');
    }
    async popBackViaOperation() {
      await this.clickOperation('Pop Back');
    }

    // Click get front/back operations
    async getFrontViaOperation() {
      await this.clickOperation('Get Front');
    }
    async getBackViaOperation() {
      await this.clickOperation('Get Back');
    }
  }

  // Before each test, create fresh arrays to collect console/page errors and attach listeners
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages and errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture unhandled exceptions (page errors)
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
  });

  // After each test, assert there were no runtime console errors or page errors
  test.afterEach(async () => {
    // Assert that no console errors were emitted during the test
    expect(consoleErrors, `Console errors were emitted: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    // Assert that no page errors occurred
    expect(pageErrors, `Page errors occurred: ${JSON.stringify(pageErrors)}`).toHaveLength(0);
  });

  test.describe('Initial load and default state', () => {
    test('should load the page and display initial empty state', async ({ page }) => {
      // Purpose: verify initial content is rendered and deque is empty
      const dq = new DequePage(page);
      await dq.goto();

      // Check welcome message displayed
      const message = await dq.getMessageText();
      expect(message).toContain('Welcome! Use the controls below to interact with the deque.');

      // Deque elements area should indicate empty state
      const dequeElementsText = await page.locator('#dequeElements').textContent();
      expect(dequeElementsText).toContain('Deque is empty');

      // Deque size and isEmpty indicators
      const size = await dq.getDequeSize();
      expect(size).toBe(0);
      const isEmpty = await dq.getIsEmptyText();
      expect(isEmpty).toBe('True');
    });
  });

  test.describe('Basic push/pop operations and UI updates', () => {
    test('should push to front and update UI, then push to back and reflect both front/back', async ({ page }) => {
      // Purpose: test Add to Front and Add to Back control buttons and UI classes
      const dq = new DequePage(page);
      await dq.goto();

      // Add 'A' to front
      await dq.addToFront('A');

      // After adding one element, it should be both front and back
      expect(await dq.getDequeSize()).toBe(1);
      let elements = await dq.getDequeElements();
      expect(elements.length).toBe(1);
      expect(elements[0].text).toBe('A');
      // The single element should have 'front' and 'back' classes applied by logic (front added and back added)
      // The implementation sets 'front' when index===0 and 'back' when index===length-1 so for length 1 both get added.
      expect(elements[0].className).toContain('front');
      expect(elements[0].className).toContain('back');

      // Message area indicates the element added to the front
      expect(await dq.getMessageText()).toContain('Element "A" added to the front of the deque.');

      // Add 'B' to back
      await dq.addToBack('B');
      expect(await dq.getDequeSize()).toBe(2);
      elements = await dq.getDequeElements();
      expect(elements.length).toBe(2);
      // First element should be front and show 'Front' position text
      expect(elements[0].text).toBe('A');
      expect(elements[0].positionText).toBe('Front');
      expect(elements[0].className).toContain('front');
      // Last element should be back and show 'Back' position text
      expect(elements[1].text).toBe('B');
      expect(elements[1].positionText).toBe('Back');
      expect(elements[1].className).toContain('back');

      // Message area indicates element added to the back
      expect(await dq.getMessageText()).toContain('Element "B" added to the back of the deque.');
    });

    test('should pop from front and back via operations and update size and messages', async ({ page }) => {
      // Purpose: verify Pop Front and Pop Back operations remove elements and update UI
      const dq = new DequePage(page);
      await dq.goto();

      // Prepare deque with two elements using control buttons
      await dq.addToFront('X'); // now [X]
      await dq.addToBack('Y');  // now [X, Y]
      expect(await dq.getDequeSize()).toBe(2);

      // Pop front via operations area
      await dq.popFrontViaOperation();
      expect(await dq.getMessageText()).toContain('Element "X" removed from the front of the deque.');
      expect(await dq.getDequeSize()).toBe(1);

      // Remaining element should be 'Y' and both front/back
      let elements = await dq.getDequeElements();
      expect(elements.length).toBe(1);
      expect(elements[0].text).toBe('Y');

      // Pop back via operations area
      await dq.popBackViaOperation();
      expect(await dq.getMessageText()).toContain('Element "Y" removed from the back of the deque.');
      expect(await dq.getDequeSize()).toBe(0);

      // Deque displays empty message
      const dequeElementsText = await page.locator('#dequeElements').textContent();
      expect(dequeElementsText).toContain('Deque is empty');
    });

    test('getFront and getBack operations should not remove elements and show correct messages', async ({ page }) => {
      // Purpose: verify getFront/getBack read operations
      const dq = new DequePage(page);
      await dq.goto();

      // Add two elements
      await dq.addToFront('First'); // [First]
      await dq.addToBack('Second'); // [First, Second]

      // Get front (should show 'First' and not remove)
      await dq.getFrontViaOperation();
      expect(await dq.getMessageText()).toContain('Front element is "First".');
      expect(await dq.getDequeSize()).toBe(2);

      // Get back (should show 'Second' and not remove)
      await dq.getBackViaOperation();
      expect(await dq.getMessageText()).toContain('Back element is "Second".');
      expect(await dq.getDequeSize()).toBe(2);
    });
  });

  test.describe('Controls: Generate, Clear, Show Details, and edge cases', () => {
    test('should generate random elements with specified count and update UI', async ({ page }) => {
      // Purpose: ensure random generation respects count and updates deque size and message
      const dq = new DequePage(page);
      await dq.goto();

      const count = 7;
      await dq.generateRandom(count);

      // Size should equal requested count and message should indicate generated count
      expect(await dq.getDequeSize()).toBe(count);
      expect((await dq.getMessageText())).toContain(`Generated ${count} random elements in the deque.`);

      // deque-elements should contain the expected number of child .deque-element nodes
      const elems = await page.locator('#dequeElements .deque-element').count();
      expect(elems).toBe(count);
    });

    test('clear operation should empty the deque and reset UI', async ({ page }) => {
      // Purpose: ensure clearing deque resets elements, size, and message
      const dq = new DequePage(page);
      await dq.goto();

      // Populate deque then clear
      await dq.addToFront('ToClear');
      expect(await dq.getDequeSize()).toBeGreaterThan(0);
      await dq.clearDeque();

      // After clearing, size zero and UI shows empty message
      expect(await dq.getDequeSize()).toBe(0);
      expect(await dq.getIsEmptyText()).toBe('True');
      expect((await dq.getMessageText())).toContain('Deque has been cleared.');

      const dequeElementsText = await page.locator('#dequeElements').textContent();
      expect(dequeElementsText).toContain('Deque is empty');
    });

    test('showDetails should display list of elements or empty message appropriately', async ({ page }) => {
      // Purpose: check showDetails behavior both empty and non-empty
      const dq = new DequePage(page);
      await dq.goto();

      // When empty
      await dq.showDetails();
      expect(await dq.getMessageText()).toContain('Deque is empty.');

      // When non-empty
      await dq.addToBack('D1');
      await dq.addToBack('D2');
      await dq.showDetails();
      const msg = await dq.getMessageText();
      expect(msg).toContain('Deque has 2 elements: [D1, D2]');
    });

    test('should show error when adding empty value and style indicates error', async ({ page }) => {
      // Purpose: verify input validation when adding empty values
      const dq = new DequePage(page);
      await dq.goto();

      // Ensure input is empty and click Add to Front
      await dq.elementValueInput.fill('');
      await dq.addFrontButton.click();
      await page.waitForTimeout(50);

      // Error message should be shown
      expect(await dq.getMessageText()).toContain('Please enter a value to add to the deque.');

      // Message color should correspond to error color '#ff6b6b' i.e. rgb(255, 107, 107)
      const color = await dq.getMessageColor();
      expect(color).toBe('rgb(255, 107, 107)');
    });

    test('generateRandomElements should validate count boundaries and show error for invalid input', async ({ page }) => {
      // Purpose: test generating with invalid counts (edge cases)
      const dq = new DequePage(page);
      await dq.goto();

      // Too low (0)
      await dq.elementCountInput.fill('0');
      await dq.generateButton.click();
      await page.waitForTimeout(50);
      expect(await dq.getMessageText()).toContain('Please enter a number between 1 and 20.');
      expect(await dq.getMessageColor()).toBe('rgb(255, 107, 107)');

      // Too high (21)
      await dq.elementCountInput.fill('21');
      await dq.generateButton.click();
      await page.waitForTimeout(50);
      expect(await dq.getMessageText()).toContain('Please enter a number between 1 and 20.');
      expect(await dq.getMessageColor()).toBe('rgb(255, 107, 107)');
    });
  });

  test.describe('Accessibility and visual structure checks', () => {
    test('deque element visual markers for front and back are present and update correctly', async ({ page }) => {
      // Purpose: ensure visual "position" indicators are shown (Front/Back) and classes update
      const dq = new DequePage(page);
      await dq.goto();

      // Start with empty - show message 'Deque is empty'
      expect((await page.locator('#dequeElements').textContent())).toContain('Deque is empty');

      // Add multiple items and verify positions
      await dq.addToBack('1');
      await dq.addToBack('2');
      await dq.addToBack('3'); // deque: [1,2,3]

      const elements = await dq.getDequeElements();
      // First should be 'Front'
      expect(elements[0].positionText).toBe('Front');
      // Last should be 'Back'
      expect(elements[elements.length - 1].positionText).toBe('Back');
      // Middle element should have empty position label
      if (elements.length >= 3) {
        expect(elements[1].positionText).toBe('');
      }
    });
  });
});