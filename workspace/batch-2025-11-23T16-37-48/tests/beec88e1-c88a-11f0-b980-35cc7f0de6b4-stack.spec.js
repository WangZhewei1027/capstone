import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-23T16-37-48/html/beec88e1-c88a-11f0-b980-35cc7f0de6b4.html';

class StackPage {
  constructor(page) {
    this.page = page;
    this.sel = {
      stackContainer: '#stack-container',
      topLabel: '#top-label',
      input: '#input-value',
      pushBtn: '#push-btn',
      popBtn: '#pop-btn',
      peekBtn: '#peek-btn',
      clearBtn: '#clear-btn',
      info: '#info',
      stackElement: '.stack-element',
      pushing: '.stack-element.pushing',
      removing: '.stack-element.removing',
    };
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Ensure initial render finished
    await expect(this.page.locator(this.sel.info)).toBeVisible();
  }

  async getInfoText() {
    return (await this.page.locator(this.sel.info).innerText()).trim();
  }

  async fillInput(value) {
    await this.page.fill(this.sel.input, value);
    // input triggers updateButtons via input event
    // wait a tick to let UI update
    await this.page.waitForTimeout(50);
  }

  async clearInput() {
    await this.page.fill(this.sel.input, '');
    await this.page.waitForTimeout(50);
  }

  async clickPush() {
    await this.page.click(this.sel.pushBtn);
  }

  async clickPop() {
    await this.page.click(this.sel.popBtn);
  }

  async clickPeek() {
    await this.page.click(this.sel.peekBtn);
  }

  async clickClear() {
    await this.page.click(this.sel.clearBtn);
  }

  async pressEnterInInput() {
    await this.page.press(this.sel.input, 'Enter');
  }

  async getStackCount() {
    return await this.page.locator(this.sel.stackElement).count();
  }

  async isTopLabelVisible() {
    // topLabel exists always, but style display toggles
    return await this.page.$eval(this.sel.topLabel, el => window.getComputedStyle(el).display !== 'none')
      .catch(() => false);
  }

  async isButtonDisabled(buttonSel) {
    return await this.page.$eval(buttonSel, el => el.disabled);
  }

  async waitForPushToComplete(value) {
    // animatePush sets info to 已入栈元素 "value" after animationend
    await this.page.waitForFunction(
      (selector, expected) => {
        const info = document.querySelector(selector);
        return info && info.textContent.includes(expected);
      },
      this.sel.info,
      `已入栈元素 "${value}"。`
    );
    // ensure pushing class gone
    await this.page.waitForSelector(this.sel.pushing, { state: 'detached' });
  }

  async waitForPopToComplete(value) {
    await this.page.waitForFunction(
      (selector, expected) => {
        const info = document.querySelector(selector);
        return info && info.textContent.includes(expected);
      },
      this.sel.info,
      `已出栈元素 "${value}"。`
    );
    // ensure removing class gone
    await this.page.waitForSelector(this.sel.removing, { state: 'detached' });
  }

  async waitForClearComplete() {
    await this.page.waitForFunction(
      (selector) => {
        const info = document.querySelector(selector);
        return info && info.textContent.includes('栈已清空。');
      },
      this.sel.info
    );
    await this.page.waitForSelector(this.sel.removing, { state: 'detached' });
  }

  async forceClickWhileAnimating(buttonId) {
    // Dispatch click event on element even if disabled to simulate attempted triggers during animating.
    await this.page.evaluate((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      // dispatch native click event
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }, buttonId);
  }
}

