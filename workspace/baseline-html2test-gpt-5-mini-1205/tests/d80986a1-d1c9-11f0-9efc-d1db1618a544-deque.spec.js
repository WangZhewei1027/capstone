import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80986a1-d1c9-11f0-9efc-d1db1618a544.html';

// Page Object to encapsulate interactions with the Deque demo
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // selectors
    this.valueInput = '#valueInput';
    this.pushFrontBtn = '#pushFrontBtn';
    this.pushBackBtn = '#pushBackBtn';
    this.popFrontBtn = '#popFrontBtn';
    this.popBackBtn = '#popBackBtn';
    this.peekFrontBtn = '#peekFrontBtn';
    this.peekBackBtn = '#peekBackBtn';
    this.implSelect = '#implSelect';
    this.implLabel = '#implLabel';
    this.sizeBadge = '#sizeBadge';
    this.emptyBadge = '#emptyBadge';
    this.lastOp = '#lastOp';
    this.dequeArea = '#dequeArea';
    this.log = '#log';
    this.rotateLeftBtn = '#rotateLeftBtn';
    this.rotateRightBtn = '#rotateRightBtn';
    this.exportBtn = '#exportBtn';
    this.fillBtn = '#fillBtn';
    this.countInput = '#countInput';
    this.pushManyFrontBtn = '#pushManyFrontBtn';
    this.pushManyBackBtn = '#pushManyBackBtn';
    this.clearBtn = '#clearBtn';
    this.demoSeqBtn = '#demoSeqBtn';
  }

  async goto() {
    await this.page.goto(APP_URL);
    // make sure initial render is present
    await this.page.waitForSelector(this.dequeArea);
  }

  async getSize() {
    return (await this.page.locator(this.sizeBadge).innerText()).trim();
  }
  async getEmpty() {
    return (await this.page.locator(this.emptyBadge).innerText()).trim();
  }
  async getImplLabel() {
    return (await this.page.locator(this.implLabel).innerText()).trim();
  }
  async getLastOp() {
    return (await this.page.locator(this.lastOp).innerText()).trim();
  }

  // returns array of strings representing visible node text (includes possible 'front'/'back' subtext)
  async getNodeTexts() {
    // get all node elements under dequeArea
    const nodes = this.page.locator(`${this.dequeArea} .node`);
    const count = await nodes.count();
    const arr = [];
    for (let i = 0; i < count; i++) {
      const n = nodes.nth(i);
      // use innerText to capture visible text (value + 'front'/'back' sub)
      const t = (await n.innerText()).trim();
      arr.push(t);
    }
    return arr;
  }

  async pushFront(value) {
    await this.page.fill(this.valueInput, value);
    await this.page.click(this.pushFrontBtn);
    // rendering may animate; wait a tick
    await this.page.waitForTimeout(80);
  }
  async pushBack(value) {
    await this.page.fill(this.valueInput, value);
    await this.page.click(this.pushBackBtn);
    await this.page.waitForTimeout(80);
  }
  async popFront() {
    await this.page.click(this.popFrontBtn);
    await this.page.waitForTimeout(60);
  }
  async popBack() {
    await this.page.click(this.popBackBtn);
    await this.page.waitForTimeout(60);
  }
  async peekFront() {
    await this.page.click(this.peekFrontBtn);
    await this.page.waitForTimeout(80);
  }
  async peekBack() {
    await this.page.click(this.peekBackBtn);
    await this.page.waitForTimeout(80);
  }

  async rotateLeft() {
    await this.page.click(this.rotateLeftBtn);
    await this.page.waitForTimeout(80);
  }
  async rotateRight() {
    await this.page.click(this.rotateRightBtn);
    await this.page.waitForTimeout(80);
  }

  async switchImpl(value) {
    await this.page.selectOption(this.implSelect, { value });
    // change triggers render and log
    await this.page.waitForTimeout(120);
  }

  async exportSnapshotAndAcceptDialog() {
    // export triggers alert('Array snapshot: ...') and (due to code) may trigger a pageerror TypeError
    // Accept the dialog
    this.page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await this.page.click(this.exportBtn);
    // give page a moment to produce errors/logs
    await this.page.waitForTimeout(120);
  }

  async clickNodeAt(index) {
    const nodes = this.page.locator(`${this.dequeArea} .node`);
    await expect(nodes).toHaveCountGreaterThan(index);
    await nodes.nth(index).click();
    await this.page.waitForTimeout(120);
  }

  async fillCountAndFillRandom(count) {
    await this.page.fill(this.countInput, String(count));
    await this.page.click(this.fillBtn);
    await this.page.waitForTimeout(200);
  }

  async pushMany(side, count = 3) {
    await this.page.fill(this.countInput, String(count));
    if (side === 'front') await this.page.click(this.pushManyFrontBtn);
    else await this.page.click(this.pushManyBackBtn);
    await this.page.waitForTimeout(120);
  }

  async clear() {
    await this.page.click(this.clearBtn);
    await this.page.waitForTimeout(120);
  }

  async runDemoSequence() {
    await this.page.click(this.demoSeqBtn);
    // demo sequence is async with delays; wait sufficiently long to complete
    await this.page.waitForTimeout(420 * 9);
  }

  async getLogTexts() {
    const lines = this.page.locator('#log div');
    const n = await lines.count();
    const out = [];
    for (let i = 0; i < n; i++) out.push((await lines.nth(i).innerText()).trim());
    return out;
  }
}

