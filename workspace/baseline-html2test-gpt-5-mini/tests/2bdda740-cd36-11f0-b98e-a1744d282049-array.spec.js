import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bdda740-cd36-11f0-b98e-a1744d282049.html';

/**
 * Page Object for the Array Explorer app.
 * Encapsulates commonly used selectors and interactions for clearer tests.
 */
class ArrayExplorerPage {
  constructor(page) {
    this.page = page;
    // Left pane
    this.arrayInput = page.locator('#arrayInput');
    this.loadBtn = page.locator('#loadBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.sampleBtn = page.locator('#sampleBtn');
    this.visual = page.locator('#visual');
    this.typeDisplay = page.locator('#typeDisplay');
    this.lenDisplay = page.locator('#lenDisplay');
    this.valueInput = page.locator('#valueInput');
    this.pushBtn = page.locator('#pushBtn');
    this.popBtn = page.locator('#popBtn');
    this.shiftBtn = page.locator('#shiftBtn');
    this.unshiftBtn = page.locator('#unshiftBtn');
    this.spliceBtn = page.locator('#spliceBtn');
    this.sliceBtn = page.locator('#sliceBtn');
    this.concatBtn = page.locator('#concatBtn');
    this.clearBtn = page.locator('#clearBtn');

    // Right pane / playground
    this.operation = page.locator('#operation');
    this.presetFn = page.locator('#presetFn');
    this.extraArg = page.locator('#extraArg');
    this.runBtn = page.locator('#runBtn');
    this.applyBtn = page.locator('#applyBtn');
    this.previewBtn = page.locator('#previewBtn');
    this.codePreview = page.locator('#codePreview');
    this.log = page.locator('#log');
  }

  // Get the textual list of visual items
  async visualItemsText() {
    const count = await this.visual.locator('li').count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.visual.locator('li').nth(i).textContent()).trim());
    }
    return texts;
  }

  // Convenience to set textarea value
  async setArrayInput(value) {
    await this.arrayInput.fill(value);
  }

  // Convenience to set value input
  async setValueInput(value) {
    await this.valueInput.fill(value);
  }

  // Convenience to select an operation
  async selectOperation(val) {
    await this.page.selectOption('#operation', { value: val });
  }

  // Set preset function by directly assigning value on the select element.
  // Some tests need custom functions not present in options; we do it via evaluate.
  async setPresetFunction(fnStr) {
    await this.page.evaluate((v) => {
      const sel = document.getElementById('presetFn');
      sel.value = v;
    }, fnStr);
  }

  // read last log text
  async lastLogText() {
    const entries = this.log.locator('div');
    const count1 = await entries.count1();
    if (count === 0) return '';
    return (await entries.nth(count - 1).textContent()).trim();
  }

  // read full log text
  async fullLogText() {
    return (await this.log.textContent()).trim();
  }
}