test.describe('Stack interactive FSM tests - beec88e1-c88a-11f0-b980-35cc7f0de6b4', () => {
  let stack;

  test.beforeEach(async ({ page }) => {
    stack = new StackPage(page);
    await stack.goto();
  });

  test.afterEach(async ({ page }) => {
    // ensure we land in a consistent state: reload page
    await page.reload();
  });

  test.describe('Initial state (idle_empty) and input/button rules', () => {
    test('initial render: idle_empty - top label hidden, push disabled, pop/peek/clear disabled, welcome info', async () => {
      // Verify top-label hidden (idle_empty onEnter renderStackAndUpdateButtons)
      expect(await stack.isTopLabelVisible()).toBe(false);

      // Push should be disabled because input empty; others disabled because stack empty
      expect(await stack.isButtonDisabled(stack.sel.pushBtn)).toBe(true);
      expect(await stack.isButtonDisabled(stack.sel.popBtn)).toBe(true);
      expect(await stack.isButtonDisabled(stack.sel.peekBtn)).toBe(true);
      expect(await stack.isButtonDisabled(stack.sel.clearBtn)).toBe(true);

      // Info message initial state
      const info = await stack.getInfoText();
      expect(info).toContain('欢迎使用 Stack 算法可视化演示');
    });

    test('input change enables Push (INPUT_CHANGED event)', async () => {
      // Type a value -> INPUT_CHANGED should update button state
      await stack.fillInput('X1');
      expect(await stack.isButtonDisabled(stack.sel.pushBtn)).toBe(false);
      // pop/peek/clear still disabled because stack empty
      expect(await stack.isButtonDisabled(stack.sel.popBtn)).toBe(true);
      expect(await stack.isButtonDisabled(stack.sel.peekBtn)).toBe(true);
      expect(await stack.isButtonDisabled(stack.sel.clearBtn)).toBe(true);
    });

    test('invalid push (empty input) updates info message (INVALID_PUSH)', async () => {
      // Ensure input empty then click push
      await stack.clearInput();
      // Attempt to click push: button is disabled so click will be rejected by browser,
      // but we can dispatch click via evaluate to simulate user attempt -> handler checks and shows message
      await stack.forceClickWhileAnimating('push-btn');
      // In this implementation clicking while empty leads to info '请输入一个有效的值进行入栈。'
      await expect(stack.page.locator(stack.sel.info)).toHaveText(/请输入一个有效的值进行入栈。/);
    });

    test('peeking/popping/clearing when empty shows appropriate messages (PEEK_WHEN_EMPTY, POP_WHEN_EMPTY, CLEAR_WHEN_EMPTY)', async () => {
      // Pop when empty
      await stack.forceClickWhileAnimating('pop-btn');
      await expect(stack.page.locator(stack.sel.info)).toHaveText(/栈为空，无法出栈。/);

      // Peek when empty
      await stack.forceClickWhileAnimating('peek-btn');
      await expect(stack.page.locator(stack.sel.info)).toHaveText(/栈为空，无栈顶元素。/);

      // Clear when empty
      await stack.forceClickWhileAnimating('clear-btn');
      await expect(stack.page.locator(stack.sel.info)).toHaveText(/栈已为空，无需清空。/);
    });
  });

  test.describe('Push operation and transitions (idle_empty -> pushing -> idle_nonempty / idle_full)', () => {
    test('push a single element via Click (PUSH_CLICKED -> pushing -> ANIMATION_END_PUSH -> idle_nonempty)', async () => {
      // Enter value and click push
      await stack.fillInput('A');
      await stack.clickPush();

      // While animating push, a .stack-element.pushing must appear
      await expect(stack.page.locator(stack.sel.pushing)).toBeVisible();

      // Buttons should be disabled during animating (REJECT_WHEN_ANIMATING)
      expect(await stack.isButtonDisabled(stack.sel.pushBtn)).toBe(true);
      expect(await stack.isButtonDisabled(stack.sel.popBtn)).toBe(true);

      // Wait until animation completes and info updated accordingly (onEnter animatePush -> onExit renderStackAndUpdateButtons)
      await stack.waitForPushToComplete('A');

      // After push complete, stack should have 1 element and top label visible
      expect(await stack.getStackCount()).toBe(1);
      expect(await stack.isTopLabelVisible()).toBe(true);

      // Buttons updated: push disabled (input cleared), pop/peek/clear enabled
      expect(await stack.isButtonDisabled(stack.sel.pushBtn)).toBe(true);
      expect(await stack.isButtonDisabled(stack.sel.popBtn)).toBe(false);
      expect(await stack.isButtonDisabled(stack.sel.peekBtn)).toBe(false);
      expect(await stack.isButtonDisabled(stack.sel.clearBtn)).toBe(false);
    });

    test('push using Enter key (ENTER_PRESSED) triggers same push flow and clears input', async () => {
      await stack.fillInput('EnterTest');
      // Press Enter should trigger click on push
      await stack.pressEnterInInput();

      // Wait animation and completion detected by info
      await stack.waitForPushToComplete('EnterTest');

      // Ensure the element exists and input was cleared
      expect(await stack.getStackCount()).toBe(1);
      const inputVal = await stack.page.inputValue(stack.sel.input);
      expect(inputVal).toBe('');
    });

    test('push elements until full leads to idle_full (STACK_BECAME_FULL)', async () => {
      // Clear any existing elements by reload (we're in a fresh beforeEach but ensure)
      await stack.page.reload();
      await stack.goto();

      // Push 10 elements sequentially (respect animations)
      for (let i = 1; i <= 10; i++) {
        const val = `n${i}`;
        await stack.fillInput(val);
        await stack.clickPush();
        await stack.waitForPushToComplete(val);
        // After each push, verify count matches i
        expect(await stack.getStackCount()).toBe(i);
      }

      // At max size, push should be disabled and info should reflect state when trying to push more
      expect(await stack.isButtonDisabled(stack.sel.pushBtn)).toBe(true);

      // Try to push another element: it should produce '栈已满' message (INVALID_PUSH when full)
      await stack.fillInput('overflow');
      await stack.clickPush();
      await expect(stack.page.locator(stack.sel.info)).toHaveText(/栈已满，最多可包含 10 个元素。/);

      // Ensure stack count remains 10
      expect(await stack.getStackCount()).toBe(10);
    });
  });

  test.describe('Pop operation and transitions (idle_nonempty -> popping -> idle_nonempty/idle_empty)', () => {
    test('pop reduces stack and shows transition (POP_CLICKED -> popping -> TRANSITION_END_POP_TO_NONEMPTY)', async () => {
      // Prepare stack with 3 elements
      await stack.page.reload();
      await stack.goto();
      for (let v of ['P1', 'P2', 'P3']) {
        await stack.fillInput(v);
        await stack.clickPush();
        await stack.waitForPushToComplete(v);
      }
      expect(await stack.getStackCount()).toBe(3);

      // Pop once
      await stack.clickPop();

      // During popping, top .stack-element.removing should be present
      await expect(stack.page.locator(stack.sel.removing)).toBeVisible();

      // Wait for pop completion (info contains popped value)
      await stack.waitForPopToComplete('P3');

      // Stack count should be 2 and top label still visible
      expect(await stack.getStackCount()).toBe(2);
      expect(await stack.isTopLabelVisible()).toBe(true);
    });

    test('pop until empty (TRANSITION_END_POP_TO_EMPTY leads to idle_empty)', async () => {
      // Prepare stack with 1 element
      await stack.page.reload();
      await stack.goto();
      await stack.fillInput('only');
      await stack.clickPush();
      await stack.waitForPushToComplete('only');
      expect(await stack.getStackCount()).toBe(1);

      // Pop last element
      await stack.clickPop();
      await stack.waitForPopToComplete('only');

      // Now stack empty
      expect(await stack.getStackCount()).toBe(0);
      expect(await stack.isTopLabelVisible()).toBe(false);

      // Buttons should reflect idle_empty
      expect(await stack.isButtonDisabled(stack.sel.popBtn)).toBe(true);
      expect(await stack.isButtonDisabled(stack.sel.peekBtn)).toBe(true);
      expect(await stack.isButtonDisabled(stack.sel.clearBtn)).toBe(true);
    });
  });

  test.describe('Peek operation (PEEK_CLICKED)', () => {
    test('peek shows current top without removing element', async () => {
      await stack.page.reload();
      await stack.goto();

      // Push two items
      await stack.fillInput('T1');
      await stack.clickPush();
      await stack.waitForPushToComplete('T1');

      await stack.fillInput('T2');
      await stack.clickPush();
      await stack.waitForPushToComplete('T2');

      // Peek should update info with top element but not change count
      const beforeCount = await stack.getStackCount();
      await stack.clickPeek();
      await expect(stack.page.locator(stack.sel.info)).toHaveText(/栈顶元素是 "T2"。/);
      const afterCount = await stack.getStackCount();
      expect(afterCount).toBe(beforeCount);
    });
  });

  test.describe('Clear operation (CLEAR_CLICKED -> clearing -> TRANSITION_END_CLEAR_COMPLETE)', () => {
    test('clear all elements uses transitions and results in empty stack', async () => {
      await stack.page.reload();
      await stack.goto();

      // Push 4 elements
      for (let i = 0; i < 4; i++) {
        await stack.fillInput(`c${i}`);
        await stack.clickPush();
        await stack.waitForPushToComplete(`c${i}`);
      }
      expect(await stack.getStackCount()).toBe(4);

      // Click clear
      await stack.clickClear();

      // All elements should get .removing class while animating
      await expect(stack.page.locator(`${stack.sel.stackElement}.removing`)).toBeVisible();

      // Wait for clear complete by inspecting info text and absence of removing elements
      await stack.waitForClearComplete();

      // Stack should be empty and top label hidden
      expect(await stack.getStackCount()).toBe(0);
      expect(await stack.isTopLabelVisible()).toBe(false);

      // Buttons reflect idle_empty
      expect(await stack.isButtonDisabled(stack.sel.popBtn)).toBe(true);
      expect(await stack.isButtonDisabled(stack.sel.peekBtn)).toBe(true);
      expect(await stack.isButtonDisabled(stack.sel.clearBtn)).toBe(true);
    });
  });

  test.describe('Edge cases and REJECT_WHEN_ANIMATING behavior', () => {
    test('attempting other operations during animation should be rejected (REJECT_WHEN_ANIMATING)', async () => {
      await stack.page.reload();
      await stack.goto();

      // Start a push and while animating attempt another push and a pop
      await stack.fillInput('first');
      await stack.clickPush();

      // Ensure pushing class exists (animation in progress)
      await expect(stack.page.locator(stack.sel.pushing)).toBeVisible();

      // Attempt to force another push while animating by dispatching click event directly
      await stack.fillInput('shouldBeIgnored');
      await stack.forceClickWhileAnimating('push-btn');

      // Attempt to force a pop while animating
      await stack.forceClickWhileAnimating('pop-btn');

      // Wait for first push to finish
      await stack.waitForPushToComplete('first');

      // Only the first element should be present, the forced push or pop should have been ignored
      expect(await stack.getStackCount()).toBe(1);
      const infoAfter = await stack.getInfoText();
      // Info should reflect the successful push and not any additional pops/pushes
      expect(infoAfter).toContain('已入栈元素 "first"。');
    });

    test('pushing when full is rejected and shows appropriate message', async () => {
      // Fill stack to max
      await stack.page.reload();
      await stack.goto();
      for (let i = 1; i <= 10; i++) {
        await stack.fillInput(`f${i}`);
        await stack.clickPush();
        await stack.waitForPushToComplete(`f${i}`);
      }
      expect(await stack.getStackCount()).toBe(10);

      // Try to push more using Enter key as well
      await stack.fillInput('overflow2');
      await stack.pressEnterInInput();

      // Info should show full message
      await expect(stack.page.locator(stack.sel.info)).toHaveText(/栈已满，最多可包含 10 个元素。/);

      // Count remains
      expect(await stack.getStackCount()).toBe(10);
    });
  });
});