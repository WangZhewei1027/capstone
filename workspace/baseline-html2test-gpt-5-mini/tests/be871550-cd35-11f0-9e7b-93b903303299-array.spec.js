import { test, expect } from '@playwright/test';

// Test file: be871550-cd35-11f0-9e7b-93b903303299-array.spec.js
// URL under test:
// http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be871550-cd35-11f0-9e7b-93b903303299.html

// Page Object helper to encapsulate interactions with the Array Playground
class ArrayPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.inputArray = page.locator('#inputArray');
    this.btnLoad = page.locator('#btnLoad');
    this.btnRandom = page.locator('#btnRandom');
    this.btnClear = page.locator('#btnClear');
    this.lenEl = page.locator('#len');
    this.currentType = page.locator('#currentType');

    // Mutate controls
    this.opValue = page.locator('#opValue');
    this.opIndex = page.locator('#opIndex');
    this.opEnd = page.locator('#opEnd');
    this.pushBtn = page.locator('#push');
    this.popBtn = page.locator('#pop');
    this.spliceBtn = page.locator('#splice');

    // Examples & higher-order
    this.exNums = page.locator('#exNums');
    this.exStr = page.locator('#exStr');
    this.mapBtn = page.locator('#mapBtn');
    this.filterBtn = page.locator('#filterBtn');
    this.expr = page.locator('#expr');

    // Typed demo
    this.typedDemo = page.locator('#typedDemo');

    // Visual & log
    this.visual = page.locator('#visual');
    this.cells = () => this.visual.locator('.cell');
    this.logEl = page.locator('#log');

    // Utilities
    this.clearLog = page.locator('#clearLog');
    this.arrayTypeSelect = page.locator('#arrayType');
  }

  // Read textual values from visual cells (returns array of {index, value})
  async readVisualCells() {
    const cellCount = await this.cells().count();
    const out = [];
    for (let i = 0; i < cellCount; i++) {
      const cell = this.cells().nth(i);
      const idx = await cell.locator('.index').textContent();
      const val = await cell.locator('.value').textContent();
      out.push({ index: idx?.trim(), value: val?.trim() });
    }
    return out;
  }

  // Read the most recent log lines as plain text (split by newline)
  async readLogs() {
    const txt = await this.logEl.textContent();
    if (!txt) return [];
    // Prepend order in UI is newest first, but textContent returns combined
    return txt.split('\n').map(s => s.trim()).filter(Boolean);
  }

  // Wait for a log line that includes the substring
  async waitForLogContains(substring, timeout = 2000) {
    await this.page.waitForFunction(
      (sel, substr) => {
        const el = document.querySelector(sel);
        return el && el.textContent && el.textContent.includes(substr);
      },
      '#log',
      substring,
      { timeout }
    );
  }
}

