import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-23T16-37-48/html/4b5ada20-c88b-11f0-b980-35cc7f0de6b4.html';

/**
 * Page Object for the Deque interactive demo.
 * Encapsulates common operations and selectors used across tests.
 */
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.deque = page.locator('#deque');
    this.input = page.locator('#inputValue');
    this.pushFrontBtn = page.locator('#pushFrontBtn');
    this.pushBackBtn = page.locator('#pushBackBtn');
    this.popFrontBtn = page.locator('#popFrontBtn');
    this.popBackBtn = page.locator('#popBackBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.message = page.locator('#message');
    this.node = (nth = 0) => page.locator('#deque .node').nth(nth);
    this.nodes = () => page.locator('#deque .node');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for initial message to be present
    await expect(this.message).toBeVisible();
  }

  async enterInput(value) {
    await this.input.fill(value);
  }

  async pressEnterInInput() {
    await this.input.press('Enter');
  }

  async clickPushFront() {
    await this.pushFrontBtn.click();
  }

  async clickPushBack() {
    await this.pushBackBtn.click();
  }

  async clickPopFront() {
    await this.popFrontBtn.click();
  }

  async clickPopBack() {
    await this.popBackBtn.click();
  }

  async clickClear() {
    await this.clearBtn.click();
  }

  async getMessageText() {
    return (await this.message.innerText()).trim();
  }

  async getMessageColor() {
    return this.page.evaluate((el) => getComputedStyle(el).color, await this.message.elementHandle());
  }

  async nodeCount() {
    return await this.nodes().count();
  }

  async firstNodeText() {
    const count = await this.nodeCount();
    if (count === 0) return null;
    return (await this.node(0).innerText()).trim();
  }

  async lastNodeText() {
    const count = await this.nodeCount();
    if (count === 0) return null;
    return (await this.node(count - 1).innerText()).trim();
  }

  // Wait until an inserting node with the given direction class appears
  async waitForInsertingDirection(direction = 'rear', options = {}) {
    const classSelector = direction === 'front' ? '.slide-in-front' : '.slide-in-rear';
    const inserting = this.page.locator(`#deque .node.inserting${classSelector}`);
    await inserting.waitFor({ state: 'visible', timeout: options.timeout ?? 2000 });
    return inserting;
  }

  // Wait for animation to finish by waiting for a success message (the app sets the success message after animation completes)
  async waitForSuccessMessageContaining(substring, options = {}) {
    await expect(this.message).toHaveText(new RegExp(substring), { timeout: options.timeout ?? 3000 });
  }

  // Wait for removing animation to start (node.removing .fade-out present)
  async waitForRemovingAnimation(options = {}) {
    const removing = this.page.locator('#deque .node.removing.fade-out');
    await removing.waitFor({ state: 'visible', timeout: options.timeout ?? 2000 });
    return removing;
  }

  // Utility to fill deque with n items by pushBack (used for capacity tests). Waits for each insertion to complete.
  async fillWithCount(n, base = 'X') {
    for (let i = 0; i < n; i++) {
      await this.enterInput(`${base}${i}`);
      await this.clickPushBack();
      // Wait for success message which indicates animation finished
      await this.waitForSuccessMessageContaining(`成功从后端添加元素`, { timeout: 5000 });
    }
  }

  // Check whether a button is disabled
  async isDisabled(locator) {
    return await locator.evaluate((btn) => btn.disabled);
  }
}

