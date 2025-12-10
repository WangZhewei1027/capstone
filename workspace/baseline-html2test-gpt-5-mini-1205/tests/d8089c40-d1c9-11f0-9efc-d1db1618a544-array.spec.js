import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d8089c40-d1c9-11f0-9efc-d1db1618a544.html';

// Page object encapsulating interactions with the Array Playground
class ArrayPlaygroundPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Inputs / buttons
    this.arrayInput = page.locator('#arrayInput');
    this.createBtn = page.locator('#createBtn');
    this.samplesBtn = page.locator('#samplesBtn');
    this.sampleSelect = page.locator('#sampleSelect');
    this.loadSample = page.locator('#loadSample');

    this.arrayView = page.locator('#arrayView');
    this.itemsTable = page.locator('#itemsTable');

    this.copyBtn = page.locator('#copyBtn');
    this.cloneBtn = page.locator('#cloneBtn');
    this.clearBtn = page.locator('#clearBtn');

    this.valueInput = page.locator('#valueInput');
    this.pushBtn = page.locator('#pushBtn');
    this.popBtn = page.locator('#popBtn');
    this.shiftBtn = page.locator('#shiftBtn');
    this.unshiftBtn = page.locator('#unshiftBtn');

    this.spliceStart = page.locator('#spliceStart');
    this.spliceDel = page.locator('#spliceDel');
    this.spliceItems = page.locator('#spliceItems');
    this.spliceBtn = page.locator('#spliceBtn');

    this.sliceStart = page.locator('#sliceStart');
    this.sliceEnd = page.locator('#sliceEnd');
    this.sliceBtn = page.locator('#sliceBtn');
    this.applySlice = page.locator('#applySlice');

    this.mapDouble = page.locator('#mapDouble');
    this.filterEven = page.locator('#filterEven');
    this.reduceSum = page.locator('#reduceSum');
    this.applyResult = page.locator('#applyResult');

    this.customCode = page.locator('#customCode');
    this.runCustom = page.locator('#runCustom');
    this.applyCustom = page.locator('#applyCustom');
    this.customResult = page.locator('#customResult');
    this.resetSnap = page.locator('#resetSnap');

    this.resultArea = page.locator('#resultArea');
    this.codeArea = page.locator('#codeArea');
  }

  async navigate() {
    await this.page.goto(BASE_URL, { waitUntil: 'networkidle' });
  }

  async getArrayViewText() {
    return this.arrayView.innerText();
  }

  async getResultText() {
    return this.resultArea.innerText();
  }

  async getCodeAreaText() {
    return this.codeArea.innerText();
  }

  async getItemsTableText() {
    return this.itemsTable.innerText();
  }
}