test.describe('Array Playground — Core interactions and state transitions', () => {
  const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be871550-cd35-11f0-9e7b-93b903303299.html';

  // Collections for console and page error observation
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture console messages and page errors for assertions / investigation
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application
    await page.goto(URL);
  });

  test.afterEach(async () => {
    // After each test, assert there were no uncaught page errors.
    // This verifies the page executed without crashing during user interactions.
    expect(pageErrors, 'No uncaught page errors should occur').toEqual([]);
  });

  test('Initial load: page shows initialized sample array and log entry', async ({ page }) => {
    // Purpose: Verify initial state after script initialization.
    const app = new ArrayPage(page);

    // Visual should render 5 cells from the initialization [1,2,3,4,5]
    const cells = await app.readVisualCells();
    expect(cells.length).toBe(5);
    // Values should match initialization numbers
    const values = cells.map(c => c.value);
    expect(values).toEqual(['1', '2', '3', '4', '5']);

    // Length indicator should show 5
    await expect(app.lenEl).toHaveText('5');

    // Current type should be Array
    await expect(app.currentType).toHaveText('Array');

    // Log should contain the initialization message
    const logs = await app.readLogs();
    const joined = logs.join(' ');
    expect(joined).toContain('Initialized with sample [1,2,3,4,5]');

    // Ensure at least some console messages were emitted (informational)
    expect(consoleMessages.length).toBeGreaterThanOrEqual(0);
  });

  test('Load custom array from input, verify visual and log update', async ({ page }) => {
    // Purpose: Test loading a comma-separated array string and resulting DOM updates.
    const app1 = new ArrayPage(page);

    // Enter "10,20,30" into the input and click Load
    await app.inputArray.fill('10,20,30');
    await app.btnLoad.click();

    // Wait for render: length should be 3
    await expect(app.lenEl).toHaveText('3');

    // Visual cells should reflect 10,20,30
    const cells1 = await app.readVisualCells();
    expect(cells.length).toBe(3);
    const values1 = cells.map(c => c.value);
    expect(values).toEqual(['10', '20', '30']);

    // Log should include "Loaded array"
    await app.waitForLogContains('Loaded array:');

    // Also verify the log contains the parsed array notation
    const logs1 = await app.readLogs();
    const logJoined = logs.join(' ');
    expect(logJoined).toContain('Loaded array:');
    expect(logJoined).toContain('10');

  });

  test('Push and pop operations update array and logs correctly', async ({ page }) => {
    // Purpose: Validate push(value) and pop() mutate the array and emit logs.
    const app2 = new ArrayPage(page);

    // Ensure we start from a known array [1,2,3,4,5]
    // (Initial state already provides that)
    await expect(app.lenEl).toHaveText('5');

    // Set opValue to 42 and push
    await app.opValue.fill('42');
    await app.pushBtn.click();

    // After push, length increments to 6 and last value is '42'
    await expect(app.lenEl).toHaveText('6');
    const cellsAfterPush = await app.readVisualCells();
    expect(cellsAfterPush[cellsAfterPush.length - 1].value).toBe('42');

    // Log should contain a push entry
    await app.waitForLogContains('push(');

    // Now click pop and expect the value to be removed
    await app.popBtn.click();
    // After pop, length back to 5
    await expect(app.lenEl).toHaveText('5');
    const cellsAfterPop = await app.readVisualCells();
    const values2 = cellsAfterPop.map(c => c.value);
    expect(values).not.toContain('42');

    // Log must include pop result
    await app.waitForLogContains('pop() ->');
  });

  test('Clicking a visual cell removes that element from the array (splice) and logs removal', async ({ page }) => {
    // Purpose: Verify that clicking a rendered cell removes an item (for normal arrays).
    const app3 = new ArrayPage(page);

    // Load a known array to control indices
    await app.inputArray.fill('100,200,300');
    await app.btnLoad.click();
    await expect(app.lenEl).toHaveText('3');

    // Read first cell's index and value
    const cellsBefore = await app.readVisualCells();
    expect(cellsBefore[0].value).toBe('100');

    // Click the first cell to remove it
    await app.cells().nth(0).click();

    // After removal, length should be 2 and '100' no longer present
    await expect(app.lenEl).toHaveText('2');
    const cellsAfter = await app.readVisualCells();
    const values3 = cellsAfter.map(c => c.value);
    expect(values).not.toContain('100');

    // Log should contain 'splice(' removal message
    await app.waitForLogContains('splice(');
  });

  test('TypedArray demo demonstrates fixed-length behavior and conversion on push', async ({ page }) => {
    // Purpose: Validate typed array demo behavior and that push forces conversion to normal array.
    const app4 = new ArrayPage(page);

    // Click the typed demo button to set an Int16Array into arr
    await app.typedDemo.click();

    // currentType should reflect Int16Array
    await expect(app.currentType).toHaveText('Int16Array');

    // Now attempt to push a value; push handler should convert to normal array and push
    await app.opValue.fill('7');
    await app.pushBtn.click();

    // After push, the type should become Array (converted)
    await expect(app.currentType).toHaveText('Array');

    // Length should have increased (initial typed demo had 4 elements, so should now be 5)
    const lenText = await app.lenEl.textContent();
    const lenNum = Number(lenText?.trim());
    expect(lenNum).toBeGreaterThanOrEqual(5);

    // Logs should include a message about conversion
    await app.waitForLogContains('Converted typed array -> normal Array');

    // Also there should be a push log
    await app.waitForLogContains('push(');
  });

  test('Higher-order functions: map and filter update the array as expected', async ({ page }) => {
    // Purpose: Test that providing an expression for map/filter transforms the array.
    const app5 = new ArrayPage(page);

    // Load a simple numeric array
    await app.inputArray.fill('1,2,3,4');
    await app.btnLoad.click();
    await expect(app.lenEl).toHaveText('4');

    // Map: double each element
    await app.expr.fill('x => x * 2');
    await app.mapBtn.click();

    // Expect array to be doubled: [2,4,6,8]
    const postMap = await app.readVisualCells();
    const mappedValues = postMap.map(c => c.value);
    expect(mappedValues).toEqual(['2', '4', '6', '8']);

    // Filter: keep values > 3
    await app.expr.fill('x => x > 3');
    await app.filterBtn.click();

    const postFilter = await app.readVisualCells();
    const filteredValues = postFilter.map(c => c.value);
    // From [2,4,6,8], filter >3 => [4,6,8]
    expect(filteredValues).toEqual(['4', '6', '8']);

    // Logs should include map and filter entries
    await app.waitForLogContains('map ->');
    await app.waitForLogContains('filter ->');
  });

  test('Safe eval: invalid expression is handled gracefully and logged', async ({ page }) => {
    // Purpose: Ensure invalid user-supplied expressions do not crash the app and are logged.
    const app6 = new ArrayPage(page);

    // Load a small array and set an intentionally invalid expression
    await app.inputArray.fill('1,2,3');
    await app.btnLoad.click();

    await app.expr.fill('invalid =>'); // invalid JS
    await app.mapBtn.click();

    // The app should have logged 'Invalid expression:' and not crashed
    await app.waitForLogContains('Invalid expression:');

    // The array should remain defined; verify it still renders cells (map falls back to identity)
    const cells2 = await app.readVisualCells();
    expect(cells.length).toBeGreaterThan(0);
  });

  test('Slice, concat and flat operations produce expected visual results', async ({ page }) => {
    // Purpose: Quick coverage of slice/concat/flat flows.
    const app7 = new ArrayPage(page);

    // Start with nested arrays for flat
    await app.inputArray.fill('[1,2],[3,4]');
    await app.btnLoad.click();

    // The parseInputToArray fallback treats this as two items: '[1,2]' and '[3,4]' strings,
    // but we can use the provided example buttons for nested arrays reliably.
    await app.exNested.click();
    await expect(app.lenEl).toHaveText('2');

    // Use flat(1) via flatten1 button
    await page.locator('#flatten1').click();
    // After flatten1, arr should contain four numeric elements
    const flatCells = await app.readVisualCells();
    // Values may be '1','2','3','4' depending on stringify behavior
    const flatValues = flatCells.map(c => c.value);
    expect(flatValues.sort()).toEqual(['1','2','3','4']);

    // Now test concat: concat with "9,10"
    await app.opValue.fill('9,10');
    await page.locator('#concat').click();
    await expect(app.lenEl).toHaveText((flatValues.length + 2).toString());

    // Test slice: slice(1,3) -> should replace arr with sliced portion
    await app.opIndex.fill('1');
    await app.opEnd.fill('3');
    await page.locator('#slice').click();
    // Now length should be 2 (slice from 1 to 3)
    const afterSliceLen = await app.lenEl.textContent();
    expect(Number(afterSliceLen.trim())).toBe(2);
  });

  test('Export button triggers blob creation workflow and logs export', async ({ page }) => {
    // Purpose: Verify clicking export triggers the export logic without throwing.
    const app8 = new ArrayPage(page);

    // Spy on URL.createObjectURL to ensure it is invoked (not monkey-patching; just observe no errors)
    // Just click the export button and assert log shows "Exported array as JSON"
    await app.inputArray.fill('7,8,9');
    await app.btnLoad.click();

    await page.locator('#export').click();

    // The export action creates a blob and attempts to click an anchor.
    // We assert that the export log entry appears.
    await app.waitForLogContains('Exported array as JSON');
  });

});