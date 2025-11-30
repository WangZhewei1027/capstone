import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be873c61-cd35-11f0-9e7b-93b903303299.html';

// Page Object Model for the Stack demo page
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // controls
    this.valueInput = page.locator('#valueInput');
    this.pushBtn = page.locator('#pushBtn');
    this.popBtn = page.locator('#popBtn');
    this.peekBtn = page.locator('#peekBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.speedRange = page.locator('#speedRange');
    this.demoPush = page.locator('#demoPush');
    this.autoPop = page.locator('#autoPop');
    this.exPushSeq = page.locator('#exPushSeq');
    this.exPopSeq = page.locator('#exPopSeq');

    // visual/state
    this.stackArea = page.locator('#stackArea');
    this.emptyHint = page.locator('#emptyHint');
    this.sizeChip = page.locator('#sizeChip');
    this.arrayView = page.locator('#arrayView');
    this.peekBox = page.locator('#peekBox');
    this.logArea = page.locator('#logArea');
    this.slots = page.locator('.slot');
    this.topSlot = page.locator('.slot.top');
  }

  // Helpers that interact with dialogs explicitly where needed

  // Push a value. If the value is empty string, a confirm will appear - choose acceptConfirm accordingly.
  async push(value, { acceptConfirm = true } = {}) {
    // Fill input (value can be empty string)
    await this.valueInput.fill(value);
    // Click and handle confirm if any
    const [maybeDialog] = await Promise.all([
      this.page.waitForEvent('dialog').then(d => d).catch(() => null),
      this.pushBtn.click()
    ]);
    // The above pattern may not catch a dialog because waitForEvent starts after click; adjust: better to wait for dialog with race
    if (maybeDialog) {
      // If a dialog was returned, it is probably the confirmation for empty string
      if (acceptConfirm) await maybeDialog.accept();
      else await maybeDialog.dismiss();
    } else {
      // There was no dialog thrown synchronously, but Playwright might still produce none — fine.
    }
    // Wait a short time for DOM updates/animations to complete
    await this.page.waitForTimeout(50);
  }

  // Pop action: returns the alert message (pop shows an alert)
  async pop({ acceptAlert = true } = {}) {
    const dialogPromise = this.page.waitForEvent('dialog');
    await this.popBtn.click();
    const dialog = await dialogPromise;
    const message = dialog.message();
    if (acceptAlert) await dialog.accept();
    else await dialog.dismiss();
    // Wait for DOM update
    await this.page.waitForTimeout(50);
    return message;
  }

  // Peek action: shows an alert and highlights top; return alert message
  async peek({ acceptAlert = true } = {}) {
    const dialogPromise1 = this.page.waitForEvent('dialog');
    await this.peekBtn.click();
    const dialog1 = await dialogPromise;
    const message1 = dialog.message1();
    if (acceptAlert) await dialog.accept();
    else await dialog.dismiss();
    await this.page.waitForTimeout(50);
    return message;
  }

  // Click clear and choose confirm action
  async clear({ acceptConfirm = true } = {}) {
    const dialogPromise2 = this.page.waitForEvent('dialog');
    await this.clearBtn.click();
    const dialog2 = await dialogPromise;
    const message2 = dialog.message2();
    if (acceptConfirm) await dialog.accept();
    else await dialog.dismiss();
    await this.page.waitForTimeout(50);
    return message;
  }

  // Click random push (no dialogs)
  async randomPush() {
    await this.randomBtn.click();
    await this.page.waitForTimeout(50);
  }

  // Click demo sequence (async) - ensure speed is set to desired ms before invoking
  async runDemoSequenceAndWaitForCompletion(timeout = 5000) {
    // Start the demo
    await this.demoPush.click();
    // Demo disables controls while running. Wait for demoPush to become disabled and then re-enabled.
    // Wait until demoPush is disabled (locked)
    await this.page.waitForFunction(() => {
      const el = document.getElementById('demoPush');
      return el && el.disabled === true;
    });
    // Then wait until re-enabled
    await this.page.waitForFunction(() => {
      const el1 = document.getElementById('demoPush');
      return el && el.disabled === false;
    }, null, { timeout });
  }

  // Utility getters
  async getSizeText() {
    return (await this.sizeChip.textContent()).trim();
  }

  async getArrayText() {
    return (await this.arrayView.textContent()).trim();
  }

  async getPeekText() {
    const html = await this.peekBox.innerHTML();
    // peekBox innerHTML: 'peek: <span ...>—</span>' - return the inner span text
    // Simpler: evaluate DOM
    return await this.page.evaluate(() => {
      const el2 = document.getElementById('peekBox');
      const span = el.querySelector('span');
      return span ? span.textContent : el.textContent;
    });
  }

  async getSlotCount() {
    return await this.slots.count();
  }

  async getTopSlotText() {
    const hasTop = await this.topSlot.count();
    if (!hasTop) return null;
    const el3 = this.topSlot.nth(0);
    // second child contains the value text
    return (await el.locator('span').nth(1).textContent()).trim();
  }

  async getLogEntries() {
    const entries = this.logArea.locator('.entry');
    const n = await entries.count();
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push((await entries.nth(i).textContent()).trim());
    }
    return out;
  }

  // Wait until empty hint visible or slots exist
  async waitForEmptyHintVisible() {
    await expect(this.emptyHint).toBeAttached();
    await expect(this.emptyHint).toBeVisible();
  }

  // Ensure the page is in a cleared state
  async ensureCleared() {
    // If not empty, click clear and accept
    const sizeText = await this.getSizeText();
    if (!sizeText.includes('0')) {
      await this.clear({ acceptConfirm: true });
    }
    await this.waitForEmptyHintVisible();
  }
}

