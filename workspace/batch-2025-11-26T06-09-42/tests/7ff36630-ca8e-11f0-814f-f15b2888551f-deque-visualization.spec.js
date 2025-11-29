import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T06-09-42/html/7ff36630-ca8e-11f0-814f-f15b2888551f.html';

// Page Object Model for the Deque app
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#elementValue');
    this.addFrontBtn = page.locator('.btn-add[onclick="app.addFront()"]');
    this.addBackBtn = page.locator('.btn-add[onclick="app.addBack()"]');
    this.removeFrontBtn = page.locator('.btn-remove[onclick="app.removeFront()"]');
    this.removeBackBtn = page.locator('.btn-remove[onclick="app.removeBack()"]');
    this.peekFrontBtn = page.locator('.btn-peek[onclick="app.peekFront()"]');
    this.peekBackBtn = page.locator('.btn-peek[onclick="app.peekBack()"]');
    this.getSizeBtn = page.locator('.btn-info[onclick="app.getSize()"]');
    this.checkEmptyBtn = page.locator('.btn-info[onclick="app.checkEmpty()"]');
    this.visual = page.locator('#deque-visual');
    this.info = page.locator('#infoDisplay');
    this.elementSelector = '.deque-element';
    this.emptyMessageSelector = '.empty-message';
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Ensure initial render has happened
    await expect(this.visual).toBeVisible();
  }

  async setInput(value) {
    await this.input.fill(value);
  }

  async addFront(value) {
    if (value !== undefined) await this.setInput(value);
    await this.addFrontBtn.click();
  }

  async addBack(value) {
    if (value !== undefined) await this.setInput(value);
    await this.addBackBtn.click();
  }

  async removeFront() {
    await this.removeFrontBtn.click();
  }

  async removeBack() {
    await this.removeBackBtn.click();
  }

  async peekFront() {
    await this.peekFrontBtn.click();
  }

  async peekBack() {
    await this.peekBackBtn.click();
  }

  async getSize() {
    await this.getSizeBtn.click();
  }

  async checkEmpty() {
    await this.checkEmptyBtn.click();
  }

  async pressEnterInInput() {
    await this.input.press('Enter');
  }

  async getInfoText() {
    return (await this.info.textContent())?.trim();
  }

  async getVisualText() {
    return (await this.visual.textContent())?.trim();
  }

  async getDequeElements() {
    return this.page.locator(this.elementSelector);
  }

  async dequeElementsCount() {
    return await this.getDequeElements().count();
  }

  async dequeElementsTextArray() {
    const count = await this.dequeElementsCount();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.getDequeElements().nth(i).textContent())?.trim());
    }
    return texts;
  }

  async hasEmptyMessage() {
    return (await this.page.locator(this.emptyMessageSelector).count()) > 0;
  }
}

