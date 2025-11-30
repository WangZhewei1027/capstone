import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87b198-cd35-11f0-9e7b-93b903303299.html';

// Page object helpers for the Knapsack demo app
class KnapsackPage {
  constructor(page) {
    this.page = page;
    this.selectors = {
      header: 'h1',
      lead: 'p.lead',
      itemName: '#itemName',
      itemValue: '#itemValue',
      itemWeight: '#itemWeight',
      addItem: '#addItem',
      randomItems: '#randomItems',
      clearItems: '#clearItems',
      capacity: '#capacity',
      runDP: '#runDP',
      runFractional: '#runFractional',
      runBrute: '#runBrute',
      warnings: '#warnings',
      itemsTbody: '#itemsTable tbody',
      resultArea: '#resultArea',
      visual: '#visual',
      dpViz: '#dpViz',
      runtime: '#runtime'
    };
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getHeaderText() {
    return this.page.textContent(this.selectors.header);
  }

  async getLeadText() {
    return this.page.textContent(this.selectors.lead);
  }

  async getItemsCount() {
    return this.page.locator(this.selectors.itemsTbody).locator('tr').count();
  }

  async getItemsText() {
    return this.page.textContent(this.selectors.itemsTbody);
  }

  async fillNewItem(name, value, weight) {
    await this.page.fill(this.selectors.itemName, name);
    await this.page.fill(this.selectors.itemValue, String(value));
    await this.page.fill(this.selectors.itemWeight, String(weight));
  }

  async clickAddItem() {
    await this.page.click(this.selectors.addItem);
  }

  async clickRandomItems() {
    await this.page.click(this.selectors.randomItems);
  }

  async clickClearItems() {
    await this.page.click(this.selectors.clearItems);
  }

  async setCapacity(val) {
    await this.page.fill(this.selectors.capacity, String(val));
  }

  async clickRunFractional() {
    await this.page.click(this.selectors.runFractional);
  }

  async clickRunDP() {
    await this.page.click(this.selectors.runDP);
  }

  async clickRunBrute() {
    await this.page.click(this.selectors.runBrute);
  }

  async getWarningsText() {
    return this.page.textContent(this.selectors.warnings);
  }

  async getResultHtml() {
    return this.page.innerHTML(this.selectors.resultArea);
  }

  async isDpVizVisible() {
    const el = this.page.locator(this.selectors.dpViz);
    return el.isVisible();
  }

  async getRuntimeText() {
    return this.page.textContent(this.selectors.runtime);
  }

  async visualHasBars() {
    const bars = this.page.locator(`${this.selectors.visual} .bar`);
    return bars.count();
  }
}

test.describe('Knapsack Problem Demo - end-to-end', () => {
  let page;
  let knapsack;
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    knapsack = new KnapsackPage(page);

    // Capture console messages and page errors for every test
    consoleMessages = [];
    pageErrors = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await knapsack.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initial page load shows header, lead, default items and capacity', async () => {
    // Verify header and lead texts are present
    await expect(knapsack.getHeaderText()).resolves.toContain('Knapsack Problem Demo');
    await expect(knapsack.getLeadText()).resolves.toContain('Interactive playground');

    // The initial sample adds 5 items in the inline script
    const itemCount = await knapsack.getItemsCount();
    expect(itemCount).toBeGreaterThanOrEqual(5);

    // Capacity should be preset to 25 per initial sample
    const cap = await page.getAttribute('#capacity', 'value');
    expect(Number(cap)).toBe(25);

    // Result area initial message
    const resultHtml = await knapsack.getResultHtml();
    expect(resultHtml).toContain('No solution computed yet');

    // Ensure no uncaught page errors were emitted during initial load
    expect(pageErrors.length).toBe(0);
    // Ensure no console errors were emitted
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Add a valid item updates the items table and inputs are normalized', async () => {
    // Fill and add a new item called 'X'
    await knapsack.fillNewItem('X', 30.7, 10.2);
    await knapsack.clickAddItem();

    // New item should be present in the table
    const itemsText = await knapsack.getItemsText();
    expect(itemsText).toContain('X');
    expect(itemsText).toContain('31'); // value rounded
    expect(itemsText).toContain('10'); // weight rounded

    // Items count increased
    const count = await knapsack.getItemsCount();
    expect(count).toBeGreaterThanOrEqual(6);

    // No page errors from this action
    expect(pageErrors.length).toBe(0);
  });

  test('Click "Generate random 6" produces 6 items and updates capacity', async () => {
    // Click random generator
    await knapsack.clickRandomItems();

    // Should have exactly 6 rows
    const count1 = await knapsack.getItemsCount();
    expect(count).toBe(6);

    // Capacity should be a number between 10 and 39 per generator code
    const capVal = Number(await page.getAttribute('#capacity', 'value'));
    expect(capVal).toBeGreaterThanOrEqual(10);
    expect(capVal).toBeLessThanOrEqual(39);

    // No warnings for 6 items
    const warn = await knapsack.getWarningsText();
    expect(warn.trim()).toBe('');

    // No console errors
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
  });

  test('Clear items empties the table and updates result area', async () => {
    // Precondition: ensure there are items
    const initialCount = await knapsack.getItemsCount();
    expect(initialCount).toBeGreaterThan(0);

    // Click clear
    await knapsack.clickClearItems();

    // Table should be empty
    const count2 = await knapsack.getItemsCount();
    expect(count).toBe(0);

    // result area shows "Cleared items."
    const html = await knapsack.getResultHtml();
    expect(html).toContain('Cleared items.');

    // dpViz hidden
    const visible = await knapsack.isDpVizVisible();
    expect(visible).toBe(false);
  });

