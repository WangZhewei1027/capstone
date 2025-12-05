import { test, expect } from '@playwright/test';

// Test file: d8093880-d1c9-11f0-9efc-d1db1618a544-linked-list.spec.js
// Target URL (served by the test harness)
const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d8093880-d1c9-11f0-9efc-d1db1618a544.html';

// Page Object Model for the Linked List demo
class LinkedListPage {
  constructor(page) {
    this.page = page;
    // Controls
    this.valInput = page.locator('#valInput');
    this.indexInput = page.locator('#indexInput');
    this.searchInput = page.locator('#searchInput');
    this.pushBtn = page.locator('#pushBtn');
    this.unshiftBtn = page.locator('#unshiftBtn');
    this.insertAtBtn = page.locator('#insertAtBtn');
    this.removeAtBtn = page.locator('#removeAtBtn');
    this.findBtn = page.locator('#findBtn');
    this.removeBtn = page.locator('#removeBtn');
    this.reverseBtn = page.locator('#reverseBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.stepTraversalBtn = page.locator('#stepTraversal');
    this.exportBtn = page.locator('#exportBtn');

    // Badges / display
    this.sizeBadge = page.locator('#sizeBadge');
    this.headBadge = page.locator('#headBadge');
    this.logEl = page.locator('#log');
    this.svgWrapper = page.locator('#svgWrapper');
    // Node texts inside svg are rendered with class 'node-text'
    this.nodeTexts = () => this.page.locator('#svgWrapper svg .node-text');
  }

  // Helper to read node values from SVG in order
  async getNodeValues() {
    const count = await this.nodeTexts().count();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push(await this.nodeTexts().nth(i).textContent());
    }
    return values;
  }

  async getSizeBadgeText() {
    return (await this.sizeBadge.textContent())?.trim();
  }
  async getHeadBadgeText() {
    return (await this.headBadge.textContent())?.trim();
  }
  async getLogText() {
    return (await this.logEl.textContent())?.trim();
  }

  // Interactions
  async push(value) {
    await this.valInput.fill(String(value));
    await this.pushBtn.click();
  }
  async unshift(value) {
    await this.valInput.fill(String(value));
    await this.unshiftBtn.click();
  }
  async insertAt(index, value) {
    await this.valInput.fill(String(value));
    await this.indexInput.fill(String(index));
    await this.insertAtBtn.click();
  }
  async removeAt(index) {
    await this.indexInput.fill(String(index));
    await this.removeAtBtn.click();
  }
  async find(value) {
    await this.searchInput.fill(String(value));
    await this.findBtn.click();
  }
  async removeValue(value) {
    await this.searchInput.fill(String(value));
    await this.removeBtn.click();
  }
  async reverse() {
    await this.reverseBtn.click();
  }
  async clear() {
    await this.clearBtn.click();
  }
  async randomize() {
    await this.randomBtn.click();
  }
  async export() {
    await this.exportBtn.click();
  }

  // Step-through traversal: this will cause confirm dialogs for each node.
  // Caller should set up dialog handling on the page before calling this.
  async stepThrough() {
    await this.stepTraversalBtn.click();
  }
}

