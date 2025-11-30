import { test, expect } from '@playwright/test';

// Test file: 2bde1c72-cd36-11f0-b98e-a1744d282049-heap-min-max.spec.js
// This suite exercises the Heap Visualizer (Min/Max) HTML app.
// It verifies UI behavior, DOM updates, visual highlights, error handling, and basic accessibility cues.

// Page Object to encapsulate common interactions and queries
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde1c72-cd36-11f0-b98e-a1744d282049.html';
  }

  async goto() {
    await this.page.goto(this.url);
    // Ensure initial render completed
    await this.page.waitForSelector('#arrayContainer');
    await this.page.waitForSelector('#svg');
  }

  // Basic element handles
  async minBtn() { return this.page.locator('#minBtn'); }
  async maxBtn() { return this.page.locator('#maxBtn'); }
  async valInput() { return this.page.locator('#valInput'); }
  async insertBtn() { return this.page.locator('#insertBtn'); }
  async peekBtn() { return this.page.locator('#peekBtn'); }
  async popBtn() { return this.page.locator('#popBtn'); }
  async arrInput() { return this.page.locator('#arrInput'); }
  async buildBtn() { return this.page.locator('#buildBtn'); }
  async randBtn() { return this.page.locator('#randBtn'); }
  async clearBtn() { return this.page.locator('#clearBtn'); }
  async stepToggle() { return this.page.locator('#stepToggle'); }
  async speedSelect() { return this.page.locator('#speed'); }
  async sizeEl() { return this.page.locator('#size'); }
  async peekEl() { return this.page.locator('#peek'); }
  async typeLabel() { return this.page.locator('#typeLabel'); }
  async arrayContainer() { return this.page.locator('#arrayContainer'); }
  async svgEl() { return this.page.locator('#svg'); }
  async log() { return this.page.locator('#log'); }

  // Helpers to read state
  async getSize() {
    const text = await this.sizeEl().textContent();
    return Number(text?.trim());
  }
  async getPeekText() {
    return (await this.peekEl().textContent()).trim();
  }
  async getTypeLabel() {
    return (await this.typeLabel().textContent()).trim();
  }

  async getArrayCellCount() {
    // cells are created as .cell.index (but elements have class 'cell index')
    // We can count children with .cell.index or count children in arrayContainer excluding the 'muted' placeholder
    const count = await this.page.evaluate(() => {
      const container = document.getElementById('arrayContainer');
      if (!container) return 0;
      return Array.from(container.children).filter(c => c.classList && c.className.includes('index')).length;
    });
    return count;
  }

  async getSVGNodeCount() {
    return this.page.evaluate(() => {
      const svg = document.getElementById('svg');
      if (!svg) return 0;
      return svg.querySelectorAll('g.node').length;
    });
  }

  async getLogEntriesText() {
    return this.page.evaluate(() => {
      const log = document.getElementById('log');
      if (!log) return [];
      return Array.from(log.querySelectorAll('.entry')).map(e => e.textContent.trim());
    });
  }

  // Actions that trigger operations and wait for the UI to reflect final state
  async waitForSize(expected, options = { timeout: 2000 }) {
    // Poll until #size equals expected (string numeric)
    await this.page.waitForFunction(
      (exp) => {
        const el = document.getElementById('size');
        if (!el) return false;
        return Number(el.textContent.trim()) === exp;
      },
      expected,
      options
    );
  }

  async insertNumber(n) {
    await this.valInput().fill(String(n));
    await this.insertBtn().click();
    // After insert the heap size should increase by 1; we don't know the prior size here in the helper.
    // Caller should use waitForSize to verify final size.
  }

  async pollOnce() {
    await this.popBtn().click();
  }

  async buildFromArrayText(txt) {
    await this.arrInput().fill(txt);
    await this.buildBtn().click();
  }

  async clickRand() {
    await this.randBtn().click();
  }

  async clearHeap() {
    await this.clearBtn().click();
  }

  async toggleToMax() {
    await this.maxBtn().click();
  }

  async toggleStepMode() {
    await this.stepToggle().click();
  }

  async setSpeed(value) {
    await this.speedSelect().selectOption(String(value));
  }
}

