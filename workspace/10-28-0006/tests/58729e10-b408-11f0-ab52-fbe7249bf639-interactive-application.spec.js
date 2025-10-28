import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0006/html/58729e10-b408-11f0-ab52-fbe7249bf639.html';

class RBTreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.visualization = page.locator('#visualization');
    this.input = page.locator('#insert-input');
    this.button = page.locator('#insert-button');
    this.balanceMsg = page.locator('#balance-msg');
    this.nodes = page.locator('#visualization .node');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async isButtonEnabled() {
    return !(await this.button.isDisabled());
  }

  async getButtonBgColor() {
    return await this.button.evaluate((el) => getComputedStyle(el).backgroundColor);
  }

  async hoverInsertButton() {
    await this.button.hover();
  }

  async moveMouseOut() {
    await this.visualization.hover();
  }

  async setInputValueViaType(value) {
    await this.input.fill(''); // clear
    await this.input.fill(String(value));
  }

  async setInputValueRaw(value) {
    // Force-set value regardless of input type constraints (e.g., non-numeric strings)
    await this.page.evaluate((v) => {
      const el = document.getElementById('insert-input');
      el.value = v;
    }, String(value));
  }

  async clickInsert() {
    await this.button.click();
  }

  async insert(value) {
    await this.setInputValueViaType(value);
    await this.clickInsert();
  }

  async getInputValue() {
    return await this.input.inputValue();
  }

  async getNodeCount() {
    return await this.nodes.count();
  }

  async getNodeTexts() {
    return await this.nodes.allTextContents();
  }

  async getFirstNodeHandle() {
    const handle = await this.nodes.first().elementHandle();
    return handle;
  }

  async getBalanceMessage() {
    return await this.balanceMsg.textContent();
  }
}