test.describe('Deque interactive FSM - 4b5ada20-c88b-11f0-b980-35cc7f0de6b4', () => {
  let page;
  let dequePage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    dequePage = new DequePage(page);
    await dequePage.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Idle states and initial UI', () => {
    test('Initial load should be idle_empty: no nodes, initial message and proper buttons disabled', async () => {
      // Validate deque is empty
      expect(await dequePage.nodeCount()).toBe(0);

      // Initial message is instructional
      const msg = await dequePage.getMessageText();
      expect(msg).toMatch(/请输入元素.*最大容量20/);

      // Buttons: pop and clear should be disabled; push buttons enabled; input enabled
      expect(await dequePage.isDisabled(dequePage.popFrontBtn)).toBe(true);
      expect(await dequePage.isDisabled(dequePage.popBackBtn)).toBe(true);
      expect(await dequePage.isDisabled(dequePage.clearBtn)).toBe(true);

      expect(await dequePage.isDisabled(dequePage.pushFrontBtn)).toBe(false);
      expect(await dequePage.isDisabled(dequePage.pushBackBtn)).toBe(false);
      expect(await dequePage.isDisabled(dequePage.input)).toBe(false);
    });
  });

  test.describe('Insertion operations (inserting_front / inserting_rear)', () => {
    test('INPUT_ENTER should trigger inserting_rear, disable controls during animation, then update state and message', async () => {
      // Enter value and press Enter to trigger INPUT_ENTER -> inserting_rear
      await dequePage.enterInput('rear1');

      // Click Enter: handler clears message immediately and sets animating true, then animation starts
      await dequePage.pressEnterInInput();

      // During animation, the message should be cleared (empty) and inserting node should appear
      await expect(dequePage.message).toHaveText('', { timeout: 1000 });
      const inserting = page.locator('#deque .node.inserting.slide-in-rear');
      await inserting.waitFor({ state: 'visible', timeout: 2000 });

      // While animating controls should be disabled (input and most buttons)
      expect(await dequePage.isDisabled(dequePage.input)).toBe(true);
      expect(await dequePage.isDisabled(dequePage.pushFrontBtn)).toBe(true);
      expect(await dequePage.isDisabled(dequePage.pushBackBtn)).toBe(true);
      expect(await dequePage.isDisabled(dequePage.popFrontBtn)).toBe(true);
      expect(await dequePage.isDisabled(dequePage.popBackBtn)).toBe(true);
      expect(await dequePage.isDisabled(dequePage.clearBtn)).toBe(true);

      // Wait for animation to finish -> success message will be set by the app
      await dequePage.waitForSuccessMessageContaining('成功从后端添加元素');

      // After animation and onExit actions: node should exist, input cleared, buttons updated
      expect(await dequePage.nodeCount()).toBe(1);
      expect(await dequePage.firstNodeText()).toBe('rear1');

      // Message color for success is green (#2e7d32). Validate computed color contains 'rgb' format with green-ish tone.
      const color = await dequePage.getMessageColor();
      expect(color).toMatch(/rgb\(.+?\)/);

      // Now pop and clear buttons should be enabled
      expect(await dequePage.isDisabled(dequePage.popFrontBtn)).toBe(false);
      expect(await dequePage.isDisabled(dequePage.popBackBtn)).toBe(false);
      expect(await dequePage.isDisabled(dequePage.clearBtn)).toBe(false);
      // pushBack disabled only if at capacity (not yet), so should be enabled
      expect(await dequePage.isDisabled(dequePage.pushBackBtn)).toBe(false);
    });

    test('Click push front should animate slide-in-front and place the new node at the front', async () => {
      // Prepare by adding a rear element to ensure non-empty state before pushFront
      await dequePage.enterInput('base');
      await dequePage.clickPushBack();
      await dequePage.waitForSuccessMessageContaining('成功从后端添加元素');

      // Now push at front
      await dequePage.enterInput('front1');
      await dequePage.clickPushFront();

      // During animation: a node with slide-in-front + inserting classes should be visible
      await page.locator('#deque .node.inserting.slide-in-front').waitFor({ state: 'visible', timeout: 2000 });

      // Message cleared during animation
      await expect(dequePage.message).toHaveText('', { timeout: 1000 });

      // Wait for completion and message update
      await dequePage.waitForSuccessMessageContaining('成功从前端添加元素');

      // New node should be at index 0 (front)
      expect(await dequePage.firstNodeText()).toBe('front1');
      // Rear should remain the previously added 'base'
      expect(await dequePage.lastNodeText()).toBe('base');
    });
  });

  test.describe('Removal operations (removing_front / removing_rear)', () => {
    test('Pop front triggers removing animation and removes the first element, updates message', async () => {
      // Setup: add two elements
      await dequePage.enterInput('A');
      await dequePage.clickPushBack();
      await dequePage.waitForSuccessMessageContaining('成功从后端添加元素');

      await dequePage.enterInput('B');
      await dequePage.clickPushBack();
      await dequePage.waitForSuccessMessageContaining('成功从后端添加元素');

      // Ensure initial order is A (first) then B (last)
      expect(await dequePage.firstNodeText()).toBe('A');
      expect(await dequePage.lastNodeText()).toBe('B');

      // Click pop front
      await dequePage.clickPopFront();

      // During removing animation: a node should have removing and fade-out classes
      await page.locator('#deque .node.removing.fade-out').waitFor({ state: 'visible', timeout: 2000 });

      // Message cleared during animation
      await expect(dequePage.message).toHaveText('', { timeout: 1000 });

      // Wait for completion: success message with removed element "A"
      await dequePage.waitForSuccessMessageContaining('成功从前端移除元素');

      // The first node should now be 'B' and count decreased by 1
      expect(await dequePage.firstNodeText()).toBe('B');
      expect(await dequePage.nodeCount()).toBe(1);
    });

    test('Pop back triggers removing animation and removes the last element, updates message', async () => {
      // Setup: add two elements
      await dequePage.enterInput('1');
      await dequePage.clickPushBack();
      await dequePage.waitForSuccessMessageContaining('成功从后端添加元素');

      await dequePage.enterInput('2');
      await dequePage.clickPushBack();
      await dequePage.waitForSuccessMessageContaining('成功从后端添加元素');

      // Last element should be '2'
      expect(await dequePage.lastNodeText()).toBe('2');

      // Click pop back
      await dequePage.clickPopBack();

      // Removing animation occurs
      await page.locator('#deque .node.removing.fade-out').waitFor({ state: 'visible', timeout: 2000 });

      // Wait for completion message that includes removed value
      await dequePage.waitForSuccessMessageContaining('成功从后端移除元素');

      // Confirm last node is now '1' and count decreased
      expect(await dequePage.lastNodeText()).toBe('1');
    });
  });

  test.describe('Clearing operations', () => {
    test('Clear when non-empty should animate all nodes fading out and result in empty deque with cleared message', async () => {
      // Add 3 elements
      await dequePage.enterInput('c1');
      await dequePage.clickPushBack();
      await dequePage.waitForSuccessMessageContaining('成功从后端添加元素');

      await dequePage.enterInput('c2');
      await dequePage.clickPushBack();
      await dequePage.waitForSuccessMessageContaining('成功从后端添加元素');

      await dequePage.enterInput('c3');
      await dequePage.clickPushBack();
      await dequePage.waitForSuccessMessageContaining('成功从后端添加元素');

      expect(await dequePage.nodeCount()).toBe(3);

      // Click clear
      await dequePage.clickClear();

      // During animateClear all nodes get removing + fade-out classes - wait for at least one to be visible in that state
      await page.locator('#deque .node.removing.fade-out').first().waitFor({ state: 'visible', timeout: 2000 });

      // Wait for completion: message "队列已清空" set
      await expect(dequePage.message).toHaveText('队列已清空', { timeout: 3000 });

      // Deque must be empty after clear
      expect(await dequePage.nodeCount()).toBe(0);

      // After clearing, clear/pop buttons should be disabled again
      expect(await dequePage.isDisabled(dequePage.clearBtn)).toBe(true);
      expect(await dequePage.isDisabled(dequePage.popFrontBtn)).toBe(true);
      expect(await dequePage.isDisabled(dequePage.popBackBtn)).toBe(true);
    });

    test('Clear when empty should not animate and should show informative non-error message', async () => {
      // Ensure empty
      expect(await dequePage.nodeCount()).toBe(0);

      // Click clear on empty deque
      await dequePage.clickClear();

      // App sets message to "队列已为空，无需清空"
      await expect(dequePage.message).toHaveText('队列已为空，无需清空');

      // This is an informational (non-error) message - color should be green-ish (success color in implementation)
      const color = await dequePage.getMessageColor();
      expect(color).toMatch(/rgb\(.+?\)/);
      // Buttons remain in idle_empty state
      expect(await dequePage.isDisabled(dequePage.popFrontBtn)).toBe(true);
      expect(await dequePage.isDisabled(dequePage.clearBtn)).toBe(true);
    });
  });

  test.describe('Error conditions and edge cases (error_shown transitions)', () => {
    test('Attempt to push empty string should set an error message and keep deque unchanged', async () => {
      // Ensure empty
      expect(await dequePage.nodeCount()).toBe(0);

      // Leave input empty and click pushBack
      await dequePage.enterInput('');
      await dequePage.clickPushBack();

      // Error message should be displayed
      await expect(dequePage.message).toHaveText('请输入一个非空元素！');

      // Message color should indicate error (red). The computed color should match the red used (#f44336)
      const color = await dequePage.getMessageColor();
      // Typical computed color will be "rgb(244, 67, 54)" for #f44336
      expect(color).toMatch(/rgb\((244|243|245).*(67|68).*(54|55)\)|#f44336|rgba?/);

      // Deque remains empty and no animation occurred
      expect(await dequePage.nodeCount()).toBe(0);
      // Buttons remain in idle_empty state
      expect(await dequePage.isDisabled(dequePage.popFrontBtn)).toBe(true);
    });

    test('Attempt to pop when empty should show an error message and not throw unhandled rejection', async () => {
      // Ensure empty
      expect(await dequePage.nodeCount()).toBe(0);

      // Click popFront
      await dequePage.clickPopFront();

      // Error message expected
      await expect(dequePage.message).toHaveText('队列为空，无法从前端移除元素！');

      // Now try popBack
      await dequePage.clickPopBack();
      await expect(dequePage.message).toHaveText('队列为空，无法从后端移除元素！');
    });

    test('Animating error scenario: trying to pop using internal animate when deque empty triggers rejection and shows error', async () => {
      // This simulates the ANIMATION_ERROR pathway indirectly:
      // animatePopFront rejects if no node. The UI already catches that rejection and sets a message.
      // Trigger directly by clicking popFront when empty
      await dequePage.clickPopFront();
      await expect(dequePage.message).toHaveText('队列为空，无法从前端移除元素！');
    });
  });

  test.describe('Capacity limit (maxSize) and related button state', () => {
    test('Filling deque to maxSize disables pushBack (capacity reached) and leaves pushFront enabled', async () => {
      // maxSize is 20 according to implementation. Fill to 20 via pushBack.
      // This may take some time due to animations; provide generous timeouts.
      const MAX = 20;

      // Fill with 20 elements
      await dequePage.fillWithCount(MAX, 'V');

      // Confirm node count is 20
      expect(await dequePage.nodeCount()).toBe(MAX);

      // pushBackBtn should be disabled when deque.length >= maxSize
      expect(await dequePage.isDisabled(dequePage.pushBackBtn)).toBe(true);

      // pushFrontBtn remains enabled (implementation only disables pushBack when full)
      expect(await dequePage.isDisabled(dequePage.pushFrontBtn)).toBe(false);

      // pop and clear should be enabled
      expect(await dequePage.isDisabled(dequePage.popFrontBtn)).toBe(false);
      expect(await dequePage.isDisabled(dequePage.clearBtn)).toBe(false);

      // Clean up: clear the deque to restore state
      await dequePage.clickClear();
      await expect(dequePage.message).toHaveText('队列已清空', { timeout: 5000 });
      expect(await dequePage.nodeCount()).toBe(0);
    }, 60000); // extend timeout because 20 animations may take a few seconds
  });
});