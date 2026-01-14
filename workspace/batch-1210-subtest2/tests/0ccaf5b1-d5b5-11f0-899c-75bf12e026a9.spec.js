import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0ccaf5b1-d5b5-11f0-899c-75bf12e026a9.html';

// Page Object for the Hash Map Demo page
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#keyInput');
    this.valueInput = page.locator('#valueInput');
    this.operation = page.locator('#operation');
    this.executeBtn = page.locator('#executeBtn');
    this.output = page.locator('#output');
    this.tableRows = page.locator('#hash-map tbody tr');
  }

  async goto() {
    return this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  }

  async setKey(key) {
    await this.keyInput.fill(key);
  }

  async setValue(value) {
    await this.valueInput.fill(value);
  }

  async selectOperation(opValue) {
    await this.operation.selectOption(opValue);
    // wait a tick for updateInputs() and showOutput('') triggered on 'change'
    await this.page.waitForTimeout(50);
  }

  async clickExecute() {
    await this.executeBtn.click();
  }

  async getOutputText() {
    return (await this.output.textContent()) ?? '';
  }

  async isValueDisabled() {
    return await this.valueInput.isDisabled();
  }

  async getTableText() {
    // Return normalized table body text lines
    const rows = await this.tableRows.elementHandles();
    if (rows.length === 0) return [];
    const texts = [];
    for (const row of rows) {
      const tds = await row.$$('td');
      const cellTexts = [];
      for (const td of tds) {
        const txt = (await td.textContent()) ?? '';
        cellTexts.push(txt.trim());
      }
      texts.push(cellTexts.join(' | '));
    }
    return texts;
  }

  async clearKeyAndValue() {
    await this.keyInput.fill('');
    await this.valueInput.fill('');
  }
}