  test('Running Fractional algorithm produces a result and visual bars', async () => {
    // Ensure sample items exist (initial sample re-populated on load)
    const count3 = await knapsack.getItemsCount();
    expect(count).toBeGreaterThanOrEqual(5);

    // Intercept any dialogs that might appear unexpectedly
    page.once('dialog', async dialog => {
      // If an alert pops, fail the test with its message (shouldn't happen here)
      await dialog.dismiss();
      throw new Error('Unexpected dialog: ' + dialog.message());
    });

    // Run Fractional
    await knapsack.clickRunFractional();

    // Expect result area to show 'Fractional knapsack' title
    const html1 = await knapsack.getResultHtml();
    expect(html).toContain('Fractional knapsack (greedy)');

    // Runtime element should indicate Fractional
    const runtime = await knapsack.getRuntimeText();
    expect(runtime).toContain('Fractional');

    // Visual bar elements should exist for selected items
    const barsCount = await knapsack.visualHasBars();
    expect(Number(barsCount)).toBeGreaterThanOrEqual(1);

    // No page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Running 0/1 DP produces exact result and displays DP visualization', async () => {
    // There are initial sample items and capacity = 25 which is small -> smallViz true
    await knapsack.clickRunDP();

    // Result area should include 0/1 knapsack title
    const html2 = await knapsack.getResultHtml();
    expect(html).toContain('0/1 knapsack (dynamic programming)');

    // Runtime should indicate DP
    const runtime1 = await knapsack.getRuntimeText();
    expect(runtime).toContain('0/1 DP');

    // dpViz should be visible for small instances
    const dpVisible = await knapsack.isDpVizVisible();
    expect(dpVisible).toBe(true);

    // The dp table HTML should include table markup
    const dpHtml = await page.innerHTML('#dpViz');
    expect(dpHtml).toContain('<table');

    // No console errors occurred
    const consoleErrs = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrs.length).toBe(0);
  });

  test('Running Brute-force on small set returns exact solution', async () => {
    // Ensure small number of items (initial sample fits)
    const itemCount1 = await knapsack.getItemsCount();
    expect(itemCount).toBeGreaterThanOrEqual(5);
    expect(itemCount).toBeLessThanOrEqual(20);

    // Run brute-force
    await knapsack.clickRunBrute();

    // Result area should include 'Brute-force exact'
    const html3 = await knapsack.getResultHtml();
    expect(html).toContain('Brute-force exact');

    // Runtime should indicate Brute-force
    const runtime2 = await knapsack.getRuntimeText();
    expect(runtime).toContain('Brute-force');

    // Ensure no page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Adding invalid item (weight <= 0) triggers alert and does not add item', async () => {
    // Listen for the alert dialog from invalid weight
    const dialogPromise = new Promise(resolve => {
      page.once('dialog', async dialog => {
        const msg = dialog.message();
        await dialog.accept();
        resolve(msg);
      });
    });

    // Fill invalid weight and click add
    await knapsack.fillNewItem('Bad', 5, 0); // weight = 0 -> should alert
    await knapsack.clickAddItem();

    const message = await dialogPromise;
    expect(message).toContain('Weight must be > 0');

    // Ensure item was not added
    const itemsText1 = await knapsack.getItemsText();
    expect(itemsText).not.toContain('Bad');
  });

  test('Brute-force is disabled when items > 20 and shows appropriate alert', async () => {
    // First clear items to start fresh
    await knapsack.clickClearItems();

    // Add 21 items programmatically by clicking the add button repeatedly
    for (let i = 0; i < 21; i++) {
      await knapsack.fillNewItem('X' + i, 1, 1);
      await knapsack.clickAddItem();
    }

    // Confirm we have >20 items
    const count4 = await knapsack.getItemsCount();
    expect(count).toBeGreaterThan(20);

    // Expect an alert when attempting brute-force
    const dialogPromise1 = new Promise(resolve => {
      page.once('dialog', async dialog => {
        const msg1 = dialog.message();
        await dialog.accept();
        resolve(msg);
      });
    });

    await knapsack.clickRunBrute();
    const message1 = await dialogPromise;
    expect(message).toContain('Brute-force disabled for more than 20 items.');
  });

  test('Running DP with excessively large capacity triggers error alert', async () => {
    // Set capacity to a value greater than 20000 so DP throws
    await knapsack.setCapacity('30000');

    // Expect an alert with the DP too large message
    const dialogPromise2 = new Promise(resolve => {
      page.once('dialog', async dialog => {
        const msg2 = dialog.message();
        await dialog.accept();
        resolve(msg);
      });
    });

    await knapsack.clickRunDP();
    const message2 = await dialogPromise;
    expect(message).toContain('DP would be too large');

    // Confirm dpViz did not become visible
    const dpVisible1 = await knapsack.isDpVizVisible();
    expect(dpVisible).toBe(false);
  });

  test('Observe console and page error streams remain free of critical errors', async () => {
    // Perform a couple of interactions to exercise code paths
    await knapsack.clickRunFractional();
    await knapsack.clickRunDP();
    await knapsack.clickRunBrute();

    // After interactions, ensure no pageerror events (uncaught exceptions)
    expect(pageErrors.length).toBe(0);

    // No console messages of type error
    const consoleErrs1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrs.length).toBe(0);

    // If any console warnings exist that's fine; we only assert no console.error occurred
  });
});