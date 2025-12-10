import { test, expect } from '@playwright/test';

// URL of the tested HTML page
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d809d4c0-d1c9-11f0-9efc-d1db1618a544.html';

// Page Object Model for the Set demo page
class SetDemoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.valueInput = page.locator('#valueInput');
    this.typeSelect = page.locator('#typeSelect');
    this.addBtn = page.locator('#addBtn');
    this.hasBtn = page.locator('#hasBtn');
    this.deleteBtn = page.locator('#deleteBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.setInfo = page.locator('#setInfo');
    this.log = page.locator('#log');
    this.iterateBtn = page.locator('#iterateBtn');
    this.toArrayBtn = page.locator('#toArrayBtn');
    this.dedupeBtn = page.locator('#dedupeBtn');
    this.csvInput = page.locator('#csvInput');

    // demo buttons
    this.demoUnion = page.locator('#demoUnion');
    this.demoIntersection = page.locator('#demoIntersection');
    this.demoDifference = page.locator('#demoDifference');
    this.demoObjects = page.locator('#demoObjects');
    this.demoWeakSet = page.locator('#demoWeakSet');
    this.demoFromArray = page.locator('#demoFromArray');
  }

  // Navigate to the app and wait until loaded
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
    // wait for the log element to contain the welcome message (inserted on init)
    await expect(this.log).toContainText('Welcome! Use the controls on the left to experiment with Set.');
  }

  // Helper: set the "Interpret as" select value
  async setType(type) {
    await this.typeSelect.selectOption(type);
  }

  // Helper: fill the value input
  async fillValue(val) {
    await this.valueInput.fill(String(val));
  }

  // Add a value using the UI (value is string representation; type selects parse mode)
  async addValue(valueText, type = 'string', acceptDialog = true) {
    await this.setType(type);
    await this.fillValue(valueText);
    if (!acceptDialog) {
      await this.addBtn.click();
      return;
    }
    // If add triggers an alert on invalid input, handle it in caller if necessary
    const dialogPromise = this.page.waitForEvent('dialog').catch(() => null);
    await this.addBtn.click();
    const dlg = await dialogPromise;
    if (dlg) {
      // accept to avoid blocking; keep message for assertions by caller via waitForEvent usage if needed
      await dlg.accept();
    }
  }

  // Click various action buttons
  async clickHas() { await this.hasBtn.click(); }
  async clickDelete() { await this.deleteBtn.click(); }
  async clickClear() { await this.clearBtn.click(); }
  async clickIterate() { await this.iterateBtn.click(); }
  async clickToArray() { await this.toArrayBtn.click(); }
  async clickDedupe() { await this.dedupeBtn.click(); }
  async clickDemoUnion() { await this.demoUnion.click(); }
  async clickDemoIntersection() { await this.demoIntersection.click(); }
  async clickDemoDifference() { await this.demoDifference.click(); }
  async clickDemoObjects() { await this.demoObjects.click(); }
  async clickDemoWeakSet() { await this.demoWeakSet.click(); }
  async clickDemoFromArray() { await this.demoFromArray.click(); }

  // Read UI text snapshots
  async getSetInfoText() { return (await this.setInfo.textContent()) || ''; }
  async getLogText() { return (await this.log.textContent()) || ''; }

  // Fill CSV input
  async fillCSV(csv) { await this.csvInput.fill(csv); }
}