// Group tests for clarity
test.describe('Heap Visualizer (Min / Max) - End-to-End', () => {
  // Each test gets a fresh page; capture console errors and page errors per-test
  test.beforeEach(async ({ page }) => {
    // No-op here; per-test setup in each test using HeapPage.goto()
  });

  // Test initial page load and default seeded state
  test('Initial load: renders seeded heap and basic UI elements', async ({ page }) => {
    // Capture console errors and page errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(String(msg.text()));
    });
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err));

    const hp = new HeapPage(page);
    await hp.goto();

    // The app seeds the heap with 7 elements (see inline seed array). Assert size shows 7.
    await hp.waitForSize(7, { timeout: 3000 });
    expect(await hp.getSize()).toBe(7);

    // Array view should show 7 index cells and SVG should have 7 nodes
    const arrCount = await hp.getArrayCellCount();
    const svgCount = await hp.getSVGNodeCount();
    expect(arrCount).toBe(7);
    expect(svgCount).toBe(7);

    // Type label should show 'Min' by default
    expect(await hp.getTypeLabel()).toBe('Min');

    // Peek should show the minimum of the seeded array. The seed array is [15,10,8,12,20,25,5] -> min 5
    // The UI may display '5'
    const peekText = await hp.getPeekText();
    // Accept symbol '—' only if empty, but we expect a number
    expect(peekText).toMatch(/\d+/);

    // Log should contain the seed message at top somewhere
    const logs = await hp.getLogEntriesText();
    const foundSeed = logs.some(s => s.includes('Seeded heap with'));
    expect(foundSeed).toBeTruthy();

    // Ensure no uncaught page errors or console errors were produced during initial load
    // (we assert zero errors to ensure stable load)
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Insert operation: inserting a new minimum updates size and peek', async ({ page }) => {
    // Capture console / page errors
    const consoleErrors1 = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(String(msg.text()));
    });
    const pageErrors1 = [];
    page.on('pageerror', err => pageErrors.push(err));

    const hp1 = new HeapPage(page);
    await hp.goto();

    // Confirm initial size (seeded)
    const initialSize = await hp.getSize();
    expect(initialSize).toBeGreaterThan(0);

    // Insert a small number that should become new root for min-heap (e.g., 3)
    await hp.insertNumber(3);

    // Wait until size increments by 1
    await hp.waitForSize(initialSize + 1, { timeout: 3000 });
    const newSize = await hp.getSize();
    expect(newSize).toBe(initialSize + 1);

    // Peek should update to the new minimum (3)
    // Wait/poll until peek shows '3'
    await page.waitForFunction(() => document.getElementById('peek').textContent.trim() === '3', null, { timeout: 3000 });
    expect(await hp.getPeekText()).toBe('3');

    // The log should contain an "Inserted" entry and compare/swap messages
    const logs1 = await hp.getLogEntriesText();
    const inserted = logs.some(s => s.includes('Inserted 3') || s.includes('Insert 3'));
    expect(inserted).toBeTruthy();

    // Verify visual highlights: after operation completes, array container should reflect inserted value somewhere
    const arrCount1 = await hp.getArrayCellCount();
    expect(arrCount).toBe(newSize);

    // No unexpected runtime errors
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Pop operation: popping root reduces size and updates peek / log', async ({ page }) => {
    const consoleErrors2 = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(String(msg.text()));
    });
    const pageErrors2 = [];
    page.on('pageerror', err => pageErrors.push(err));

    const hp2 = new HeapPage(page);
    await hp.goto();

    // Ensure there is at least one element
    const sizeBefore = await hp.getSize();
    expect(sizeBefore).toBeGreaterThan(0);

    // Click Pop - runOperation will animate; wait for size to drop by 1
    await hp.popOnce?.(); // safe noop if missing
    // Instead use the provided pop action
    await hp.popBtn().click();

    await hp.waitForSize(sizeBefore - 1, { timeout: 3000 });
    expect(await hp.getSize()).toBe(sizeBefore - 1);

    // Log should contain 'Remove root' or 'Remove root ->'
    const logs2 = await hp.getLogEntriesText();
    const hasRemove = logs.some(s => s.toLowerCase().includes('remove root') || s.toLowerCase().includes('remove root ->'));
    expect(hasRemove).toBeTruthy();

    // No runtime page errors
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Build from array: invalid input displays an error log entry and does not crash', async ({ page }) => {
    const consoleErrors3 = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(String(msg.text()));
    });
    const pageErrors3 = [];
    page.on('pageerror', err => pageErrors.push(err));

    const hp3 = new HeapPage(page);
    await hp.goto();

    // Provide an invalid array containing a non-number
    await hp.arrInput().fill('1,2,foo,4');
    await hp.buildBtn().click();

    // The UI should flash an error log entry containing 'Invalid number in array'
    await page.waitForFunction(() => {
      const log1 = document.getElementById('log1');
      if (!log) return false;
      return Array.from(log.querySelectorAll('.entry')).some(e => e.textContent.includes('Invalid number in array'));
    }, null, { timeout: 2000 });

    const logs3 = await hp.getLogEntriesText();
    expect(logs.some(s => s.includes('Invalid number in array'))).toBe(true);

    // Ensure heap size did not change as a result of failed build (it should still be >= 0)
    const size = await hp.getSize();
    expect(typeof size).toBe('number');

    // No runtime errors thrown by the page
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Toggle heap type to Max: clear, build a known array, then toggle and verify peek is max', async ({ page }) => {
    const consoleErrors4 = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(String(msg.text()));
    });
    const pageErrors4 = [];
    page.on('pageerror', err => pageErrors.push(err));

    const hp4 = new HeapPage(page);
    await hp.goto();

    // Clear any seeded data
    await hp.clearHeap();
    // After clear, size should be 0
    await hp.waitForSize(0, { timeout: 2000 });
    expect(await hp.getSize()).toBe(0);

    // Build from a deterministic array [1,2,3,4]
    await hp.arrInput().fill('1,2,3,4');
    await hp.buildBtn().click();

    // Wait until size becomes 4
    await hp.waitForSize(4, { timeout: 3000 });
    expect(await hp.getSize()).toBe(4);

    // Toggle to Max heap
    await hp.toggleToMax();

    // Toggling triggers re-heapify; wait for type label to change and peek to be the maximum (4)
    await page.waitForFunction(() => document.getElementById('typeLabel').textContent.trim() === 'Max', null, { timeout: 2000 });
    expect(await hp.getTypeLabel()).toBe('Max');

    // Peek should be '4'
    await page.waitForFunction(() => document.getElementById('peek').textContent.trim() === '4', null, { timeout: 2000 });
    expect(await hp.getPeekText()).toBe('4');

    // Log should contain toggle entry
    const logs4 = await hp.getLogEntriesText();
    expect(logs.some(s => s.toLowerCase().includes('toggled heap')) || logs.some(s => s.toLowerCase().includes('toggled heap'))).toBeTruthy();

    // No runtime errors
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Random build and step mode toggle: randomize heap and toggle step mode', async ({ page }) => {
    const consoleErrors5 = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(String(msg.text()));
    });
    const pageErrors5 = [];
    page.on('pageerror', err => pageErrors.push(err));

    const hp5 = new HeapPage(page);
    await hp.goto();

    // Ensure step mode is On initially (button text contains 'Step Mode: On')
    expect(await hp.stepToggle().textContent()).toContain('Step Mode: On');

    // Toggle step mode off and verify text and class change
    await hp.toggleStepMode();
    await page.waitForFunction(() => document.getElementById('stepToggle').textContent.includes('Off'), null, { timeout: 1000 });
    expect(await hp.stepToggle().textContent()).toContain('Step Mode: Off');

    // Toggle back on
    await hp.toggleStepMode();
    await page.waitForFunction(() => document.getElementById('stepToggle').textContent.includes('On'), null, { timeout: 1000 });
    expect(await hp.stepToggle().textContent()).toContain('Step Mode: On');

    // Use Random to generate an array and build heap
    await hp.clickRand();

    // Random will populate arrInput and then runOperation heapifyFromArray -> wait for size > 0
    await page.waitForFunction(() => Number(document.getElementById('size').textContent.trim()) > 0, null, { timeout: 3000 });
    const size1 = await hp.getSize();
    expect(size).toBeGreaterThan(0);

    // arrInput should be non-empty and log should contain 'Random heap built'
    const arrTxt = await hp.arrInput().inputValue();
    expect(arrTxt.length).toBeGreaterThan(0);
    const logs5 = await hp.getLogEntriesText();
    expect(logs.some(s => s.toLowerCase().includes('random heap built'))).toBeTruthy();

    // No runtime errors
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Speed control exists and can be changed; no crash when performing fast operation', async ({ page }) => {
    const consoleErrors6 = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(String(msg.text()));
    });
    const pageErrors6 = [];
    page.on('pageerror', err => pageErrors.push(err));

    const hp6 = new HeapPage(page);
    await hp.goto();

    // Set speed to Fast (120)
    await hp.setSpeed(120);
    // Insert a number and ensure operation completes without errors and size increments
    const prev = await hp.getSize();
    await hp.insertNumber(999);
    await hp.waitForSize(prev + 1, { timeout: 3000 });
    expect(await hp.getSize()).toBe(prev + 1);

    // Look for an inserted log entry
    const logs6 = await hp.getLogEntriesText();
    expect(logs.some(s => s.includes('Inserted') || s.includes('Insert'))).toBeTruthy();

    // No runtime errors
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});