test.describe('Interactive Red-Black Tree - FSM and UI behavior', () => {
  test.beforeEach(async ({ page }) => {
    const app = new RBTreePage(page);
    await app.goto();
  });

  test.describe('Idle and hover states', () => {
    test('should start in idle (readyForInteraction): input empty, button enabled, visualization empty', async ({ page }) => {
      const app = new RBTreePage(page);
      // Ensure initial idle state
      await expect(app.input).toBeVisible();
      await expect(app.button).toBeVisible();
      expect(await app.isButtonEnabled()).toBe(true);

      // Input should initially be empty
      expect(await app.getInputValue()).toBe('');

      // Visualization should have no nodes
      await expect(app.nodes).toHaveCount(0);

      // Balance message should be empty
      expect((await app.getBalanceMessage())?.trim() ?? '').toBe('');
    });

    test('should apply hover style on MOUSE_OVER_INSERT and remove on MOUSE_OUT_INSERT', async ({ page }) => {
      const app = new RBTreePage(page);

      const originalColor = await app.getButtonBgColor();
      await app.hoverInsertButton();
      // Check hover color (CSS defines #0056b3 => rgb(0, 86, 179))
      await expect.poll(async () => await app.getButtonBgColor()).toBe('rgb(0, 86, 179)');

      // Mouse out to another element, expect hover style removed
      await app.moveMouseOut();
      await expect.poll(async () => await app.getButtonBgColor()).toBe(originalColor);
    });
  });

  test.describe('Processing input and validation', () => {
    test('should clear input on CLICK_INSERT and remain idle on VALUE_INVALID (invalid input)', async ({ page }) => {
      const app = new RBTreePage(page);

      // Force an invalid input via raw set (non-number string)
      await app.setInputValueRaw('not-a-number');
      await app.clickInsert();

      // processing_input: readValueAndClearInput -> input should be cleared
      expect(await app.getInputValue()).toBe('');

      // VALUE_INVALID -> back to idle without visualization changes or messages
      await expect(app.nodes).toHaveCount(0);
      expect((await app.getBalanceMessage())?.trim() ?? '').toBe('');
    });

    test('should clear input and proceed on VALUE_VALID (valid number)', async ({ page }) => {
      const app = new RBTreePage(page);

      await app.setInputValueViaType(10);
      await app.clickInsert();

      // input cleared
      expect(await app.getInputValue()).toBe('');

      // Eventually nodes appear (TREE_UPDATED -> building_visualization -> visualization built)
      await expect(app.nodes).toHaveCount(1);
    });

    test('should ignore empty input (VALUE_INVALID) and not alter tree', async ({ page }) => {
      const app = new RBTreePage(page);

      // Insert valid value first
      await app.insert(1);
      await expect(app.nodes).toHaveCount(1);

      // Click with empty input should not change node count
      await app.clickInsert();
      await expect(app.nodes).toHaveCount(1);

      // Message remains either previously set or unchanged; since no change expected on invalid
      expect((await app.getBalanceMessage())?.includes('Tree balanced after insertion!') || (await app.getBalanceMessage()) === '').toBeTruthy();
    });
  });

  test.describe('Updating tree and visualization', () => {
    test('should add a node with correct label and a color class (red or black)', async ({ page }) => {
      const app = new RBTreePage(page);

      await app.insert(15);
      await expect(app.nodes).toHaveCount(1);

      const texts = await app.getNodeTexts();
      expect(texts[0].trim()).toBe('15');

      // Ensure node has either red or black class
      const hasRed = await app.nodes.first().evaluate((el) => el.classList.contains('red'));
      const hasBlack = await app.nodes.first().evaluate((el) => el.classList.contains('black'));
      expect(hasRed || hasBlack).toBe(true);
    });

    test('should render alternating colors as nodes increase (at least one red and one black for 2 nodes)', async ({ page }) => {
      const app = new RBTreePage(page);

      await app.insert(3);
      await app.insert(7);
      await expect(app.nodes).toHaveCount(2);

      const redCount = await page.locator('#visualization .node.red').count();
      const blackCount = await page.locator('#visualization .node.black').count();
      expect(redCount).toBeGreaterThanOrEqual(1);
      expect(blackCount).toBeGreaterThanOrEqual(1);
    });

    test('should rebuild visualization on each insert (clear then render new nodes)', async ({ page }) => {
      const app = new RBTreePage(page);

      await app.insert(5);
      await expect(app.nodes).toHaveCount(1);

      const firstHandleBefore = await app.getFirstNodeHandle();

      // Insert second value triggers clearing and re-rendering
      await app.insert(8);
      await expect(app.nodes).toHaveCount(2);

      const firstHandleAfter = await app.getFirstNodeHandle();

      // If container is cleared and re-rendered, first node element should not be the same reference
      const sameRef = await page.evaluate((a, b) => a === b, firstHandleBefore, firstHandleAfter);
      expect(sameRef).toBe(false);
    });

    test('should maintain insertion order of node labels after multiple inserts', async ({ page }) => {
      const app = new RBTreePage(page);

      const values = [10, 20, 30];
      for (const v of values) {
        await app.insert(v);
      }
      await expect(app.nodes).toHaveCount(values.length);
      const texts = (await app.getNodeTexts()).map((t) => t.trim());
      expect(texts).toEqual(values.map(String));
    });
  });

  test.describe('Rebalancing message and returning to idle', () => {
    test('should set balance message during rebalancing and return to idle for next input', async ({ page }) => {
      const app = new RBTreePage(page);

      await app.insert(12);
      await expect(app.nodes).toHaveCount(1);

      // rebalancing: updateBalanceMessage -> message text set
      await expect(app.balanceMsg).toHaveText(/Tree balanced after insertion!/);

      // Return to idle: input ready, button interactive
      expect(await app.isButtonEnabled()).toBe(true);
      expect(await app.getInputValue()).toBe('');

      // Hover works again in idle
      const originalColor = await app.getButtonBgColor();
      await app.hoverInsertButton();
      await expect.poll(async () => await app.getButtonBgColor()).toBe('rgb(0, 86, 179)');
      await app.moveMouseOut();
      await expect.poll(async () => await app.getButtonBgColor()).toBe(originalColor);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('should handle decimal input by truncating via parseInt (e.g., 42.9 -> 42)', async ({ page }) => {
      const app = new RBTreePage(page);

      await app.setInputValueViaType('42.9');
      await app.clickInsert();
      await expect(app.nodes).toHaveCount(1);

      const texts = await app.getNodeTexts();
      expect(texts[0].trim()).toBe('42');

      await expect(app.balanceMsg).toHaveText(/Tree balanced after insertion!/);
    });

    test('should handle negative numbers', async ({ page }) => {
      const app = new RBTreePage(page);

      await app.insert(-7);
      await expect(app.nodes).toHaveCount(1);

      const texts = await app.getNodeTexts();
      expect(texts[0].trim()).toBe('-7');

      await expect(app.balanceMsg).toHaveText(/Tree balanced after insertion!/);
    });

    test('should allow duplicate inserts (nodes increase accordingly)', async ({ page }) => {
      const app = new RBTreePage(page);

      await app.insert(5);
      await app.insert(5);
      await expect(app.nodes).toHaveCount(2);

      const texts = await app.getNodeTexts();
      expect(texts.map((t) => t.trim())).toEqual(['5', '5']);
    });

    test('should not alter visualization or message on invalid input like whitespace', async ({ page }) => {
      const app = new RBTreePage(page);

      // Insert a valid value first
      await app.insert(1);
      await expect(app.nodes).toHaveCount(1);
      const messageAfterValid = await app.getBalanceMessage();

      // Now set whitespace which becomes invalid for parseInt
      await app.setInputValueRaw('   ');
      await app.clickInsert();

      await expect(app.nodes).toHaveCount(1);
      expect(await app.getBalanceMessage()).toBe(messageAfterValid);
      expect(await app.getInputValue()).toBe('');
    });
  });

  test.describe('FSM transition coverage on single click', () => {
    test('should execute processing_input -> updating_tree -> building_visualization -> rebalancing -> idle for VALUE_VALID', async ({ page }) => {
      const app = new RBTreePage(page);

      // Ensure starting from idle
      expect(await app.getInputValue()).toBe('');

      // processing_input: readValueAndClearInput
      await app.setInputValueViaType(99);
      await app.clickInsert();
      expect(await app.getInputValue()).toBe('');

      // updating_tree/building_visualization: nodes appear
      await expect(app.nodes).toHaveCount(1);

      // rebalancing: message updated
      await expect(app.balanceMsg).toHaveText(/Tree balanced after insertion!/);

      // idle again: can insert more
      expect(await app.isButtonEnabled()).toBe(true);

      // Insert again immediately to confirm idle responsiveness
      await app.insert(100);
      await expect(app.nodes).toHaveCount(2);
      await expect(app.balanceMsg).toHaveText(/Tree balanced after insertion!/);
    });

    test('should execute processing_input -> idle for VALUE_INVALID (no nodes added, no message)', async ({ page }) => {
      const app = new RBTreePage(page);

      // Force invalid input
      await app.setInputValueRaw('foo');
      await app.clickInsert();

      // Back to idle with no changes
      await expect(app.nodes).toHaveCount(0);
      expect((await app.getBalanceMessage())?.trim() ?? '').toBe('');
      expect(await app.isButtonEnabled()).toBe(true);
    });
  });
});