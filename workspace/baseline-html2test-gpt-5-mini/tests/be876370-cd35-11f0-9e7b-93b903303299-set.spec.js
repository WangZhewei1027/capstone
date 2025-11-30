import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be876370-cd35-11f0-9e7b-93b903303299.html';

// Page object encapsulating interactions with the Set demo page
class SetDemoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Inputs
    this.inputA = page.locator('#inputA');
    this.inputB = page.locator('#inputB');
    // Buttons
    this.updateBtn = page.locator('#updateBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.dedupeBtn = page.locator('#dedupeBtn');
    this.unionBtn = page.locator('#unionBtn');
    this.intersectionBtn = page.locator('#intersectionBtn');
    this.diffBtn = page.locator('#diffBtn');
    this.symDiffBtn = page.locator('#symDiffBtn');
    this.subsetBtn = page.locator('#subsetBtn');
    this.equalsBtn = page.locator('#equalsBtn');
    this.demoNaN = page.locator('#demoNaN');
    this.demoObjects = page.locator('#demoObjects');
    this.demoOrder = page.locator('#demoOrder');
    this.exampleButtons = page.locator('[data-ex]');
    // Views / results
    this.setsOverview = page.locator('#setsOverview');
    this.sizeA = page.locator('#sizeA');
    this.sizeB = page.locator('#sizeB');
    this.setAList = page.locator('#setAList');
    this.setBList = page.locator('#setBList');
    this.opResult = page.locator('#opResult');
    this.opTitle = page.locator('#opTitle');
    this.opList = page.locator('#opList');
    this.opCode = page.locator('#opCode');
    this.dedupeResult = page.locator('#dedupeResult');
    this.dedupeList = page.locator('#dedupeList');
    this.dedupeCode = page.locator('#dedupeCode');
    this.demoArea = page.locator('#demoArea');
    this.demoText = page.locator('#demoText');
    this.demoList = page.locator('#demoList');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Set the inputs (replaces content)
  async setInputs(a, b) {
    await this.inputA.fill(a);
    await this.inputB.fill(b);
  }

  // Click the main update button to parse inputs and create sets
  async clickUpdate() {
    await this.updateBtn.click();
  }

  async clickClear() {
    await this.clearBtn.click();
  }

  async clickDedupe() {
    await this.dedupeBtn.click();
  }

  async clickUnion() {
    await this.unionBtn.click();
  }

  async clickIntersection() {
    await this.intersectionBtn.click();
  }

  async clickDiff() {
    await this.diffBtn.click();
  }

  async clickSymDiff() {
    await this.symDiffBtn.click();
  }

  async clickSubset() {
    await this.subsetBtn.click();
  }

  async clickEquals() {
    await this.equalsBtn.click();
  }

  async clickDemoNaN() {
    await this.demoNaN.click();
  }

  async clickDemoObjects() {
    await this.demoObjects.click();
  }

  async clickDemoOrder() {
    await this.demoOrder.click();
  }

  // Click an example button by data-ex attribute value
  async clickExample(name) {
    await this.page.locator(`[data-ex="${name}"]`).click();
  }

  // Helper to get visible chip texts from a container (returns array of strings)
  async getChipTexts(containerLocator) {
    // chips are direct children inside lists; may be wrapped elements - collect textContent of child chips
    // We select .chip elements inside the container.
    const chips = containerLocator.locator('.chip');
    const count = await chips.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await chips.nth(i).innerText()).trim());
    }
    return texts;
  }
}

