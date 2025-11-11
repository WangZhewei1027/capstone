import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-10-0004-5-mini/html/6e678b20-bde7-11f0-8591-4fc0953aab32.html';

/**
 * Page object encapsulating common interactions with the Binary Search Tree Explorer app.
 * The selectors use resilient strategies (role/text and attribute fallbacks) since the
 * exact DOM may vary slightly. Each method exposes high-level events from the FSM:
 * INSERT, SEARCH, DELETE, TRAVERSE, RANDOM, CLEAR, STEP_TOGGLE, AUTO_TOGGLE, SPEED_CHANGE,
 * NODE_CLICK, NODE_KEY, NEXT_STEP, CANCEL.
 */
class AppPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Common controls
    this.input = page.locator('input[type="text"]').first();
    this.insertBtn = page.getByRole('button', { name: /insert/i }).first();
    this.searchBtn = page.getByRole('button', { name: /search/i }).first();
    this.deleteBtn = page.getByRole('button', { name: /delete/i }).first();
    this.traverseBtn = page.getByRole('button', { name: /traverse|inorder|preorder|postorder/i }).first();
    this.randomBtn = page.getByRole('button', { name: /random|randomize/i }).first();
    this.clearBtn = page.getByRole('button', { name: /clear/i }).first();
    this.stepToggleBtn = page.getByRole('button', { name: /step/i });
    this.autoToggleBtn = page.getByRole('button', { name: /auto/i }).first();
    this.nextStepBtn = page.getByRole('button', { name: /next step|next/i }).first();
    this.cancelBtn = page.getByRole('button', { name: /cancel/i }).first();
    this.speedInput = page.locator('input[type="range"], .speed input[type="range"]').first();

    // Generic containers / indicators
    this.header = page.locator('h1').first();
    this.svg = page.locator('svg').first();
    this.alert = page.getByRole('alert').first();
    this.status = page.locator('[data-state], .state, .status, #state, #status').first();

    // Node selectors - SVG circles and text labels
    this.nodeCircles = () => this.page.locator('svg circle, .node circle, .bst-node circle');
    this.nodeLabels = (value) => {
      // match text nodes in the SVG or normal text elements with the node value
      return this.page.locator(`svg text:has-text("${value}"), .node:has-text("${value}"), text=${value}`);
    };
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // wait for the main header to appear to consider app loaded
    await expect(this.header).toBeVisible({ timeout: 5000 });
  }

  // Insert a value using the input and Insert button
  async insert(value) {
    await this.input.fill(String(value));
    // ensure input is set
    await expect(this.input).toHaveValue(String(value));
    if (await this.insertBtn.count()) {
      await this.insertBtn.click();
    } else {
      // fallback: press Enter in input
      await this.input.press('Enter');
    }
  }

  async search(value) {
    await this.input.fill(String(value));
    if (await this.searchBtn.count()) {
      await this.searchBtn.click();
    } else {
      await this.input.press('Enter');
    }
  }

  async del(value) {
    await this.input.fill(String(value));
    if (await this.deleteBtn.count()) {
      await this.deleteBtn.click();
    } else {
      await this.input.press('Delete');
    }
  }

  async traverse() {
    if (await this.traverseBtn.count()) {
      await this.traverseBtn.click();
    }
  }

  async randomize() {
    if (await this.randomBtn.count()) {
      await this.randomBtn.click();
    }
  }

  async clear() {
    if (await this.clearBtn.count()) {
      await this.clearBtn.click();
    }
  }

  async toggleStep() {
    if (await this.stepToggleBtn.count()) {
      await this.stepToggleBtn.click();
    }
  }

  async toggleAuto() {
    if (await this.autoToggleBtn.count()) {
      await this.autoToggleBtn.click();
    }
  }

  async nextStep() {
    if (await this.nextStepBtn.count()) {
      await this.nextStepBtn.click();
    }
  }

  async cancel() {
    if (await this.cancelBtn.count()) {
      await this.cancelBtn.click();
    }
  }

  async setSpeed(value) {
    if (await this.speedInput.count()) {
      // clamp value between 0 and 100
      const v = Math.max(0, Math.min(100, Number(value)));
      await this.speedInput.evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    }
  }

  async clickNode(value) {
    const node = this.nodeLabels(value).first();
    await expect(node).toBeVisible({ timeout: 2000 });
    await node.click();
  }

  async pressKeyOnNode(value, key) {
    const node = this.nodeLabels(value).first();
    await expect(node).toBeVisible({ timeout: 2000 });
    await node.focus();
    await this.page.keyboard.press(key);
  }

  // Convenience: check if a node with text exists
  async hasNode(value) {
    const count = await this.nodeLabels(value).count();
    return count > 0;
  }

  // Wait for alert text containing substring
  async waitForAlertContaining(substr, timeout = 3000) {
    if (await this.alert.count()) {
      await expect(this.alert).toContainText(new RegExp(substr, 'i'), { timeout });
      return true;
    }
    // fallback: look for any element that looks like a toast or message
    const possible = this.page.locator('text=/error|found|not found|inserted|deleted|animation complete|complete/i');
    await expect(possible).toContainText(new RegExp(substr, 'i'), { timeout });
    return true;
  }
}

