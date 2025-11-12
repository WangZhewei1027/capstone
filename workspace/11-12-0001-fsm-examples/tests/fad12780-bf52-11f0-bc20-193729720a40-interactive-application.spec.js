import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-12-0001-fsm-examples/html/fad12780-bf52-11f0-bc20-193729720a40.html';

// Page Object for the BST Interactive Lab
class BSTLabPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle');
  }

  // Helper to attempt multiple locators and return the first that exists
  async firstExistingLocator(locatorFactories) {
    for (const factory of locatorFactories) {
      const loc = factory();
      try {
        if (await loc.count() > 0) {
          return loc.first();
        }
      } catch {
        // Continue trying other selectors
      }
    }
    return this.page.locator('::not(*)'); // Empty locator if none found
  }

  // General-purpose button getter by name candidates
  async button(...names) {
    // Try role-based by name, data-testid, title, and text
    return this.firstExistingLocator([
      () => this.page.getByRole('button', { name: new RegExp(`^\\s*(?:${names.join('|')})\\s*$`, 'i') }),
      () => this.page.locator(names.map(n => `[data-testid="${n.toLowerCase().replace(/\s+/g, '-')}-btn"]`).join(',')),
      () => this.page.locator(names.map(n => `button[title*="${n}"]`).join(',')),
      () => this.page.locator(names.map(n => `button:has-text("${n}")`).join(',')),
    ]);
  }

  // Inputs for single value and list
  async valueInput() {
    return this.firstExistingLocator([
      () => this.page.locator('input[name="value"]'),
      () => this.page.getByPlaceholder(/value/i),
      () => this.page.locator('input[type="number"]'),
      () => this.page.locator('input[data-role="value"]'),
    ]);
  }

  async listInput() {
    return this.firstExistingLocator([
      () => this.page.locator('input[name="list"]'),
      () => this.page.getByPlaceholder(/list|comma|csv/i),
      () => this.page.locator('input[type="text"]'),
      () => this.page.locator('textarea[name="list"]'),
    ]);
  }

  async speedInput() {
    return this.firstExistingLocator([
      () => this.page.locator('input[type="range"][name="speed"]'),
      () => this.page.locator('input[type="range"]'),
      () => this.page.getByLabel(/speed/i),
    ]);
  }

  async speedLabel() {
    return this.firstExistingLocator([
      () => this.page.locator('[data-role="speed-label"]'),
      () => this.page.locator('label:has-text(/speed/i)'),
      () => this.page.locator('.toolbar .group:has(label:has-text(/speed/i))'),
    ]);
  }

  async codeTabInsert() {
    return this.firstExistingLocator([
      () => this.page.getByRole('tab', { name: /insert/i }),
      () => this.page.getByRole('button', { name: /insert code|insert tab|insert pseudo/i }),
      () => this.page.locator('[data-tab="insert"]'),
    ]);
  }
  async codeTabSearch() {
    return this.firstExistingLocator([
      () => this.page.getByRole('tab', { name: /search/i }),
      () => this.page.getByRole('button', { name: /search code|search tab|search pseudo/i }),
      () => this.page.locator('[data-tab="search"]'),
    ]);
  }
  async codeTabDelete() {
    return this.firstExistingLocator([
      () => this.page.getByRole('tab', { name: /delete/i }),
      () => this.page.getByRole('button', { name: /delete code|delete tab|delete pseudo/i }),
      () => this.page.locator('[data-tab="delete"]'),
    ]);
  }
  async codeTabTraverse() {
    return this.firstExistingLocator([
      () => this.page.getByRole('tab', { name: /traverse|traversal/i }),
      () => this.page.getByRole('button', { name: /traverse code|traverse tab|traverse pseudo/i }),
      () => this.page.locator('[data-tab="traverse"]'),
    ]);
  }

  // Visualization and output
  async svg() {
    return this.firstExistingLocator([
      () => this.page.locator('svg#bst, .viz svg, svg'),
    ]);
  }

  async svgNodes() {
    return this.page.locator('svg g.node, svg .node, svg .bst-node, svg [data-node], svg [data-node-id], svg g[data-type="node"]');
  }

  async output() {
    return this.firstExistingLocator([
      () => this.page.locator('#output, .output, [data-role="output"], #console, .console, #log, .log'),
      () => this.page.getByRole('region', { name: /output|console|log|messages/i }),
    ]);
  }

  // Utility getters for buttons
  async insertBtn() { return this.button('Insert', 'Add'); }
  async searchBtn() { return this.button('Search', 'Find'); }
  async deleteBtn() { return this.button('Delete', 'Remove'); }
  async insertListBtn() { return this.button('Insert List', 'Batch Insert', 'Insert CSV'); }
  async randomBtn() { return this.button('Random', 'Generate Random'); }
  async clearBtn() { return this.button('Clear', 'Reset Tree'); }
  async inorderBtn() { return this.button('Inorder', 'In-order'); }
  async preorderBtn() { return this.button('Preorder', 'Pre-order'); }
  async postorderBtn() { return this.button('Postorder', 'Post-order'); }
  async levelorderBtn() { return this.button('Levelorder', 'Level-order', 'Breadth-first'); }
  async validateBtn() { return this.button('Validate', 'Validate BST'); }
  async balancedBtn() { return this.button('Balanced', 'Check Balance'); }
  async statsBtn() { return this.button('Stats', 'Statistics'); }
  async animateToggleBtn() { return this.button('Animate', 'Animation'); }
  async themeToggleBtn() { return this.button('Theme', 'Light', 'Dark', 'Toggle Theme'); }
  async metaToggleBtn() { return this.button('Meta', 'Metadata', 'Show Meta'); }
  async genChallengeBtn() { return this.button('Generate Challenge', 'Gen Challenge', 'New Challenge'); }
  async startChallengeBtn() { return this.button('Start Challenge', 'Start'); }
  async resetChallengeBtn() { return this.button('Reset Challenge', 'Reset'); }
  async challengeCheckBtn() { return this.button('Check', 'Challenge Check'); }
  async challengeHintBtn() { return this.button('Hint', 'Challenge Hint'); }

  // Common actions
  async insertValue(value, triggerByEnter = false) {
    const input = await this.valueInput();
    await input.click({ force: true });
    await input.fill(String(value));
    if (triggerByEnter) {
      await input.press('Enter');
    } else {
      const btn = await this.insertBtn();
      await btn.click();
    }
  }

  async searchValue(value) {
    const input = await this.valueInput();
    await input.click({ force: true });
    await input.fill(String(value));
    const btn = await this.searchBtn();
    await btn.click();
  }

  async deleteValue(value) {
    const input = await this.valueInput();
    await input.click({ force: true });
    await input.fill(String(value));
    const btn = await this.deleteBtn();
    await btn.click();
  }

  async insertList(list, triggerByEnter = false) {
    const input = await this.listInput();
    await input.click({ force: true });
    await input.fill(list);
    if (triggerByEnter) {
      await input.press('Enter');
    } else {
      const btn = await this.insertListBtn();
      await btn.click();
    }
  }

  async toggleAnimate() {
    const b = await this.animateToggleBtn();
    await b.click();
  }

  async toggleTheme() {
    const b = await this.themeToggleBtn();
    await b.click();
  }

  async toggleMeta() {
    const b = await this.metaToggleBtn();
    await b.click();
  }

  async adjustSpeedTo(value) {
    const s = await this.speedInput();
    await s.evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, value);
  }

  async clearTree() {
    const b = await this.clearBtn();
    await b.click();
  }

  // State helpers
  async getStateName() {
    return this.page.evaluate(() => {
      const tryGet = () => {
        const fromBody = document.body?.dataset?.state || document.body?.getAttribute('data-state');
        if (fromBody) return fromBody;
        const el = document.querySelector('#fsm-state, [data-fsm-state], [data-state]');
        if (el) {
          return el.getAttribute('data-state') || el.textContent?.trim();
        }
        const candidates = [
          () => window?.fsm?.state?.value,
          () => window?.app?.fsm?.state?.value,
          () => window?.__fsm?.state?.value,
          () => window?.__state,
          () => window?.FSM_CURRENT_STATE,
        ];
        for (const fn of candidates) {
          try {
            const v = fn();
            if (typeof v === 'string') return v;
            if (v && typeof v.value === 'string') return v.value;
          } catch { /* ignore */ }
        }
        return null;
      };
      const s = tryGet();
      if (typeof s === 'string') return s;
      return null;
    });
  }

  async waitForState(target, timeout = 5000) {
    const initial = await this.getStateName();
    if (!initial) return false; // state not exposed; skip hard assert
    await this.page.waitForFunction(
      (t) => {
        const get = () => {
          const fromBody = document.body?.dataset?.state || document.body?.getAttribute('data-state');
          if (fromBody) return fromBody;
          const el = document.querySelector('#fsm-state, [data-fsm-state], [data-state]');
          if (el) {
            return el.getAttribute('data-state') || el.textContent?.trim();
          }
          try { return window?.fsm?.state?.value || window?.app?.fsm?.state?.value || window?.__fsm?.state?.value || window?.__state || null; } catch { return null; }
        };
        const v = get();
        return v === t;
      },
      target,
      { timeout }
    );
    return true;
  }

  async waitForIdle(timeout = 7000) {
    const s = await this.getStateName();
    if (!s) return; // not observable
    await this.waitForState('idle', timeout);
  }

  async getAllStatesObservedDuring(action, timeout = 8000) {
    const states = [];
    const stop = { val: false };
    const capture = setInterval(async () => {
      const s = await this.getStateName();
      if (s && states[states.length - 1] !== s) states.push(s);
    }, 50);
    try {
      await action();
      const start = Date.now();
      // Allow some time for transitions to settle
      while (Date.now() - start < timeout) {
        await this.page.waitForTimeout(100);
      }
    } finally {
      clearInterval(capture);
    }
    return states;
  }

  // Helpers to assert busy state by checking disabled controls
  async areControlsDisabled() {
    const buttons = [
      await this.insertBtn(),
      await this.searchBtn(),
      await this.deleteBtn(),
      await this.insertListBtn(),
      await this.randomBtn(),
      await this.clearBtn(),
      await this.inorderBtn(),
      await this.preorderBtn(),
      await this.postorderBtn(),
      await this.levelorderBtn(),
      await this.validateBtn(),
      await this.balancedBtn(),
      await this.statsBtn(),
    ];
    // Some may not exist; evaluate disabled counts among those that exist
    let exists = 0;
    let disabled = 0;
    for (const b of buttons) {
      if (await b.count()) {
        exists++;
        const isDisabled = await b.isDisabled().catch(() => false);
        if (isDisabled) disabled++;
      }
    }
    if (exists === 0) return null;
    return disabled === exists;
  }

  async nodeCount() {
    const n = await this.svgNodes().count();
    return n;
  }
}