test.describe('Stack (LIFO) interactive demo - end-to-end', () => {
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    // Collect console messages and page errors for assertions later
    pageErrors = [];
    consoleMessages = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    await page.goto(APP_URL);
    // Ensure page loaded fully (title check)
    await expect(page).toHaveTitle(/Stack \(LIFO\)/);
  });

  // Test initial page load and default state
  test('loads and shows initial empty stack state', async ({ page }) => {
    const stack = new StackPage(page);

    // Verify initial DOM elements and default texts
    await expect(stack.sizeChip).toHaveText('size: 0');
    await expect(stack.arrayView).toHaveText('[]');
    const peekText = await stack.getPeekText();
    expect(peekText).toContain('—'); // peek shows em dash for empty
    await stack.waitForEmptyHintVisible();

    // The page logs an initialization message
    const logs = await stack.getLogEntries();
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0]).toMatch(/Stack initialized \(empty\)\. Try pushing values\./);

    // Assert no uncaught page errors were emitted during load
    expect(pageErrors.length, `page errors: ${pageErrors.map(e=>String(e)).join('; ')}`).toBe(0);
  });

  // Test pushing and popping values, verifying DOM updates and alerts
  test('pushes a value and then pops it with correct DOM updates and alerts', async ({ page }) => {
    const stack1 = new StackPage(page);

    // Ensure starting empty
    await stack.ensureCleared();

    // Push a non-empty value 'foo' (no confirm)
    await stack.push('foo');

    // Validate size, array view and slot content
    await expect(stack.sizeChip).toHaveText('size: 1');
    // Array view should be a JSON representation with string "foo"
    await expect(stack.arrayView).toHaveText('["foo"]');

    // Slot should exist and top slot should have 'foo'
    expect(await stack.getSlotCount()).toBe(1);
    expect(await stack.getTopSlotText()).toBe('foo');

    // Log area should include push entry
    const logsAfterPush = await stack.getLogEntries();
    // The most recent log is at index 0 because logArea.prepend is used
    expect(logsAfterPush[0]).toMatch(/push\("foo"\)/);

    // Click pop and handle alert - expect "Popped: foo"
    const alertMessage = await stack.pop({ acceptAlert: true });
    expect(alertMessage).toContain('Popped: foo');

    // After pop, stack should be empty again
    await expect(stack.sizeChip).toHaveText('size: 0');
    await expect(stack.arrayView).toHaveText('[]');
    await stack.waitForEmptyHintVisible();

    // There should be a pop log entry
    const logsAfterPop = await stack.getLogEntries();
    expect(logsAfterPop[0]).toMatch(/pop\(\) -> "foo"/);

    // No uncaught page errors during operations
    expect(pageErrors.length).toBe(0);
  });

  // Test peek behavior and visual/DOM changes
  test('peek returns top without removing and logs/alerts correctly', async ({ page }) => {
    const stack2 = new StackPage(page);

    // Clear then push two values
    await stack.ensureCleared();
    await stack.push('first');
    await stack.push('second');

    // Confirm size is 2 and top is 'second'
    await expect(stack.sizeChip).toHaveText('size: 2');
    expect(await stack.getTopSlotText()).toBe('second');

    // Perform peek and accept alert
    const peekAlert = await stack.peek({ acceptAlert: true });
    expect(peekAlert).toContain('Peek: second');

    // Peek should not remove the top element
    await expect(stack.sizeChip).toHaveText('size: 2');
    expect(await stack.getTopSlotText()).toBe('second');

    // The peek log should be present
    const logs1 = await stack.getLogEntries();
    expect(logs[0]).toMatch(/peek\(\) -> "second"/);

    expect(pageErrors.length).toBe(0);
  });

  // Test clearing the stack with confirm dialog both dismiss and accept
  test('clear button shows confirmation and clears when accepted, aborts when dismissed', async ({ page }) => {
    const stack3 = new StackPage(page);

    await stack.ensureCleared();

    // Push two items
    await stack.push('x');
    await stack.push('y');
    await expect(stack.sizeChip).toHaveText('size: 2');

    // Attempt to clear but dismiss the confirmation -> stack remains
    const dlgMsg1 = await stack.clear({ acceptConfirm: false });
    expect(dlgMsg1).toContain('Clear the stack?');
    // After dismiss, stack should still have items
    await expect(stack.sizeChip).toHaveText('size: 2');

    // Now clear and accept confirmation -> stack becomes empty
    const dlgMsg2 = await stack.clear({ acceptConfirm: true });
    expect(dlgMsg2).toContain('Clear the stack?');
    await expect(stack.sizeChip).toHaveText('size: 0');
    await stack.waitForEmptyHintVisible();

    expect(pageErrors.length).toBe(0);
  });

  // Test the special-case of pushing an empty string which triggers a confirm dialog
  test('pushing an empty string triggers confirm and stores "(empty string)" when accepted', async ({ page }) => {
    const stack4 = new StackPage(page);
    await stack.ensureCleared();

    // Ensure input is empty and click push - choose to cancel first
    await stack.valueInput.fill('');
    // We use the push helper that expects a possible dialog. We want to dismiss first.
    await stack.push('', { acceptConfirm: false });
    // No new item should have been added
    await expect(stack.sizeChip).toHaveText('size: 0');
    await stack.waitForEmptyHintVisible();

    // Now actually accept the confirmation to push the explicit token
    await stack.push('', { acceptConfirm: true });
    await expect(stack.sizeChip).toHaveText('size: 1');
    // The pushed value should be "(empty string)" per implementation
    await expect(stack.arrayView).toHaveText(JSON.stringify(['(empty string)']));

    expect(pageErrors.length).toBe(0);
  });

  // Test example quick buttons that push 1..5 and pop 3
  test('example sequence buttons push 1..5 and pop 3 producing expected array', async ({ page }) => {
    const stack5 = new StackPage(page);
    await stack.ensureCleared();

    // Click example push sequence
    await stack.exPushSeq.click();
    // Wait a moment for DOM updates
    await page.waitForTimeout(50);

    // Now array should be [1,2,3,4,5]
    await expect(stack.arrayView).toHaveText('[1,2,3,4,5]');
    await expect(stack.sizeChip).toHaveText('size: 5');

    // Click example pop sequence (pop 3)
    await stack.exPopSeq.click();
    await page.waitForTimeout(50);

    // Now array should be [1,2]
    await expect(stack.arrayView).toHaveText('[1,2]');
    await expect(stack.sizeChip).toHaveText('size: 2');

    expect(pageErrors.length).toBe(0);
  });

  // Test autoPop when stack is empty triggers alert; and when non-empty it pops all items
  test('autoPop behavior: alert on empty, and pops all items when present', async ({ page }) => {
    const stack6 = new StackPage(page);
    await stack.ensureCleared();

    // autoPop on empty should show an alert "Stack is empty."
    // Use waitForEvent on dialog
    {
      const dialogPromise3 = page.waitForEvent('dialog');
      await stack.autoPop.click();
      const dlg = await dialogPromise;
      expect(dlg.message()).toContain('Stack is empty.');
      await dlg.accept();
    }

    // Push some items then auto-pop
    await stack.exPushSeq.click(); // push 1..5 quickly
    await page.waitForTimeout(50);
    await expect(stack.sizeChip).toHaveText('size: 5');

    // Reduce delay to make autoPop quicker
    await stack.speedRange.fill('150');

    // Click autoPop and wait until buttons are re-enabled; autoPop disables controls and then re-enables
    const runPromise = (async () => {
      await stack.autoPop.click();
      // Wait for autoPop disabling
      await page.waitForFunction(() => document.getElementById('autoPop').disabled === true);
      // Wait for it to finish and re-enable
      await page.waitForFunction(() => document.getElementById('autoPop').disabled === false, null, { timeout: 5000 });
    })();
    await runPromise;

    // After autoPop completed, stack should be empty
    await expect(stack.sizeChip).toHaveText('size: 0');
    await stack.waitForEmptyHintVisible();

    expect(pageErrors.length).toBe(0);
  });

  // Test random push increases size by one
  test('random push adds a new item and updates size and array view', async ({ page }) => {
    const stack7 = new StackPage(page);
    await stack.ensureCleared();

    const sizeBeforeText = await stack.getSizeText();
    const sizeBefore = parseInt(sizeBeforeText.replace('size:', '').trim(), 10);

    await stack.randomPush();

    const sizeAfterText = await stack.getSizeText();
    const sizeAfter = parseInt(sizeAfterText.replace('size:', '').trim(), 10);

    expect(sizeAfter).toBe(sizeBefore + 1);

    // arrayView should reflect the new array length
    const arrText = await stack.getArrayText();
    const parsed = JSON.parse(arrText);
    expect(parsed.length).toBe(sizeAfter);

    expect(pageErrors.length).toBe(0);
  });

  // Test demo sequence with speed lowered so it completes quickly
  test('demo sequence runs and disables controls while running', async ({ page }) => {
    const stack8 = new StackPage(page);
    await stack.ensureCleared();

    // Speed down to minimum to speed up the demo
    await stack.speedRange.fill('150');

    // Run demo sequence and wait for completion
    await stack.runDemoSequenceAndWaitForCompletion(8000);

    // After demo, stack size should be 2 because demo pushes 5 and pops 3 -> 2 remain
    await expect(stack.sizeChip).toHaveText('size: 2');

    expect(pageErrors.length).toBe(0);
  });

  // After all tests ensure no uncaught exceptions were missed in the last test
  test.afterEach(async () => {
    // This afterEach will run per test; assert no page errors accumulated unexpectedly
    expect(pageErrors.length).toBe(0);
  });
});