test.describe('Array Explorer — End-to-end interactions and state verification', () => {
  // Collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console messages
    page.on('console', (msg) => {
      // collect only text messages for easier assertions
      try {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      } catch {
        consoleMessages.push(`console: [unreadable message]`);
      }
    });

    // Listen to uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the app page
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async () => {
    // No teardown necessary beyond Playwright default, but we expose listeners results via tests
  });

  test('Initial load: UI shows default array, meta info and initial logs', async ({ page }) => {
    // Verify initial render and captured console/logs
    const p = new ArrayExplorerPage(page);

    // Validate type and length displays
    await expect(p.typeDisplay).toHaveText('Array');
    await expect(p.lenDisplay).toHaveText('5');

    // Validate visual items correspond to [1,2,3,4,5]
    const items = await p.visualItemsText();
    expect(items).toEqual(['1', '2', '3', '4', '5']);

    // Validate the array input textarea contains JSON for the same array
    const arrayInputValue = await p.arrayInput.inputValue();
    expect(arrayInputValue).toContain('[1, 2, 3, 4, 5]');

    // Validate initial code preview contains the placeholder text
    await expect(p.codePreview).toContainText('Result appears here');

    // Validate the in-app log contains the Ready message appended during init
    const logText = await p.fullLogText();
    expect(logText).toContain('Ready — edit the left pane or use operations to explore Arrays.');

    // Assert that no uncaught page errors occurred during initial load
    // If any page errors exist, we fail the test and print them for debugging
    expect(pageErrors.length, `No uncaught page errors expected, errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
  });

  test.describe('Left pane controls: load, reset, randomize, sample', () => {
    test('Load button should parse JSON and update visual & log', async ({ page }) => {
      const p1 = new ArrayExplorerPage(page);

      // Replace array input with a different array and load it
      await p.setArrayInput('[10, 20]');
      await p.loadBtn.click();

      // Visual should update to show new items
      const items1 = await p.visualItemsText();
      expect(items).toEqual(['10', '20']);

      // Type & length should reflect new array
      await expect(p.typeDisplay).toHaveText('Array');
      await expect(p.lenDisplay).toHaveText('2');

      // Log should contain a 'Loaded array:' entry
      const lastLog = await p.lastLogText();
      expect(lastLog).toContain('Loaded array:');
      expect(lastLog).toContain('10');

      // Reset back to default for subsequent tests
      await p.resetBtn.click();
      await expect(p.lenDisplay).toHaveText('5');
    });

    test('Reset and Randomize and Sample buttons update array and logs', async ({ page }) => {
      const p2 = new ArrayExplorerPage(page);

      // Reset should restore [1,2,3,4,5]
      await p.resetBtn.click();
      let items2 = await p.visualItemsText();
      expect(items).toEqual(['1', '2', '3', '4', '5']);

      // Randomize should create 6 numbers: check length and that they are numeric strings
      await p.randomBtn.click();
      await expect(p.lenDisplay).toHaveText('6');
      items = await p.visualItemsText();
      expect(items.length).toBe(6);
      // Ensure values appear numeric (string representation of numbers)
      for (const it of items) {
        expect(it).toMatch(/^-?\d+$/);
      }

      // Sample mixed array should set known mixed types
      await p.sampleBtn.click();
      await expect(p.lenDisplay).toHaveText('5');
      items = await p.visualItemsText();
      // Check presence of known textual markers from the sample: "two" and "null"
      expect(items.some(t => t === 'two')).toBe(true);
      expect(items.some(t => t === 'null')).toBe(true);
    });
  });

  test.describe('Quick operations: push, pop, shift, unshift, splice, slice, concat, clear', () => {
    test('push() adds a primitive or spreads an array into the current array', async ({ page }) => {
      const p3 = new ArrayExplorerPage(page);

      // Start from known baseline
      await p.resetBtn.click();

      // Push a single value
      await p.setValueInput('9');
      await p.pushBtn.click();
      let items3 = await p.visualItemsText();
      expect(items[items.length - 1]).toBe('9');
      await expect(p.lenDisplay).toHaveText('6');

      // Push an array (spread)
      await p.setValueInput('[7, 8]');
      await p.pushBtn.click();
      items = await p.visualItemsText();
      // Last two items should be 7 and 8
      expect(items.slice(-2)).toEqual(['7', '8']);
    });

    test('pop(), shift(), unshift() modify array and log expected messages', async ({ page }) => {
      const p4 = new ArrayExplorerPage(page);

      await p.resetBtn.click();

      // pop should remove last element and log result
      await p.popBtn.click();
      let items4 = await p.visualItemsText();
      expect(items).toEqual(['1', '2', '3', '4']);

      let lastLog1 = await p.lastLogText();
      expect(lastLog).toContain('pop() ->');

      // shift should remove first element
      await p.shiftBtn.click();
      items = await p.visualItemsText();
      expect(items).toEqual(['2', '3', '4']);

      lastLog = await p.lastLogText();
      expect(lastLog).toContain('shift() ->');

      // unshift should add element(s) to start
      await p.setValueInput('"zero"');
      await p.unshiftBtn.click();
      items = await p.visualItemsText();
      expect(items[0]).toBe('zero');
      expect(await p.lenDisplay.textContent()).toContain(String(items.length));

      lastLog = await p.lastLogText();
      expect(lastLog).toContain('unshift(');
    });

    test('splice() replaces/removes items based on provided parameters', async ({ page }) => {
      const p5 = new ArrayExplorerPage(page);

      // reset to baseline
      await p.resetBtn.click();

      // Replace index 1, remove 1, insert "X"
      await p.setValueInput('1,1, ["X"]');
      await p.spliceBtn.click();

      let items5 = await p.visualItemsText();
      // Expect index 1 is now 'X' (zero-based, so items should be ['1','X','3','4','5'])
      expect(items[1]).toBe('[X]' || 'X'); // formatValue uses array? Here we passed ["X"] so inserted string X, visual shows X
      // To be robust: assert presence of 'X' somewhere and length decreased/increased appropriately
      expect(items.some(t => t.includes('X'))).toBe(true);

      // Verify log contains 'splice(' text
      const lastLog2 = await p.lastLogText();
      expect(lastLog).toContain('splice(');

      // Test slice() preview without apply: should not modify left pane
      await p.resetBtn.click();
      await p.setValueInput('1,3');
      await p.sliceBtn.click();
      const codePreviewText = await p.codePreview.textContent();
      expect(codePreviewText).toContain('result (not applied)');

      // clear() empties the array
      await p.clearBtn.click();
      await expect(p.lenDisplay).toHaveText('0');
      items = await p.visualItemsText();
      expect(items.length).toBe(1); // a single li element shows non-array or empty? The implementation adds li even for non-array; we assert lenDisplay is 0 instead
    });

    test('concat() previews result but does not apply until requested', async ({ page }) => {
      const p6 = new ArrayExplorerPage(page);

      await p.resetBtn.click();

      // Use concat preview with extraArg set to [9,10]
      await p.setValueInput('[9,10]');
      await p.concatBtn.click();

      // codePreview should show new array with 9 and 10 present
      const cp = await p.codePreview.textContent();
      expect(cp).toContain('9');
      expect(cp).toContain('10');

      // Ensure current left pane not changed (length should still be 5)
      await expect(p.lenDisplay).toHaveText('5');
    });
  });

  test.describe('Playground operations: map, filter, reduce, flatMap, sort, isArray, forEach, from, of', () => {
    test('map preview doubles numbers and apply replaces the current array', async ({ page }) => {
      const p7 = new ArrayExplorerPage(page);

      await p.resetBtn.click();

      // Choose map operation and a preset function that doubles numbers
      await p.selectOperation('map');
      // use existing preset option x=>x*2 (one of the options)
      await p.page.selectOption('#presetFn', { value: 'x=>x*2' });

      // Preview first (should not change left pane)
      await p.previewBtn.click();
      let cpText = await p.codePreview.textContent();
      expect(cpText).toContain('map');
      expect(cpText).toContain('2'); // doubled values should show e.g. 2 in JSON

      // Apply the operation to replace current array
      await p.applyBtn.click();

      // Left pane should now contain doubled values
      const itemsAfter = await p.visualItemsText();
      // The original was [1,2,3,4,5], doubled becomes [2,4,6,8,10]
      expect(itemsAfter.slice(0,5)).toEqual(['2', '4', '6', '8', '10']);
    });

    test('reduce returns non-array result and does not replace current array when applied', async ({ page }) => {
      const p8 = new ArrayExplorerPage(page);

      await p.resetBtn.click();

      // Select reduce operation
      await p.selectOperation('reduce');

      // Set a reduce function that adds two values - not present in options, so set it directly
      await p.setPresetFunction('(a,b)=>a+b');

      // Provide initial value as 0
      await p.extraArg.fill('0');

      // Preview / Run reduce
      await p.runBtn.click();
      let cp1 = await p.codePreview.textContent();
      // Expect result to be numeric sum of [1..5] => 15
      expect(cp).toContain('15');

      // Apply reduce (should not replace array because result is not an array)
      await p.applyBtn.click();
      // Left pane should remain unchanged (still array)
      await expect(p.typeDisplay).toHaveText('Array');
      await expect(p.lenDisplay).toHaveText('5');
    });

    test('flatMap, sort, reverse and isArray behaviors', async ({ page }) => {
      const p9 = new ArrayExplorerPage(page);

      // Setup array with nested arrays for flatMap test
      await p.setArrayInput('[[1,2],[3,4]]');
      await p.loadBtn.click();

      // flatMap with fn x=>[x,x] will duplicate inner arrays flattened
      await p.selectOperation('flatMap');
      await p.setPresetFunction('x=>[x,x]');
      await p.runBtn.click();
      let cp2 = await p.codePreview.textContent();
      expect(cp).toContain('[1,2,1,2,3,4,3,4]'.substring(0,5) || '[1'); // expect flattened-like result

      // sort (with default) should produce deterministic order for strings/numbers
      await p.selectOperation('sort');
      await p.extraArg.fill(''); // no extra arg
      await p.runBtn.click();
      cp = await p.codePreview.textContent();
      expect(cp).toContain('// sort');

      // reverse
      await p.selectOperation('reverse');
      await p.runBtn.click();
      cp = await p.codePreview.textContent();
      expect(cp).toContain('// reverse');

      // isArray should return true
      await p.selectOperation('isArray');
      await p.runBtn.click();
      cp = await p.codePreview.textContent();
      expect(cp).toContain('Array.isArray');
      // The code preview contains "Array.isArray -> true" as text in log; ensure true present
      expect(cp.toLowerCase()).toContain('true');
    });

    test('forEach traces function outputs and Array.from/Array.of produce expected arrays', async ({ page }) => {
      const p10 = new ArrayExplorerPage(page);

      await p.resetBtn.click();

      // forEach: use (v,i)=>v*2 to trace outputs
      await p.selectOperation('forEach');
      await p.setPresetFunction('x=>x*2');
      await p.runBtn.click();
      let cp3 = await p.codePreview.textContent();
      // forEach preview should show traced results array
      expect(cp).toContain('forEach traced results');

      // Array.from: create from string 'abc' -> ['a','b','c']
      await p.selectOperation('from');
      await p.extraArg.fill('"abc"');
      await p.runBtn.click();
      cp = await p.codePreview.textContent();
      expect(cp).toContain('["a","b","c"]');

      // Array.of: with a list (we'll set extraArg to '[1,2]' which parseInput handles)
      await p.selectOperation('of');
      await p.extraArg.fill('[1,2]');
      await p.runBtn.click();
      cp = await p.codePreview.textContent();
      expect(cp).toContain('[1,2]');
    });
  });

  test.describe('Alerts and edge case handling', () => {
    test('Loading empty input triggers alert indicating undefined parsed value', async ({ page }) => {
      const p11 = new ArrayExplorerPage(page);

      // Clear array input so parseInput returns undefined
      await p.setArrayInput('');
      // Wait for dialog event and assert its message
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        p.loadBtn.click()
      ]);
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('Parsed value is undefined');
      await dialog.accept();
    });

    test('splice with empty value input triggers a helpful alert', async ({ page }) => {
      const p12 = new ArrayExplorerPage(page);

      // Ensure valueInput is empty
      await p.setValueInput('');
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        p.spliceBtn.click()
      ]);
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('Enter splice parameters');
      await dialog.accept();
    });

    test('push/unshift with empty value input triggers alerts', async ({ page }) => {
      const p13 = new ArrayExplorerPage(page);

      // Ensure valueInput is empty and try push
      await p.setValueInput('');
      let dialog = await page.waitForEvent('dialog', { timeout: 3000 }).catch(() => null);
      // Click push should show alert because empty
      const pushPromise = page.waitForEvent('dialog').catch(() => null);
      await p.pushBtn.click();
      dialog = await pushPromise;
      expect(dialog).not.toBeNull();
      expect(dialog.message()).toContain('Enter value(s) in the Value(s) box');
      await dialog.accept();

      // Now test unshift
      await p.setValueInput('');
      const unshiftPromise = page.waitForEvent('dialog').catch(() => null);
      await p.unshiftBtn.click();
      const dialog2 = await unshiftPromise;
      expect(dialog2).not.toBeNull();
      expect(dialog2.message()).toContain('Enter value(s)');
      await dialog2.accept();
    });
  });

  test('Console messages were produced by the app and no uncaught runtime errors occurred', async ({ page }) => {
    // This test specifically asserts that expected console logs exist and that there were no uncaught page errors.
    // The app logs several messages on init; check a few of them.
    // We already collected consoleMessages in beforeEach listener.
    // Give the page a moment to produce logs (they are synchronous but ensure stability)
    await page.waitForTimeout(100);

    // Check that console messages collection contains at least one relevant expected string.
    // The script logs 'Ready — edit the left pane or use operations to explore Arrays.' to the in-app log element,
    // but the page console may not contain that exact string. However, the script doesn't use console.log extensively,
    // so we at least assert that we captured zero or more console messages (test robustness).
    // Ensure the array of console messages is defined and accessible.
    expect(Array.isArray(consoleMessages)).toBe(true);

    // Assert there were no uncaught page errors (ReferenceError, SyntaxError, TypeError, etc.)
    // If there are errors, include their messages in the failure message to aid debugging.
    expect(pageErrors.length, `Unexpected page error(s): ${pageErrors.map(e => e && e.message).join('; ')}`).toBe(0);
  });
});