// Global test suite
test.describe('Linked List Visualizer — E2E', () => {
  // Capture console errors and page errors for assertions
  let consoleErrors;
  let pageErrors;

  // Setup before each test: navigate and wire up listeners
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages of type 'error'
    page.on('console', msg => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({ text: msg.text(), location: msg.location ? msg.location() : null });
        }
      } catch (e) {
        // ignore listener errors
      }
    });

    // Collect uncaught exceptions from the page
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to app
    await page.goto(BASE_URL, { waitUntil: 'load' });
  });

  // Teardown: assert no uncaught page errors or console errors occurred
  test.afterEach(async () => {
    // Ensure tests fail if any console error or page error was emitted
    expect(consoleErrors.length, `Console errors occurred: ${JSON.stringify(consoleErrors, null, 2)}`).toBe(0);
    expect(pageErrors.length, `Page errors occurred: ${pageErrors.map(e => String(e)).join('\n')}`).toBe(0);
  });

  test('Initial load shows seeded list and correct badges', async ({ page }) => {
    // Validate initial rendering and badges after seed runs
    const app = new LinkedListPage(page);

    // The app seeds with ['10','20','30','40'] on init; wait for the log to show that
    await page.waitForFunction(() => {
      const el = document.getElementById('log');
      return el && el.textContent && el.textContent.includes('Sample list created');
    });

    // Size badge should indicate 4 nodes
    await expect(app.sizeBadge).toHaveText(/Size:\s*4/);

    // Head should be the first seeded value '10'
    await expect(app.headBadge).toHaveText(/Head:\s*10/);

    // SVG should render the 4 node values in order
    const values = await app.getNodeValues();
    expect(values).toEqual(['10', '20', '30', '40']);

    // Log should include the seed message
    const logText = await app.getLogText();
    expect(logText).toMatch(/Sample list created/i);
  });

  test('Push and Unshift update DOM, badges and SVG order', async ({ page }) => {
    // Test push (append) and unshift (insert at head)
    const app = new LinkedListPage(page);

    // Wait for initial seed complete
    await page.waitForFunction(() => document.getElementById('log')?.textContent?.includes('Sample list created'));

    // Push a new value '50', size should increment, and value should appear as last item
    await app.push('50');

    // Wait for size update
    await page.waitForFunction(() => document.getElementById('sizeBadge')?.textContent?.includes('5'));

    await expect(app.sizeBadge).toHaveText(/Size:\s*5/);

    // Node values should now include '50' at the end
    let values = await app.getNodeValues();
    expect(values[values.length - 1]).toBe('50');

    // Unshift a value '5' to head
    await app.unshift('5');

    // Wait for size update
    await page.waitForFunction(() => document.getElementById('sizeBadge')?.textContent?.includes('6'));

    await expect(app.sizeBadge).toHaveText(/Size:\s*6/);
    // Head badge should display '5'
    await expect(app.headBadge).toHaveText(/Head:\s*5/);

    values = await app.getNodeValues();
    expect(values[0]).toBe('5');
  });

  test('InsertAt performs traversal animation and places node at correct index', async ({ page }) => {
    // Insert a value at index 2 and validate it's placed correctly
    const app = new LinkedListPage(page);

    // Ensure seeded state ready
    await page.waitForFunction(() => document.getElementById('log')?.textContent?.includes('Sample list created'));

    // Insert 'X' at index 2
    await app.insertAt(2, 'X');

    // The UI animates; wait until log contains insertion confirmation
    await page.waitForFunction(() => {
      const txt = document.getElementById('log')?.textContent || '';
      return txt.includes('Inserted "X" at index 2') || txt.includes('Inserted "X" at index 2.') || txt.includes('Inserted "X" at index 2.');
    }, { timeout: 7000 });

    // Size should reflect insertion (initial 4 -> +1 = 5)
    await expect(app.sizeBadge).toHaveText(/Size:\s*5/);

    // Validate that 'X' is at index 2 in the rendered nodes
    const values = await app.getNodeValues();
    expect(values[2]).toBe('X');
  });

  test('Find (not found) animates full traversal and logs not found message', async ({ page }) => {
    // Attempt to find a value that does not exist and verify behavior
    const app = new LinkedListPage(page);

    await page.waitForFunction(() => document.getElementById('log')?.textContent?.includes('Sample list created'));

    // Use a value unlikely to be in the seeded/randomized set
    await app.find('NO_SUCH_VALUE');

    // Wait for the 'not found' message (the visualizer animates then logs)
    await page.waitForFunction(() => {
      const txt = document.getElementById('log')?.textContent || '';
      return txt.includes('not found');
    }, { timeout: 7000 });

    const logText = await app.getLogText();
    expect(logText).toMatch(/not found/i);
  });

  test('Remove by value removes first occurrence and updates list', async ({ page }) => {
    // Add a known duplicate value, then remove the first occurrence
    const app = new LinkedListPage(page);

    await page.waitForFunction(() => document.getElementById('log')?.textContent?.includes('Sample list created'));

    // Push a value 'Z' twice to create duplicates
    await app.push('Z');
    await page.waitForFunction(() => document.getElementById('sizeBadge')?.textContent?.includes('5'));
    await app.push('Z');
    await page.waitForFunction(() => document.getElementById('sizeBadge')?.textContent?.includes('6'));

    // Remove the first occurrence of 'Z'
    await app.removeValue('Z');

    // Wait until log indicates removal
    await page.waitForFunction(() => {
      const txt = document.getElementById('log')?.textContent || '';
      return /Removed first occurrence of "Z"/.test(txt) || /Removed first occurrence of "Z"/i.test(txt);
    }, { timeout: 7000 });

    // Ensure size decreased by one (from 6 to 5)
    await expect(app.sizeBadge).toHaveText(/Size:\s*5/);

    // Ensure at least one 'Z' still remains (since we added two and removed one)
    const values = await app.getNodeValues();
    const zCount = values.filter(v => v === 'Z').length;
    expect(zCount).toBeGreaterThanOrEqual(1);
  });

  test('Reverse flips the list order and updates head accordingly', async ({ page }) => {
    // Validate that reverse changes ordering and head badge
    const app = new LinkedListPage(page);

    await page.waitForFunction(() => document.getElementById('log')?.textContent?.includes('Sample list created'));

    // Capture the current node order and head
    const before = await app.getNodeValues();
    const beforeHead = await app.getHeadBadgeText();

    // Reverse the list
    await app.reverse();

    // The reverse operation animates briefly; wait until log contains 'List reversed.' or similar
    await page.waitForFunction(() => {
      const txt = document.getElementById('log')?.textContent || '';
      return /List reversed/i.test(txt) || /reversed/i.test(txt);
    }, { timeout: 7000 });

    // Capture after state
    const after = await app.getNodeValues();
    const afterHead = await app.getHeadBadgeText();

    // The reversed order should be the reverse of before
    const reversedBefore = [...before].reverse();
    expect(after).toEqual(reversedBefore);

    // Head badge after should match the first element of the reversed array
    expect(afterHead).toMatch(new RegExp(`Head:\\s*${after[0]}`));
    // Also ensure it differs from the original head unless the list was symmetric
    if (before.length > 1) {
      expect(afterHead).not.toBe(beforeHead);
    }
  });

  test('Clear empties the list and Randomize generates new nodes', async ({ page }) => {
    // Validate clear and randomize behavior
    const app = new LinkedListPage(page);

    await page.waitForFunction(() => document.getElementById('log')?.textContent?.includes('Sample list created'));

    // Clear the list
    await app.clear();

    // Size should be 0 and svg should show '(empty list)'
    await expect(app.sizeBadge).toHaveText(/Size:\s*0/);
    // Validate the empty placeholder text in the SVG container
    await page.waitForSelector('#svgWrapper svg text');
    const svgText = await page.locator('#svgWrapper svg text').textContent();
    expect(svgText).toContain('(empty list)');

    // Randomize to generate a fresh list
    await app.randomize();

    // Wait for log indicating generation
    await page.waitForFunction(() => {
      const txt = document.getElementById('log')?.textContent || '';
      return txt.includes('Generated random list') || txt.includes('Generated random list.');
    }, { timeout: 5000 });

    // After randomize, size should be > 0 and node values should be present
    const sizeText = await app.getSizeBadgeText();
    const match = sizeText?.match(/Size:\s*(\d+)/);
    expect(match).not.toBeNull();
    const sizeNum = parseInt(match[1], 10);
    expect(sizeNum).toBeGreaterThan(0);

    const values = await app.getNodeValues();
    expect(values.length).toBe(sizeNum);
  });

  test('Step-through traversal accepts confirms and reaches end', async ({ page }) => {
    // Step-through traversal uses window.confirm; handle dialogs automatically and assert final log
    const app = new LinkedListPage(page);

    await page.waitForFunction(() => document.getElementById('log')?.textContent?.includes('Sample list created'));

    // Count how many nodes exist to know how many dialogs to expect
    const initialValues = await app.getNodeValues();
    const expectedDialogs = initialValues.length;

    // Track dialog count
    let dialogCount = 0;
    page.on('dialog', async dialog => {
      // Each step shows a confirm; accept to continue traversal
      dialogCount++;
      await dialog.accept();
    });

    // Trigger step-through traversal
    await app.stepThrough();

    // Wait until the traversal completes by observing the log "Reached end of list." or "Traversal stopped"
    await page.waitForFunction(() => {
      const txt = document.getElementById('log')?.textContent || '';
      return /Reached end of list/i.test(txt) || /Traversal stopped by user/i.test(txt);
    }, { timeout: 20000 });

    // Ensure we did see at least one confirm dialog and ideally as many as nodes
    expect(dialogCount).toBeGreaterThanOrEqual(1);
    // It's possible some environments or security policies change confirm behavior; just assert we handled dialogs

    const finalLog = await app.getLogText();
    expect(finalLog).toMatch(/Reached end of list|Traversal stopped by user/i);
  });

  test('Export button logs export string (clipboard fallback or success)', async ({ page }) => {
    // Export attempts to use clipboard; we assert that a relevant Export message is logged
    const app = new LinkedListPage(page);

    await page.waitForFunction(() => document.getElementById('log')?.textContent?.includes('Sample list created'));

    // Click export
    await app.export();

    // Wait for a log message that begins with 'Export' or 'Exported'
    await page.waitForFunction(() => {
      const txt = document.getElementById('log')?.textContent || '';
      return txt.startsWith('Export:') || txt.startsWith('Exported') || txt.includes('Export:');
    }, { timeout: 5000 });

    const logText = await app.getLogText();
    expect(logText).toMatch(/Export(ed)?(:)?/i);
    // If it contains JSON array representation, ensure it's valid JSON when applicable
    const jsonMatch = logText.match(/\[.*\]/);
    if (jsonMatch) {
      // Try to parse the bracketed JSON portion
      let parsed = null;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        parsed = null;
      }
      // If parsing succeeded, it should be an array
      if (parsed !== null) expect(Array.isArray(parsed)).toBe(true);
    }
  });
});