test.describe('Hash Map (JavaScript Map) Demonstration - FSM Validation', () => {
  let pageErrors = [];
  let consoleErrors = [];
  let pageLoaded = false;
  let responseStatus = null;

  test.beforeEach(async ({ page }) => {
    // Collect console errors and uncaught page errors
    pageErrors = [];
    consoleErrors = [];

    page.on('console', (msg) => {
      // collect only console error type messages
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(String(msg.text()));
        }
      } catch (e) {
        // swallow; we only record
        consoleErrors.push(`console collection error: ${String(e)}`);
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(String(err?.message ?? err));
    });

    // Navigate to the application page exactly as given
    const resp = await page.goto(APP_URL, { waitUntil: 'domcontentloaded' }).catch((e) => {
      // Navigation failed (could be network error or 404). We record status as null.
      responseStatus = null;
      pageLoaded = false;
      return null;
    });
    if (resp) {
      responseStatus = resp.status();
      pageLoaded = resp.ok();
    } else {
      pageLoaded = false;
    }
  });

  test.afterEach(async ({ page }) => {
    // For every test ensure no unexpected runtime page errors or console errors occurred
    // This assertion will surface runtime problems in the page JS.
    expect(pageErrors, `Unexpected page errors: ${JSON.stringify(pageErrors, null, 2)}`).toEqual([]);
    expect(consoleErrors, `Unexpected console.error messages: ${JSON.stringify(consoleErrors, null, 2)}`).toEqual([]);
    // close page contexts are handled by Playwright runner automatically
  });

  test('Initial Idle state: entry actions render empty map and set input state', async ({ page }) => {
    // This test validates S0_Idle entry actions (updateInputs(), renderMap())
    const app = new HashMapPage(page);

    // If page didn't load, fail early with details
    expect(pageLoaded, `Expected page to load successfully, got status=${responseStatus}`).toBeTruthy();

    // Verify initial table shows "(empty)"
    const tableText = await app.getTableText();
    expect(tableText.length).toBeGreaterThanOrEqual(1);
    const firstRow = tableText[0];
    expect(firstRow).toContain('(empty)');

    // Default operation should be 'set' (per HTML), so value input should be enabled
    const valueDisabled = await app.isValueDisabled();
    expect(valueDisabled).toBe(false);

    // Output should be empty due to updateInputs() calling showOutput('')
    const out = await app.getOutputText();
    expect(out.trim()).toBe('');
  });

  test('Operation change disables/enables value input and clears output', async ({ page }) => {
    // This validates the OperationChange event and the transition back to Idle
    const app = new HashMapPage(page);

    expect(pageLoaded).toBeTruthy();

    // Ensure starting with 'set'
    await app.selectOperation('set');
    expect(await app.isValueDisabled()).toBe(false);

    // Change to 'get' -> value input should be disabled and value cleared
    await app.selectOperation('get');
    expect(await app.isValueDisabled()).toBe(true);
    // Since operation change clears output, verify output is empty
    expect((await app.getOutputText()).trim()).toBe('');

    // Change back to 'set' -> value input enabled again
    await app.selectOperation('set');
    expect(await app.isValueDisabled()).toBe(false);
  });

  test('Set operation: adding key-value pair updates map and output (S1_Set)', async ({ page }) => {
    // Tests S1_Set transition and renderMap() call
    const app = new HashMapPage(page);

    expect(pageLoaded).toBeTruthy();

    // Ensure inputs are clear
    await app.clearKeyAndValue();

    // Set key/value and execute
    await app.setKey('foo');
    await app.setValue('bar');
    await app.selectOperation('set');
    await app.clickExecute();

    // Output should confirm set
    const out = await app.getOutputText();
    expect(out).toContain('Set key "foo" with value "bar".');

    // Table should contain the new entry
    const table = await app.getTableText();
    // Expect at least one row and that row contains foo and bar
    const hasEntry = table.some((r) => r.includes('foo') && r.includes('bar'));
    expect(hasEntry).toBe(true);
  });

  test('Set with empty key shows validation message and map not updated (edge case)', async ({ page }) => {
    // Edge case: empty key should not be accepted
    const app = new HashMapPage(page);

    expect(pageLoaded).toBeTruthy();

    // Ensure we're in set operation
    await app.selectOperation('set');
    await app.clearKeyAndValue();

    // Attempt to set with empty key
    await app.setKey('');
    await app.setValue('valueShouldNotBeSet');
    await app.clickExecute();

    const out = await app.getOutputText();
    expect(out).toContain('Please enter a key.');

    // Ensure map does not contain an empty key row; table should still contain only prior entries (if any)
    const table = await app.getTableText();
    const hasEmptyKey = table.some((r) => r.includes('') && r.includes('valueShouldNotBeSet'));
    // We expect false: there should be no entry with the provided value because key was empty
    expect(hasEmptyKey).toBe(false);
  });

  test('Get operation: retrieve existing value and missing key message (S2_Get)', async ({ page }) => {
    const app = new HashMapPage(page);

    expect(pageLoaded).toBeTruthy();

    // Ensure 'foo' => 'bar' present; if not present from earlier test, set it again
    await app.selectOperation('get');
    await app.setKey('foo');
    await app.clickExecute();
    let out = await app.getOutputText();

    if (out.includes('Key "foo" does not exist.')) {
      // set it
      await app.selectOperation('set');
      await app.setKey('foo');
      await app.setValue('bar');
      await app.clickExecute();
      expect((await app.getOutputText())).toContain('Set key "foo" with value "bar".');
    }

    // Now perform get for existing key
    await app.selectOperation('get');
    await app.setKey('foo');
    await app.clickExecute();
    out = await app.getOutputText();
    expect(out).toContain('Value for key "foo":');
    // value stringified should include bar
    expect(out).toContain('bar');

    // Now get for missing key
    await app.setKey('nonexistentKeyXYZ');
    await app.clickExecute();
    out = await app.getOutputText();
    expect(out).toContain('Key "nonexistentKeyXYZ" does not exist.');
  });

  test('Has operation: checks existence for present and absent keys (S3_Has)', async ({ page }) => {
    const app = new HashMapPage(page);

    expect(pageLoaded).toBeTruthy();

    // Ensure 'foo' exists
    await app.selectOperation('has');
    await app.setKey('foo');
    await app.clickExecute();
    let out = await app.getOutputText();
    // Could be has or does NOT have depending on previous tests, assert message is one of the two expected
    expect(out.includes('Map has the key') || out.includes('Map does NOT have the key')).toBe(true);

    // Check absent key
    await app.setKey('definitelyMissingKey123');
    await app.clickExecute();
    out = await app.getOutputText();
    expect(out).toContain('does NOT have the key');
  });

  test('Delete operation: delete existing key and report deletion or not found (S4_Delete)', async ({ page }) => {
    const app = new HashMapPage(page);

    expect(pageLoaded).toBeTruthy();

    // Ensure key to delete exists
    await app.selectOperation('set');
    await app.setKey('todelete');
    await app.setValue('val');
    await app.clickExecute();
    expect((await app.getOutputText())).toContain('Set key "todelete" with value "val".');

    // Delete it
    await app.selectOperation('delete');
    await app.setKey('todelete');
    await app.clickExecute();
    let out = await app.getOutputText();
    expect(out).toContain('Key "todelete" deleted from the map.');

    // Deleting again should say not found
    await app.clickExecute(); // key still 'todelete' in input
    out = await app.getOutputText();
    expect(out).toContain('was not found in the map.');
  });

  test('Clear operation: clears map and renderMap called (S5_Clear)', async ({ page }) => {
    const app = new HashMapPage(page);

    expect(pageLoaded).toBeTruthy();

    // Add two keys
    await app.selectOperation('set');
    await app.setKey('k1');
    await app.setValue('v1');
    await app.clickExecute();
    await app.setKey('k2');
    await app.setValue('v2');
    await app.clickExecute();

    // Now clear
    await app.selectOperation('clear');
    await app.clickExecute();

    const out = await app.getOutputText();
    expect(out).toContain('Map cleared.');

    // Table should show '(empty)'
    const table = await app.getTableText();
    expect(table[0]).toContain('(empty)');
  });

  test('Size operation: returns correct map size (S6_Size)', async ({ page }) => {
    const app = new HashMapPage(page);

    expect(pageLoaded).toBeTruthy();

    // Clear first to have a deterministic baseline
    await app.selectOperation('clear');
    await app.clickExecute();
    expect((await app.getOutputText())).toContain('Map cleared.');

    // Add two keys
    await app.selectOperation('set');
    await app.setKey('sizeA');
    await app.setValue('1');
    await app.clickExecute();
    await app.setKey('sizeB');
    await app.setValue('2');
    await app.clickExecute();

    // Check size
    await app.selectOperation('size');
    await app.clickExecute();
    const out = await app.getOutputText();
    expect(out).toContain('Map size: 2');
  });

  test('Keys, Values, Entries operations show correct lists (S7_Keys, S8_Values, S9_Entries)', async ({ page }) => {
    const app = new HashMapPage(page);

    expect(pageLoaded).toBeTruthy();

    // Start from clear
    await app.selectOperation('clear');
    await app.clickExecute();
    expect((await app.getOutputText())).toContain('Map cleared.');

    // Add known entries: "A"->1 and "B"->2
    await app.selectOperation('set');
    await app.setKey('A');
    await app.setValue('1');
    await app.clickExecute();
    await app.setKey('B');
    await app.setValue('2');
    await app.clickExecute();

    // Keys
    await app.selectOperation('keys');
    await app.clickExecute();
    let out = await app.getOutputText();
    expect(out.startsWith('Keys:')).toBe(true);
    expect(out).toContain('A');
    expect(out).toContain('B');

    // Values
    await app.selectOperation('values');
    await app.clickExecute();
    out = await app.getOutputText();
    expect(out.startsWith('Values:')).toBe(true);
    expect(out).toContain('1');
    expect(out).toContain('2');

    // Entries
    await app.selectOperation('entries');
    await app.clickExecute();
    out = await app.getOutputText();
    expect(out.startsWith('Entries:')).toBe(true);
    expect(out).toContain('A => 1');
    expect(out).toContain('B => 2');
  });

  test('Validation messages for operations without key: get/has/delete should prompt for key (edge cases)', async ({ page }) => {
    const app = new HashMapPage(page);
    expect(pageLoaded).toBeTruthy();

    // Attempt get with empty key
    await app.selectOperation('get');
    await app.clearKeyAndValue();
    await app.clickExecute();
    expect((await app.getOutputText())).toContain('Please enter a key.');

    // Attempt has with empty key
    await app.selectOperation('has');
    await app.clickExecute();
    expect((await app.getOutputText())).toContain('Please enter a key.');

    // Attempt delete with empty key
    await app.selectOperation('delete');
    await app.clickExecute();
    expect((await app.getOutputText())).toContain('Please enter a key.');
  });
});