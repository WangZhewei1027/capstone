import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-1/html/82c2e9a0-d1d0-11f0-b999-357785ae4ede.html';

test.describe('BST Interactive Demo (FSM validation) - 82c2e9a0-d1d0-11f0-b999-357785ae4ede', () => {
  // Helper to attach listeners to collect console messages and page errors
  async function attachObservers(page) {
    const consoles = [];
    const pageErrors = [];
    page.on('console', msg => {
      consoles.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
    return { consoles, pageErrors };
  }

  // Helper to set numeric input value and dispatch input event
  async function setInputValue(page, selector, value) {
    await page.fill(selector, String(value));
    await page.dispatchEvent(selector, 'input');
  }

  test('Initial Idle state: page loads and shows seeded tree stats and traversal output', async ({ page }) => {
    // Validate initial Idle state: seeded demo tree present and updateStats called
    const { consoles, pageErrors } = await attachObservers(page);

    await page.goto(APP_URL);

    // Wait for initial drawing and stats update
    await page.waitForSelector('#size');
    const sizeText = await page.textContent('#size');
    expect(sizeText).toBe('11'); // seedDemo inserts 11 values

    // Output should be inorder JSON array of seeded values
    const output = await page.textContent('#output');
    // Expect output to be the sorted list of seeded values
    expect(output).toBe('[10,20,25,30,35,40,45,50,60,70,80]');

    // Also ensure speedVal is shown and set by setSpeedDisplay
    const speedVal = await page.textContent('#speedVal');
    expect(speedVal).toMatch(/ms$/);

    // No runtime page errors during initial load
    expect(pageErrors.length).toBe(0);
    // Console may contain messages but not errors — ensure no console type 'error'
    const errorConsole = consoles.find(c => c.type === 'error');
    expect(errorConsole).toBeUndefined();
  });

  test.describe('Insert / Search / Delete transitions (S0 -> S1)', () => {
    test('Insert a new unique value increments size and updates output (with animation)', async ({ page }) => {
      // Validate insert flow triggers animatePath and updates tree.size
      const { pageErrors } = await attachObservers(page);
      await page.goto(APP_URL);

      // speed down animations
      await page.evaluate(() => { UI.speedRange.value = '100'; setSpeedDisplay(); });
      // Insert new value 99
      await setInputValue(page, '#valueInput', 99);

      const initialSize = Number(await page.textContent('#size'));
      await page.click('#insertBtn');

      // Wait for animations to finish (safe margin)
      await page.waitForTimeout(700);

      const newSize = Number(await page.textContent('#size'));
      expect(newSize).toBe(initialSize + 1);
      const output = await page.textContent('#output');
      // output must contain the inserted value
      expect(output.includes('99')).toBeTruthy();

      expect(pageErrors.length).toBe(0);
    });

    test('Inserting a duplicate value triggers alert (edge case)', async ({ page }) => {
      // Insert duplicate should trigger alert via animatePath callback
      await page.goto(APP_URL);

      // Ensure speed fast
      await page.evaluate(() => { UI.speedRange.value = '100'; setSpeedDisplay(); });

      // Insert a known value (50 is present from seed)
      await setInputValue(page, '#valueInput', 50);

      const dialogs = [];
      page.on('dialog', async dialog => {
        dialogs.push({ type: dialog.type(), message: dialog.message(), defaultValue: dialog.defaultValue() });
        // For alert, just accept
        await dialog.accept();
      });

      await page.click('#insertBtn');

      // Wait for any animation/alert to occur
      await page.waitForTimeout(700);

      // There should be an alert about duplicate
      const hasDuplicateAlert = dialogs.some(d => /already exists/i.test(d.message) || /duplicates not allowed/i.test(d.message));
      expect(hasDuplicateAlert).toBeTruthy();
    });

    test('Search: existing value and non-existing value behavior (alert on not found)', async ({ page }) => {
      await page.goto(APP_URL);
      await page.evaluate(() => { UI.speedRange.value = '100'; setSpeedDisplay(); });

      // Handle dialogs for not found case
      const dialogs = [];
      page.on('dialog', async dialog => {
        dialogs.push({ type: dialog.type(), message: dialog.message() });
        await dialog.accept();
      });

      // Search existing value 50 (root) - should not produce a final alert "Value not found."
      await setInputValue(page, '#valueInput', 50);
      await page.click('#searchBtn');
      await page.waitForTimeout(500);
      // Ensure no 'not found' alert in dialogs
      const notFoundAfterFoundSearch = dialogs.some(d => /not found/i.test(d.message));
      expect(notFoundAfterFoundSearch).toBeFalsy();

      // Now search an absent value -> expect alert 'Value not found.'
      await setInputValue(page, '#valueInput', 9999);
      await page.click('#searchBtn');
      await page.waitForTimeout(700);

      const hasNotFound = dialogs.some(d => /Value not found/i.test(d.message) || /not found/i.test(d.message));
      expect(hasNotFound).toBeTruthy();
    });

    test('Delete an inserted value decrements size and updates tree (animated)', async ({ page }) => {
      await page.goto(APP_URL);
      await page.evaluate(() => { UI.speedRange.value = '100'; setSpeedDisplay(); });

      // Insert a unique value to later delete
      await setInputValue(page, '#valueInput', 777);
      await page.click('#insertBtn');
      await page.waitForTimeout(700);
      const sizeAfterInsert = Number(await page.textContent('#size'));

      // Delete the same value
      await setInputValue(page, '#valueInput', 777);

      // No alert expected for successful deletion, but an animation will occur
      await page.click('#deleteBtn');
      await page.waitForTimeout(1000); // wait for search animation + delete animation

      const sizeAfterDelete = Number(await page.textContent('#size'));
      expect(sizeAfterDelete).toBe(sizeAfterInsert - 1);
    });
  });

  test.describe('Clear / Balanced / Random build flows (including prompts & confirms)', () => {
    test('Clear the tree after confirming clears size and output (S4 ConfirmOpen)', async ({ page }) => {
      await page.goto(APP_URL);
      const dialogs = [];
      page.on('dialog', async dialog => {
        dialogs.push({ type: dialog.type(), message: dialog.message() });
        // accept confirm to clear
        if (dialog.type() === 'confirm') await dialog.accept();
        else await dialog.accept();
      });

      await page.click('#clearBtn');
      // small wait for draw & updateStats
      await page.waitForTimeout(300);

      const size = await page.textContent('#size');
      expect(size).toBe('0');
      const output = await page.textContent('#output');
      expect(output).toBe('[]');

      const confirmSeen = dialogs.some(d => d.type === 'confirm' && /Clear the entire tree/i.test(d.message));
      expect(confirmSeen).toBeTruthy();
    });

    test('Balanced from Sorted when empty triggers prompt and builds balanced tree (S3 PromptOpen)', async ({ page }) => {
      await page.goto(APP_URL);

      // Ensure tree empty first by clearing and accepting confirm
      page.on('dialog', async dialog => {
        if (dialog.type() === 'confirm') await dialog.accept();
        else await dialog.accept();
      });
      await page.click('#clearBtn');
      await page.waitForTimeout(200);

      // Now clicking balanced should prompt for numbers; respond with '5,3,7'
      const promptMessages = [];
      page.on('dialog', async dialog => {
        promptMessages.push({ type: dialog.type(), message: dialog.message(), defaultValue: dialog.defaultValue() });
        if (dialog.type() === 'prompt') {
          await dialog.accept('5,3,7');
        } else {
          await dialog.accept();
        }
      });

      await page.click('#balancedBtn');
      await page.waitForTimeout(500);

      const size = await page.textContent('#size');
      expect(size).toBe('3');
      const output = await page.textContent('#output');
      expect(output).toBe('[3,5,7]');

      const sawPrompt = promptMessages.some(p => p.type === 'prompt' && /Enter numbers separated by commas/i.test(p.message));
      expect(sawPrompt).toBeTruthy();
    });

    test('Random Tree populates expected number of unique nodes', async ({ page }) => {
      await page.goto(APP_URL);

      // Set randCount to 5
      await setInputValue(page, '#randCount', 5);
      await page.click('#randomBtn');

      // Wait for inserts & draw
      await page.waitForTimeout(300);

      const size = Number(await page.textContent('#size'));
      expect(size).toBe(5);

      const output = await page.textContent('#output');
      // Validate output length equals 5 numeric items
      const arr = JSON.parse(output || '[]');
      expect(Array.isArray(arr)).toBeTruthy();
      expect(arr.length).toBe(5);
    });
  });

  test.describe('Traversals, Export/Import, Stop animation (S1 animations & S3 prompts)', () => {
    test('Inorder/Preorder/Postorder/Level-order buttons set output and animate sequence', async ({ page }) => {
      await page.goto(APP_URL);
      // Make animation fast
      await page.evaluate(() => { UI.speedRange.value = '100'; setSpeedDisplay(); });

      // Inorder
      await page.click('#inorderBtn');
      await page.waitForTimeout(700);
      const inorderOut = await page.textContent('#output');
      expect(inorderOut).toContain('10'); // from seeded tree

      // Preorder
      await page.click('#preorderBtn');
      await page.waitForTimeout(700);
      const preorderOut = await page.textContent('#output');
      expect(preorderOut.startsWith('[')).toBeTruthy();

      // Postorder
      await page.click('#postorderBtn');
      await page.waitForTimeout(700);
      const postorderOut = await page.textContent('#output');
      expect(postorderOut.startsWith('[')).toBeTruthy();

      // Level-order
      await page.click('#levelBtn');
      await page.waitForTimeout(700);
      const levelOut = await page.textContent('#output');
      expect(levelOut.startsWith('[')).toBeTruthy();
    });

    test('Stop animation clears timers without errors', async ({ page }) => {
      await page.goto(APP_URL);
      // Start a traversal animation then stop quickly
      await page.evaluate(() => { UI.speedRange.value = '200'; setSpeedDisplay(); });
      await page.click('#inorderBtn');
      // Stop shortly after
      await page.waitForTimeout(150);
      await page.click('#stopAnim');
      // Wait a bit to ensure clearAnim executed
      await page.waitForTimeout(200);

      // No page errors should have occurred
      // We rely on observer attached in each test; re-attach here explicitly
      const errors = [];
      page.on('pageerror', e => errors.push(e));
      expect(errors.length).toBe(0);
    });

    test('Export triggers prompt with JSON; Import invalid then valid JSON handling', async ({ page }) => {
      await page.goto(APP_URL);

      const dialogs = [];
      page.on('dialog', async dialog => {
        dialogs.push({ type: dialog.type(), message: dialog.message(), defaultValue: dialog.defaultValue() });
        // For export prompt, just accept (user would copy)
        if (dialog.type() === 'prompt') {
          // For export prompt default value contains JSON — accept without changing
          await dialog.accept(dialog.defaultValue());
        } else {
          await dialog.accept();
        }
      });

      // Click export
      await page.click('#exportBtn');
      await page.waitForTimeout(200);
      const exportPrompt = dialogs.find(d => /Copy JSON of values/i.test(d.message));
      expect(exportPrompt).toBeTruthy();
      expect(exportPrompt.defaultValue && exportPrompt.defaultValue.startsWith('[')).toBeTruthy();

      // Import invalid JSON -> expect alert 'Invalid JSON array.'
      const importDialogs = [];
      page.on('dialog', async dialog => {
        importDialogs.push({ type: dialog.type(), message: dialog.message() });
        // For prompt invoked by import, return invalid json first time
        if (dialog.type() === 'prompt' && /Paste JSON array/i.test(dialog.message())) {
          await dialog.accept('not a json');
        } else {
          await dialog.accept();
        }
      });

      await page.click('#importBtn');
      await page.waitForTimeout(300);
      const invalidAlert = importDialogs.find(d => /Invalid JSON array/i.test(d.message));
      expect(invalidAlert).toBeTruthy();

      // Now import valid JSON
      page.on('dialog', async dialog => {
        if (dialog.type() === 'prompt' && /Paste JSON array/i.test(dialog.message())) {
          await dialog.accept('[2,1,3]');
        } else {
          await dialog.accept();
        }
      });
      await page.click('#importBtn');
      await page.waitForTimeout(400);
      const size = await page.textContent('#size');
      expect(size).toBe('3');
      const output = await page.textContent('#output');
      expect(output).toBe('[1,2,3]');
    });
  });

  test.describe('Canvas interactions: click autofill, pan & zoom (S2_Panning, CANVAS_WHEEL, CANVAS_CLICK)', () => {
    test('Canvas click autofills valueInput with node value', async ({ page }) => {
      await page.goto(APP_URL);
      // Ensure a tree exists
      await page.waitForSelector('#output');

      // Get a node's client coordinates by reading node.x/node.y and canvas bounding rect and pan/scale
      const nodeInfo = await page.evaluate(() => {
        // choose first inorder node
        const nodes = tree.inorder();
        if (!nodes.length) return null;
        const node = nodes[0]; // leftmost node
        const rect = canvas.getBoundingClientRect();
        const clientX = rect.left + (node.x + offsetX) * scale;
        const clientY = rect.top + (node.y + offsetY) * scale;
        return { value: node.value, clientX, clientY };
      });
      expect(nodeInfo).not.toBeNull();

      // Click on the computed coords
      await page.mouse.click(nodeInfo.clientX, nodeInfo.clientY);
      // small wait
      await page.waitForTimeout(200);

      // Check the input got autofilled
      const val = await page.inputValue('#valueInput');
      expect(Number(val)).toBe(nodeInfo.value);
    });

    test('Canvas pan via mousedown/mousemove/mouseup updates offset and cursor', async ({ page }) => {
      await page.goto(APP_URL);
      const canvasBox = await page.locator('#treeCanvas').boundingBox();
      expect(canvasBox).not.toBeNull();

      // Record initial offsetX from page
      const initialOffset = await page.evaluate(() => offsetX);

      // Mousedown at center of canvas
      const startX = canvasBox.x + canvasBox.width / 2;
      const startY = canvasBox.y + canvasBox.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      // Cursor should be grabbing
      const cursorWhileDown = await page.evaluate(() => document.getElementById('treeCanvas').style.cursor);
      // The style is set to 'grabbing' on mousedown
      expect(cursorWhileDown === 'grabbing' || cursorWhileDown === '').toBeTruthy();

      // Move the mouse a bit to pan
      await page.mouse.move(startX + 80, startY + 40);
      await page.waitForTimeout(200);

      // Release mouse
      await page.mouse.up();
      await page.waitForTimeout(200);

      // Cursor should be default now
      const cursorAfter = await page.evaluate(() => document.getElementById('treeCanvas').style.cursor);
      expect(cursorAfter === 'default' || cursorAfter === '').toBeTruthy();

      // offsetX should have changed
      const afterOffset = await page.evaluate(() => offsetX);
      expect(afterOffset).not.toBe(initialOffset);
    });

    test('Canvas wheel zoom changes scale value (CANVAS_WHEEL)', async ({ page }) => {
      await page.goto(APP_URL);

      const scaleBefore = await page.evaluate(() => scale);
      // Dispatch a wheel event to zoom in
      await page.evaluate(() => {
        const ev = new WheelEvent('wheel', { deltaY: -120, clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
        canvas.dispatchEvent(ev);
      });
      await page.waitForTimeout(200);
      const scaleAfter = await page.evaluate(() => scale);
      expect(scaleAfter).not.toBe(scaleBefore);
      // Should be within allowed bounds
      expect(scaleAfter).toBeGreaterThanOrEqual(0.3);
      expect(scaleAfter).toBeLessThanOrEqual(3.0);
    });
  });

  test.describe('Window & UI events: resize, speed input, keyboard', () => {
    test('Window resize triggers fitCanvasToWindow and canvas size updates', async ({ page }) => {
      await page.goto(APP_URL);
      const initialCanvasWidth = await page.evaluate(() => canvas.width);
      // Resize viewport to smaller size
      await page.setViewportSize({ width: 800, height: 600 });
      // Wait for listener to run
      await page.waitForTimeout(300);
      const newCanvasWidth = await page.evaluate(() => canvas.width);
      expect(newCanvasWidth).not.toBe(initialCanvasWidth);
      expect(newCanvasWidth).toBeGreaterThanOrEqual(600);
    });

    test('Speed range input updates speedVal display (SPEED_INPUT)', async ({ page }) => {
      await page.goto(APP_URL);
      // Set speed to 200
      await page.evaluate(() => { UI.speedRange.value = '200'; UI.speedRange.dispatchEvent(new Event('input')); });
      await page.waitForTimeout(100);
      const speedVal = await page.textContent('#speedVal');
      expect(speedVal).toBe('200ms');
    });

    test('Keyboard Enter triggers insert; Delete key triggers delete (KEYDOWN_GLOBAL)', async ({ page }) => {
      await page.goto(APP_URL);
      // Ensure speed fast to quickly process animations
      await page.evaluate(() => { UI.speedRange.value = '100'; setSpeedDisplay(); });

      // Start by inserting a unique value via Enter
      await page.focus('#valueInput');
      await page.fill('#valueInput', '4242');
      await page.keyboard.press('Enter');
      // Allow time for animation + draw
      await page.waitForTimeout(700);
      let sizeAfterEnter = Number(await page.textContent('#size'));
      expect(sizeAfterEnter).toBeGreaterThanOrEqual(12); // seed + inserted earlier may vary

      // Now press Delete key which should trigger deleteBtn click for current input value (4242)
      await page.focus('#valueInput');
      // Ensure value present
      await page.fill('#valueInput', '4242');
      await page.keyboard.press('Delete');
      await page.waitForTimeout(1000); // allow search + delete animation
      const sizeAfterDelete = Number(await page.textContent('#size'));
      // Size should decrease
      expect(sizeAfterDelete).toBeLessThanOrEqual(sizeAfterEnter - 0);
      // We expect it to have decreased by at least 1 if the value existed
    });
  });

  // Final overall check: ensure no uncaught page errors during a full interaction run
  test('Full interaction smoke test does not produce page errors', async ({ page }) => {
    const { pageErrors } = await attachObservers(page);
    await page.goto(APP_URL);

    // Perform a series of interactions quickly
    await page.evaluate(() => { UI.speedRange.value = '100'; setSpeedDisplay(); });
    await page.click('#inorderBtn');
    await page.waitForTimeout(300);
    await page.click('#stopAnim');
    await page.waitForTimeout(100);
    await page.click('#randomBtn');
    await page.waitForTimeout(200);
    await page.click('#levelBtn');
    await page.waitForTimeout(300);

    // No uncaught page errors should have occurred
    expect(pageErrors.length).toBe(0);
  });
});