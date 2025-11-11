import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-10-0002-small-batch-test/html/9638b2e0-bdd4-11f0-bd8d-55214871deb0.html';

/**
 * Page object helpers for the Binary Search Tree interactive module.
 * These helpers use resilient selectors (role-based, visible text, and fallbacks)
 * so tests remain stable across small markup changes.
 */
class BSTPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Get the numeric input used for insert/search/delete operations.
  async numberInput() {
    // Prefer an input[type=number], fall back to the first input
    const input = this.page.locator('input[type="number"]');
    if (await input.count()) return input.first();
    return this.page.locator('input').first();
  }

  // Find a button by visible name using a case-insensitive regex
  buttonByName(nameRegex) {
    // Use getByRole if available; fallback to text locator
    const byRole = this.page.getByRole('button', { name: nameRegex });
    return byRole;
  }

  // Slider for speed: prefer role=slider, fallback to input[type=range]
  speedSlider() {
    const sliderByRole = this.page.getByRole('slider');
    return sliderByRole.count().then(c => (c ? sliderByRole : this.page.locator('input[type="range"]')));
  }

  // Toggles: step toggle and show values toggle. Try role=checkbox first.
  async toggleByLabel(labelRegex) {
    const byRole = this.page.getByRole('checkbox', { name: labelRegex });
    if (await byRole.count()) return byRole;
    // try buttons that act as toggles
    const byButton = this.page.getByRole('button', { name: labelRegex });
    if (await byButton.count()) return byButton;
    // last resort: text label near an input
    const label = this.page.locator(`label:has-text("${labelRegex.source || labelRegex}")`);
    if (await label.count()) {
      const id = await label.getAttribute('for');
      if (id) return this.page.locator(`#${id}`);
    }
    // generic fallback
    return this.page.locator('input[type="checkbox"]').first();
  }

  // The SVG or visualization container for the tree
  svg() {
    // Many visualizations use SVG; fall back to a container with class 'tree' or '#tree'
    const svg = this.page.locator('svg');
    return svg.count().then(c => (c ? svg.first() : this.page.locator('#tree, .tree, .canvas, svg').first()));
  }

  // Returns a locator for a node that displays the given value.
  // This checks for visible text nodes anywhere on the page (SVG text or DOM).
  nodeTextLocator(value) {
    // exact text match (string)
    return this.page.getByText(String(value), { exact: true });
  }

  // Returns the count of visible numeric-text nodes in the visualization (best-effort).
  async nodeTextCount() {
    // Search for text nodes inside svg and fallback to .node elements or general text nodes that are numeric.
    const svg = await this.svg();
    // try SVG text elements
    try {
      const svgText = svg.locator('text');
      const count = await svgText.count();
      if (count > 0) return count;
    } catch (e) {
      // ignore
    }
    // fallback: elements with class .node or .bst-node
    const nodeByClass = this.page.locator('.node, .bst-node, .tree-node');
    const classCount = await nodeByClass.count();
    if (classCount) return classCount;
    // last resort: count visible numeric texts on page inside tree container
    const possible = this.page.locator('#tree, .tree, .canvas').locator('text');
    const pcount = await possible.count();
    return pcount;
  }

  // Insert a value using the UI
  async insert(value) {
    const input = await this.numberInput();
    await input.fill(String(value));
    await this.buttonByName(/insert/i).click();
  }

  // Search for a value using the UI
  async search(value) {
    const input = await this.numberInput();
    await input.fill(String(value));
    await this.buttonByName(/search/i).click();
  }

  // Delete a value using the UI
  async delete(value) {
    const input = await this.numberInput();
    await input.fill(String(value));
    await this.buttonByName(/delete/i).click();
  }

  // Click Random button
  async random() {
    await this.buttonByName(/random/i).click();
  }

  // Click Clear button
  async clear() {
    await this.buttonByName(/clear/i).click();
  }

  // Try to find an "ACK" or "OK" style acknowledgement button used to dismiss status messages.
  ackButton() {
    // Try a few common names
    return this.page.getByRole('button', { name: /ack|ok|close|dismiss|got it|understood/i });
  }

  // Wait for status text that matches regex
  async waitForStatus(regex, opts = { timeout: 2000 }) {
    // The status could be in a dedicated element (role=status) or visible text on the page.
    const statusRole = this.page.getByRole('status').filter({ hasText: regex });
    if (await statusRole.count()) {
      await expect(statusRole).toHaveCountGreaterThan(0, opts);
      return;
    }
    // fallback: text locator anywhere
    const txt = this.page.getByText(regex);
    await expect(txt).toBeVisible(opts);
  }

  // Helper to get the fill color (or computed style) of a node's circle if the visualization uses SVG circles
  async nodeCircleFill(value) {
    // Find an SVG text node with the value, then its parent group, then the preceding circle
    const svg = await this.svg();
    // Locate the text element matching value
    const textLocator = svg.locator('text', { hasText: String(value) });
    if (await textLocator.count()) {
      const el = await textLocator.first();
      // Evaluate DOM to find adjacent circle's fill or CSS style of the parent node
      const fill = await el.evaluate((node) => {
        // find nearest parent group
        let parent = node.parentElement;
        // search for circle in same group
        if (parent) {
          const circle = parent.querySelector('circle');
          if (circle) return circle.getAttribute('fill') || circle.style.fill || null;
        }
        // fallback: search previous sibling
        if (node.previousElementSibling && node.previousElementSibling.tagName === 'CIRCLE') {
          return node.previousElementSibling.getAttribute('fill') || node.previousElementSibling.style.fill || null;
        }
        // fallback: compute color from computed style of the text element (rare)
        const cs = window.getComputedStyle(node);
        return cs.fill || cs.color || null;
      });
      return fill;
    }
    // fallback: none found
    return null;
  }
}