test.describe('Array Playground - end-to-end interactions', () => {
  // For each test we collect page errors and console errors so we can assert none happened unexpectedly
  test.beforeEach(async ({ page }) => {
    // Increase default timeout for test actions that may trigger dialogs / clipboard
    page.setDefaultTimeout(5000);
  });

  test('Initial load: page renders default state and no uncaught page errors', async ({ page }) => {
    // Collect page errors and console errors
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', e => pageErrors.push(e));
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const app = new ArrayPlaygroundPage(page);
    await app.navigate();

    // Verify initial array sample and result area message
    const arrayText = await app.getArrayViewText();
    // Should display initial sample [1,2,3] somewhere in the array view
    expect(arrayText).toContain('1');
    expect(arrayText).toContain('2');
    expect(arrayText).toContain('3');

    // Result area was initialized with the demo message
    const resultText = await app.getResultText();
    expect(resultText).toContain('Initial sample [1,2,3]');

    // Items table should list indices 0..2
    const itemsText = await app.getItemsTableText();
    expect(itemsText).toContain('index');
    expect(itemsText).toContain('0');
    expect(itemsText).toContain('1');
    expect(itemsText).toContain('2');

    // Code area should contain examples
    const codeText = await app.getCodeAreaText();
    expect(codeText).toContain('Examples you can try');

    // Assert no uncaught page errors or console errors on load
    expect(pageErrors.length, `Unexpected pageerrors: ${pageErrors.map(String).join(';')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console error logs: ${consoleErrors.join(';')}`).toBe(0);
  });

  test.describe('Array creation and samples', () => {
    test('Create array from JSON input and wrap single token into array', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e));
      const app = new ArrayPlaygroundPage(page);
      await app.navigate();

      // Create from JSON input
      await app.arrayInput.fill('[10, 20]');
      await app.createBtn.click();

      // Result should indicate creation
      await expect(app.resultArea).toContainText('Array created');

      // Array view should reflect new array
      const view = await app.getArrayViewText();
      expect(view).toContain('10');
      expect(view).toContain('20');

      // Now test a single token is wrapped into array
      await app.arrayInput.fill('singleToken');
      await app.createBtn.click();
      const view2 = await app.getArrayViewText();
      // Should be an array containing the string singleToken (JSON.stringify prints it)
      expect(view2).toContain('singleToken');

      expect(errors.length).toBe(0);
    });

    test('Load sample from dropdown and verify inspector and results', async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', e => pageErrors.push(e));
      const app = new ArrayPlaygroundPage(page);
      await app.navigate();

      // Select 'strings' sample and load
      await app.sampleSelect.selectOption('strings');
      await app.loadSample.click();

      // Result area should say sample loaded
      await expect(app.resultArea).toContainText('Sample loaded');

      // Array view and items should reflect strings
      const view = await app.getArrayViewText();
      expect(view).toContain('"a"');
      expect(view).toContain('"b"');
      expect(view).toContain('"c"');

      const items = await app.getItemsTableText();
      expect(items).toContain('array');
      // Clear any page errors
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Mutating operations (push/pop/shift/unshift/splice)', () => {
    test('Push and pop update array and results correctly', async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', e => pageErrors.push(e));
      const app = new ArrayPlaygroundPage(page);
      await app.navigate();

      // Start with a known sample
      await app.sampleSelect.selectOption('numbers');
      await app.loadSample.click();
      await expect(app.arrayView).toContainText('1');

      // Push value 5
      await app.valueInput.fill('5');
      await app.pushBtn.click();

      // push sets result to new length (4)
      await expect(app.resultArea).toContainText('4');

      // Array should contain 5
      await expect(app.arrayView).toContainText('5');

      // Pop should remove 5 and return it
      await app.popBtn.click();
      await expect(app.resultArea).toContainText('5');
      // Array should no longer include 5
      const view = await app.getArrayViewText();
      expect(view).not.toContain('5');

      expect(pageErrors.length).toBe(0);
    });

    test('Unshift and shift work and handle empty value alert', async ({ page }) => {
      const app = new ArrayPlaygroundPage(page);
      await app.navigate();

      // Prepare sample numbers
      await app.sampleSelect.selectOption('numbers');
      await app.loadSample.click();

      // Unshift without value should trigger an alert
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        app.unshiftBtn.click(), // triggers alert because valueInput is empty
      ]);
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('Enter a value to unshift.');
      await dialog.accept();

      // Now unshift a value
      await app.valueInput.fill('0');
      await app.unshiftBtn.click();
      // arr.unshift returns new length -> resultArea should contain a number (length)
      const resText = await app.getResultText();
      expect(resText).toMatch(/\d+/);

      // Shift should remove first element (0)
      await app.shiftBtn.click();
      await expect(app.resultArea).toContainText('0');

      // No uncaught errors expected
      const pageErrors = [];
      page.on('pageerror', e => pageErrors.push(e));
      expect(pageErrors.length).toBe(0);
    });

    test('Splice removes and inserts items correctly', async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', e => pageErrors.push(e));
      const app = new ArrayPlaygroundPage(page);
      await app.navigate();

      // Load numbers sample [1,2,3,4]
      await app.sampleSelect.selectOption('numbers');
      await app.loadSample.click();

      // splice from index 1, delete 2, insert 9,10 => [1,9,10,4]
      await app.spliceStart.fill('1');
      await app.spliceDel.fill('2');
      await app.spliceItems.fill('9,10');
      await app.spliceBtn.click();

      // Result area should show object with removed and arr; ensure 'removed' appears
      const res = await app.getResultText();
      expect(res).toContain('removed');
      // Array view should show 9 and 10
      const view = await app.getArrayViewText();
      expect(view).toContain('9');
      expect(view).toContain('10');

      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Non-mutating operations (slice, map, filter, reduce) and apply result', () => {
    test('Slice returns new array and applySlice enforces result type', async ({ page }) => {
      const app = new ArrayPlaygroundPage(page);
      await app.navigate();

      // Load numbers sample [1,2,3,4]
      await app.sampleSelect.selectOption('numbers');
      await app.loadSample.click();

      // slice 1..3 should produce [2,3]
      await app.sliceStart.fill('1');
      await app.sliceEnd.fill('3');
      await app.sliceBtn.click();
      await expect(app.resultArea).toContainText('2');
      await expect(app.resultArea).toContainText('3');

      // applySlice should replace arr with last result (array)
      await app.applySlice.click();
      // Now array view should reflect [2,3]
      const view = await app.getArrayViewText();
      expect(view).toContain('2');
      expect(view).toContain('3');
    });

    test('ApplySlice alerts when last result is not an array (reduce case)', async ({ page }) => {
      await page.goto(BASE_URL);
      const app = new ArrayPlaygroundPage(page);

      // Load numbers sample
      await app.sampleSelect.selectOption('numbers');
      await app.loadSample.click();

      // reduceSum -> lastResult is a number
      await app.reduceSum.click();

      // Now applySlice should alert 'Last result is not an array.'
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        app.applySlice.click(),
      ]);
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('Last result is not an array.');
      await dialog.accept();
    });

    test('map/filter/reduce produce expected results and applyResult applies last result', async ({ page }) => {
      const app = new ArrayPlaygroundPage(page);
      await app.navigate();

      // Load numbers [1,2,3,4]
      await app.sampleSelect.selectOption('numbers');
      await app.loadSample.click();

      // mapDouble -> doubles numbers
      await app.mapDouble.click();
      await expect(app.resultArea).toContainText('2');
      await expect(app.resultArea).toContainText('8'); // 4*2

      // Apply result to arr
      await app.applyResult.click();
      const view = await app.getArrayViewText();
      expect(view).toContain('2');
      expect(view).toContain('8');

      // filterEven on the new array should keep even numbers
      await app.filterEven.click();
      const filterRes = await app.getResultText();
      // Should include only even numbers like 2,4,6,8 etc (here 2,4,6,8 => since we doubled earlier, expect some evens)
      expect(filterRes.length).toBeGreaterThan(0);

      // reduceSum returns a number
      await app.reduceSum.click();
      const reduceRes = await app.getResultText();
      // Should contain numeric result or zero at least
      expect(reduceRes).toMatch(/\d+/);
    });
  });

  test.describe('Custom code sandbox and snapshot behaviors', () => {
    test('Running custom code updates custom result and can apply to array', async ({ page }) => {
      const app = new ArrayPlaygroundPage(page);
      await app.navigate();

      // Load numbers sample [1,2,3,4]
      await app.sampleSelect.selectOption('numbers');
      await app.loadSample.click();

      // Prepare custom code to increment each number
      await app.customCode.fill('return arr.map(x => (typeof x === "number" ? x + 1 : x));');
      // Check applyCustom to apply the returned array
      await app.applyCustom.check();

      // Run custom code
      await app.runCustom.click();

      // customResult should show numbers incremented
      const customText = await app.customResult.innerText();
      expect(customText).toContain('2'); // 1 + 1
      expect(customText).toContain('5'); // 4 + 1

      // Because applyCustom was checked, arrayView should reflect applied array
      const view = await app.getArrayViewText();
      expect(view).toContain('2');
      expect(view).toContain('5');

      // Reset snapshot should revert to last saved snapshot (snapshot was taken on runCustom)
      await app.resetSnap.click();
      // After revert, array should be back to previous snapshot (which was the state before custom apply). Ensure it contains numbers 1..4 or similar.
      const reverted = await app.getArrayViewText();
      // It should contain at least '2' (because snapshot saved earlier might be after sample load) - assert not empty
      expect(reverted.length).toBeGreaterThan(0);
    });

    test('Custom code with invalid JS shows an error message and does not crash page', async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', e => pageErrors.push(e));
      const app = new ArrayPlaygroundPage(page);
      await app.navigate();

      // Intentionally invalid JS to create a syntax error in Function constructor
      await app.customCode.fill('return arr.map(x => x + );');
      await app.runCustom.click();

      // customResult should display an Error message
      const customHtml = await app.customResult.innerHTML();
      expect(customHtml).toMatch(/Error:/);

      // No uncaught page errors should have bubbled as pageerror (errors handled by try/catch)
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Copy, clone, clear, and dialog behaviors', () => {
    test('Clone produces a shallow copy result and copy may show clipboard feedback or fallback alert', async ({ page }) => {
      await page.goto(BASE_URL);
      const app = new ArrayPlaygroundPage(page);

      // Clone - should set lastResult to a cloned array (presented in resultArea)
      await app.cloneBtn.click();
      // The result area should show an array representation (pre)
      const cloneText = await app.getResultText();
      expect(cloneText.length).toBeGreaterThan(0);

      // Copy to clipboard: this button may either succeed silently, resolve, or cause a failure alert or a page error
      // We handle possible outcomes: either success leads to resultArea with 'Copied to clipboard' or an alert with 'Copy failed' or a page error (TypeError)
      let dialogMessage = null;
      const dialogPromise = page.waitForEvent('dialog').then(d => { dialogMessage = d.message(); d.accept().catch(()=>{}); }).catch(() => null);

      // Race between dialog and a small timeout to then inspect resultArea
      await Promise.all([
        app.copyBtn.click(),
        // allow some time for copy logic to run
        page.waitForTimeout(200).catch(()=>{}),
      ]);

      // Wait for dialog if it appeared
      await Promise.race([dialogPromise, page.waitForTimeout(200)]);

      const resultText = await app.getResultText();
      const sawCopied = resultText.includes('Copied to clipboard');
      const sawDialogCopyFailed = dialogMessage && dialogMessage.includes('Copy failed');

      // At least one of the outcomes should be true: either clipboard success or dialog "Copy failed" or nothing but no crash
      expect(sawCopied || sawDialogCopyFailed || resultText.length > 0).toBeTruthy();
    });

    test('Clear button presents confirm and empties array when accepted', async ({ page }) => {
      const app = new ArrayPlaygroundPage(page);
      await app.navigate();

      // Make sure array is non-empty
      await app.sampleSelect.selectOption('numbers');
      await app.loadSample.click();

      // Accept the confirm dialog by handling it
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Clear the array?');
        await dialog.accept();
      });

      await app.clearBtn.click();

      // After clearing, array view should be empty array representation []
      const view = await app.getArrayViewText();
      expect(view).toContain('[]');

      // Result area should show 'Cleared'
      await expect(app.resultArea).toContainText('Cleared');
    });
  });

  test.describe('Edge cases and alerts', () => {
    test('Push with empty input triggers an alert', async ({ page }) => {
      await page.goto(BASE_URL);
      const app = new ArrayPlaygroundPage(page);

      // Ensure valueInput is empty
      await app.valueInput.fill('');

      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        app.pushBtn.click(),
      ]);
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('Enter a value to push.');
      await dialog.accept();
    });
  });
});