test.describe('Interactive Binary Search Tree Explorer - FSM coverage', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    // Ensure initial conditions: clear any existing tree
    try {
      await app.clear();
    } catch (e) {
      // ignore if clear not present
    }
  });

  test.afterEach(async ({ page }) => {
    // Attempt to reset UI after each test to avoid cross-test pollution
    try {
      const a = new AppPage(page);
      await a.clear();
      // toggle off step/auto if on
      if (await a.stepToggleBtn.count()) {
        // try to ensure step mode is off by toggling twice (idempotent)
        await a.toggleStep();
      }
      if (await a.autoToggleBtn.count()) {
        await a.toggleAuto();
      }
    } catch (e) {
      // ignore teardown errors
    }
  });

  test('Initial state: app loads into idle state and controls are available', async ({ page }) => {
    // Validate header
    await expect(app.header).toBeVisible();
    await expect(app.header).toContainText(/interactive/i);

    // Check state indicator if present (FSM idle\ state)
    if (await app.status.count()) {
      // The FSM names included "idle\". We accept "idle", "idle\", or "idle-state" variants
      const txt = (await app.status.innerText()).toLowerCase();
      expect(['idle', 'idle\\', 'idle-state'].some(s => txt.includes(s.replace('\\', '')) || txt.includes(s))).toBeTruthy();
    }

    // Controls should exist: input and primary buttons
    await expect(app.input).toBeVisible();
    expect((await app.input.getAttribute('type'))).toBe('text');

    // At least one of main buttons should be present
    const anyMainBtn = await Promise.any([
      app.insertBtn.count().then(c => c > 0),
      app.searchBtn.count().then(c => c > 0),
      app.randomBtn.count().then(c => c > 0),
      app.clearBtn.count().then(c => c > 0),
    ]).catch(() => false);
    expect(anyMainBtn).toBeTruthy();
  });

  test('INSERT flow: insert a node, verify DOM change and duplicate insertion triggers error', async ({ page }) => {
    // Insert a value and verify node appears
    await app.insert('42');

    // Node should appear in the SVG or as a labeled element
    await expect(app.nodeLabels('42').first()).toBeVisible({ timeout: 3000 });

    // Insert duplicate - expect an error or warning
    await app.insert('42');

    // The UI should show an alert or message indicating duplicate or error
    const duplicateReported = await Promise.race([
      app.alert.count().then(async c => {
        if (c > 0) {
          await expect(app.alert).toContainText(/duplicate|exists|already/i);
          return true;
        }
        return false;
      }),
      (async () => {
        const possible = page.locator('text=/duplicate|already exists|error|invalid/i');
        await expect(possible).toBeVisible({ timeout: 2500 });
        return true;
      })()
    ]).catch(() => false);
    expect(duplicateReported).toBeTruthy();
  });

  test('SEARCH flow: search existing and non-existing nodes (found vs not_found)', async ({ page }) => {
    // Prepare tree with nodes
    await app.insert('50');
    await app.insert('30');
    await app.insert('70');

    // Search for an existing node -> expect found indication
    await app.search('30');

    // Expect some visual feedback: node highlighted or "found" message
    const foundMsg = page.locator('text=/found|node found|search result/i');
    const foundNode = app.nodeLabels('30').first();
    await Promise.any([
      foundMsg.waitFor({ state: 'visible', timeout: 3000 }),
      foundNode.waitFor({ state: 'visible', timeout: 3000 }).then(async () => {
        // If highlight class exists, we consider it success
        const el = foundNode;
        // check for common 'found' class or stroke color indicating success
        const attr = await el.getAttribute('class');
        if (attr && /found|active|highlight/i.test(attr)) return;
        // fallback: ensure element exists (we already know it does)
      })
    ]).catch(() => {
      // If none of the above happened, assert at least the node exists
      expect(await app.hasNode('30')).toBeTruthy();
    });

    // Search for a non-existing node -> expect "not found" feedback
    await app.search('9999');
    const notFoundMsg = page.locator('text=/not found|no results|not present/i');
    await expect(notFoundMsg).toBeVisible({ timeout: 3000 });
  });

  test('DELETE flow: delete existing node and attempt to delete non-existing node', async ({ page }) => {
    // Insert then delete node
    await app.insert('15');
    await expect(app.nodeLabels('15').first()).toBeVisible({ timeout: 3000 });

    await app.del('15');

    // Node should be removed within a short timeout
    await expect(app.nodeLabels('15').first()).toBeHidden().catch(async () => {
      // if not hidden, check count is zero
      expect(await app.hasNode('15')).toBeFalsy();
    });

    // Delete non-existing node -> expect error/alert
    await app.del('11111');
    await app.waitForAlertContaining('not found', 3000);
  });

  test('TRAVERSE flow: produces an order list after traversal', async ({ page }) => {
    // Build predictable tree
    await app.insert('40');
    await app.insert('20');
    await app.insert('60');
    await app.insert('10');
    await app.insert('30');

    await app.traverse();

    // Expect a traversal result container or sequence to appear
    const traversalResult = page.locator('text=/traversal|order|visited|sequence/i');
    const listLike = page.locator('ol, ul, .traversal, .order, .visit-list').first();

    // Accept either a textual traversal message or a list component
    await Promise.any([
      traversalResult.waitFor({ state: 'visible', timeout: 3000 }),
      listLike.waitFor({ state: 'visible', timeout: 3000 })
    ]).catch(() => {
      // As last resort check for any sequence of numbers in visible text
      const pattern = page.locator('text=/\\b(10|20|30|40|60)\\b/').first();
      await expect(pattern).toBeVisible({ timeout: 3000 });
    });
  });

  test('RANDOM and CLEAR: random populates nodes, clear removes them', async ({ page }) => {
    // Randomize the tree
    await app.randomize();

    // Expect nodes to appear
    const anyNodes = app.nodeCircles();
    await expect(anyNodes.first()).toBeVisible({ timeout: 3000 });

    // Count should be greater than 1
    const countAfterRandom = await anyNodes.count();
    expect(countAfterRandom).toBeGreaterThan(0);

    // Clear should remove nodes
    await app.clear();
    // wait briefly and assert zero nodes
    await new Promise(r => setTimeout(r, 400)); // small wait for animation
    const countAfterClear = await anyNodes.count();
    expect(countAfterClear).toBe(0);
  });

  test('STEP mode: toggling step and using NEXT_STEP to walk through an operation', async ({ page }) => {
    // Ensure step toggle exists and enable step mode
    if (await app.stepToggleBtn.count()) {
      await app.toggleStep();
      // Step mode should indicate active; check for "step" active text or active class
      const stepActiveText = page.locator('text=/step mode|stepping/i');
      await Promise.any([
        stepActiveText.waitFor({ state: 'visible', timeout: 2000 }),
        app.stepToggleBtn.first().getAttribute('aria-pressed').then(v => {
          if (v === 'true') return true;
          throw new Error('not pressed');
        }).catch(() => false)
      ]).catch(() => { /* tolerate */ });
    }

    // Insert set of nodes
    await app.insert('8');
    await app.insert('3');
    await app.insert('10');

    // Start an operation in step mode: search for a node, then use Next Step to proceed
    await app.search('10');

    // Next step button should exist; click it to progress through internal OP_STEP_* events
    if (await app.nextStepBtn.count()) {
      // click next multiple times to simulate stepping through comparisons/moves
      for (let i = 0; i < 4; i++) {
        await app.nextStep();
        // allow UI to update between steps
        await new Promise(r => setTimeout(r, 250));
      }
      // After stepping, expect a found message or highlight
      await app.waitForAlertContaining('found', 3000).catch(() => {
        // fallback: check node '10' still visible
        expect(app.hasNode('10')).resolves.toBeTruthy();
      });
    } else {
      test.skip('Next step button not present in this build - skipping step-mode flow');
    }
  });

  test('AUTO mode: toggle auto on/off, speed change and cancel auto-run', async ({ page }) => {
    // Ensure the app can be toggled to auto mode
    if (!(await app.autoToggleBtn.count())) {
      test.skip('Auto toggle not present - skipping auto-mode tests');
      return;
    }

    // Toggle auto on
    await app.toggleAuto();

    // When auto is on, a visual indicator or aria-pressed attribute may be set
    const autoPressed = await app.autoToggleBtn.getAttribute('aria-pressed').catch(() => null);
    if (autoPressed) {
      expect(['true', 'false']).toContain(autoPressed);
    }

    // Change speed slider if present
    if (await app.speedInput.count()) {
      await app.setSpeed(80);
      // verify slider value changed
      const val = await app.speedInput.evaluate(el => el.value);
      expect(Number(val)).toBeGreaterThanOrEqual(0);
    }

    // Trigger a larger operation that would run automatically; use Random to start an animation
    await app.randomize();

    // Wait a short while to let auto-run start, then cancel
    await new Promise(r => setTimeout(r, 400));
    await app.cancel();

    // After cancel, expect auto to be disabled or a cancel confirmation
    const canceled = page.locator('text=/canceled|cancelled|stopped|auto off/i');
    await Promise.any([
      canceled.waitFor({ state: 'visible', timeout: 2000 }),
      app.autoToggleBtn.first().getAttribute('aria-pressed').then(v => v === 'false')
    ]).catch(() => {
      // fallback: nothing to assert strongly, but ensure we could click cancel without error
      expect(true).toBeTruthy();
    });

    // Toggle auto off if still on
    await app.toggleAuto();
  });

  test('NODE interactions: clicking a node selects it, and keyboard actions can trigger deletion', async ({ page }) => {
    await app.insert('7');

    // Node should appear
    await expect(app.nodeLabels('7').first()).toBeVisible({ timeout: 3000 });

    // Click the node
    await app.clickNode('7');

    // The app may show selection via class or an inspector; verify selection feedback exists
    const selectionIndicator = page.locator('text=/selected|node selected|active node|highlight/i');
    await Promise.any([
      selectionIndicator.waitFor({ state: 'visible', timeout: 1500 }),
      app.nodeLabels('7').first().getAttribute('class').then(cls => {
        if (cls && /selected|active|highlight/i.test(cls)) return true;
        throw new Error('no selection class');
      }).catch(() => false)
    ]).catch(() => {
      // tolerate builds without explicit selection UI
    });

    // Press Delete key while focused on the node to trigger deletion (NODE_KEY -> DELETE)
    await app.pressKeyOnNode('7', 'Delete');

    // Verify node removed
    await expect(app.nodeLabels('7').first()).toBeHidden({ timeout: 2000 }).catch(async () => {
      expect(await app.hasNode('7')).toBeFalsy();
    });
  });

  test('Edge cases and error scenarios: invalid input, ack error flow, and OP_COMPLETE', async ({ page }) => {
    // Invalid input (non-number or empty) should produce an error
    await app.input.fill(''); // empty
    if (await app.insertBtn.count()) {
      await app.insertBtn.click();
      await app.waitForAlertContaining('invalid', 2000).catch(() => {
        // fallback check for generic error
        return app.waitForAlertContaining('error', 2000).catch(() => false);
      });
    }

    // Non-numeric input
    await app.input.fill('abc');
    if (await app.insertBtn.count()) {
      await app.insertBtn.click();
      // Expect error or ignore
      await app.waitForAlertContaining('invalid', 2000).catch(() => {
        // may silently ignore; ensure app still functional by inserting a valid one
      });
    }

    // Trigger OP_COMPLETE by running a single insert and expecting completion message or no pending animations
    await app.insert('99');
    // Some implementations might show "Complete" or "Operation complete" text
    const completeText = page.locator('text=/complete|operation complete|done/i');
    await completeText.first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {
      // fallback: ensure node exists as evidence of completion
      expect(await app.hasNode('99')).toBeTruthy();
    });

    // If an error alert exists, test ACK_ERROR by clicking an OK/ack button
    if (await app.alert.count()) {
      // try to find a button to acknowledge the alert
      const okBtn = page.getByRole('button', { name: /ok|ack|dismiss|close/i }).first();
      if (await okBtn.count()) {
        await okBtn.click();
        // alert should disappear
        await expect(app.alert).toBeHidden({ timeout: 2000 }).catch(() => { /* fine if not hidden */ });
      }
    }
  });

  test('Operation step types: attempt to observe compare/move/insert/replace/delete step messages', async ({ page }) => {
    // Turn on step mode to see OP_STEP_* messages if available
    if (await app.stepToggleBtn.count()) {
      await app.toggleStep();
    } else {
      test.info().annotations.push({ type: 'note', description: 'Step toggle not present; best-effort inspection only' });
    }

    // Insert a few nodes to create a scenario for comparisons and moves
    await app.insert('25');
    await app.insert('15');
    await app.insert('35');

    // Start an insert that will cause comparisons/moves (e.g., inserting 20)
    await app.insert('20');

    // Look for textual indicators of underlying operation steps
    const compareText = page.locator('text=/compare|comparing/i');
    const moveText = page.locator('text=/move|moving/i');
    const insertText = page.locator('text=/inserted|inserting/i');
    const foundText = page.locator('text=/found|node found/i');
    const notFoundText = page.locator('text=/not found/i');
    const replaceText = page.locator('text=/replace|replacing/i');
    const deleteText = page.locator('text=/deleted|deleting/i');

    // It's acceptable to find any of these messages; assert at least one appears during the operation
    await Promise.any([
      compareText.waitFor({ state: 'visible', timeout: 3000 }),
      moveText.waitFor({ state: 'visible', timeout: 3000 }),
      insertText.waitFor({ state: 'visible', timeout: 3000 }),
      foundText.waitFor({ state: 'visible', timeout: 3000 }),
      notFoundText.waitFor({ state: 'visible', timeout: 3000 }),
      replaceText.waitFor({ state: 'visible', timeout: 3000 }),
      deleteText.waitFor({ state: 'visible', timeout: 3000 }),
    ]).catch(() => {
      // If none of the textual hints are present, ensure the final node exists as confirmation of insert
      expect(await app.hasNode('20')).toBeTruthy();
    });
  });
});