test.describe('JavaScript Set — Interactive Demo (d809d4c0...)', () => {
  // Capture page errors and console messages for each test run
  test.beforeEach(async ({ page }) => {
    // ensure we surface page errors in the test output if any
    page.on('pageerror', (err) => {
      // Intentionally do not suppress errors; just let them be visible in test logs.
      // Tests will also assert on absence/presence as appropriate.
      // console.error is used so Playwright test runner shows it in context.
      console.error('PAGE ERROR:', err);
    });
    page.on('console', (c) => {
      // Log browser console messages to the node test runner to aid debugging if needed.
      console.log(`BROWSER LOG [${c.type()}]: ${c.text()}`);
    });
  });

  test.describe('Initial load & default state', () => {
    test('should load the demo and show initial log and empty set state', async ({ page }) => {
      // Purpose: Verify the page loads, initial log message exists, and set is empty.
      const p = new SetDemoPage(page);
      await p.goto();

      // The setInfo should show 'Empty set' on initial load
      await expect(p.setInfo).toHaveText('Empty set');

      // The log should contain the welcome message inserted by the script
      const logText = await p.getLogText();
      expect(logText).toContain('Welcome! Use the controls on the left to experiment with Set.');

      // The script also logs a note about NaN behavior on init; assert it exists
      expect(logText).toContain('Note on NaN');

      // No uncaught page errors should have occurred up to this point (pageerror would have been printed)
      // We rely on the fact that page.on('pageerror') logs errors; here we assert none by checking a flag:
      // Since we can't synchronously inspect internal listener storage, we at least assert the log DOM exists and contains expected texts.
      // (Any pageerror would have caused visible console output and test failure if it throws.)
    });
  });

  test.describe('Basic set operations (add / has / delete / clear / iteration / toArray)', () => {
    test('should add a string and reflect in set info and log', async ({ page }) => {
      // Purpose: add "hello" as a string (default) and verify DOM updates
      const p = new SetDemoPage(page);
      await p.goto();

      // Ensure set is clear
      await p.clickClear();

      // Add a string value using default 'string' interpret mode
      await p.addValue('hello', 'string');
      const setInfo = await p.getSetInfoText();
      // Should show size = 1 and the pretty-printed string "hello"
      expect(setInfo).toContain('size = 1');
      expect(setInfo).toContain('"hello"');

      // The log should include an "Added value to Set" entry with the value
      const log = await p.getLogText();
      expect(log).toMatch(/Added value to Set:/);
      expect(log).toContain('"hello"');
    });

    test('should add and detect a number when "Number" type is selected', async ({ page }) => {
      // Purpose: verify number parsing path, has(), and setInfo update
      const p = new SetDemoPage(page);
      await p.goto();

      // Reset set
      await p.clickClear();

      // Add number 42
      await p.addValue('42', 'number');
      await expect(p.setInfo).toContainText('size = 1');

      // Now test Has? => should log true for 42
      await p.fillValue('42');
      await p.setType('number');
      await p.clickHas();

      const log = await p.getLogText();
      // The Has? log line should be present and mention => true
      expect(log).toMatch(/Has\?/);
      expect(log).toMatch(/=> true/);
    });

    test('should delete values and update the set size and log', async ({ page }) => {
      // Purpose: confirm deleteBtn removes an entry and logs deletion result
      const p = new SetDemoPage(page);
      await p.goto();

      // Reset set and add two values
      await p.clickClear();
      await p.addValue('one', 'string');
      await p.addValue('two', 'string');

      // Delete 'one'
      await p.fillValue('one');
      await p.setType('string');
      await p.clickDelete();

      // setInfo should now show size = 1 and not include "one"
      const setInfo = await p.getSetInfoText();
      expect(setInfo).toContain('size = 1');
      expect(setInfo).not.toContain('"one"');

      // Log should show deletion result => true
      const log = await p.getLogText();
      expect(log).toMatch(/Delete/);
      expect(log).toMatch(/=> true/);
    });

    test('should clear the set via Clear Set button', async ({ page }) => {
      // Purpose: adding items then clearing should show "Empty set"
      const p = new SetDemoPage(page);
      await p.goto();

      // Add an item then clear
      await p.addValue('to-be-cleared', 'string');
      await expect(p.setInfo).toContainText('size = 1');

      await p.clickClear();
      await expect(p.setInfo).toHaveText('Empty set');

      // Log should contain 'Cleared Set'
      const log = await p.getLogText();
      expect(log).toContain('Cleared Set');
    });

    test('should iterate over set using iterate button and show items in log', async ({ page }) => {
      // Purpose: add some items and verify iterateBtn outputs both for..of and forEach iterations
      const p = new SetDemoPage(page);
      await p.goto();

      // Reset and add values preserving order
      await p.clickClear();
      await p.addValue('a', 'string');
      await p.addValue('b', 'string');
      await p.addValue('c', 'string');

      await p.clickIterate();
      const log = await p.getLogText();

      expect(log).toContain('Iterating with for..of');
      expect(log).toContain('"a"');
      expect(log).toContain('"b"');
      expect(log).toContain('"c"');
      expect(log).toContain('Iterating with forEach');
    });

    test('should convert set to array and log the conversion', async ({ page }) => {
      // Purpose: verify toArray button logs the conversion
      const p = new SetDemoPage(page);
      await p.goto();

      await p.clickClear();
      await p.addValue('x', 'string');
      await p.addValue('y', 'string');

      await p.clickToArray();
      const log = await p.getLogText();
      expect(log).toContain('Converted Set to Array:');
      expect(log).toContain('"x"');
      expect(log).toContain('"y"');
    });
  });

  test.describe('Dedupe and CSV input behaviors', () => {
    test('should dedupe CSV input and log result', async ({ page }) => {
      // Purpose: verify dedupe button processes csvInput and logs deduped array
      const p = new SetDemoPage(page);
      await p.goto();

      await p.fillCSV('apple, banana, apple, orange');
      await p.clickDedupe();

      const log = await p.getLogText();
      expect(log).toContain('Dedupe result');
      expect(log).toContain('apple');
      expect(log).toContain('banana');
      expect(log).toContain('orange');
    });

    test('clicking dedupe with empty CSV should show an alert', async ({ page }) => {
      // Purpose: ensure empty CSV triggers an alert with the expected message
      const p = new SetDemoPage(page);
      await p.goto();

      // Ensure csvInput is empty
      await p.fillCSV('');
      // Listen for dialog and assert its message
      const dialogPromise = page.waitForEvent('dialog');
      await p.clickDedupe();
      const dlg = await dialogPromise;
      expect(dlg.message()).toBe('Enter comma-separated values to dedupe');
      await dlg.accept();
    });
  });

  test.describe('Demos: union/intersection/difference/objects/weakset/fromArray', () => {
    test('should run union, intersection, and difference demos and log expected headings', async ({ page }) => {
      // Purpose: run the three set operation demos and assert they add appropriate log entries
      const p = new SetDemoPage(page);
      await p.goto();

      await p.clickDemoUnion();
      await p.clickDemoIntersection();
      await p.clickDemoDifference();

      const log = await p.getLogText();
      expect(log).toContain('Union demo:');
      expect(log).toContain('Intersection demo:');
      expect(log).toContain('Difference demo (A \\ B):');
      // union demo logs arrays (pretty uses JSON.stringify) so check for numeric values used in demos
      expect(log).toContain('1,2,3'); // part of union A or B arrays representation
    });

    test('should demonstrate objects stored by reference and show distinct entries', async ({ page }) {
      // Purpose: demoObjects shows two different object references and logs size and contents
      const p = new SetDemoPage(page);
      await p.goto();

      await p.clickDemoObjects();
      const log = await p.getLogText();
      expect(log).toContain('Objects in Set (by reference):');
      expect(log).toContain('Added obj1, obj2, obj1 again.');
      expect(log).toMatch(/size=\d+/); // logs Set contents with size info
    });

    test('should run WeakSet demo and log note about WeakSets and the primitive error', async ({ page }) {
      // Purpose: verify WeakSet demo logs explanation and logs that adding a primitive throws
      const p = new SetDemoPage(page);
      await p.goto();

      await p.clickDemoWeakSet();

      const log = await p.getLogText();
      expect(log).toContain('WeakSet demo:');
      // The code catches the error and logs a message that includes 'WeakSet cannot hold primitives'
      expect(log).toContain('WeakSet cannot hold primitives');
    });

    test('should create a set from array (dedupe) and log resulting unique values', async ({ page }) {
      // Purpose: demoFromArray demonstrates creating a set from an array with duplicates
      const p = new SetDemoPage(page);
      await p.goto();

      await p.clickDemoFromArray();
      const log = await p.getLogText();
      expect(log).toContain('From Array demo:');
      // The demo array includes 'red' and 'blue' duplicates and final set output should show unique entries
      expect(log).toContain('red');
      expect(log).toContain('blue');
      expect(log).toContain('green');
    });
  });

  test.describe('Error handling and parsing edge cases', () => {
    test('should alert and log when adding invalid number input', async ({ page }) => {
      // Purpose: ensure Number parsing path errors are surfaced via alert and log
      const p = new SetDemoPage(page);
      await p.goto();

      await p.clickClear();
      await p.setType('number');
      await p.fillValue('not-a-number');

      const dialogPromise = page.waitForEvent('dialog');
      await p.addBtn.click(); // clicking the add button will trigger dialog via alert in catch
      const dlg = await dialogPromise;
      // The page alerts with 'Error: Not a valid number'
      expect(dlg.message()).toBe('Error: Not a valid number');
      await dlg.accept();

      // The log should contain an "Error: Not a valid number" entry as well
      const log = await p.getLogText();
      expect(log).toContain('Error: Not a valid number');
    });

    test('should alert and log when adding invalid JSON input', async ({ page }) => {
      // Purpose: ensure JSON parsing errors surface as alert and log entries
      const p = new SetDemoPage(page);
      await p.goto();

      await p.clickClear();
      await p.setType('json');
      await p.fillValue('{a:1}'); // invalid JSON (keys must be quoted)

      const dialogPromise = page.waitForEvent('dialog');
      await p.addBtn.click();
      const dlg = await dialogPromise;
      expect(dlg.message()).toBe('Error: Invalid JSON');
      await dlg.accept();

      const log = await p.getLogText();
      expect(log).toContain('Error: Invalid JSON');
    });

    test('adding NaN twice should result in only one entry in the set (SameValueZero behavior)', async ({ page }) => {
      // Purpose: verify NaN uniqueness behavior via UI by using the number type and adding NaN representation
      const p = new SetDemoPage(page);
      await p.goto();

      await p.clickClear();
      // Add NaN via JSON parsing (JSON 'null' can't produce NaN), so add via number path by using 'NaN' (Number('NaN') => NaN)
      await p.setType('number');
      await p.fillValue('NaN');
      await p.addBtn.click();

      // Add NaN again
      await p.fillValue('NaN');
      await p.addBtn.click();

      // The setInfo pretty-prints NaN likely as null? However updateSetInfo uses JSON.stringify where JSON.stringify(NaN) -> 'null'
      // The page also logs an initial note about NaN. We assert size = 1 as described by script logic.
      const setInfo = await p.getSetInfoText();
      expect(setInfo).toContain('size = 1');
      // Also look for the explicit "Note on NaN" in the log that was created on init
      const log = await p.getLogText();
      expect(log).toContain('Note on NaN');
    });
  });

  test.describe('Safety checks: console and page errors', () => {
    test('should not have uncaught page errors on normal interactions', async ({ page }) => {
      // Purpose: run a set of typical interactions and ensure no uncaught pageerror events are emitted
      const errors = [];
      page.on('pageerror', (e) => errors.push(e));
      const p = new SetDemoPage(page);
      await p.goto();

      // Run through a few operations
      await p.clickClear();
      await p.addValue('alpha', 'string');
      await p.clickHas();
      await p.clickToArray();
      await p.clickDemoUnion();
      await p.clickDemoWeakSet();

      // Give a short moment for any async page errors to surface
      await page.waitForTimeout(200);

      // Assert no pageerrors were captured
      expect(errors.length).toBe(0);
    });
  });
});