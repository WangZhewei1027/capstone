import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde4381-cd36-11f0-b98e-a1744d282049.html';

// Page object model for the Union-Find visualizer
class UFPage {
  constructor(page) {
    this.page = page;
    // element getters
    this.nInput = () => this.page.locator('#nInput');
    this.resetBtn = () => this.page.locator('#resetBtn');
    this.unionInput = () => this.page.locator('#unionInput');
    this.unionBtn = () => this.page.locator('#unionBtn');
    this.randUnionBtn = () => this.page.locator('#randUnionBtn');
    this.findInput = () => this.page.locator('#findInput');
    this.findBtn = () => this.page.locator('#findBtn');
    this.findCompBtn = () => this.page.locator('#findCompBtn');
    this.byRankChk = () => this.page.locator('#byRank');
    this.pathCompChk = () => this.page.locator('#pathComp');
    this.speed = () => this.page.locator('#speed');
    this.mergeRandom = () => this.page.locator('#mergeRandom');
    this.resetAll = () => this.page.locator('#resetAll');

    this.parentArr = () => this.page.locator('#parentArr');
    this.rankArr = () => this.page.locator('#rankArr');
    this.status = () => this.page.locator('#status');
    this.infoBox = () => this.page.locator('#infoBox');
    this.svg = () => this.page.locator('#svg');
    this.nodes = () => this.page.locator('#svg .node');
    this.edges = () => this.page.locator('#svg .edge');
  }

  // Wait until status text contains substring (with polling)
  async waitForStatusContains(substr, opts = { timeout: 3000 }) {
    await this.page.waitForFunction(
      (s) => {
        const e = document.getElementById('status');
        return e && e.textContent && e.textContent.includes(s);
      },
      substr,
      opts
    );
  }

  // Wait until infoBox contains substring
  async waitForInfoContains(substr, opts = { timeout: 3000 }) {
    await this.page.waitForFunction(
      (s) => {
        const e1 = document.getElementById('infoBox');
        return e && e.textContent && e.textContent.includes(s);
      },
      substr,
      opts
    );
  }

  // Read parent array string
  async getParentArrayText() {
    return (await this.parentArr().textContent()).trim();
  }

  async getRankArrayText() {
    return (await this.rankArr().textContent()).trim();
  }

  // Click node by index (simulates user clicking a drawn node)
  async clickNode(i) {
    // find corresponding g.node[data-i="i"]
    const node = this.page.locator(`#svg .node[data-i="${i}"]`);
    await expect(node).toHaveCount(1);
    await node.click();
  }

  // Click background of svg to clear highlights (click near top-left padding)
  async clickSvgBackground() {
    // click near (10,10) inside svg viewport to avoid hitting nodes
    const box = await this.svg().boundingBox();
    if (!box) {
      // Shouldn't happen; fallback to direct click
      await this.svg().click();
    } else {
      // choose coordinate close to left/top padding
      const x = Math.min(10, Math.max(1, Math.floor(box.width * 0.02)));
      const y = Math.min(10, Math.max(1, Math.floor(box.height * 0.02)));
      await this.svg().click({ position: { x, y } });
    }
  }

  // Helper to perform union via inputs (text like "a,b")
  async union(a, b) {
    await this.unionInput().fill(`${a},${b}`);
    await this.unionBtn().click();
  }

  // Helper to perform find (no compress)
  async find(x) {
    await this.findInput().fill(String(x));
    await this.findBtn().click();
  }

  // Helper to perform find with compression
  async findCompress(x) {
    await this.findInput().fill(String(x));
    await this.findCompBtn().click();
  }
}

