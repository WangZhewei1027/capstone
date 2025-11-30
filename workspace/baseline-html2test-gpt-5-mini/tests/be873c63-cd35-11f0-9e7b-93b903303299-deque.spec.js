import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be873c63-cd35-11f0-9e7b-93b903303299.html';

test.describe('Deque interactive demo (be873c63-cd35-11f0-9e7b-93b903303299)', () => {
  // Common selectors used across tests
  const selectors = {
    capSpan: '#capSpan',
    sizeSpan: '#sizeSpan',
    headSpan: '#headSpan',
    buffer: '#buffer',
    pointers: '#pointers',
    log: '#log',
    valueInput: '#valueInput',
    pushFrontBtn: '#pushFrontBtn',
    pushBackBtn: '#pushBackBtn',
    popFrontBtn: '#popFrontBtn',
    popBackBtn: '#popBackBtn',
    peekFrontBtn: '#peekFrontBtn',
    peekBackBtn: '#peekBackBtn',
    clearBtn: '#clearBtn',
    randomFillBtn: '#randomFillBtn',
    rotateLeftBtn: '#rotateLeftBtn',
    rotateRightBtn: '#rotateRightBtn',
    clearLogBtn: '#clearLogBtn'
  };

  // Setup and navigation before each test. Also capture console and page errors.
  test.beforeEach(async ({ page }) => {
    // arrays to collect console messages and errors for later assertions if needed
    page.context()._consoleMessages = [];
    page.context()._pageErrors = [];

    page.on('console', (msg) => {
      // record console message text and type
      page.context()._consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      // record page errors (uncaught exceptions)
      page.context()._pageErrors.push(err);
    });

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    // basic visibility sanity
    await expect(page.locator('role=application[aria-label="Deque demo"]')).toBeVisible();
  });

  // Utility to read the current DOM-based "visual buffer" as array of strings (uses displayed text or '•' for empty)
  async function getVisualBuffer(page) {
    return await page.$$eval(`${selectors.buffer} .slot`, (slots) =>
      slots.map(s => {
        // remove index child text if present
        const idx = s.querySelector('.index');
        let text = s.textContent || '';
        if (idx) {
          const idxText = idx.textContent || '';
          // remove index text from slot text representation
          text = text.replace(idxText, '').trim();
        }
        return text;
      })
    );
  }

  // Utility: attempt to read the internal deque.toArray() if accessible
  async function getInternalArray(page) {
    return await page.evaluate(() => {
      try {
        // if deque is in scope, return its toArray(); else return null
        if (typeof deque !== 'undefined' && deque && typeof deque.toArray === 'function') {
          return deque.toArray();
        }
      } catch (e) {
        // propagate error for test to assert if needed
        return { __error__: String(e) };
      }
      return null;
    });
  }

  // Test initial page load and default state
  test('Initial load: capacity, size, head, buffer slots and initial log present', async ({ page }) => {
    // Verify capacity, size, head values
    await expect(page.locator(selectors.capSpan)).toHaveText('8');
    await expect(page.locator(selectors.sizeSpan)).toHaveText('0');
    await expect(page.locator(selectors.headSpan)).toHaveText('0');

    // Buffer should render 8 slots
    const slots = page.locator(`${selectors.buffer} .slot`);
    await expect(slots).toHaveCount(8);

    // Each slot should show either '•' for empty and have an index child
    const visual = await getVisualBuffer(page);
    expect(visual.length).toBe(8);
    // At least one slot must contain the dot marker for empties
    expect(visual.some(t => t.includes('•'))).toBe(true);

    // Pointers: head should display 'head → 0' and tail should show 'tail → —'
    const pointers = page.locator(`${selectors.pointers} .pointer`);
    await expect(pointers.first()).toHaveText(/head →\s*0/);
    await expect(pointers.nth(1)).toHaveText(/tail →\s*—/);

    // Log should contain the initialization message at top
    const firstLogText = await page.locator(`${selectors.log} > div`).first().textContent();
    expect(firstLogText).toContain('Deque initialized (capacity 8)');

    // There should be no uncaught page errors on initial load
    const errs = page.context()._pageErrors;
    expect(errs.length).toBe(0);
  });

  // Test pushBack via input and button works and updates UI & logs
  test('pushBack inserts value at tail and updates size, buffer, pointers and log', async ({ page }) => {
    // Enter value and click Push Back
    await page.fill(selectors.valueInput, 'Alpha');
    await page.click(selectors.pushBackBtn);

    // After pushBack: size should be 1, cap stays 8
    await expect(page.locator(selectors.sizeSpan)).toHaveText('1');
    await expect(page.locator(selectors.capSpan)).toHaveText('8');

    // Visual buffer should show one cell with 'Alpha'
    const visual1 = await getVisualBuffer(page);
    const nonEmpty = visual.filter(t => !t.includes('•') && t.trim() !== '');
    expect(nonEmpty.length).toBe(1);
    expect(nonEmpty[0]).toContain('Alpha');

    // The head and tail should reference the same index when size is 1
    const headText = await page.locator(selectors.headSpan).textContent();
    const tailPointerText = await page.locator(`${selectors.pointers} .pointer`).nth(1).textContent();
    expect(tailPointerText).toMatch(/tail → \d+|tail → —/); // tail textual format
    // Check top log entry mentions pushBack(Alpha)
    const firstLog = await page.locator(`${selectors.log} > div`).first().textContent();
    expect(firstLog).toContain('pushBack(Alpha)');

    // Input should have been cleared by the UI code
    await expect(page.locator(selectors.valueInput)).toHaveValue('');
  });

  // Test pushFront, popFront, popBack, peek operations and clear
  test('pushFront/pushBack ordering, peek, pop, and clear behavior', async ({ page }) => {
    // Start fresh: ensure clear works (also tests clear button)
    await page.fill(selectors.valueInput, 'one');
    await page.click(selectors.pushBackBtn);
    await page.fill(selectors.valueInput, 'two');
    await page.click(selectors.pushBackBtn);
    await page.fill(selectors.valueInput, 'zero');
    await page.click(selectors.pushFrontBtn); // now logical order: zero, one, two

    // If internal deque accessible, verify internal order; otherwise fall back to visual validation
    const internalBefore = await getInternalArray(page);
    if (internalBefore && !internalBefore.__error__) {
      expect(Array.isArray(internalBefore)).toBe(true);
      expect(internalBefore).toEqual(['zero', 'one', 'two']);
    } else {
      // fallback: check that at least three non-empty slots exist
      const visual2 = await getVisualBuffer(page);
      const nonEmpty1 = visual.filter(t => !t.includes('•') && t.trim() !== '');
      expect(nonEmpty.length).toBeGreaterThanOrEqual(3);
      // ensure the textual presence of the three inserted values exists somewhere
      const concatenated = nonEmpty.join(' ');
      expect(concatenated).toContain('zero');
      expect(concatenated).toContain('one');
      expect(concatenated).toContain('two');
    }

    // Test peekFront and peekBack - these only write to log (no DOM change)
    await page.click(selectors.peekFrontBtn);
    await page.click(selectors.peekBackBtn);

    // Top two log entries should correspond to peekBack and peekFront in some order (they prepend)
    const logs = await page.$$eval(`${selectors.log} > div`, nodes => nodes.slice(0, 4).map(n => n.textContent));
    // ensure at least one peek message exists
    expect(logs.some(t => t && t.includes('peekFront()'))).toBe(true);
    expect(logs.some(t => t && t.includes('peekBack()'))).toBe(true);

    // popFront should remove 'zero'
    await page.click(selectors.popFrontBtn);
    const afterPopFront = await getInternalArray(page);
    if (afterPopFront && !afterPopFront.__error__ && Array.isArray(afterPopFront)) {
      expect(afterPopFront).toEqual(['one', 'two']);
    }

    // popBack should remove 'two'
    await page.click(selectors.popBackBtn);
    const afterPopBack = await getInternalArray(page);
    if (afterPopBack && !afterPopBack.__error__ && Array.isArray(afterPopBack)) {
      expect(afterPopBack).toEqual(['one']);
    }

    // Clear the deque via UI clear button and verify size 0 and buffer empties visually
    await page.click(selectors.clearBtn);
    await expect(page.locator(selectors.sizeSpan)).toHaveText('0');
    const visualAfterClear = await getVisualBuffer(page);
    // All visible slots should show empties (contain '•' or be empty text)
    expect(visualAfterClear.every(t => t.includes('•') || t.trim() === '')).toBe(true);
  });

  // Test error messages and edge cases: pushing without value and popping/rotating empty deque
  test('Edge cases: push without value, pop on empty, rotate on empty produce error logs', async ({ page }) => {
    // Ensure deque is empty first
    await page.click(selectors.clearBtn);
    await expect(page.locator(selectors.sizeSpan)).toHaveText('0');

    // Attempt to push empty value via Push Back (should log an error message in DOM)
    await page.fill(selectors.valueInput, '   ');
    await page.click(selectors.pushBackBtn);
    // Top log entry should contain the "Enter a value before pushing." message
    const topLog = await page.locator(`${selectors.log} > div`).first().textContent();
    expect(topLog).toContain('Enter a value before pushing.');

    // popFront on empty should log an error-like message mentioning undefined
    await page.click(selectors.popFrontBtn);
    const topLog2 = await page.locator(`${selectors.log} > div`).first().textContent();
    expect(topLog2).toContain('popFront() → undefined');

    // rotate left/right on empty should produce an error log
    await page.click(selectors.rotateLeftBtn);
    const r1 = await page.locator(`${selectors.log} > div`).first().textContent();
    expect(r1).toContain('rotateLeft() — deque empty');

    await page.click(selectors.rotateRightBtn);
    const r2 = await page.locator(`${selectors.log} > div`).first().textContent();
    expect(r2).toContain('rotateRight() — deque empty');
  });

  // Test randomFill and rotate functionality, verifying that rotate changes the logical order
  test('randomFill populates deque and rotateLeft/rotateRight change logical order', async ({ page }) => {
    await page.click(selectors.clearBtn);

    // Click random fill - unpredictable count but should increase size >0
    await page.click(selectors.randomFillBtn);
    const sizeText = await page.locator(selectors.sizeSpan).textContent();
    const size = Number(sizeText);
    expect(size).toBeGreaterThan(0);

    // Capture logical order from internal deque if available
    const arrBefore = await getInternalArray(page);

    // If internal array is available and an actual array, test rotation semantics
    if (Array.isArray(arrBefore)) {
      // perform a left rotation via UI
      await page.click(selectors.rotateLeftBtn);
      // after rotation, internal array should be left-rotated by 1
      const arrAfterLeft = await getInternalArray(page);
      if (Array.isArray(arrAfterLeft)) {
        // compute expected left rotation
        const expectedLeft = arrBefore.length > 0 ? arrBefore.slice(1).concat(arrBefore[0]) : arrBefore;
        expect(arrAfterLeft).toEqual(expectedLeft);
      }

      // perform a right rotation via UI (which uses rotate(-1))
      await page.click(selectors.rotateRightBtn);
      const arrAfterRight = await getInternalArray(page);
      if (Array.isArray(arrAfterRight)) {
        // after left then right, should be back to arrBefore
        expect(arrAfterRight).toEqual(arrBefore);
      }
    } else {
      // Fallback: assert that UI pointers/head index changes upon rotation
      const headBefore = Number(await page.locator(selectors.headSpan).textContent());
      await page.click(selectors.rotateLeftBtn);
      const headAfter = Number(await page.locator(selectors.headSpan).textContent());
      // head index should have advanced (mod capacity) unless deque empty - we ensured size>0
      expect(headAfter).not.toBe(headBefore);
    }
  });

  // Test that pressing Enter in the input triggers pushBack (keyboard interaction)
  test('Press Enter in input triggers pushBack (keyboard shortcut)', async ({ page }) => {
    await page.click(selectors.clearBtn);
    await page.fill(selectors.valueInput, 'enterKeyTest');
    // Press Enter which should trigger pushBack via the keydown handler
    await page.press(selectors.valueInput, 'Enter');

    // Verify deque size increased and top log mentions pushBack(enterKeyTest)
    await expect(page.locator(selectors.sizeSpan)).toHaveText(/1/);
    const top = await page.locator(`${selectors.log} > div`).first().textContent();
    expect(top).toContain('pushBack(enterKeyTest)');
  });

  // Test that Clear Log button empties the operations log
  test('Clear Log button removes log entries', async ({ page }) => {
    // Add a log entry by failing a push
    await page.fill(selectors.valueInput, '   ');
    await page.click(selectors.pushFrontBtn);

    // Ensure there is at least one log entry
    let count = await page.$$eval(`${selectors.log} > div`, nodes => nodes.length);
    expect(count).toBeGreaterThan(0);

    // Click clear log and assert log is empty
    await page.click(selectors.clearLogBtn);
    const countAfter = await page.$$eval(`${selectors.log} > div`, nodes => nodes.length);
    expect(countAfter).toBe(0);
  });

  // Final sanity test: ensure no unexpected page errors (uncaught exceptions) and no console.error entries during interactions
  test('No uncaught page errors and no console.error messages during typical interactions', async ({ page }) => {
    // Perform a sequence of normal interactions
    await page.click(selectors.clearBtn);
    await page.fill(selectors.valueInput, 'x');
    await page.click(selectors.pushBackBtn);
    await page.click(selectors.peekFrontBtn);
    await page.click(selectors.popBackBtn);

    // Wait a moment for any asynchronous handlers (UI is synchronous but stay safe)
    await page.waitForTimeout(100);

    // Assert no uncaught page errors collected
    const errs1 = page.context()._pageErrors || [];
    expect(errs.length).toBe(0);

    // Assert console did not emit any error-level messages
    const consoleMsgs = page.context()._consoleMessages || [];
    const hasConsoleError = consoleMsgs.some(m => m.type === 'error' || m.type === 'fatal');
    expect(hasConsoleError).toBe(false);
  });
});