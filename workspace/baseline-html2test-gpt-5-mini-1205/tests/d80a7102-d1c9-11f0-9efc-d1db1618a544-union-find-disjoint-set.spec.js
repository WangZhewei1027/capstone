import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80a7102-d1c9-11f0-9efc-d1db1618a544.html';

// Page object encapsulating interactions and queries for the Union-Find demo
class UnionFindPage {
  constructor(page) {
    this.page = page;
    this.pageObj = page;
  }

  // Wait for the main UI to be ready
  async waitForReady() {
    await this.page.waitForSelector('h1:has-text("Union-Find (Disjoint Set) — Interactive Demo")');
    // wait until svg nodes are rendered (they are created during init)
    await this.page.waitForSelector('#svgCanvas g[data-index="0"]', { timeout: 2000 });
  }

  // Click initialization button with given size
  async initialize(size) {
    await this.page.fill('#initN', String(size));
    await this.page.click('#initBtn');
    // wait for render to finish: componentsCount updates
    await this.page.waitForFunction((s) => {
      const el = document.getElementById('componentsCount');
      return el && el.textContent && el.textContent.indexOf(`${s} component`) === 0;
    }, size);
  }

  // Get the components count text
  async getComponentsText() {
    return (await this.page.locator('#componentsCount').innerText()).trim();
  }

  // Click an SVG node by its index
  async clickNode(index) {
    await this.page.waitForSelector(`#svgCanvas g[data-index="${index}"]`);
    await this.page.click(`#svgCanvas g[data-index="${index}"]`);
  }

  // Read parent array as displayed in the parentTable UI
  async getParentArray() {
    return await this.page.evaluate(() => {
      const container = document.getElementById('parentTable');
      if (!container) return [];
      // The first child is a header div that contains per-index divs with parent values
      const header = container.firstElementChild;
      if (!header) return [];
      const children = Array.from(header.children);
      return children.map((el) => {
        const t = el.textContent.trim();
        const num = parseInt(t, 10);
        return isNaN(num) ? t : num;
      });
    });
  }

  // Read rank array as displayed in the rankTable UI
  async getRankArray() {
    return await this.page.evaluate(() => {
      const container = document.getElementById('rankTable');
      if (!container) return [];
      const header = container.firstElementChild;
      if (!header) return [];
      const children = Array.from(header.children);
      return children.map((el) => {
        const t = el.textContent.trim();
        const num = parseInt(t, 10);
        return isNaN(num) ? t : num;
      });
    });
  }

  // Get value of nodeA and nodeB inputs
  async getNodeA() {
    return await this.page.inputValue('#nodeA');
  }
  async getNodeB() {
    return await this.page.inputValue('#nodeB');
  }

  // Click union/manual or manual find buttons
  async clickUnionManual() {
    await this.page.click('#unionManual');
  }
  async clickFindManual() {
    await this.page.click('#findManual');
  }

  // Toggle a checkbox by id to a target boolean state
  async setCheckboxState(selector, checked) {
    const isChecked = await this.page.isChecked(selector);
    if (isChecked !== checked) await this.page.click(selector);
  }

  // Click reset
  async clickReset() {
    await this.page.click('#resetBtn');
  }

  // Click connect line (quick action) - it uses unions; ensure animate unchecked to avoid long animations
  async clickConnectLine() {
    await this.page.click('#connectLine');
    // wait until componentsCount updates to 1 (connected)
    await this.page.waitForFunction(() => {
      const el = document.getElementById('componentsCount');
      return el && el.textContent && el.textContent.indexOf('1 component') === 0;
    }, null);
  }

  // Click random select button
  async clickRandomSelect() {
    await this.page.click('#randomSelectBtn');
  }

  // Get text content of the log box
  async getLogEntries() {
    return await this.page.evaluate(() => {
      const log = document.getElementById('log');
      if (!log) return [];
      return Array.from(log.children).map(div => div.textContent.trim());
    });
  }

  // Fetch whether a specific svg node rect has the 'nodeSelected' class (visual selection)
  async isNodeSelected(index) {
    return await this.page.evaluate((i) => {
      const g = document.querySelector(`#svgCanvas g[data-index="${i}"]`);
      if (!g) return false;
      const rect = g.querySelector('rect');
      if (!rect) return false;
      return rect.classList.contains('nodeSelected');
    }, index);
  }
}