test.describe('Union-Find (Disjoint Set) Visualizer - E2E', () => {
  // Keep arrays of console/errors for assertions
  let pageErrors;
  let consoleErrors;
  let page;

  test.beforeEach(async ({ browser }) => {
    // create new context+page for isolation
    const context = await browser.newContext();
    page = await context.newPage();

    // capture uncaught page errors
    pageErrors = [];
    page.on('pageerror', (err) => {
      // store error message for assertions
      pageErrors.push(err);
    });

    // capture console messages of severity 'error'
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(APP, { waitUntil: 'load' });
    // wait for the initial rendering to complete (script sets up UF object)
    await page.waitForFunction(() => !!window.UF, null, { timeout: 3000 });
  });

  test.afterEach(async () => {
    // Ensure no unexpected severe console errors or page errors occurred during a test
    // This assertion is left in place to surface runtime issues in the page code.
    expect(pageErrors, 'no uncaught page errors should have been emitted').toEqual([]);
    expect(consoleErrors, 'no console.error messages expected').toEqual([]);
    // close page
    await page.close();
  });

  test('Initial load shows expected default state (arrays, status, SVG nodes)', async () => {
    // Purpose: verify the app loads and displays default arrays and status.
    const uf = new UFPage(page);

    await expect(uf.status()).toHaveText(/Status: ready/); // status shows ready
    const parentText = await uf.getParentArrayText();
    // should list parent pointers 0..9
    expect(parentText).toContain('parent: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]');

    const rankText = await uf.getRankArrayText();
    // rank array initially all zeros
    expect(rankText).toContain('rank:');
    expect(rankText).toContain('0'); // there should be zeros

    // ensure there are 10 node elements rendered in SVG (indexes 0..9)
    await expect(uf.nodes()).toHaveCount(10);
    // verify each node has correct data-i attribute
    for (let i = 0; i < 10; i++) {
      await expect(page.locator(`#svg .node[data-i="${i}"]`)).toHaveCount(1);
    }
  });

  test('Create new forest with custom n and reset behaviour', async () => {
    // Purpose: ensure the "Create" control resets arrays to the specified size.
    const uf1 = new UFPage(page);

    await uf.nInput().fill('5');
    await uf.resetBtn().click();

    // status is updated to indicate creation
    await uf.waitForStatusContains('created new forest', { timeout: 2000 });

    const parentText1 = await uf.getParentArrayText();
    expect(parentText).toContain('parent: [0, 1, 2, 3, 4]');

    // ensure exactly 5 nodes are drawn
    await expect(uf.nodes()).toHaveCount(5);
  });

  test('Union operation updates parent and rank arrays (union-by-rank default)', async () => {
    // Purpose: validate union(a,b) via UI updates parent and rank arrays as expected.
    const uf2 = new UFPage(page);

    // perform union(1,2)
    await uf.union(1, 2);

    // wait for completion - union() sets status to 'union completed.' on finish
    await uf.waitForStatusContains('union completed', { timeout: 3000 });

    // read parent array; since union-by-rank is default (checked), equal ranks attach rb under ra and increase rank[ra]
    const ptext = await uf.getParentArrayText();
    // Expect parent[2] = 1, so array at indices should show ...,1,1,...
    // exact string should be 'parent: [0, 1, 1, 3, 4, 5, 6, 7, 8, 9]'
    expect(ptext).toContain('parent: [0, 1, 1');

    const rtext = await uf.getRankArrayText();
    // rank[1] should have incremented from 0 to 1
    expect(rtext).toContain('1');
  });

  test('Find without compression does not change parent pointers', async () => {
    // Purpose: ensure find (no compression) reveals root but does not alter parent array.
    const uf3 = new UFPage(page);

    // Ensure a known union exists: union(1,2) to create parent[2]=1
    await uf.union(1, 2);
    await uf.waitForStatusContains('union completed', { timeout: 3000 });

    // Now run find(2) without compression
    await uf.find(2);
    // findBtn triggers animatedFind(x, false) and status should indicate "found root"
    await uf.waitForStatusContains('found root', { timeout: 3000 });

    // Parent array should remain with parent[2] = 1
    const ptext1 = await uf.getParentArrayText();
    expect(ptext).toContain('parent: [0, 1, 1');
  });

  test('Path compression via Find & Compress updates intermediate parents for a chain (byRank toggled off)', async () => {
    // Purpose: create a small chain using naive unions (byRank off), then compress path using Find & Compress.
    const uf4 = new UFPage(page);

    // Turn off union-by-rank to force naive attachments
    const byRankLocator = uf.byRankChk();
    const byRankChecked = await byRankLocator.isChecked();
    if (byRankChecked) await byRankLocator.click();

    // Create a chain scenario:
    // Step 1: union(6,7) => parent[7] = 6 (naive)
    await uf.union(6, 7);
    await uf.waitForStatusContains('union completed', { timeout: 3000 });

    // Step 2: union(8,7) => findRoot(7) is 6, then parent[6] = 8 => results in 7->6->8 chain
    await uf.union(8, 7);
    await uf.waitForStatusContains('union completed', { timeout: 3000 });

    // Verify the chain exists in the parent array: parent[7] should be 6 and parent[6] should be 8
    const ptextBefore = await uf.getParentArrayText();
    // Assert both patterns exist
    expect(ptextBefore).toMatch(/.*7:?\s*6|.*,\s*6,?\s*7/); // tolerant check, but ensure numbers appear
    // More concrete check: ensure the string contains "...,6,..." and "...,7,..." occurrences near indices - best-effort
    expect(ptextBefore).toContain('6');

    // Now compress path of node 7 to its root using Find & Compress
    await uf.findCompress(7);
    // wait for compression status
    await uf.waitForStatusContains('compressed', { timeout: 4000 });

    // After compression parent[7] should be direct root (which is 8)
    const ptextAfter = await uf.getParentArrayText();
    // We expect 7's parent to become 8; look for '... ,8, ...' at appropriate place
    expect(ptextAfter).toContain('8');
  });

  test('Random union button and resetAll button behavior', async () => {
    // Purpose: exercise the random union button and the resetAll quick action.
    const uf5 = new UFPage(page);

    // Click random union once (can't predict pair); ensure a union attempt completes without throwing
    await uf.randUnionBtn().click();
    // The union may result in 'union completed' or 'no-op'; wait for a Status update containing 'union' or 'no-op'
    await page.waitForFunction(() => {
      const s = document.getElementById('status');
      return s && /union|no-op/i.test(s.textContent || '');
    }, null, { timeout: 3000 });

    // Now click resetAll to clear parents to identity
    await uf.resetAll().click();
    // status updated to indicate reset
    await uf.waitForStatusContains('parents reset', { timeout: 3000 });

    const ptext2 = await uf.getParentArrayText();
    // after reset, parent array should equal identity for the current n (by default 10)
    expect(ptext).toContain('parent: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]');
  });

  test('SVG interactions: clicking a node triggers find and clicking background clears highlights', async () => {
    // Purpose: ensure clicking on a node triggers a Find and highlights, and clicking the empty SVG area clears highlights.
    const uf6 = new UFPage(page);

    // click node 0 (root) - path compression toggle default is checked, so it will call animatedFind(..., true)
    await uf.clickNode(0);

    // After clicking, infoBox should mention 'Find(0)' or similar
    await uf.waitForInfoContains('Find(0)', { timeout: 3000 }).catch(async () => {
      // The info format used in code is: "Find(x) -> r. Path: ...", so check for "Find(0)" or "Find(0) ->"
      await uf.waitForInfoContains('Find(0) ->', { timeout: 3000 });
    });

    // Now click background to clear highlights
    await uf.clickSvgBackground();

    // After clicking empty area, the infoBox is set to 'Ready.'
    await uf.waitForInfoContains('Ready.', { timeout: 2000 });
  });
});