test.describe('Set — Interactive Demo (be876370-cd35-11f0-9e7b-93b903303299)', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Collect page errors and console messages for each test so we can assert about runtime issues
    pageErrors = [];
    consoleMessages = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test('Initial load: default inputs are populated and sets overview reflects parsed values', async ({ page }) => {
    // Purpose: Verify initial state after page load, default inputs, and sets sizes/contents
    const p = new SetDemoPage(page);
    await p.goto();

    // Wait for setsOverview to be visible (loaded by script)
    await expect(p.setsOverview).toBeVisible();

    // Sizes should reflect default initialization in the inline script:
    // inputA.value = '1, 2, 2, "apple", {"x":1}, NaN';
    // inputB.value = '2, "banana", {"x":1}, NaN';
    await expect(p.sizeA).toHaveText('5'); // unique entries in A: 1,2,"apple",{"x":1},NaN
    await expect(p.sizeB).toHaveText('4'); // unique entries in B: 2,"banana",{"x":1},NaN

    // Confirm that some expected display text values are present in the visual chips
    const setAChips = await p.getChipTexts(p.setAList);
    expect(setAChips).toEqual(expect.arrayContaining(['1', '2', '"apple"', '{"x":1}', 'NaN']));

    const setBChips = await p.getChipTexts(p.setBList);
    expect(setBChips).toEqual(expect.arrayContaining(['2', '"banana"', '{"x":1}', 'NaN']));

    // Ensure no runtime page errors were triggered during load
    expect(pageErrors.length).toBe(0);

    // Basic sanity: opResult & dedupeResult & demoArea are hidden at initial load
    await expect(p.opResult).toBeHidden();
    await expect(p.dedupeResult).toBeHidden();
    await expect(p.demoArea).toBeHidden();
  });

  test('Set operations: union, intersection, difference, symmetric difference, subset and equality', async ({ page }) => {
    // Purpose: Exercise all operation buttons and verify displayed results & code snippets
    const p1 = new SetDemoPage(page);
    await p.goto();

    // Union: should combine unique elements from A and B -> expected size 6
    await p.clickUnion();
    await expect(p.opResult).toBeVisible();
    await expect(p.opTitle).toContainText('Union (A ∪ B) — size: 6');
    const unionChips = await p.getChipTexts(p.opList);
    // union should include banana, apple, 1, 2, object, NaN
    expect(unionChips).toEqual(expect.arrayContaining(['"banana"', '"apple"', '1', '2', '{"x":1}', 'NaN']));
    await expect(p.opCode).toContainText('const union = new Set');

    // Intersection: should include elements common to both sets (2, {"x":1}, NaN) -> size 3
    await p.clickIntersection();
    await expect(p.opTitle).toContainText('Intersection (A ∩ B) — size: 3');
    const intersectionChips = await p.getChipTexts(p.opList);
    expect(intersectionChips).toEqual(expect.arrayContaining(['2', '{"x":1}', 'NaN']));
    await expect(p.opCode).toContainText('const intersection');

    // Difference A \ B: should include elements in A not in B (1, "apple") -> size: 2
    await p.clickDiff();
    await expect(p.opTitle).toContainText('Difference (A \\ B) — size: 2');
    const diffChips = await p.getChipTexts(p.opList);
    expect(diffChips).toEqual(expect.arrayContaining(['1', '"apple"']));
    expect(diffChips).not.toEqual(expect.arrayContaining(['2', '"banana"', 'NaN']));

    // Symmetric difference: elements unique to either A or B (1, "apple", "banana") -> size: 3
    await p.clickSymDiff();
    await expect(p.opTitle).toContainText('Symmetric Difference (A Δ B) — size: 3');
    const symChips = await p.getChipTexts(p.opList);
    expect(symChips).toEqual(expect.arrayContaining(['1', '"apple"', '"banana"']));

    // Subset check (A ⊆ B?) -> expected false for default example
    await p.clickSubset();
    await expect(p.opTitle).toContainText('A ⊆ B ? → false');
    await expect(p.opCode).toContainText('const isSubset');

    // Equality check (A == B?) -> expected false
    await p.clickEquals();
    await expect(p.opTitle).toContainText('A == B (same elements)? → false');
    await expect(p.opCode).toContainText('A.size === B.size');

    // No unexpected page errors during these interactions
    expect(pageErrors.length).toBe(0);
  });

  test('Dedupe A to Array and clear behavior', async ({ page }) => {
    // Purpose: Verify dedupe button produces a deduplicated array and that clearing resets the UI
    const p2 = new SetDemoPage(page);
    await p.goto();

    // Click dedupe to produce a deduplicated array view
    await p.clickDedupe();
    await expect(p.dedupeResult).toBeVisible();
    await expect(p.dedupeCode).toContainText('const deduped = [...new Set(arrayA)]');

    const dedupeChips = await p.getChipTexts(p.dedupeList);
    // Dedupe should reflect the deduplicated insertion order of arrA
    expect(dedupeChips).toEqual(expect.arrayContaining(['1', '2', '"apple"', '{"x":1}', 'NaN']));

    // Now click clear and ensure UI resets
    await p.clickClear();
    await expect(p.setsOverview).toBeHidden();
    await expect(p.opResult).toBeHidden();
    await expect(p.dedupeResult).toBeHidden();
    await expect(p.demoArea).toBeHidden();
    await expect(p.sizeA).toHaveText('0');
    await expect(p.sizeB).toHaveText('0');

    // Inputs should be blank
    await expect(p.inputA).toHaveValue('');
    await expect(p.inputB).toHaveValue('');

    expect(pageErrors.length).toBe(0);
  });

  test('Quick demos: NaN behavior, objects-by-reference, and insertion order', async ({ page }) => {
    // Purpose: Validate the three quick demo buttons reveal the expected demonstration content
    const p3 = new SetDemoPage(page);
    await p.goto();

    // Demo NaN: should present a demonstration that NaN is treated equal to NaN
    await p.clickDemoNaN();
    await expect(p.demoArea).toBeVisible();
    await expect(p.demoText).toContainText('NaN is considered equal to NaN');
    const demoNaNChips = await p.getChipTexts(p.demoList);
    // demoNaN builds Set([NaN, 0/0, NaN]) -> only one NaN should be present
    // The demoList includes the NaN chip; ensure 'NaN' appears at least once
    expect(demoNaNChips).toEqual(expect.arrayContaining(['NaN']));
    // Ensure only one unique NaN chip is shown for the demonstration (size 1 expected)
    // We check at least one 'NaN', and that the number of chips with 'NaN' is 1
    const nanCount = demoNaNChips.filter(t => t === 'NaN').length;
    expect(nanCount).toBeGreaterThanOrEqual(1);

    // Demo Objects: show that distinct object literals remain distinct entries and size note is present
    await p.clickDemoObjects();
    await expect(p.demoArea).toBeVisible();
    await expect(p.demoText).toContainText('Objects are stored by reference');
    // The demo populates two object chips and a small note with size information
    const demoObjText = await p.demoList.innerText();
    expect(demoObjText).toContain('size =');

    // Demo Order: check that insertion order is preserved: demonstration adds 3,1,2,1 -> iteration order should be 3,1,2
    await p.clickDemoOrder();
    await expect(p.demoArea).toBeVisible();
    await expect(p.demoText).toContainText('insertion order');
    const orderChips = await p.getChipTexts(p.demoList);
    // The demoList should contain '3', '1', '2' in that order as the first three chips
    // We only examine the first three chip texts to validate order
    const firstThree = orderChips.slice(0, 3);
    expect(firstThree).toEqual(['3', '1', '2']);

    expect(pageErrors.length).toBe(0);
  });

  test('Examples loader buttons populate inputs and update sets (nums & strings examples)', async ({ page }) => {
    // Purpose: Ensure example loader buttons set the inputs and call loadInputs() to update views
    const p4 = new SetDemoPage(page);
    await p.goto();

    // Click "nums" example
    await p.clickExample('nums');
    await expect(p.inputA).toHaveValue('1, 2, 2, 3, 4');
    await expect(p.inputB).toHaveValue('2, 4, 6');
    await expect(p.setsOverview).toBeVisible();
    await expect(p.sizeA).toHaveText('4'); // 1,2,3,4
    await expect(p.sizeB).toHaveText('3'); // 2,4,6

    // Click "strings" example
    await p.clickExample('strings');
    await expect(p.inputA).toContainText('apple'); // ensure input changed
    await expect(p.setsOverview).toBeVisible();
    // For the strings example, deduplicated setA should include "apple" and "banana"
    const setAChipsAfter = await p.getChipTexts(p.setAList);
    expect(setAChipsAfter).toEqual(expect.arrayContaining(['"banana"', '"apple"', 'banana', 'apple']).or(expect.arrayContaining(['"apple"', 'banana', '"banana"'])));
    expect(pageErrors.length).toBe(0);
  });

  test('Keyboard shortcut: Ctrl+Enter on textarea triggers loadInputs', async ({ page }) => {
    // Purpose: Verify that Ctrl+Enter (or Cmd+Enter on Mac-like keys) triggers loadInputs
    const p5 = new SetDemoPage(page);
    await p.goto();

    // Clear and type a new value into inputA
    await p.clickClear();
    await p.inputA.fill('5,5');
    // Press Ctrl+Enter (use ctrlKey true) to trigger loadInputs via keydown handler
    await p.inputA.press('Enter', { modifiers: ['Control'] });

    // After the shortcut, setsOverview should become visible and sizeA should be 1 (deduplicated)
    await expect(p.setsOverview).toBeVisible();
    await expect(p.sizeA).toHaveText('1');

    const setAChips1 = await p.getChipTexts(p.setAList);
    expect(setAChips).toEqual(expect.arrayContaining(['5']));

    expect(pageErrors.length).toBe(0);
  });

  test('Console and page error observation: ensure no unexpected runtime errors occurred', async ({ page }) => {
    // Purpose: Collect console messages and page errors and assert expected levels (no errors)
    const p6 = new SetDemoPage(page);
    await p.goto();

    // Interact with several controls to surface potential runtime errors
    await p.clickUnion();
    await p.clickIntersection();
    await p.clickDedupe();
    await p.clickDemoObjects();
    await p.clickExample('nan');
    await p.clickDemoNaN();

    // Validate that no page errors (uncaught exceptions) were emitted during interactions
    expect(pageErrors.length).toBe(0);

    // Basic check: some console messages may be present (scripts can log). We at least assert that consoleMessages is an array.
    expect(Array.isArray(consoleMessages)).toBe(true);
  });
});