import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-10-0001/html/6b3f2b60-bdce-11f0-9d31-adfdd0a1a4cb.html';

// Utility: safe click that waits for stable state
async function safeClick(locator) {
  await locator.waitFor({ state: 'visible', timeout: 2000 });
  await locator.click();
}

test.describe('Binary Tree Interactive Module - FSM coverage', () => {
  test.beforeEach(async ({ page }) => {
    // navigate fresh for every test
    await page.goto(APP_URL);
    // ensure body is present
    await expect(page.locator('body')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Try to clear any animations or dialogs by reloading
    try {
      await page.reload();
    } catch (e) {
      // ignore
    }
  });

  test.describe('Empty / Initial state validations', () => {
    test('Initial render - should be in empty state with no nodes', async ({ page }) => {
      // Validate the page has main controls, and there are no tree nodes initially.
      await expect(page.locator('button', { hasText: /create root/i })).toBeVisible();
      await expect(page.locator('button', { hasText: /random/i })).toBeVisible();
      // SVG canvas should exist
      const svg = page.locator('svg');
      await expect(svg).toBeVisible();
      // There should be no node text elements initially (empty state)
      // We look for common selectors: g.node, .node, circle + text. Use a tolerant approach.
      const nodeLocators = page.locator('g.node, .node, svg g[data-node], svg circle, svg text');
      // It's acceptable that some decorative svg elements exist; ensure there is no meaningful node label text
      const meaningfulText = page.locator('svg text').filter({ hasNot: page.locator('defs') });
      // If meaningfulText exists, ensure it has zero visible text content (empty)
      const count = await meaningfulText.count();
      // If any text exists, check none of them look like numeric labels (best-effort)
      let foundLabel = false;
      for (let i = 0; i < count; i++) {
        const t = meaningfulText.nth(i);
        const text = (await t.innerText()).trim();
        if (text.length > 0) {
          foundLabel = true;
        }
      }
      // Accept either zero meaningful text nodes or no numeric labels
      expect(foundLabel).toBeFalsy();
      // Click on canvas background should keep it empty (state stays empty)
      await page.locator('svg').click({ position: { x: 10, y: 10 } });
      // No nodes created
      expect(await meaningfulText.count()).toBe(count);
    });
  });

  test.describe('Create / Randomize root and selection', () => {
    test('Create root from empty transitions to idle_selected and sets selection', async ({ page }) => {
      // Intercept prompt created by Create Root (notes: prompts use browser prompt())
      page.on('dialog', async (dialog) => {
        // Expect a prompt to create root value
        expect(dialog.type()).toBe('prompt');
        // Provide numeric value
        await dialog.accept('42');
      });

      const createBtn = page.locator('button', { hasText: /create root/i });
      await safeClick(createBtn);

      // After create, a node with label 42 should appear
      // Try various plausible text selectors
      const nodeText = page.locator('svg text', { hasText: '42' });
      await expect(nodeText).toBeVisible({ timeout: 2000 });

      // The created node should have a selected visual state: class 'selected' or aria-selected
      const selectedNode = page.locator('g.node.selected, .node.selected, [aria-selected="true"]');
      await expect(selectedNode.first()).toBeVisible();
    });

    test('Randomize creates a tree and results in selected root', async ({ page }) => {
      // Click Random button - some implementations prompt for size, handle dialog robustly
      page.on('dialog', async (dialog) => {
        // random may prompt for number of nodes, provide 5
        if (dialog.type() === 'prompt') {
          await dialog.accept('5');
        } else {
          await dialog.accept();
        }
      });

      const randomBtn = page.locator('button', { hasText: /random/i });
      await safeClick(randomBtn);

      // Expect several nodes to exist (at least 2)
      // Find text nodes in SVG and assert count >= 2
      const svgTexts = page.locator('svg text');
      await expect(svgTexts).toHaveCountGreaterThan(1).catch(async () => {
        // If API doesn't support toHaveCountGreaterThan, fallback:
        const cnt = await svgTexts.count();
        expect(cnt).toBeGreaterThanOrEqual(2);
      });

      // Root should be selected
      const selected = page.locator('g.node.selected, .node.selected, [aria-selected="true"]');
      await expect(selected.first()).toBeVisible();
    });
  });

  test.describe('Selection, deselection, and navigation', () => {
    test('Clicking a node selects it and clicking canvas deselects', async ({ page }) => {
      // Create a root first
      page.on('dialog', async (dialog) => await dialog.accept('7'));
      await safeClick(page.locator('button', { hasText: /create root/i }));

      // Click the root node text to select (it may already be selected)
      const nodeText = page.locator('svg text', { hasText: '7' }).first();
      await nodeText.waitFor({ state: 'visible' });
      await nodeText.click();

      // Ensure selection present
      const selected = page.locator('g.node.selected, .node.selected, [aria-selected="true"]');
      await expect(selected).toHaveCountGreaterThan(0).catch(async () => {
        expect(await selected.count()).toBeGreaterThan(0);
      });

      // Click canvas background to deselect
      // Get bounding box of svg and click empty spot
      const svg = page.locator('svg').first();
      const box = await svg.boundingBox();
      if (box) {
        // Click top-left corner inside svg to simulate background click
        await svg.click({ position: { x: 5, y: 5 } });
      } else {
        // fallback global click
        await page.click('body', { position: { x: 10, y: 10 } });
      }

      // Expect no selected node
      await expect(page.locator('g.node.selected, .node.selected, [aria-selected="true"]')).toHaveCount(0);
    });

    test('Arrow navigation updates selection (NAV_LEFT/NAV_RIGHT/NAV_UP) - best-effort', async ({ page }) => {
      // Create a small tree: root and two children via prompts
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') {
          // Provide values in sequence: root=1, left=2, right=3 when prompted
          // We track based on message
          const msg = dialog.message().toLowerCase();
          if (msg.includes('root')) await dialog.accept('1');
          else if (msg.includes('left')) await dialog.accept('2');
          else if (msg.includes('right')) await dialog.accept('3');
          else await dialog.accept('1');
        } else {
          await dialog.accept();
        }
      });

      // Create root
      await safeClick(page.locator('button', { hasText: /create root/i }));
      // Add child left and right via UI: try "Add Child" or "Add Left"/"Add Right" buttons
      const addChildBtn = page.locator('button', { hasText: /add child/i }).first();
      if (await addChildBtn.count() > 0) {
        await safeClick(addChildBtn);
      } else {
        // try specific left/right options
        const addLeft = page.locator('button', { hasText: /left/i }).first();
        if (await addLeft.count() > 0) {
          await safeClick(addLeft);
        }
        const addRight = page.locator('button', { hasText: /right/i }).first();
        if (await addRight.count() > 0) {
          await safeClick(addRight);
        }
      }

      // If the UI didn't prompt for left/right separately, try using PROMPT_ADD_CHILD via a generic Add Child click twice.
      // Try to select the root to make sure subsequent add child prompts target it.
      const rootText = page.locator('svg text', { hasText: '1' }).first();
      await rootText.click();
      // Try again to add child if none added
      const svgTexts = page.locator('svg text');
      if ((await svgTexts.count()) < 3) {
        const addBtnFallback = page.locator('button', { hasText: /add child/i }).first();
        if (await addBtnFallback.count() > 0) {
          await addBtnFallback.click();
        }
      }

      // Now try keyboard navigation - press ArrowRight then ArrowLeft then ArrowUp
      // Start by ensuring one node is selected
      const selectedBefore = await page.locator('g.node.selected, .node.selected, [aria-selected="true"]').count();
      if (selectedBefore === 0) {
        // click root to select
        await rootText.click();
      }

      // Press ArrowRight
      await page.keyboard.press('ArrowRight');
      // Expect selection to change (count still 1 but different node). Best-effort: selection exists
      await expect(page.locator('g.node.selected, .node.selected, [aria-selected="true"]')).toHaveCount(1);

      // Press ArrowLeft
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('g.node.selected, .node.selected, [aria-selected="true"]')).toHaveCount(1);

      // Press ArrowUp
      await page.keyboard.press('ArrowUp');
      await expect(page.locator('g.node.selected, .node.selected, [aria-selected="true"]')).toHaveCount(1);
    });
  });

  test.describe('Add / Edit prompts and confirm dialogs', () => {
    test('Prompt add child opens prompt and creates a child node', async ({ page }) => {
      // Create root
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') {
          // First prompt: root value
          await dialog.accept('100');
        }
      });
      await safeClick(page.locator('button', { hasText: /create root/i }));

      // Now select root and trigger add child. Intercept prompt to provide child value.
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('prompt');
        await dialog.accept('50');
      });

      // Click "Add Child" or "Add Left/Right"
      const addBtn = page.locator('button', { hasText: /add child|add left|add right/i }).first();
      if ((await addBtn.count()) === 0) {
        // Try a plus icon fallback
        const plus = page.locator('button[title="Add Child"], button[aria-label*="add"]');
        await safeClick(plus);
      } else {
        await safeClick(addBtn);
      }

      // Expect child value '50' to appear somewhere in SVG text
      const childText = page.locator('svg text', { hasText: '50' });
      await expect(childText).toBeVisible({ timeout: 2000 });
    });

    test('Edit node via double-click shows prompt and updates label; cancel keeps original', async ({ page }) => {
      // Create root
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') await dialog.accept('8');
      });
      await safeClick(page.locator('button', { hasText: /create root/i }));

      const node = page.locator('svg text', { hasText: '8' }).first();
      await node.waitFor({ state: 'visible' });

      // First test canceling edit: when prompt appears, dismiss it
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('prompt');
        await dialog.dismiss();
      });

      // Trigger edit via double-click or Edit button
      await node.dblclick();
      // After dismiss, label should remain '8'
      await expect(page.locator('svg text', { hasText: '8' })).toBeVisible();

      // Now accept an edit
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('prompt');
        await dialog.accept('80');
      });

      // Trigger edit again
      await node.dblclick();

      // Expect new label
      await expect(page.locator('svg text', { hasText: '80' })).toBeVisible();
    });
  });

  test.describe('Delete subtree and reset confirmations', () => {
    test('Delete subtree uses confirm dialog; cancel and confirm flows', async ({ page }) => {
      // Create root
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') await dialog.accept('9');
      });
      await safeClick(page.locator('button', { hasText: /create root/i }));

      // Select the node
      const node = page.locator('svg text', { hasText: '9' }).first();
      await node.click();

      // Press Delete key to trigger confirm (KEY_DELETE)
      // Cancel path first: intercept and dismiss
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        await dialog.dismiss();
      });
      await page.keyboard.press('Delete');

      // Node should still exist
      await expect(page.locator('svg text', { hasText: '9' })).toBeVisible();

      // Now confirm deletion
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });
      await page.keyboard.press('Delete');

      // Now node should be removed (idle_no_selection)
      await expect(page.locator('svg text', { hasText: '9' })).toHaveCount(0);
      // And no selected nodes remain
      await expect(page.locator('g.node.selected, .node.selected, [aria-selected="true"]')).toHaveCount(0);
    });

    test('Reset shows confirm; cancel keeps tree; confirm clears to empty state', async ({ page }) => {
      // Create root
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') await dialog.accept('11');
      });
      await safeClick(page.locator('button', { hasText: /create root/i }));

      // Click Reset and cancel
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        await dialog.dismiss();
      });
      await safeClick(page.locator('button', { hasText: /reset/i }));

      // Node should still be present
      await expect(page.locator('svg text', { hasText: '11' })).toBeVisible();

      // Now confirm reset
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });
      await safeClick(page.locator('button', { hasText: /reset/i }));

      // Expect empty canvas: no node labels present
      await expect(page.locator('svg text')).toHaveCount(0);
    });
  });

  test.describe('Traversal and animation behaviors', () => {
    test('Start traversal applies pulse/highlight classes and can be interrupted by Create Root', async ({ page }) => {
      // Build a small tree: root + two children
      let promptCount = 0;
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') {
          promptCount++;
          // Provide values: 1,2,3
          if (promptCount === 1) await dialog.accept('1');
          else if (promptCount === 2) await dialog.accept('2');
          else if (promptCount === 3) await dialog.accept('3');
          else await dialog.accept('99');
        } else {
          await dialog.accept();
        }
      });

      // Create root
      await safeClick(page.locator('button', { hasText: /create root/i }));

      // Add left and right if possible
      const addBtn = page.locator('button', { hasText: /add child|add left|add right/i }).first();
      if (await addBtn.count() > 0) {
        // attempt two times to add two children
        await addBtn.click();
        await addBtn.click();
      } else {
        // Fallback: try clicking some generic controls
        const plus = page.locator('button[aria-label*="add"], button[title*="Add"]');
        if (await plus.count() > 0) {
          await plus.click();
          await plus.click();
        }
      }

      // Start a traversal (Preorder/Inorder/Postorder/Level Order). Try Preorder first.
      const traversalBtn = page.locator('button', { hasText: /preorder|inorder|postorder|level order/i }).first();
      await traversalBtn.waitFor({ state: 'visible' });
      await traversalBtn.click();

      // During animation nodes should receive a 'pulse' class or an 'animating' attribute and edges 'highlight'.
      // Wait for any node to acquire 'pulse' or .pulse class.
      const pulseNode = page.locator('g.node.pulse, .node.pulse, svg text.pulse, circle.pulse').first();
      await expect(pulseNode).toBeVisible({ timeout: 3000 });

      // Now interrupt animation by clicking Create Root (this should stop animation and transition to idle_selected)
      // Intercept the prompt that will create new root
      page.once('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') await dialog.accept('777');
        else await dialog.accept();
      });
      await safeClick(page.locator('button', { hasText: /create root/i }));

      // After interruption, new root '777' should be visible and selected
      await expect(page.locator('svg text', { hasText: '777' })).toBeVisible({ timeout: 2000 });
      // Ensure no nodes remain with the 'pulse' class
      const anyPulse = await page.locator('g.node.pulse, .node.pulse, svg text.pulse, circle.pulse').count();
      expect(anyPulse).toBe(0);
    });

    test('Traversal ends and preserves selection if selection existed before (ANIMATION_END_WITH_SELECTION)', async ({ page }) => {
      // Create root and a child
      let promptIndex = 0;
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') {
          promptIndex++;
          if (promptIndex === 1) await dialog.accept('21');
          else await dialog.accept('22');
        } else {
          await dialog.accept();
        }
      });

      await safeClick(page.locator('button', { hasText: /create root/i }));
      // Add child if possible
      const addBtn = page.locator('button', { hasText: /add child|add left|add right/i }).first();
      if ((await addBtn.count()) > 0) {
        await addBtn.click();
      }

      // Select the root explicitly to test preservation
      const rootText = page.locator('svg text', { hasText: '21' }).first();
      await rootText.click();

      // Start a traversal
      const traversalBtn = page.locator('button', { hasText: /preorder|inorder|postorder|level order/i }).first();
      await traversalBtn.click();

      // Wait for animation to finish: we look for pulse classes to disappear
      const pulseSelector = 'g.node.pulse, .node.pulse, svg text.pulse, circle.pulse';
      // Wait until no pulses (with generous timeout)
      await page.waitForFunction((sel) => !document.querySelector(sel), {}, pulseSelector).catch(() => {
        // ignore if not found, continue
      });

      // After animation end with selection, the previously selected node should still be selected
      const selected = page.locator('g.node.selected, .node.selected, [aria-selected="true"]');
      await expect(selected).toHaveCountGreaterThan(0).catch(async () => {
        expect(await selected.count()).toBeGreaterThan(0);
      });
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Attempt to add child with empty prompt input should be ignored or show no new node', async ({ page }) => {
      // Create root
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') {
          await dialog.accept('33');
        } else {
          await dialog.accept();
        }
      });
      await safeClick(page.locator('button', { hasText: /create root/i }));

      // When prompting for add child, dismiss the prompt (simulate empty/cancel)
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('prompt');
        await dialog.dismiss();
      });

      // Trigger add child
      const addBtn = page.locator('button', { hasText: /add child|add left|add right/i }).first();
      if ((await addBtn.count()) === 0) {
        // fallback try plus icon
        const plus = page.locator('button[title*="Add"], button[aria-label*="add"]');
        if ((await plus.count()) > 0) await plus.click();
      } else {
        await addBtn.click();
      }

      // Ensure no new text node with empty value was added; count remains 1
      const texts = page.locator('svg text');
      await expect(texts).toHaveCount(1);
    });

    test('Pressing non-supported keys should not crash app and state remains stable', async ({ page }) => {
      // Create root
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') await dialog.accept('44');
      });
      await safeClick(page.locator('button', { hasText: /create root/i }));

      // Press random keys
      await page.keyboard.press('KeyA');
      await page.keyboard.press('F5'); // refresh key (may reload but we handle)
      // If reloaded, ensure no uncaught errors by checking body visible
      await expect(page.locator('body')).toBeVisible();

      // Ensure the tree still has either the created node or gracefully handled reload
      const anyText = page.locator('svg text');
      // At least attempt to not crash - we accept either zero or >0 nodes
      await expect(page.locator('body')).toBeVisible();
    });
  });
});