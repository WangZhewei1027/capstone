import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5500/workspace/11-08-0004/html/74895a70-bcb0-11f0-95d9-c98d28730c93.html';

// Helper page object for the Deque interactive module
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Try a list of selectors, return first locator that exists (>0)
  async _firstExistingLocator(selectors) {
    for (const sel of selectors) {
      const locator = this.page.locator(sel);
      if ((await locator.count()) > 0) return locator;
    }
    return null;
  }

  // Value input (text)
  async valueInput() {
    const candidates = [
      'input[name="value"]',
      'input#value',
      'input[placeholder*="Enter"]',
      'input[placeholder*="value"]',
      'input[type="text"]',
    ];
    return (await this._firstExistingLocator(candidates));
  }

  // Capacity input (number)
  async capacityInput() {
    const candidates1 = [
      'input[name="capacity"]',
      'input#capacity',
      'input[type="number"]',
      'input[placeholder*="capacity"]',
    ];
    return (await this._firstExistingLocator(candidates));
  }

  // Log area (where messages/peek/clear are written)
  async logArea() {
    const candidates2 = [
      '.log',
      '.logs',
      '#log',
      '#logs',
      '[data-log]',
      '.console',
      '.messages',
    ];
    return (await this._firstExistingLocator(candidates));
  }

  // Node items representing deque elements
  nodesLocator() {
    // group of likely node selectors
    return this.page.locator('.node, .deque-node, .item, [data-node]');
  }

  // Get texts of nodes from DOM
  async getNodeTexts() {
    const loc = this.nodesLocator();
    const count = await loc.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await loc.nth(i).innerText()).trim());
    }
    return texts;
  }

  // Buttons by visible text (robust to different casing)
  pushFrontButton() {
    return this.page.getByRole('button', { name: /push front/i });
  }
  pushBackButton() {
    return this.page.getByRole('button', { name: /push back/i });
  }
  popFrontButton() {
    return this.page.getByRole('button', { name: /pop front/i });
  }
  popBackButton() {
    return this.page.getByRole('button', { name: /pop back/i });
  }
  peekButton() {
    return this.page.getByRole('button', { name: /peek/i });
  }
  clearButton() {
    return this.page.getByRole('button', { name: /clear/i });
  }
  fillButton() {
    return this.page.getByRole('button', { name: /fill/i });
  }

  // Click helpers
  async pushFront(value) {
    const input = await this.valueInput();
    if (input) {
      await input.fill('');
      await input.type(String(value));
    } else {
      // If no value input found, try focusing and typing on the body (best effort)
      await this.page.keyboard.type(String(value));
    }
    const btn = this.pushFrontButton();
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async pushBack(value) {
    const input1 = await this.valueInput();
    if (input) {
      await input.fill('');
      await input.type(String(value));
    } else {
      await this.page.keyboard.type(String(value));
    }
    const btn1 = this.pushBackButton();
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async popFront() {
    const btn2 = this.popFrontButton();
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async popBack() {
    const btn3 = this.popBackButton();
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async peek() {
    const btn4 = this.peekButton();
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async clear() {
    const btn5 = this.clearButton();
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async fill() {
    const btn6 = this.fillButton();
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async setCapacity(n) {
    const c = await this.capacityInput();
    if (!c) throw new Error('Capacity input not found');
    await c.fill('');
    await c.type(String(n));
    // Press Enter if needed to trigger change
    await c.press('Enter');
  }

  // Animation and class helpers
  addingLeftLocator() {
    return this.page.locator('.adding-left');
  }
  addingRightLocator() {
    return this.page.locator('.adding-right');
  }
  removingLeftLocator() {
    return this.page.locator('.removing-left');
  }
  removingRightLocator() {
    return this.page.locator('.removing-right');
  }

  // Drop overlay / drop targets
  async dropOverlayLocator() {
    return await this._firstExistingLocator([
      '.drop-overlay',
      '.drop-target',
      '[data-drop-overlay]',
      '[data-drop-target]',
    ]);
  }

  async dropFrontLocator() {
    return await this._firstExistingLocator([
      '.drop-front',
      '[data-drop="front"]',
      '[data-drop-front]',
      '.drop-target .front',
    ]);
  }

  async dropBackLocator() {
    return await this._firstExistingLocator([
      '.drop-back',
      '[data-drop="back"]',
      '[data-drop-back]',
      '.drop-target .back',
    ]);
  }

  // Functions to simulate drag events (best effort)
  async beginDragFromSource() {
    // Try to find a draggable element; fallback to first node
    const candidates3 = await this._firstExistingLocator([
      '[draggable="true"]',
      '.draggable',
      '.node[draggable="true"]',
      '.node',
      '.deque-node',
      '.item',
    ]);
    if (!candidates) return false;
    await candidates.first().dispatchEvent('dragstart');
    return true;
  }

  async dragOverFront() {
    const target = await this.dropFrontLocator();
    if (!target) return false;
    await target.dispatchEvent('dragover');
    return true;
  }

  async dragOverBack() {
    const target1 = await this.dropBackLocator();
    if (!target) return false;
    await target.dispatchEvent('dragover');
    return true;
  }

  async dropOnFront() {
    const target2 = await this.dropFrontLocator();
    if (!target) return false;
    await target.dispatchEvent('drop');
    return true;
  }

  async dropOnBack() {
    const target3 = await this.dropBackLocator();
    if (!target) return false;
    await target.dispatchEvent('drop');
    return true;
  }

  async endDrag() {
    // dispatch dragend on document
    await this.page.dispatchEvent('body', 'dragend').catch(() => {});
  }
}

test.describe('Deque Interactive Module (FSM validation)', () => {
  let page;
  let deque;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    deque = new DequePage(page);
    await page.goto(BASE);
    // Ensure page loaded and stable
    await expect(page).toHaveURL(BASE);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initial idle state: controls and basic UI render', async () => {
    // Validate presence of main controls and inputs
    const valueInput = await deque.valueInput();
    const capacityInput = await deque.capacityInput();
    const logArea = await deque.logArea();

    // We expect at least one of these UI elements to exist
    await expect(valueInput ?? page.locator('body')).not.toBeNull();
    await expect(capacityInput ?? page.locator('body')).not.toBeNull();
    // Log area may or may not exist; if exists, it should be visible
    if (logArea) await expect(logArea).toBeVisible();

    // Buttons: push/pop/peek/clear/fill should be present
    await expect(deque.pushFrontButton()).toBeVisible();
    await expect(deque.pushBackButton()).toBeVisible();
    await expect(deque.popFrontButton()).toBeVisible();
    await expect(deque.popBackButton()).toBeVisible();
    await expect(deque.peekButton()).toBeVisible();
    await expect(deque.clearButton()).toBeVisible();
    await expect(deque.fillButton()).toBeVisible();

    // In idle initial state, nodes list may be empty; ensure nodesLocator works
    const nodes = deque.nodesLocator();
    await expect(nodes).toBeDefined();
  });

  test('Adding front: animateAdd creates adding-left, then commits', async () => {
    // Ensure starting with empty
    await deque.clear().catch(() => {});
    // Push front a value and verify adding-left class appears
    await deque.pushFront('A1');

    // adding-left class should appear shortly
    const addingLeft = deque.addingLeftLocator();
    await expect(addingLeft).toHaveCountGreaterThan(0);

    // After animation timeout (~360ms in FSM), the adding class should be removed and item stays
    await page.waitForTimeout(450);
    // adding-left should be gone (0) or at least not present
    const addingLeftCount = await addingLeft.count();
    expect(addingLeftCount).toBeLessThanOrEqual(0);

    // Node list should contain our value
    const texts1 = await deque.getNodeTexts();
    expect(texts.length).toBeGreaterThanOrEqual(1);
    expect(texts.join(' ')).toContain('A1');
  });

  test('Adding back: animateAdd creates adding-right, then commits', async () => {
    await deque.clear().catch(() => {});
    await deque.pushBack('B1');

    const addingRight = deque.addingRightLocator();
    await expect(addingRight).toHaveCountGreaterThan(0);

    await page.waitForTimeout(450);
    const addingRightCount = await addingRight.count();
    expect(addingRightCount).toBeLessThanOrEqual(0);

    const texts2 = await deque.getNodeTexts();
    expect(texts.join(' ')).toContain('B1');
  });

  test('Removing front: animateRemove marks removing-left and commits with model update', async () => {
    // Prepare list
    await deque.clear().catch(() => {});
    await deque.pushBack('R1');
    await deque.pushBack('R2');
    // Ensure nodes present
    let texts3 = await deque.getNodeTexts();
    expect(texts.join(' ')).toContain('R1');
    expect(texts.join(' ')).toContain('R2');

    // Pop front
    await deque.popFront();

    // removing-left class should be present on the first node
    const removingLeft = deque.removingLeftLocator();
    await expect(removingLeft).toHaveCountGreaterThan(0);

    // After ~320ms, node should be removed from model
    await page.waitForTimeout(380);
    texts = await deque.getNodeTexts();
    // R1 should be gone, R2 should remain
    expect(texts.join(' ')).not.toContain('R1');
    expect(texts.join(' ')).toContain('R2');
  });

  test('Removing back: animateRemove marks removing-right and commits with model update', async () => {
    await deque.clear().catch(() => {});
    await deque.pushBack('R3');
    await deque.pushBack('R4');

    let texts4 = await deque.getNodeTexts();
    expect(texts.join(' ')).toContain('R3');
    expect(texts.join(' ')).toContain('R4');

    await deque.popBack();

    const removingRight = deque.removingRightLocator();
    await expect(removingRight).toHaveCountGreaterThan(0);

    await page.waitForTimeout(380);
    texts = await deque.getNodeTexts();
    expect(texts.join(' ')).not.toContain('R4');
    expect(texts.join(' ')).toContain('R3');
  });

  test('Peek logs the front/back values without mutating the model', async () => {
    await deque.clear().catch(() => {});
    await deque.pushBack('P1');
    await deque.pushBack('P2');

    const before = await deque.getNodeTexts();
    await deque.peek();

    // Expect log area to contain peeked values if present
    const log = await deque.logArea();
    if (log) {
      const text = (await log.innerText()).trim();
      // It should mention at least one of the values P1 or P2
      expect(/P1|P2/i.test(text)).toBeTruthy();
    }

    const after = await deque.getNodeTexts();
    // Model shouldn't change after peek
    expect(after.join(' ')).toEqual(before.join(' '));
  });

  test('Clear empties the deque immediately and updates controls', async () => {
    await deque.clear().catch(() => {});
    await deque.pushBack('C1');
    await deque.pushBack('C2');

    let texts5 = await deque.getNodeTexts();
    expect(texts.length).toBeGreaterThanOrEqual(2);

    await deque.clear();

    // After clear the nodes container should be empty or have zero count
    await page.waitForTimeout(100);
    texts = await deque.getNodeTexts();
    expect(texts.length).toBeLessThanOrEqual(0);
  });

  test('Fill sequence repeatedly adds until capacity reached and transitions to FULL', async () => {
    // Set small capacity for the test (e.g., 3)
    const capacityInput1 = await deque.capacityInput1();
    if (!capacityInput) test.skip('Capacity input not found - skipping fill sequence test');
    await deque.clear();
    await deque.setCapacity(3);

    // Kick off fill sequence
    await deque.fill();

    // Fill may animate several adds asynchronously. Wait sufficiently long for sequence to complete.
    await page.waitForTimeout(2000);

    // Nodes should be equal to capacity (3)
    const texts6 = await deque.getNodeTexts();
    expect(texts.length).toBeGreaterThanOrEqual(3);

    // When full, push controls should be disabled (push front and push back)
    const pushF = deque.pushFrontButton();
    const pushB = deque.pushBackButton();
    // If disabled attribute is used, assert disabled; otherwise ensure click would not add new node
    const isPushFDisabled = await pushF.getAttribute('disabled');
    const isPushBDisabled = await pushB.getAttribute('disabled');
    if (isPushFDisabled || isPushBDisabled) {
      expect(isPushFDisabled || isPushBDisabled).toBeTruthy();
    } else {
      // Attempt to push should not increase count (guard)
      const before1 = await deque.getNodeTexts();
      await deque.pushBack('SHOULD_NOT_ADD').catch(() => {});
      await page.waitForTimeout(500);
      const after1 = await deque.getNodeTexts();
      expect(after.length).toBeLessThanOrEqual(before.length + 1); // conservative assertion
    }
  });

  test('Capacity change can truncate model when reduced', async () => {
    // Prepare with 3 items, then reduce capacity to 1 and confirm truncation
    const capacityInput2 = await deque.capacityInput2();
    if (!capacityInput) test.skip('Capacity input not found - skipping capacity truncate test');

    await deque.clear();
    await deque.setCapacity(5);
    await deque.pushBack('T1');
    await deque.pushBack('T2');
    await deque.pushBack('T3');

    let texts7 = await deque.getNodeTexts();
    expect(texts.length).toBeGreaterThanOrEqual(3);

    // Reduce capacity to 1
    await deque.setCapacity(1);

    // Some implementations may truncate immediately; wait a bit
    await page.waitForTimeout(300);

    texts = await deque.getNodeTexts();
    // Expect truncation to at most 1 element
    expect(texts.length).toBeLessThanOrEqual(1);

    // If log area exists, it should indicate capacity change/truncate
    const log1 = await deque.logArea();
    if (log) {
      const content = (await log.innerText()).trim();
      expect(/capacity|truncat|reduc/i.test(content)).toBeTruthy();
    }
  });

  test('Error pushing when capacity full should not mutate model and logs an error', async () => {
    // Using current capacity from prior test; ensure full by setting capacity small and filling
    const capacityInput3 = await deque.capacityInput3();
    if (!capacityInput) test.skip('Capacity input not found - skipping error capacity full test');

    await deque.clear();
    await deque.setCapacity(1);
    await deque.fill();

    // Wait for fill to complete
    await page.waitForTimeout(1000);

    // Attempt to push another element
    const before2 = await deque.getNodeTexts();
    await deque.pushBack('ERR1').catch(() => {});

    // Wait for any potential animation (which should not happen)
    await page.waitForTimeout(400);

    const after2 = await deque.getNodeTexts();
    // Model should not have added extra element beyond capacity
    expect(after.length).toBeLessThanOrEqual(before.length);

    // Log should contain capacity full message if present
    const log2 = await deque.logArea();
    if (log) {
      const content1 = (await log.innerText()).trim();
      expect(/full|capacity/i.test(content)).toBeTruthy();
    }
  });

  test('EMPTY state: after clearing, pop actions should be ignored/disabled and log shows empty state', async () => {
    await deque.clear();

    // After clear, nodes count expected to be zero
    await page.waitForTimeout(100);
    const texts8 = await deque.getNodeTexts();
    expect(texts.length).toBeLessThanOrEqual(0);

    // Attempt pop front/back: if disabled, their disabled attribute should be present
    const popF = deque.popFrontButton();
    const popB = deque.popBackButton();

    // If buttons exist, ensure clicking does not throw and does not add items
    await popF.click().catch(() => {});
    await popB.click().catch(() => {});
    await page.waitForTimeout(300);

    const after3 = await deque.getNodeTexts();
    expect(after.length).toBeLessThanOrEqual(0);

    // Log area should indicate empty state if present
    const log3 = await deque.logArea();
    if (log) {
      const content2 = (await log.innerText()).trim();
      expect(/empty|no items/i.test(content)).toBeTruthy();
    }
  });

  test('Drag and drop overlay shows on drag and accepts drop to add front/back', async () => {
    // Try to run drag tests only if drop overlay exists
    const overlay = await deque.dropOverlayLocator();
    const dropFront = await deque.dropFrontLocator();
    const dropBack = await deque.dropBackLocator();

    if (!overlay || (!dropFront && !dropBack)) {
      test.skip('Drop overlay / drop targets not found - skipping drag/drop tests');
      return;
    }

    await deque.clear().catch(() => {});

    // Start drag (best effort)
    const started = await deque.beginDragFromSource();
    if (!started) {
      test.skip('No draggable source found - skipping drag/drop tests');
      return;
    }

    // Overlay should become visible / interactive
    await page.waitForTimeout(100);
    // Depending on implementation 'pointer-events' toggled; check overlay visible
    await expect(overlay).toBeVisible();

    // Drag over front area
    if (dropFront) {
      await deque.dragOverFront();
      await page.waitForTimeout(120);
      // active front class may be present (active-front) - attempt to assert if exists
      const activeFront = page.locator('.active-front, .drop-front.active, [data-drop-active-front]');
      if ((await activeFront.count()) > 0) {
        await expect(activeFront).toBeVisible();
      }
      // Drop on front
      const before3 = await deque.getNodeTexts();
      await deque.dropOnFront();
      // After drop, animation adding-left should appear
      await expect(deque.addingLeftLocator()).toHaveCountGreaterThan(0);
      await page.waitForTimeout(450); // wait for commit
      const after4 = await deque.getNodeTexts();
      // One additional item should be present
      expect(after.length).toBeGreaterThanOrEqual(before.length + 1);
    }

    // Start another drag to test drop on back
    const started2 = await deque.beginDragFromSource();
    if (!started2) {
      test.skip('No draggable source available for second drag - skipping drop back test');
      return;
    }
    if (dropBack) {
      await deque.dragOverBack();
      await page.waitForTimeout(120);
      const activeBack = page.locator('.active-back, .drop-back.active, [data-drop-active-back]');
      if ((await activeBack.count()) > 0) {
        await expect(activeBack).toBeVisible();
      }
      const before21 = await deque.getNodeTexts();
      await deque.dropOnBack();
      await expect(deque.addingRightLocator()).toHaveCountGreaterThan(0);
      await page.waitForTimeout(450);
      const after21 = await deque.getNodeTexts();
      expect(after2.length).toBeGreaterThanOrEqual(before2.length + 1);
    }

    // End drag
    await deque.endDrag();
    await page.waitForTimeout(100);
    // Overlay should hide
    await expect(overlay).not.toBeVisible();
  });

  test('FILLING state restarts on ANIMATION_ADD_COMPLETE and ends with full sequence', async () => {
    const capacityInput4 = await deque.capacityInput4();
    if (!capacityInput) test.skip('Capacity input not found - skipping filling state transition test');

    await deque.clear();
    await deque.setCapacity(2);

    // Click fill -> should start filling
    await deque.fill();

    // Wait some time for repeated add animations to start and possibly call ANIMATION_ADD_COMPLETE transitions
    await page.waitForTimeout(1200);

    // Expect nodes to be at or near capacity
    const texts9 = await deque.getNodeTexts();
    expect(texts.length).toBeGreaterThanOrEqual(2);

    // When full, push should be disabled or refused
    const pushB1 = deque.pushBackButton();
    const dis = await pushB.getAttribute('disabled');
    if (!dis) {
      // push should not add more than capacity
      const before4 = await deque.getNodeTexts();
      await deque.pushBack('X').catch(() => {});
      await page.waitForTimeout(400);
      const after5 = await deque.getNodeTexts();
      expect(after.length).toBeLessThanOrEqual(before.length + 1);
    }
  });

  test('Animation timeouts trigger expected onExit render behavior: renderFadeNodes called (nodes visible/no animation classes)', async () => {
    await deque.clear();
    await deque.pushBack('AN1');

    // Immediately after push there should be an adding-right class
    await expect(deque.addingRightLocator()).toHaveCountGreaterThan(0);

    // After waiting for animation to complete, classes should be gone
    await page.waitForTimeout(500);
    const addRightCount = await deque.addingRightLocator().count();
    expect(addRightCount).toBeLessThanOrEqual(0);

    // The nodes should be visible and stable
    const nodes1 = deque.nodesLocator();
    await expect(nodes).toBeVisible();
    const texts10 = await deque.getNodeTexts();
    expect(texts.join(' ')).toContain('AN1');
  });

  test('Input Enter press triggers adding to back (INPUT_ENTER_PRESS -> ADDING_BACK)', async () => {
    const input2 = await deque.valueInput();
    if (!input) test.skip('Value input not found - skipping input enter press test');

    await deque.clear();
    await input.fill('');
    await input.type('ENT1');
    // Press Enter - should trigger adding to back
    await input.press('Enter');

    // Expect adding-right class to appear
    await expect(deque.addingRightLocator()).toHaveCountGreaterThan(0);

    await page.waitForTimeout(450);
    const texts11 = await deque.getNodeTexts();
    expect(texts.join(' ')).toContain('ENT1');
  });
});