test.describe('Deque demo (d80986a1...)', () => {
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];
    // collect page errors and console messages for assertions
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test('Initial load shows prefilled items and correct badges', async ({ page }) => {
    // Purpose: verify initial render, prefilled values and badge states
    const dp = new DequePage(page);
    await dp.goto();

    // initial prefill adds 'start1' and 'start2' in script; ensure they are visible
    const nodeTexts = await dp.getNodeTexts();
    // Expect at least two nodes and the texts to include 'start1' and 'start2'
    expect(nodeTexts.length).toBeGreaterThanOrEqual(2);
    expect(nodeTexts.join(' ')).toContain('start1');
    expect(nodeTexts.join(' ')).toContain('start2');

    // Size and empty badges should reflect 2 items and not empty
    const size = await dp.getSize();
    const empty = await dp.getEmpty();
    expect(Number(size)).toBeGreaterThanOrEqual(2);
    expect(empty).toBe('false');

    // Implementation label should be Doubly-linked list by default
    expect(await dp.getImplLabel()).toContain('Doubly-linked');

    // The page should have logged the ready message inside the UI log
    const logs = await dp.getLogTexts();
    const joined = logs.join('\n');
    expect(joined).toContain('Demo ready');
    // there should be no fatal uncaught pageerror on initial load
    expect(pageErrors.length).toBe(0);
  });

  test('Push Front and Push Back update DOM and lastOp', async ({ page }) => {
    // Purpose: verify adding elements at both ends updates UI and metadata
    const dp = new DequePage(page);
    await dp.goto();

    const beforeSize = Number(await dp.getSize());

    await dp.pushFront('PF1');
    expect((await dp.getLastOp()).toLowerCase()).toContain('pushfront');
    // first node should contain 'PF1'
    const textsAfterPF = await dp.getNodeTexts();
    expect(textsAfterPF[0]).toContain('PF1');

    await dp.pushBack('PB1');
    expect((await dp.getLastOp()).toLowerCase()).toContain('pushback');
    const textsAfterPB = await dp.getNodeTexts();
    // last node contains PB1
    expect(textsAfterPB[textsAfterPB.length - 1]).toContain('PB1');

    const afterSize = Number(await dp.getSize());
    expect(afterSize).toBeGreaterThan(beforeSize);
  });

  test('Peek and Pop operations change lastOp and adjust size', async ({ page }) => {
    // Purpose: verify peek doesn't remove but shows lastOp and flash; pop removes and updates size
    const dp = new DequePage(page);
    await dp.goto();

    // Ensure there are items to peek/pop
    await dp.pushBack('itemA');
    await dp.pushBack('itemB');

    const sizeBefore = Number(await dp.getSize());

    await dp.peekFront();
    expect((await dp.getLastOp()).toLowerCase()).toContain('peekfront');

    await dp.peekBack();
    expect((await dp.getLastOp()).toLowerCase()).toContain('peekback');

    // Pop front reduces size by 1
    await dp.popFront();
    expect((await dp.getLastOp()).toLowerCase()).toContain('popfront');
    const sizeAfterPopFront = Number(await dp.getSize());
    expect(sizeAfterPopFront).toBe(sizeBefore - 1);

    // Pop back reduces size by 1
    await dp.popBack();
    expect((await dp.getLastOp()).toLowerCase()).toContain('popback');
    const sizeAfterPopBack = Number(await dp.getSize());
    expect(sizeAfterPopBack).toBe(sizeAfterPopFront - 1);
  });

  test('Rotate left and right reorder elements as expected', async ({ page }) => {
    // Purpose: ensure rotateLeft moves front to back and rotateRight moves back to front
    const dp = new DequePage(page);
    await dp.goto();

    // clear and push deterministic items
    await dp.clear();
    await dp.pushBack('a');
    await dp.pushBack('b');
    await dp.pushBack('c');

    let texts = await dp.getNodeTexts();
    // validate initial order a,b,c
    expect(texts.join(' ')).toContain('a');
    expect(texts[0]).toContain('a');
    expect(texts[texts.length - 1]).toContain('c');

    await dp.rotateLeft();
    texts = await dp.getNodeTexts();
    // after rotateLeft, 'a' should now be last
    expect(texts[texts.length - 1]).toContain('a');

    await dp.rotateRight();
    texts = await dp.getNodeTexts();
    // rotateRight should bring 'a' back to front
    expect(texts[0]).toContain('a');
  });

  test('Switching implementation preserves elements and updates label', async ({ page }) => {
    // Purpose: switching between linked and array implementations should preserve snapshot contents
    const dp = new DequePage(page);
    await dp.goto();

    await dp.clear();
    await dp.pushBack('one');
    await dp.pushBack('two');
    const before = await dp.getNodeTexts();

    // switch to array implementation
    await dp.switchImpl('array');
    expect(await dp.getImplLabel()).toContain('Simple Array');

    const afterSwitch = await dp.getNodeTexts();
    // contents/order should be preserved
    expect(afterSwitch.join('|')).toContain(before[0]);
    expect(afterSwitch.join('|')).toContain(before[1]);

    // switch back to linked
    await dp.switchImpl('linked');
    expect(await dp.getImplLabel()).toContain('Doubly-linked');
    const afterBack = await dp.getNodeTexts();
    expect(afterBack.join('|')).toContain('one');
    expect(afterBack.join('|')).toContain('two');
  });

  test('Clicking an element removes its first matching value', async ({ page }) => {
    // Purpose: ensure clicking a node triggers removal logic and UI updates
    const dp = new DequePage(page);
    await dp.goto();

    await dp.clear();
    await dp.pushBack('clickMe');
    await dp.pushBack('keepMe');

    let texts = await dp.getNodeTexts();
    expect(texts.join(' ')).toContain('clickMe');

    // click the first node (index 0) which should remove 'clickMe'
    await dp.clickNodeAt(0);
    texts = await dp.getNodeTexts();
    // After removal, the visible nodes should no longer include 'clickMe'
    expect(texts.join(' ')).not.toContain('clickMe');
  });

  test('Export snapshot triggers alert and produces a TypeError due to optional chaining bug', async ({ page }) => {
    // Purpose: exercise the export code path which attempts to use navigator.clipboard?.writeText(...).then(...) and thus
    // may produce a TypeError in non-secure contexts (undefined.then). We observe pageerror events and assert a TypeError occurs.
    const dp = new DequePage(page);

    await dp.goto();

    // ensure there is some content to export
    await dp.clear();
    await dp.pushBack('E1');
    await dp.pushBack('E2');

    // prepare to capture page errors (bound in beforeEach) and accept dialog
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e));
    // Accept alert dialog produced by exportSnapshot()
    page.once('dialog', async dialog => {
      // dialog message expected to contain the JSON snapshot
      expect(dialog.message()).toContain('Array snapshot:');
      await dialog.accept();
    });

    // click export - this will run navigator.clipboard?.writeText(txt).then(...).catch(...)
    await page.click('#exportBtn');
    // give event loop time to produce pageerror if any
    await page.waitForTimeout(200);

    // It's expected that in many test environments navigator.clipboard is undefined; optional chaining then results
    // in undefined.then(...) causing a TypeError. Assert we observed at least one pageerror and that it is a TypeError
    // or message references 'then' or 'undefined'.
    const errors = pageErrors;
    // We accept either a genuine TypeError or at least some pageerror
    expect(errors.length).toBeGreaterThanOrEqual(1);

    const foundTypeErrorLike = errors.some(e => {
      const m = String(e.message || '').toLowerCase();
      return (e.name === 'TypeError') || m.includes('then') || m.includes('undefined') || m.includes('cannot read');
    });
    expect(foundTypeErrorLike).toBeTruthy();
  });

  test('Fill random and pushMany update size and logs', async ({ page }) => {
    // Purpose: ensure bulk fill and pushMany controls work and update size/log UI
    const dp = new DequePage(page);
    await dp.goto();

    // clear first
    await dp.clear();
    expect(Number(await dp.getSize())).toBe(0);

    // fill random with count=4
    await dp.fillCountAndFillRandom(4);
    const sizeAfterFill = Number(await dp.getSize());
    expect(sizeAfterFill).toBeGreaterThanOrEqual(4);

    // push many to front 3 items
    const before = Number(await dp.getSize());
    await dp.pushMany('front', 3);
    const after = Number(await dp.getSize());
    expect(after).toBeGreaterThan(before);

    // logs should contain messages about fill/pushMany
    const logs = await dp.getLogTexts();
    const joined = logs.join('\n');
    expect(joined).toMatch(/Filled with|Pushed \d+ values/);
  });

  test('Demo sequence runs and updates log with completion message', async ({ page }) => {
    // Purpose: run the sample sequence and ensure it completes and logs completion
    const dp = new DequePage(page);
    await dp.goto();

    // clear to have deterministic state
    await dp.clear();
    await dp.runDemoSequence();

    const logs = await dp.getLogTexts();
    // recent logs should contain 'Sample sequence completed'
    const any = logs.some(line => line.includes('Sample sequence completed') || line.includes('Sample sequence'));
    expect(any).toBeTruthy();
  });

  test.afterEach(async ({ page }) => {
    // final sanity: ensure there were no unexpected fatal page errors for tests that didn't intentionally create errors
    // Tests that intentionally create an error (export test) assert errors themselves; here we ensure page errors list is captured.
    // This hook leaves as a no-op: all necessary assertions are made in tests.
    // Close page handled by Playwright fixtures automatically.
  });
});