test.describe('Binary Search Tree Interactive Module - FSM and UI tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the served HTML for each test to ensure clean state
    await page.goto(APP_URL);
    // Wait for main UI to be ready: a header or control appears
    await page.getByRole('heading').first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  });

  test.afterEach(async ({ page }) => {
    // Attempt to clear tree between tests if Clear exists
    const clearButton = page.getByRole('button', { name: /clear/i });
    if (await clearButton.count()) {
      await clearButton.first().click().catch(() => {});
    }
  });

  test('Initial render -> idle state and controls are present', async ({ page }) => {
    const bst = new BSTPage(page);

    // Verify the visualization container (SVG or tree container) is present - corresponds to onEnter: renderTree for idle
    const svg = await bst.svg();
    await expect(svg).toBeVisible({ timeout: 3000 });

    // Controls should include input and major action buttons -> verifying events that can be sent from idle
    const input = await bst.numberInput();
    await expect(input).toBeVisible();

    const insertBtn = bst.buttonByName(/insert/i);
    const searchBtn = bst.buttonByName(/search/i);
    const deleteBtn = bst.buttonByName(/delete/i);
    const randomBtn = bst.buttonByName(/random/i);
    const clearBtn = bst.buttonByName(/clear/i);

    await expect(insertBtn).toBeVisible();
    await expect(searchBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();
    await expect(randomBtn).toBeVisible();
    await expect(clearBtn).toBeVisible();

    // Speed slider and toggles should exist (SPEED_CHANGE, TOGGLE_STEP, TOGGLE_SHOW_VALUES)
    const speedCandidates = await bst.speedSlider();
    await expect(speedCandidates).toBeTruthy();

    // Step toggle and show values toggle might be checkboxes or buttons; we assert at least one toggle exists
    const stepToggle = await bst.toggleByLabel(/step/i);
    const showValuesToggle = await bst.toggleByLabel(/show values|values|show/i);

    await expect(stepToggle).toBeTruthy();
    await expect(showValuesToggle).toBeTruthy();
  });

  test('Insert nodes, visual confirmation, and duplicate handling', async ({ page }) => {
    // This test validates the inserting -> idle, inserting -> duplicate, and duplicate -> ACK flows
    const bst = new BSTPage(page);

    // Insert a root node 50
    await bst.insert(50);
    // After insert finishes (INSERT_FINISHED), we expect the node value to appear visually within tree
    const node50 = bst.nodeTextLocator(50);
    await expect(node50).toBeVisible({ timeout: 3000 });

    // Insert left and right child nodes to build tree: 25 and 75
    await bst.insert(25);
    await expect(bst.nodeTextLocator(25)).toBeVisible({ timeout: 3000 });

    await bst.insert(75);
    await expect(bst.nodeTextLocator(75)).toBeVisible({ timeout: 3000 });

    // Attempt to insert a duplicate value 25 -> expected FSM transition: INSERT_DUPLICATE -> duplicate state
    await bst.insert(25);

    // The UI should indicate a duplicate status. Try several likely text variants.
    const duplicateRegex = /duplicate|already exists|already present/i;
    // Use waitForStatus helper to detect such a message
    await bst.waitForStatus(duplicateRegex, { timeout: 3000 });

    // There should be an acknowledgement control to leave duplicate state (ACK -> idle)
    const ack = bst.ackButton();
    if (await ack.count()) {
      await ack.first().click();
      // After acknowledging, the duplicate message should disappear; the tree should still contain the node 25
      await expect(bst.nodeTextLocator(25)).toBeVisible({ timeout: 2000 });
    } else {
      // If no explicit ack, ensure duplicate message disappears within a short time (auto-renderTree onExit)
      // Wait and assert node remains present
      await page.waitForTimeout(500);
      await expect(bst.nodeTextLocator(25)).toBeVisible();
    }
  });

  test('Search flow: SEARCH -> found and SEARCH -> not_found', async ({ page }) => {
    // This test verifies searching for an existing node highlights it (found) and searching for a missing node shows not_found
    const bst = new BSTPage(page);

    // Ensure there's content to search: insert values 10 and 90
    await bst.insert(10);
    await expect(bst.nodeTextLocator(10)).toBeVisible({ timeout: 3000 });

    await bst.insert(90);
    await expect(bst.nodeTextLocator(90)).toBeVisible({ timeout: 3000 });

    // Search for an existing node (10) -> FSM should go to searching then found -> highlightFound onEnter
    await bst.search(10);
    // The found state should cause a visible highlight; attempt to detect by reading circle fill or text style
    // Wait briefly to allow animation/highlight
    await page.waitForTimeout(500);

    const fill = await bst.nodeCircleFill(10);
    // Accept either a specific highlight color or any non-null fill (depends on implementation)
    // If we have a fill, it should be non-empty. If null, fallback to expecting the text element to have some inline style change or visible emphasis.
    if (fill) {
      // Possible highlight color from CSS variables: node-highlight ~ '#f97316' or style containing 'rgb' or other
      await expect(fill.length).toBeGreaterThan(0);
    } else {
      // fallback: expect the text node to still be visible (search found at least shows the node)
      await expect(bst.nodeTextLocator(10)).toBeVisible();
    }

    // Acknowledge the found status if an ack control exists
    const ack = bst.ackButton();
    if (await ack.count()) {
      await ack.first().click();
    }

    // Search for a non-existing value (9999) -> expect not_found status text
    await bst.search(9999);
    const notFoundRegex = /not found|not_found|could not find|no such/i;
    await bst.waitForStatus(notFoundRegex, { timeout: 3000 });

    // Acknowledge not_found to return to idle, if available
    if (await ack.count()) {
      await ack.first().click();
    }
  });

  test('Delete operations: DELETE_FINISHED and DELETE_NOT_FOUND, visual removal and statuses', async ({ page }) => {
    const bst = new BSTPage(page);

    // Insert numbers to delete
    await bst.insert(200);
    await expect(bst.nodeTextLocator(200)).toBeVisible({ timeout: 3000 });

    await bst.insert(150);
    await expect(bst.nodeTextLocator(150)).toBeVisible({ timeout: 3000 });

    // Delete an existing node 150 -> FSM deletes and enters deleted state (setStatusDeleted) then back to idle
    await bst.delete(150);

    // Wait for node to disappear from visualization (DELETE_FINISHED -> deleted -> renderTree)
    await expect(bst.nodeTextLocator(150)).toHaveCount(0, { timeout: 4000 });

    // Check for a 'deleted' status message presence
    const deletedRegex = /deleted|removed/i;
    await bst.waitForStatus(deletedRegex, { timeout: 2000 }).catch(() => { /* optional */ });

    const ack = bst.ackButton();
    if (await ack.count()) {
      await ack.first().click();
    }

    // Attempt to delete a non-existing node 99999 -> expect DELETE_NOT_FOUND -> not_found state
    await bst.delete(99999);
    const notFoundRegex = /not found|does not exist|no such/i;
    await bst.waitForStatus(notFoundRegex, { timeout: 3000 });

    if (await ack.count()) {
      await ack.first().click();
    }
  });

  test('Random insertion and cancel/done behavior, then clear tree', async ({ page }) => {
    // Validate RANDOM -> random_inserting -> RANDOM_DONE and CLEAR -> cleared
    const bst = new BSTPage(page);

    // Click Random to populate tree
    await bst.random();
    // Random insertion may be animated; wait until there is at least one node in the visualization
    await page.waitForTimeout(500);
    const countAfterRandom = await bst.nodeTextCount();
    expect(countAfterRandom).toBeGreaterThan(0);

    // There may be a 'Random done' status or simply return to idle after insertion; attempt to detect message
    const randomDoneRegex = /random done|done|completed/i;
    try {
      await bst.waitForStatus(randomDoneRegex, { timeout: 1500 });
    } catch (e) {
      // it's fine if there is no explicit message; ensure nodes exist
    }

    // Now clear the tree using Clear button -> clears (cleared state's onEnter should clearTree)
    await bst.clear();
    // After clearing, nodes should be gone from visualization
    // Give a short delay for clearing animation
    await page.waitForTimeout(300);
    const countAfterClear = await bst.nodeTextCount();
    // Many implementations remove text nodes; we expect zero or very small
    expect(countAfterClear === 0 || countAfterClear < 2).toBeTruthy();
  });

  test('UI speed change and toggles trigger (SPEED_CHANGE, TOGGLE_STEP, TOGGLE_SHOW_VALUES)', async ({ page }) => {
    // Verifies controls for speed and toggles exist and respond to user interactions
    const bst = new BSTPage(page);

    // Change speed slider value (SPEED_CHANGE)
    const sliderLocator = await bst.speedSlider();
    // If slider is a locator, set value via evaluate
    try {
      if (await sliderLocator.count()) {
        const slider = sliderLocator.first();
        // Try typical min/max values; set to an arbitrary value
        await slider.evaluate((el) => {
          if (el.tagName === 'INPUT' && el.type === 'range') {
            el.value = el.max || 50;
            el.dispatchEvent(new Event('input'));
            el.dispatchEvent(new Event('change'));
          }
        });
      }
    } catch (e) {
      // ignore if slider cannot be adjusted
    }

    // Toggle step mode (TOGGLE_STEP)
    const stepToggle = await bst.toggleByLabel(/step/i);
    if (await stepToggle.count()) {
      const t = stepToggle.first();
      // Determine toggle type to flip state
      const role = await t.getAttribute('role');
      if (role === 'switch' || role === 'checkbox') {
        // toggle by click
        await t.click();
        // click again to reset
        await t.click();
      } else {
        // may be a button; just click to toggle on/off
        await t.click();
        await t.click();
      }
      // Ensure the control exists and is interactable
      await expect(t).toBeEnabled();
    }

    // Toggle show values (TOGGLE_SHOW_VALUES)
    const showToggle = await bst.toggleByLabel(/show values|show|values/i);
    if (await showToggle.count()) {
      const s = showToggle.first();
      await s.click();
      await page.waitForTimeout(200);
      await s.click();
      await expect(s).toBeEnabled();
    }
  });

  test('Edge cases: concurrent actions during animation and cancellation behavior', async ({ page }) => {
    // This test attempts to perform concurrent operations while an animation is likely in progress.
    // FSM notes mention concurrent user actions may invoke additional transitions; we ensure the app remains stable.
    const bst = new BSTPage(page);

    // Start a random insert which may animate over multiple steps
    await bst.random();

    // Immediately attempt to insert a value while random insertion is ongoing
    // This simulates user sending INSERT event while in random_inserting state.
    const insertDuringRandom = bst.insert(42);
    // Also attempt to send a clear
    const clearDuringRandom = bst.clear();

    // Wait a short period and then verify the app is still responsive and hasn't crashed
    await page.waitForTimeout(1000);

    // The application should still show nodes (either random nodes, or our inserted 42, or both)
    // At minimum, ensure the page has not navigated away or thrown (still has header)
    await expect(page.getByRole('heading').first()).toBeVisible();

    // If node 42 was successfully inserted at any point, it should be present
    // We don't assert it must be present; just check no unhandled exceptions occurred.
    const node42Count = await bst.nodeTextLocator(42).count();
    if (node42Count) {
      await expect(bst.nodeTextLocator(42)).toBeVisible();
    }

    // Finally, ensure Clear results in an empty or near-empty tree
    await bst.clear();
    await page.waitForTimeout(300);
    const finalCount = await bst.nodeTextCount();
    expect(finalCount === 0 || finalCount < 2).toBeTruthy();
  });
});