// Utility to soft-assert state transitions if state visibility is not available
async function expectStateSequenceContains(pageObj, expectedStates) {
  const s = await pageObj.getStateName();
  if (!s) {
    // Skip strict assertion if state not exposed
    test.info().annotations.push({ type: 'note', description: 'FSM state not exposed; skipping strict state assertions.' });
    return;
  }
  // Wait to settle to idle; capture states during a small window
  const observed = new Set();
  const start = Date.now();
  while (Date.now() - start < 2000) {
    const st = await pageObj.getStateName();
    if (st) observed.add(st);
    await pageObj.page.waitForTimeout(50);
  }
  for (const e of expectedStates) {
    expect(observed, `expected state "${e}" to be observed in sequence`).toContain(e);
  }
}

test.describe('BST Interactive Lab - FSM and UI integration', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new BSTLabPage(page);
    await app.goto();
    // Basic smoke checks
    await expect(page).toHaveTitle(/Interactive Binary Search Tree|BST Lab/i);
    const svg = await app.svg();
    await expect(svg).toBeVisible();
  });

  test('Initial load: idle state, controls visible', async ({ page }) => {
    const state = await app.getStateName();
    if (state) {
      expect(state).toBe('idle');
    }
    // Verify core controls present
    await expect(await app.insertBtn()).toBeVisible();
    await expect(await app.searchBtn()).toBeVisible();
    await expect(await app.deleteBtn()).toBeVisible();
    await expect(await app.clearBtn()).toBeVisible();
  });

  test.describe('Insert, Search, Delete operations and redraw', () => {
    test('Insert a value transitions through inserting -> redrawing -> idle and adds a node', async () => {
      const initialNodes = await app.nodeCount();
      // Trigger insert via button click
      await app.insertValue(50);
      // Expect busy state disables controls during insert
      const disabledDuringBusy = await app.areControlsDisabled();
      if (disabledDuringBusy !== null) {
        expect(disabledDuringBusy).toBe(true);
      }
      // Wait for idle or increased nodes
      await app.page.waitForFunction(
        (prev) => {
          const nodes = document.querySelectorAll('svg g.node, svg .node, svg .bst-node, svg [data-node], svg [data-node-id], svg g[data-type="node"]').length;
          return nodes > prev;
        },
        initialNodes,
        { timeout: 7000 }
      ).catch(() => {}); // tolerate if selectors differ
      await app.waitForIdle();
      const afterNodes = await app.nodeCount();
      expect(afterNodes).toBeGreaterThanOrEqual(initialNodes + 1);
      // State sequence should include inserting and redrawing if exposed
      await expectStateSequenceContains(app, ['inserting']);
    });

    test('Insert via Enter key (ENTER_KEY_ON_VALUE) works', async () => {
      const initialNodes = await app.nodeCount();
      await app.insertValue(30, true);
      await app.waitForIdle();
      const count = await app.nodeCount();
      expect(count).toBeGreaterThanOrEqual(initialNodes + 1);
    });

    test('Search transitions searching -> idle and provides visual/console feedback', async () => {
      // Ensure there is at least one node to search
      const count = await app.nodeCount();
      if (count === 0) {
        await app.insertValue(42);
        await app.waitForIdle();
      }
      await app.searchValue(42);
      await app.waitForIdle();
      const out = await app.output();
      if (await out.count()) {
        await expect(out).toContainText(/search|found|not found|visit/i, { timeout: 3000 });
      }
      await expectStateSequenceContains(app, ['searching']);
    });

    test('Delete transitions deleting -> redrawing -> idle and removes a node', async () => {
      // Ensure target to delete exists
      await app.insertValue(99);
      await app.waitForIdle();
      const before = await app.nodeCount();
      await app.deleteValue(99);
      await app.waitForIdle();
      const after = await app.nodeCount();
      expect(after).toBeLessThanOrEqual(before - 1);
      await expectStateSequenceContains(app, ['deleting']);
    });
  });

  test.describe('Batch insert, random generation, and clear', () => {
    test('Batch insert via button (BTN_INSERT_LIST_CLICK) and Enter (ENTER_KEY_ON_LIST)', async () => {
      await app.clearTree();
      await app.waitForIdle();
      const before = await app.nodeCount();
      await app.insertList('10,5,15,3,7,12,18');
      await app.waitForIdle();
      const after = await app.nodeCount();
      expect(after).toBeGreaterThanOrEqual(before + 5);
      await expectStateSequenceContains(app, ['batch_inserting']);
      // Now via Enter key
      await app.clearTree();
      await app.waitForIdle();
      const before2 = await app.nodeCount();
      await app.insertList('1,2,3,4', true);
      await app.waitForIdle();
      const after2 = await app.nodeCount();
      expect(after2).toBeGreaterThanOrEqual(before2 + 3);
    });

    test('Generate Random transitions generating_random -> batch_inserting -> idle', async () => {
      await app.clearTree();
      await app.waitForIdle();
      const before = await app.nodeCount();
      const btn = await app.randomBtn();
      await btn.click();
      await app.page.waitForTimeout(300); // allow generate to trigger
      await app.waitForIdle();
      const after = await app.nodeCount();
      expect(after).toBeGreaterThanOrEqual(before + 1);
      await expectStateSequenceContains(app, ['generating_random', 'batch_inserting']);
    });

    test('Clear transitions clearing -> idle and empties the tree', async () => {
      // Ensure there are nodes
      await app.insertList('8,3,10');
      await app.waitForIdle();
      const before = await app.nodeCount();
      expect(before).toBeGreaterThanOrEqual(3);
      await app.clearTree();
      await app.waitForIdle();
      const after = await app.nodeCount();
      expect(after).toBeLessThanOrEqual(1); // root may be removed; allow 0 or 1 depending on rendering
      await expectStateSequenceContains(app, ['clearing']);
    });
  });

  test.describe('Traversals and animations', () => {
    test.beforeEach(async () => {
      // Build a balanced small tree
      await app.clearTree();
      await app.waitForIdle();
      await app.insertList('8,3,10,1,6,14,4,7,13');
      await app.waitForIdle();
    });

    test('Inorder traversal animates visiting (traversing -> animating_traversal_visit -> idle)', async () => {
      const btn = await app.inorderBtn();
      await btn.click();
      await app.waitForIdle();
      const out = await app.output();
      if (await out.count()) {
        await expect(out).toContainText(/in.?order|traverse|visit/i);
      }
      await expectStateSequenceContains(app, ['traversing']);
    });

    test('Preorder traversal works', async () => {
      const btn = await app.preorderBtn();
      await btn.click();
      await app.waitForIdle();
      await expectStateSequenceContains(app, ['traversing']);
    });

    test('Postorder traversal works', async () => {
      const btn = await app.postorderBtn();
      await btn.click();
      await app.waitForIdle();
      await expectStateSequenceContains(app, ['traversing']);
    });

    test('Level order traversal works', async () => {
      const btn = await app.levelorderBtn();
      await btn.click();
      await app.waitForIdle();
      await expectStateSequenceContains(app, ['traversing']);
    });
  });

  test.describe('Validation, balance check, stats', () => {
    test('Validate (validating -> idle) outputs validation result', async () => {
      await app.clearTree();
      await app.waitForIdle();
      await app.insertList('5,3,7');
      await app.waitForIdle();
      const b = await app.validateBtn();
      await b.click();
      const out = await app.output();
      if (await out.count()) {
        await expect(out).toContainText(/valid|invalid/i);
      }
      await app.waitForIdle();
      await expectStateSequenceContains(app, ['validating']);
    });

    test('Check balance (checking_balance -> idle) outputs balance status', async () => {
      const b = await app.balancedBtn();
      await b.click();
      const out = await app.output();
      if (await out.count()) {
        await expect(out).toContainText(/balanced|unbalanced/i);
      }
      await app.waitForIdle();
      await expectStateSequenceContains(app, ['checking_balance']);
    });

    test('Stats (showing_stats -> idle) outputs statistics', async () => {
      const b = await app.statsBtn();
      await b.click();
      const out = await app.output();
      if (await out.count()) {
        await expect(out).toContainText(/stats|height|size|nodes|edges/i);
      }
      await app.waitForIdle();
      await expectStateSequenceContains(app, ['showing_stats']);
    });
  });

  test.describe('Code tabs selection (Insert/Search/Delete/Traverse)', () => {
    test('Selecting Insert code tab transitions to code_tab_insert', async () => {
      const tab = await app.codeTabInsert();
      if (await tab.count()) {
        await tab.click();
        await app.waitForIdle();
        await expectStateSequenceContains(app, ['code_tab_insert']);
      }
    });
    test('Selecting Search code tab transitions to code_tab_search', async () => {
      const tab = await app.codeTabSearch();
      if (await tab.count()) {
        await tab.click();
        await app.waitForIdle();
        await expectStateSequenceContains(app, ['code_tab_search']);
      }
    });
    test('Selecting Delete code tab transitions to code_tab_delete', async () => {
      const tab = await app.codeTabDelete();
      if (await tab.count()) {
        await tab.click();
        await app.waitForIdle();
        await expectStateSequenceContains(app, ['code_tab_delete']);
      }
    });
    test('Selecting Traverse code tab transitions to code_tab_traverse', async () => {
      const tab = await app.codeTabTraverse();
      if (await tab.count()) {
        await tab.click();
        await app.waitForIdle();
        await expectStateSequenceContains(app, ['code_tab_traverse']);
      }
    });
  });

  test.describe('Toggles: Animate, Theme, Meta, Speed adjustment', () => {
    test('Animate toggle (toggling_animate -> idle) affects state machine without breaking operations', async () => {
      const btn = await app.animateToggleBtn();
      await btn.click();
      await app.waitForIdle();
      await expectStateSequenceContains(app, ['toggling_animate']);
      // Perform a quick insert to ensure app still works
      const before = await app.nodeCount();
      await app.insertValue(23);
      await app.waitForIdle();
      expect(await app.nodeCount()).toBeGreaterThanOrEqual(before + 1);
    });

    test('Theme toggle (toggling_theme -> idle) toggles html.light class', async ({ page }) => {
      const initialHasLight = await page.locator('html.light').count();
      const btn = await app.themeToggleBtn();
      await btn.click();
      await app.waitForIdle();
      const afterHasLight = await page.locator('html.light').count();
      expect(afterHasLight).not.toBe(initialHasLight);
      await expectStateSequenceContains(app, ['toggling_theme']);
    });

    test('Meta toggle (toggling_meta -> idle) toggles metadata visibility', async ({ page }) => {
      // Attempt to detect metadata before/after
      const metaBefore = await page.locator('svg .meta, svg [data-meta], svg text.meta').count().catch(() => 0);
      const btn = await app.metaToggleBtn();
      await btn.click();
      await app.waitForIdle();
      const metaAfter = await page.locator('svg .meta, svg [data-meta], svg text.meta').count().catch(() => 0);
      expect(metaAfter).not.toBe(metaBefore);
      await expectStateSequenceContains(app, ['toggling_meta']);
    });

    test('Speed change (adjusting_speed -> idle) updates label', async () => {
      const label = await app.speedLabel();
      const beforeText = (await label.count()) ? (await label.innerText().catch(() => '')) : '';
      await app.adjustSpeedTo(90);
      await app.waitForIdle();
      if (await label.count()) {
        const afterText = await label.innerText().catch(() => '');
        expect(afterText).not.toBe(beforeText);
      }
      await expectStateSequenceContains(app, ['adjusting_speed']);
    });
  });

  test.describe('Node interactions, redrawing, and resize', () => {
    test.beforeEach(async () => {
      await app.clearTree();
      await app.waitForIdle();
      await app.insertList('20,10,30,5,15,25,35');
      await app.waitForIdle();
    });

    test('Clicking a node centers it (centering_node -> idle)', async () => {
      const nodes = app.svgNodes();
      const count = await nodes.count();
      expect(count).toBeGreaterThan(0);
      const svg = await app.svg();
      const beforeTransform = await svg.getAttribute('style').catch(() => null);
      await nodes.nth(0).click({ force: true });
      await app.waitForIdle();
      const afterTransform = await svg.getAttribute('style').catch(() => null);
      // Either transform style changes or at least a console message appears
      if (beforeTransform !== null && afterTransform !== null) {
        expect(afterTransform).not.toBe(beforeTransform);
      } else {
        const out = await app.output();
        if (await out.count()) {
          await expect(out).toContainText(/center|focus|node/i);
        }
      }
      await expectStateSequenceContains(app, ['centering_node']);
    });

    test('Window resize triggers redraw (redrawing -> idle)', async ({ page }) => {
      const svg = await app.svg();
      const beforeBox = await svg.evaluate((el) => el.getAttribute('viewBox') || '');
      await page.setViewportSize({ width: 900, height: 700 });
      await page.waitForTimeout(300);
      await app.waitForIdle();
      const afterBox = await svg.evaluate((el) => el.getAttribute('viewBox') || '');
      if (beforeBox && afterBox) {
        expect(afterBox).not.toBe(beforeBox);
      }
      await expectStateSequenceContains(app, ['redrawing']);
    });
  });

  test.describe('Challenge mode flow', () => {
    test('Generate -> Ready -> Start -> Active -> (Hint/Check) -> Complete -> Reset', async () => {
      // Reset to clean state
      const reset = await app.resetChallengeBtn();
      if (await reset.count()) {
        await reset.click();
      }
      await app.waitForIdle().catch(() => {});
      // Generate
      const gen = await app.genChallengeBtn();
      await gen.click();
      await app.page.waitForTimeout(200);
      await expectStateSequenceContains(app, ['challenge_ready']);
      // Start
      const start = await app.startChallengeBtn();
      await start.click();
      await app.page.waitForTimeout(200);
      await expectStateSequenceContains(app, ['challenge_active']);

      // Attempt to use hints and insert hinted values to progress
      const out = await app.output();
      let safety = 8;
      let reachedComplete = false;
      while (safety-- > 0) {
        // Request a hint
        const hintBtn = await app.challengeHintBtn();
        await hintBtn.click();
        await app.page.waitForTimeout(150);
        await expectStateSequenceContains(app, ['challenge_hinting', 'challenge_active']);
        // Parse next value from output if available
        let hinted = null;
        if (await out.count()) {
          const text = await out.innerText().catch(() => '');
          const m = text.match(/next\s+value\s*[:\-]\s*(\-?\d+)/i) || text.match(/insert\s*(\-?\d+)/i);
          if (m) hinted = parseInt(m[1], 10);
        }
        // Try to insert hinted value or a random reasonable integer
        const valueToInsert = Number.isFinite(hinted) ? hinted : Math.floor(Math.random() * 100);
        await app.insertValue(valueToInsert);
        await app.waitForIdle().catch(() => {});
        const state = await app.getStateName();
        if (state === 'challenge_complete') {
          reachedComplete = true;
          break;
        }
        // Also try check
        const checkBtn = await app.challengeCheckBtn();
        await checkBtn.click();
        await app.page.waitForTimeout(150);
        await expectStateSequenceContains(app, ['challenge_checking']);
        const s2 = await app.getStateName();
        if (s2 === 'challenge_complete') {
          reachedComplete = true;
          break;
        }
      }

      // If complete state is exposed, assert it; otherwise assert UI indicates completion
      const finalState = await app.getStateName();
      if (finalState) {
        if (reachedComplete) {
          expect(finalState === 'challenge_complete' || finalState === 'challenge_active').toBeTruthy();
        }
      } else {
        if (await out.count()) {
          await expect.soft(out).toContainText(/challenge.*complete|well done|finished/i);
        }
      }

      // Reset to challenge_none
      const reset2 = await app.resetChallengeBtn();
      await reset2.click();
      await app.page.waitForTimeout(150);
      await expectStateSequenceContains(app, ['challenge_none']);
    });
  });

  test.describe('Edge cases and error handling', () => {
    test('Insert duplicate value shows warning in output and tree structure remains valid', async () => {
      await app.clearTree();
      await app.waitForIdle();
      await app.insertValue(11);
      await app.waitForIdle();
      const before = await app.nodeCount();
      await app.insertValue(11);
      await app.waitForIdle();
      const after = await app.nodeCount();
      expect(after).toBeGreaterThanOrEqual(before); // no reduction
      const out = await app.output();
      if (await out.count()) {
        await expect.soft(out).toContainText(/duplicate|exists|ignored/i);
      }
    });

    test('Search for non-existing value shows "not found"', async () => {
      await app.clearTree();
      await app.waitForIdle();
      await app.insertList('5,2,8');
      await app.waitForIdle();
      await app.searchValue(999);
      await app.waitForIdle();
      const out = await app.output();
      if (await out.count()) {
        await expect(out).toContainText(/not\s*found/i);
      }
    });

    test('Delete non-existing value indicates error gracefully', async () => {
      const before = await app.nodeCount();
      await app.deleteValue(-1234);
      await app.waitForIdle();
      const after = await app.nodeCount();
      expect(after).toBeGreaterThanOrEqual(before);
      const out = await app.output();
      if (await out.count()) {
        await expect.soft(out).toContainText(/not\s*found|cannot delete|missing/i);
      }
    });

    test('Batch insert with invalid input does not crash and shows error', async () => {
      await app.clearTree();
      await app.waitForIdle();
      const before = await app.nodeCount();
      await app.insertList('a,b,,3, ,!,@');
      await app.waitForIdle();
      const after = await app.nodeCount();
      expect(after).toBeGreaterThanOrEqual(before); // any valid number may have been added, but should not crash
      const out = await app.output();
      if (await out.count()) {
        await expect.soft(out).toContainText(/invalid|error|skipping/i);
      }
    });

    test('Enter key with empty value input does not insert', async () => {
      await app.clearTree();
      await app.waitForIdle();
      const before = await app.nodeCount();
      const input = await app.valueInput();
      await input.click({ force: true });
      await input.fill('');
      await input.press('Enter');
      await app.waitForIdle().catch(() => {});
      const after = await app.nodeCount();
      expect(after).toBe(before);
    });
  });
});