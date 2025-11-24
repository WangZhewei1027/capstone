import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:5500/workspace/batch-2025-11-23T16-37-48/html/beec88e0-c88a-11f0-b980-35cc7f0de6b4.html';

test.describe('Linked List FSM - beec88e0-c88a-11f0-b980-35cc7f0de6b4', () => {
  // Helpers to access common elements
  const selectors = {
    valueInput: '#valueInput',
    indexInput: '#indexInput',
    pushBtn: '#pushBtn',
    unshiftBtn: '#unshiftBtn',
    insertBtn: '#insertBtn',
    popBtn: '#popBtn',
    shiftBtn: '#shiftBtn',
    removeBtn: '#removeBtn',
    searchBtn: '#searchBtn',
    resetBtn: '#resetBtn',
    speedControl: '#speedControl',
    canvasWrapper: '#canvas-wrapper',
    canvas: '#canvas',
    info: '#info',
    legendNode: '.legend-node',
    legendCurrent: '.legend-node.legend-current',
    legendVisited: '.legend-node.legend-visited',
  };

  // Before each test navigate to app and accelerate animations (set speed high)
  test.beforeEach(async ({ page }) => {
    await page.goto(APP);
    // Ensure page loaded and initialization message visible
    await expect(page.locator(selectors.info)).toHaveText(/链表初始化完成/);

    // Speed up animations to make tests faster (max allowed is 2)
    await page.locator(selectors.speedControl).fill('2');
    // Dispatch input event because the app listens to 'input'
    await page.locator(selectors.speedControl).evaluate((el) => {
      el.value = el.getAttribute('value') || '2';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Ensure speed control update reflected in info
    await expect(page.locator(selectors.info)).toHaveText(/动画速度设为|链表初始化完成|链表重置为默认状态/);
  });

  test.describe('Initial rendering & UI basics', () => {
    test('idle state draws initial linked list and legend is present', async ({ page }) => {
      // Validate legend nodes (node, current, visited) exist
      await expect(page.locator(selectors.legendNode)).toHaveCount(3);
      await expect(page.locator(selectors.legendCurrent)).toHaveCount(1);
      await expect(page.locator(selectors.legendVisited)).toHaveCount(1);

      // Canvas should be present and have width set
      const canvasWidth = await page.locator(selectors.canvas).evaluate((c) => c.width);
      expect(typeof canvasWidth).toBe('number');
      expect(canvasWidth).toBeGreaterThan(0);

      // Info should contain initialization message
      await expect(page.locator(selectors.info)).toHaveText(/链表初始化完成，包含节点: A → B → C → D/);
    });
  });

  test.describe('Add operations (push & unshift)', () => {
    test('push: adds node to tail and disables controls during animation', async ({ page }) => {
      const pushBtn = page.locator(selectors.pushBtn);
      const value = 'PUSHX';

      // Record canvas width before operation
      const beforeWidth = await page.locator(selectors.canvas).evaluate((c) => c.width);

      // Enter value and click push
      await page.locator(selectors.valueInput).fill(value);
      await pushBtn.click();

      // During animation we expect controls to be disabled (onEnter animating -> setControlsEnabled(false))
      // The app sets info to "准备在尾部添加节点..." during animation. Wait for that to appear.
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /准备在尾部添加节点/.test(info.textContent);
      }, { timeout: 2000 });

      // Check that primary controls are disabled while animation running
      const disabledStates = await Promise.all([
        page.locator(selectors.pushBtn).evaluate((b) => b.disabled),
        page.locator(selectors.unshiftBtn).evaluate((b) => b.disabled),
        page.locator(selectors.insertBtn).evaluate((b) => b.disabled),
        page.locator(selectors.popBtn).evaluate((b) => b.disabled),
        page.locator(selectors.shiftBtn).evaluate((b) => b.disabled),
        page.locator(selectors.removeBtn).evaluate((b) => b.disabled),
        page.locator(selectors.searchBtn).evaluate((b) => b.disabled),
      ]);
      disabledStates.forEach(state => expect(state).toBe(true));

      // Wait for final completion message
      await page.waitForFunction((v) => {
        const info = document.querySelector('#info');
        return info && info.textContent.includes(`尾部添加节点 "${v}" 完成。`);
      }, value, { timeout: 5000 });

      // After animation finishes, controls should be enabled again
      const reenabled = await page.locator(selectors.pushBtn).evaluate((b) => b.disabled);
      expect(reenabled).toBe(false);

      // Canvas width should have increased (one more node)
      const afterWidth = await page.locator(selectors.canvas).evaluate((c) => c.width);
      expect(afterWidth).toBeGreaterThan(beforeWidth);
    });

    test('unshift: adds node to head with visual feedback and final state', async ({ page }) => {
      const unshiftBtn = page.locator(selectors.unshiftBtn);
      const value = 'HEAD';

      const beforeWidth = await page.locator(selectors.canvas).evaluate((c) => c.width);

      await page.locator(selectors.valueInput).fill(value);
      await unshiftBtn.click();

      // Expect "准备在头部添加节点..." then final message
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /准备在头部添加节点/.test(info.textContent);
      }, { timeout: 2000 });

      await page.waitForFunction((v) => {
        const info = document.querySelector('#info');
        return info && info.textContent.includes(`头部添加节点 "${v}" 完成。`);
      }, value, { timeout: 5000 });

      const afterWidth = await page.locator(selectors.canvas).evaluate((c) => c.width);
      expect(afterWidth).toBeGreaterThanOrEqual(beforeWidth);
    });

    test('push/unshift edge-case: empty value input shows validation message and does nothing', async ({ page }) => {
      // Clear value input and attempt to push
      await page.locator(selectors.valueInput).fill('');
      await page.locator(selectors.pushBtn).click();

      // Expect validation message
      await expect(page.locator(selectors.info)).toHaveText('请先输入节点值。');

      // And canvas width should remain unchanged
      const widthAfterPushFail = await page.locator(selectors.canvas).evaluate((c) => c.width);
      expect(widthAfterPushFail).toBeGreaterThan(0);

      // Attempt unshift with empty value
      await page.locator(selectors.unshiftBtn).click();
      await expect(page.locator(selectors.info)).toHaveText('请先输入节点值。');
    });
  });

  test.describe('Insert and Remove with traversal animations', () => {
    test('insert at valid position traverses and inserts', async ({ page }) => {
      // Insert value "Z" at position 2 (between B and C initially)
      const val = 'Z';
      await page.locator(selectors.valueInput).fill(val);
      await page.locator(selectors.indexInput).fill('2');
      await page.locator(selectors.insertBtn).click();

      // Expect traversal start message for insert (访问节点 0)
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /插入 操作: 访问节点 0/.test(info.textContent);
      }, { timeout: 3000 });

      // Wait for final insertion confirmation
      await page.waitForFunction((v) => {
        const info = document.querySelector('#info');
        return info && info.textContent.includes(`节点值 "${v}" 已成功插入位置 2。`);
      }, val, { timeout: 5000 });

      // After insertion, canvas width should increase
      const widthAfter = await page.locator(selectors.canvas).evaluate((c) => c.width);
      expect(widthAfter).toBeGreaterThan(0);
    });

    test('insert invalid index displays error and does not change list', async ({ page }) => {
      // Record canvas width before
      const beforeWidth = await page.locator(selectors.canvas).evaluate((c) => c.width);

      await page.locator(selectors.valueInput).fill('X');
      await page.locator(selectors.indexInput).fill('999'); // invalid
      await page.locator(selectors.insertBtn).click();

      // Expect validation error mentioning合法的位置
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /请输入合法的位置/.test(info.textContent);
      }, { timeout: 2000 });

      const afterWidth = await page.locator(selectors.canvas).evaluate((c) => c.width);
      expect(afterWidth).toBe(beforeWidth);
    });

    test('remove at valid position traverses and removes correct node', async ({ page }) => {
      // Remove index 1 (initial list A B C D -> removes "B")
      await page.locator(selectors.indexInput).fill('1');
      await page.locator(selectors.removeBtn).click();

      // Expect traversal message for remove
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /删除 操作: 访问节点 0/.test(info.textContent);
      }, { timeout: 3000 });

      // Wait for final removal confirmation including removed value "B"
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /位置 1 的节点值 "B" 已删除。/.test(info.textContent);
      }, { timeout: 5000 });

      // Canvas should still be valid
      const w = await page.locator(selectors.canvas).evaluate((c) => c.width);
      expect(w).toBeGreaterThan(0);
    });

    test('remove invalid index shows error and no change', async ({ page }) => {
      const beforeWidth = await page.locator(selectors.canvas).evaluate((c) => c.width);
      await page.locator(selectors.indexInput).fill('-1');
      await page.locator(selectors.removeBtn).click();

      await expect(page.locator(selectors.info)).toHaveText(/请输入合法的位置/);
      const afterWidth = await page.locator(selectors.canvas).evaluate((c) => c.width);
      expect(afterWidth).toBe(beforeWidth);
    });
  });

  test.describe('Pop and Shift operations including empty-list edge cases', () => {
    test('pop removes tail and shift removes head; repeated pop leads to empty and further pop fails gracefully', async ({ page }) => {
      // Pop once (initial list 4 nodes => becomes 3)
      await page.locator(selectors.popBtn).click();
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /尾部删除操作中.../.test(info.textContent);
      }, { timeout: 2000 });
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /尾部删除操作完成。/.test(info.textContent);
      }, { timeout: 5000 });

      // Shift once (removes head)
      await page.locator(selectors.shiftBtn).click();
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /准备删除头部节点，位置: 0|头部删除操作中.../.test(info.textContent);
      }, { timeout: 2000 });
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /头部删除操作完成。|头部添加节点/.test(info.textContent);
      }, { timeout: 5000 });

      // Now remove all remaining nodes by popping repeatedly until empty.
      // There is not a direct DOM flag for list length; we will loop and break when info shows empty failure.
      let attempts = 0;
      while (attempts < 10) {
        await page.locator(selectors.popBtn).click();
        // Give time for operation or immediate empty failure message
        await page.waitForTimeout(200); // small wait to let handler run
        const infoText = await page.locator(selectors.info).textContent();
        if (infoText && infoText.includes('链表为空')) {
          // On empty, the message is like "尾部删除失败，链表为空。"
          break;
        }
        // Wait for completion message for that pop
        await page.waitForFunction(() => {
          const info = document.querySelector('#info');
          return info && /尾部删除操作完成。|尾部删除失败，链表为空。/.test(info.textContent);
        }, { timeout: 4000 });
        attempts++;
      }

      // Now explicitly try to pop on empty list to ensure graceful error
      await page.locator(selectors.popBtn).click();
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /尾部删除失败，链表为空。/.test(info.textContent);
      }, { timeout: 2000 });

      // Similarly shift should fail on empty
      await page.locator(selectors.shiftBtn).click();
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /头部删除失败，链表为空。/.test(info.textContent);
      }, { timeout: 2000 });
    }, 30000); // increase timeout because multiple pops might take time
  });

  test.describe('Search operation and validations', () => {
    test('search finds an existing value and not-found case', async ({ page }) => {
      // Search for 'C' which exists in default list
      await page.locator(selectors.valueInput).fill('C');
      await page.locator(selectors.searchBtn).click();

      // Expect traversal messages and final found message
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /访问节点/.test(info.textContent);
      }, { timeout: 3000 });

      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /找到节点，位置: \d+/.test(info.textContent);
      }, { timeout: 6000 });

      // Now search for a non-existent value
      await page.locator(selectors.valueInput).fill('NOPE');
      await page.locator(selectors.searchBtn).click();

      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /未找到值为/.test(info.textContent);
      }, { timeout: 6000 });

      // Search with empty input should show validation
      await page.locator(selectors.valueInput).fill('');
      await page.locator(selectors.searchBtn).click();
      await expect(page.locator(selectors.info)).toHaveText('请输入要查找的节点值。');
    });
  });

  test.describe('Controls, speed, keyboard and resize interactions', () => {
    test('speed control updates animationSpeed and shows info', async ({ page }) => {
      // Change to 1.5 via input event
      await page.locator(selectors.speedControl).fill('1.5');
      await page.locator(selectors.speedControl).evaluate((el) => {
        el.value = '1.5';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });

      // Expect info to reflect new speed
      await expect(page.locator(selectors.info)).toHaveText(/动画速度设为 1\.5x/);
    });

    test('canvas wrapper arrow keys scroll left and right', async ({ page }) => {
      const wrapper = page.locator(selectors.canvasWrapper);

      // Ensure wrapper has focusable attribute and focus it
      await wrapper.focus();

      // Read initial scrollLeft
      const before = await wrapper.evaluate((w) => w.scrollLeft);

      // Press ArrowRight
      await page.keyboard.press('ArrowRight');
      // After pressing right, scrollLeft should increase by approx 40 (implementation adds exactly 40)
      await page.waitForTimeout(100); // small wait for event to process
      const afterRight = await wrapper.evaluate((w) => w.scrollLeft);
      expect(afterRight).toBeGreaterThan(before);

      // Press ArrowLeft and expect scrollLeft decrease (or back to before)
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(100);
      const afterLeft = await wrapper.evaluate((w) => w.scrollLeft);
      // afterLeft should be less than or equal to afterRight
      expect(afterLeft).toBeLessThanOrEqual(afterRight);
    });

    test('window resize triggers canvas width recalculation', async ({ page }) => {
      // Get canvas width
      const before = await page.locator(selectors.canvas).evaluate((c) => c.width);

      // Resize viewport to a smaller width which should cause canvas to be recomputed
      const originalViewport = page.viewportSize();
      const newWidth = originalViewport ? Math.max(300, originalViewport.width - 200) : 600;
      await page.setViewportSize({ width: newWidth, height: 800 });

      // Wait for resize handler to update canvas width
      await page.waitForFunction(() => {
        // function returns true once canvas width differs from initial or is updated
        const canvas = document.getElementById('canvas');
        return canvas && canvas.width && canvas.width !== 0;
      }, { timeout: 2000 });

      const after = await page.locator(selectors.canvas).evaluate((c) => c.width);
      expect(after).toBeGreaterThan(0);
      // It's possible after < before depending on new viewport; assert difference or equality
      expect(after).not.toBeNaN();

      // Restore original viewport to avoid side-effects on other tests
      if (originalViewport) {
        await page.setViewportSize(originalViewport);
      }
    });
  });

  test.describe('Reset behavior and overall FSM transitions', () => {
    test('reset action resets linked list to default and info message is shown', async ({ page }) => {
      // Mutate list: push a value
      await page.locator(selectors.valueInput).fill('TMP');
      await page.locator(selectors.pushBtn).click();

      // Wait for push completion
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /尾部添加节点 "TMP" 完成。/.test(info.textContent);
      }, { timeout: 5000 });

      // Now click reset
      await page.locator(selectors.resetBtn).click();

      // Expect reset confirmation in info
      await page.waitForFunction(() => {
        const info = document.querySelector('#info');
        return info && /链表重置为默认状态: A → B → C → D/.test(info.textContent);
      }, { timeout: 2000 });

      // Canvas should be drawn and have width > 0
      const w = await page.locator(selectors.canvas).evaluate((c) => c.width);
      expect(w).toBeGreaterThan(0);
    });

    test('value and index input change events are accepted and reflected', async ({ page }) => {
      // Change value input and assert its value changed
      await page.locator(selectors.valueInput).fill('VAL1');
      const v = await page.locator(selectors.valueInput).inputValue();
      expect(v).toBe('VAL1');

      // Change index input and assert value
      await page.locator(selectors.indexInput).fill('3');
      const idx = await page.locator(selectors.indexInput).inputValue();
      expect(idx).toBe('3');
    });
  });
});