test.describe('Deque Visualization - FSM states and transitions', () => {
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Capture console errors and page errors for each test
    consoleErrors = [];
    pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
  });

  test('Initial idle state: visualization shows empty message and default info', async ({ page }) => {
    // Validate idle state's DOM and initial info text
    const appPage = new DequePage(page);
    await appPage.goto();

    // The visualization should indicate that the deque is empty
    expect(await appPage.hasEmptyMessage()).toBe(true);

    // Info display should have the initial prompt text
    const info = await appPage.getInfoText();
    expect(info).toContain('Perform an action to see the result.');

    // No deque elements should be present
    expect(await appPage.dequeElementsCount()).toBe(0);

    // Ensure there were no runtime errors during load
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test.describe('Adding elements (addingFront / addingBack states)', () => {
    test('addingFront: add element to front updates DOM and info, input cleared and focused', async ({ page }) => {
      // This test validates onEnter(addFront) and onExit(render) behavior through UI.
      const appPage = new DequePage(page);
      await appPage.goto();

      // Type value and click Add to Front
      await appPage.setInput('A');
      await appPage.addFront();

      // After adding, one element should be present with text "A"
      expect(await appPage.dequeElementsCount()).toBe(1);
      const texts = await appPage.dequeElementsTextArray();
      expect(texts).toEqual(['A']);

      // Info display should mention it was added to the front
      const info = await appPage.getInfoText();
      expect(info).toBe('Added "A" to the front.');

      // Input should be cleared and focused (focused element id should be elementValue)
      const activeId = await page.evaluate(() => document.activeElement?.id || null);
      expect(activeId).toBe('elementValue');

      // No runtime errors introduced by this transition
      expect(consoleErrors).toHaveLength(0);
      expect(pageErrors).toHaveLength(0);
    });

    test('addingFront then addingBack results in correct order (front first, back last)', async ({ page }) => {
      // Validate ordering produced by addFront and addBack transitions
      const appPage = new DequePage(page);
      await appPage.goto();

      // Add 'first' to back via Enter key for variety
      await appPage.setInput('first');
      await appPage.pressEnterInInput(); // Enter should trigger addBack
      await expect(appPage.getInfoText()).resolves.toContain('Added "first" to the back.');

      // Now add 'newFront' to the front
      await appPage.setInput('newFront');
      await appPage.addFront();

      // The DOM order should be ['newFront', 'first'] because front is rendered first
      const texts = await appPage.dequeElementsTextArray();
      expect(texts).toEqual(['newFront', 'first']);

      // Add 'last' to the back
      await appPage.setInput('last');
      await appPage.addBack();

      // Order should be ['newFront', 'first', 'last']
      const texts2 = await appPage.dequeElementsTextArray();
      expect(texts2).toEqual(['newFront', 'first', 'last']);

      // Info must reflect the last addBack action
      expect(await appPage.getInfoText()).toBe('Added "last" to the back.');

      // No runtime errors
      expect(consoleErrors).toHaveLength(0);
      expect(pageErrors).toHaveLength(0);
    });

    test('adding with empty input should not add and should show validation info', async ({ page }) => {
      // Edge case: empty input should be rejected by getInputValue()
      const appPage = new DequePage(page);
      await appPage.goto();

      // Ensure input is empty and click addFront
      await appPage.setInput('   '); // whitespace only
      await appPage.addFront();

      // No elements should be added
      expect(await appPage.dequeElementsCount()).toBe(0);
      // Info should instruct to enter a value
      expect(await appPage.getInfoText()).toBe('Please enter a value to add.');

      // No runtime errors
      expect(consoleErrors).toHaveLength(0);
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe('Removing elements (removingFront / removingBack states)', () => {
    test('removingFront from non-empty deque updates DOM and info', async ({ page }) => {
      // Add two elements then remove front and verify
      const appPage = new DequePage(page);
      await appPage.goto();

      await appPage.addBack('one');
      await appPage.addBack('two');

      expect(await appPage.dequeElementsCount()).toBe(2);
      expect(await appPage.dequeElementsTextArray()).toEqual(['one', 'two']);

      // Remove from front
      await appPage.removeFront();

      // Now only 'two' should remain
      expect(await appPage.dequeElementsCount()).toBe(1);
      expect(await appPage.dequeElementsTextArray()).toEqual(['two']);

      // Info message should indicate removed value
      expect(await appPage.getInfoText()).toBe('Removed "one" from the front.');

      // No runtime errors
      expect(consoleErrors).toHaveLength(0);
      expect(pageErrors).toHaveLength(0);
    });

    test('removingBack from non-empty deque updates DOM and info', async ({ page }) => {
      const appPage = new DequePage(page);
      await appPage.goto();

      await appPage.addBack('alpha');
      await appPage.addBack('beta');
      expect(await appPage.dequeElementsTextArray()).toEqual(['alpha', 'beta']);

      // Remove back
      await appPage.removeBack();

      // 'alpha' should remain
      expect(await appPage.dequeElementsTextArray()).toEqual(['alpha']);
      expect(await appPage.getInfoText()).toBe('Removed "beta" from the back.');

      // No runtime errors
      expect(consoleErrors).toHaveLength(0);
      expect(pageErrors).toHaveLength(0);
    });

    test('removing from empty deque shows appropriate error info', async ({ page }) => {
      // Edge cases for removing when empty
      const appPage = new DequePage(page);
      await appPage.goto();

      // Remove front on empty
      await appPage.removeFront();
      expect(await appPage.getInfoText()).toBe('Cannot remove from front: Deque is empty.');
      expect(await appPage.dequeElementsCount()).toBe(0);

      // Remove back on empty
      await appPage.removeBack();
      expect(await appPage.getInfoText()).toBe('Cannot remove from back: Deque is empty.');
      expect(await appPage.dequeElementsCount()).toBe(0);

      // No runtime errors (these are expected application-level messages, not exceptions)
      expect(consoleErrors).toHaveLength(0);
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe('Peeking and Info (peekingFront / peekingBack / gettingSize / checkingEmpty)', () => {
    test('peekingFront and peekingBack return correct values or proper empty messages', async ({ page }) => {
      const appPage = new DequePage(page);
      await appPage.goto();

      // Peeking on empty deque
      await appPage.peekFront();
      expect(await appPage.getInfoText()).toBe('Cannot peek front: Deque is empty.');

      await appPage.peekBack();
      expect(await appPage.getInfoText()).toBe('Cannot peek back: Deque is empty.');

      // Add elements and peek again
      await appPage.addBack('x');
      await appPage.addBack('y');
      // Now front should be 'x' and back 'y'
      await appPage.peekFront();
      expect(await appPage.getInfoText()).toBe('Front element is "x".');

      await appPage.peekBack();
      expect(await appPage.getInfoText()).toBe('Back element is "y".');

      // No runtime errors
      expect(consoleErrors).toHaveLength(0);
      expect(pageErrors).toHaveLength(0);
    });

    test('gettingSize returns accurate counts and checkingEmpty reports correctly', async ({ page }) => {
      const appPage = new DequePage(page);
      await appPage.goto();

      // Initially empty
      await appPage.getSize();
      expect(await appPage.getInfoText()).toBe('The deque contains 0 element(s).');

      await appPage.checkEmpty();
      expect(await appPage.getInfoText()).toBe('Is the deque empty? true.');

      // Add two elements
      await appPage.addFront('A');
      await appPage.addBack('B');

      await appPage.getSize();
      expect(await appPage.getInfoText()).toBe('The deque contains 2 element(s).');

      await appPage.checkEmpty();
      expect(await appPage.getInfoText()).toBe('Is the deque empty? false.');

      // No runtime errors
      expect(consoleErrors).toHaveLength(0);
      expect(pageErrors).toHaveLength(0);
    });
  });

  test('comprehensive scenario: perform many transitions and verify final state and messages', async ({ page }) => {
    // This test walks through many FSM transitions to ensure consistent behavior
    const appPage = new DequePage(page);
    await appPage.goto();

    // Sequence:
    // AddFront C -> deque: C
    // AddBack D -> deque: C, D
    // AddFront B -> deque: B, C, D
    // AddBack E -> deque: B, C, D, E
    // RemoveFront -> removes B
    // RemoveBack -> removes E
    // PeekFront -> should be C
    // PeekBack -> should be D
    // GetSize -> 2
    // CheckEmpty -> false

    await appPage.addFront('C');
    await appPage.addBack('D');
    await appPage.addFront('B');
    await appPage.addBack('E');

    expect(await appPage.dequeElementsTextArray()).toEqual(['B', 'C', 'D', 'E']);

    await appPage.removeFront();
    expect(await appPage.dequeElementsTextArray()).toEqual(['C', 'D']);
    expect(await appPage.getInfoText()).toBe('Removed "B" from the front.');

    await appPage.removeBack();
    expect(await appPage.dequeElementsTextArray()).toEqual(['C']);
    expect(await appPage.getInfoText()).toBe('Removed "E" from the back.');

    // At this point only 'C' remains because previous removeBack removed E and removeFront removed B leaving C and D, then removeBack removed D leaving C. Adjust expectations accordingly.
    // Re-add 'D' to recreate expected peeks
    await appPage.addBack('D');
    expect(await appPage.dequeElementsTextArray()).toEqual(['C', 'D']);

    await appPage.peekFront();
    expect(await appPage.getInfoText()).toBe('Front element is "C".');

    await appPage.peekBack();
    expect(await appPage.getInfoText()).toBe('Back element is "D".');

    await appPage.getSize();
    expect(await appPage.getInfoText()).toBe('The deque contains 2 element(s).');

    await appPage.checkEmpty();
    expect(await appPage.getInfoText()).toBe('Is the deque empty? false.');

    // Final DOM check: two elements in order C, D
    expect(await appPage.dequeElementsTextArray()).toEqual(['C', 'D']);

    // No runtime errors observed during this long sequence
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('observe console and page errors for the page load and interactions', async ({ page }) => {
    // This test intentionally collects console/page errors and asserts on them.
    // The application is not expected to throw runtime exceptions; therefore, this test asserts there are none.
    const appPage = new DequePage(page);
    await appPage.goto();

    // Perform a few interactions
    await appPage.addBack('errCheck1');
    await appPage.removeFront();
    await appPage.peekFront();

    // Validate arrays captured in beforeEach
    // We assert that there were no uncaught console errors or page errors.
    // If the runtime produced ReferenceError, TypeError, or SyntaxError naturally, these counters would be >0 and this test would fail accordingly.
    expect(consoleErrors, 'Console error messages (unexpected)').toHaveLength(0);
    expect(pageErrors, 'Uncaught page errors (unexpected)').toHaveLength(0);
  });
});