test.describe('Union-Find (Disjoint Set) Interactive Demo', () => {
  // Collect console messages and page errors for each test
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // capture console events
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    // capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // helpful debug output for failing tests (kept as comments)
    // console.log('Console messages', consoleMessages);
    // console.log('Page errors', pageErrors);
  });

  test('loads page and shows default initial state', async ({ page }) => {
    const uf = new UnionFindPage(page);
    // Ensure page loaded and nodes rendered
    await uf.waitForReady();

    // The default initN is 10, so components count should indicate 10 components
    const comps = await uf.getComponentsText();
    expect(comps).toMatch(/^10 component/);

    // Parent array should be identity [0,1,2,...,9]
    const parents = await uf.getParentArray();
    expect(parents.length).toBe(10);
    for (let i = 0; i < 10; i++) expect(parents[i]).toBe(i);

    // Rank array should be zeros
    const ranks = await uf.getRankArray();
    expect(ranks.length).toBe(10);
    for (let r of ranks) expect(r).toBe(0);

    // There should be no uncaught page errors
    expect(pageErrors).toEqual([]);
    // No console.error messages
    const consoleErrorMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrorMsgs.length).toBe(0);
  });

  test('initialization control changes universe size and updates UI', async ({ page }) => {
    const uf = new UnionFindPage(page);
    await uf.waitForReady();

    // Initialize with a smaller size and check UI updates accordingly
    await uf.initialize(5);
    const comps = await uf.getComponentsText();
    expect(comps).toMatch(/^5 component/);

    const parents = await uf.getParentArray();
    expect(parents.length).toBe(5);
    for (let i = 0; i < 5; i++) expect(parents[i]).toBe(i);
  });

  test('clicking nodes toggles selection and synchronizes inputs', async ({ page }) => {
    const uf = new UnionFindPage(page);
    await uf.waitForReady();

    // Click node 0 and check Node A input is updated
    await uf.clickNode(0);
    const nodeA = await uf.getNodeA();
    expect(nodeA).toBe('0');
    // Visual selection should be present
    expect(await uf.isNodeSelected(0)).toBe(true);

    // Click node 1 to select second node
    await uf.clickNode(1);
    const nodeB = await uf.getNodeB();
    expect(nodeB).toBe('1');
    expect(await uf.isNodeSelected(1)).toBe(true);

    // Clicking the first node again should unselect it
    await uf.clickNode(0);
    expect(await uf.isNodeSelected(0)).toBe(false);

    // There should still be no page errors from these interactions
    expect(pageErrors).toEqual([]);
  });

  test('manual union updates parent table and reduces component count', async ({ page }) => {
    const uf = new UnionFindPage(page);
    await uf.waitForReady();

    // Ensure animations are OFF for deterministic immediate changes
    await uf.setCheckboxState('#animate', false);

    // Set Node A = 0, Node B = 1 and perform manual union
    await page.fill('#nodeA', '0');
    await page.fill('#nodeB', '1');
    await uf.clickUnionManual();

    // Allow a small tick for DOM updates
    await page.waitForTimeout(50);

    const parents = await uf.getParentArray();
    // Union(0,1) in the default heuristic should attach 1 -> 0
    expect(parents[1]).toBe(0);

    // Components count should be reduced by 1 (from 10 -> 9)
    const comps = await uf.getComponentsText();
    expect(comps).toMatch(/^9 component/);

    // Log should have an entry for union
    const logs = await uf.getLogEntries();
    const unionLog = logs.find(l => l.includes('Union(0, 1)') || l.includes('Union(0,1)') || l.includes('attached'));
    expect(unionLog).toBeTruthy();
  });

  test('connect line quick action connects all nodes and find with path compression compresses paths', async ({ page }) => {
    const uf = new UnionFindPage(page);
    await uf.waitForReady();

    // Turn animation off to make unions immediate; ensure path compression is ON
    await uf.setCheckboxState('#animate', false);
    await uf.setCheckboxState('#pathCompress', true);

    // Click connect line: this will union i with i+1 for all i
    await uf.clickConnectLine();

    // All nodes should now be in 1 component
    const comps = await uf.getComponentsText();
    expect(comps).toMatch(/^1 component/);

    // Initially (without find compression) parents may be a chain; invoke find on a deep node to trigger compression
    // Set Node A to a deeper node, e.g., last index
    const parentsBefore = await uf.getParentArray();
    // pick node n-1
    const lastIdx = parentsBefore.length - 1;
    await page.fill('#nodeA', String(lastIdx));

    // Call find manual - since pathCompress checked and animate is false, compression will be immediate
    await uf.clickFindManual();

    // Allow a small tick
    await page.waitForTimeout(50);

    // After compression, all nodes should point directly to the root (likely 0)
    const parentsAfter = await uf.getParentArray();
    const root = parentsAfter[0]; // root should be a self parent
    // root should be 0 because connecting line used union(i,i+1) and default attaches i+1 -> i
    expect(root).toBe(0);
    // every node's parent should be 0 after compression
    for (let i = 0; i < parentsAfter.length; i++) {
      // root's parent is itself (0)
      expect(parentsAfter[i]).toBe(0);
    }

    // The log should reflect a Find operation
    const logs = await uf.getLogEntries();
    const findLog = logs.find(l => l.includes(`Find(${lastIdx})`));
    expect(findLog).toBeTruthy();
  });

  test('random select picks two nodes and updates selection visuals', async ({ page }) => {
    const uf = new UnionFindPage(page);
    await uf.waitForReady();

    // Click Random Select button
    await uf.clickRandomSelect();

    // After random select, nodeA and nodeB inputs should reflect selected indices
    const a = await uf.getNodeA();
    const b = await uf.getNodeB();
    // They should be numeric strings and not equal to empty
    expect(a).toMatch(/^\d+$/);
    expect(b).toMatch(/^\d+$/);

    // The corresponding nodes should have 'nodeSelected' class on rect
    const ai = Number(a);
    const bi = Number(b);
    expect(await uf.isNodeSelected(ai)).toBe(true);
    expect(await uf.isNodeSelected(bi)).toBe(true);
  });

  test('reset restores separate sets and UI reflects identity parents', async ({ page }) => {
    const uf = new UnionFindPage(page);
    await uf.waitForReady();

    // Make some unions first (disable animation to be immediate)
    await uf.setCheckboxState('#animate', false);
    // union 0 and 1 manually
    await page.fill('#nodeA', '0');
    await page.fill('#nodeB', '1');
    await uf.clickUnionManual();
    await page.waitForTimeout(50);
    let comps = await uf.getComponentsText();
    expect(comps).toMatch(/^9 component/);

    // Click reset and verify identity parents and components count
    await uf.clickReset();
    await page.waitForTimeout(50);
    const parents = await uf.getParentArray();
    for (let i = 0; i < parents.length; i++) expect(parents[i]).toBe(i);

    comps = await uf.getComponentsText();
    expect(comps).toMatch(/^10 component/);
  });

  test('shuffle quick action modifies parents and logs action', async ({ page }) => {
    const uf = new UnionFindPage(page);
    await uf.waitForReady();

    await uf.setCheckboxState('#animate', false);
    // Click shuffle, which performs random unions without animation
    await page.click('#shuffleBtn');
    // Wait a little for rerender
    await page.waitForTimeout(80);

    // Parent array should still be of length n
    const parents = await uf.getParentArray();
    expect(parents.length).toBeGreaterThan(0);

    // Log should mention 'Shuffled'
    const logs = await uf.getLogEntries();
    const found = logs.find(l => l.toLowerCase().includes('shuffled'));
    expect(found).toBeTruthy();
  });

  test('application does not emit console.error or uncaught exceptions during standard flows', async ({ page }) => {
    const uf = new UnionFindPage(page);
    await uf.waitForReady();

    // Perform a few interactions to exercise the app
    await uf.setCheckboxState('#animate', false);
    await uf.clickNode(0);
    await uf.clickNode(1);
    await page.fill('#nodeA', '2');
    await page.fill('#nodeB', '3');
    await uf.clickUnionManual();
    await page.waitForTimeout(20);
    await uf.clickRandomSelect();
    await page.waitForTimeout(20);
    await uf.clickReset();
    await page.waitForTimeout(20);

    // Verify no uncaught page errors captured
    expect(pageErrors).toEqual([]);

    // Verify there are no console messages of type 'error'
    const errorMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorMsgs.length).toBe(0);
  });
});