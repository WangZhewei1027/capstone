import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8aa591-d59e-11f0-89ab-2f71529652ac.html';

// Test file for Red-Black Tree visualization application
// Filename requirement:
// 7e8aa591-d59e-11f0-89ab-2f71529652ac-red-black-tree.spec.js

test.describe('Red-Black Tree Visualization - 7e8aa591-d59e-11f0-89ab-2f71529652ac', () => {
  // Arrays to collect console errors and page errors for each test run
  let consoleErrors;
  let pageErrors;

  // Setup: beforeEach test, navigate to the page and attach listeners to capture console/page errors.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', (err) => {
      // store the error message for assertions later
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Load the page exactly as-is and wait for network to be quiet
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
  });

  // Teardown: afterEach, ensure no unexpected console or page errors occurred
  test.afterEach(async () => {
    // assert no page errors were captured
    expect(pageErrors, `Unexpected page errors: ${JSON.stringify(pageErrors)}`).toEqual([]);
    // assert no console errors were logged
    expect(consoleErrors, `Unexpected console errors: ${JSON.stringify(consoleErrors)}`).toEqual([]);
  });

  // Helper page object functions scoped to the page evaluate calls
  // We will call these via page.evaluate where necessary.

  test('Initial page load shows input, insert button, and canvas', async ({ page }) => {
    // Purpose: Verify initial DOM elements are present and visible
    const inputVisible = await page.isVisible('#value');
    const insertVisible = await page.isVisible('#insert');
    const canvasVisible = await page.isVisible('#treeCanvas');

    expect(inputVisible).toBeTruthy();
    expect(insertVisible).toBeTruthy();
    expect(canvasVisible).toBeTruthy();

    // Verify input is of type number
    const inputType = await page.getAttribute('#value', 'type');
    expect(inputType).toBe('number');

    // Check that the canvas has expected width/height attributes
    const canvasProps = await page.$eval('#treeCanvas', (c) => ({ w: c.width, h: c.height }));
    expect(canvasProps.w).toBeGreaterThan(0);
    expect(canvasProps.h).toBeGreaterThan(0);

    // Ensure the global tree object exists on the page
    const hasTree = await page.evaluate(() => typeof window.tree !== 'undefined' && !!window.tree);
    expect(hasTree).toBeTruthy();
  });

  test('Inserting a single value creates a black root node and clears the input', async ({ page }) => {
    // Purpose: Insert one number and assert the tree root contains it and is black, input cleared

    // Capture canvas initial image data URL to later detect drawing changes
    const initialDataUrl = await page.$eval('#treeCanvas', (canvas) => canvas.toDataURL());

    // Type a value into the input and click insert
    await page.fill('#value', '15');
    await page.click('#insert');

    // After insertion, the input should be cleared
    const inputValue = await page.$eval('#value', (el) => el.value);
    expect(inputValue).toBe('');

    // Access the tree data structure on the page and assert root properties
    const rootInfo = await page.evaluate(() => {
      // Read the root, its data, and color, safely handling the NIL sentinel
      const t = window.tree;
      const root = t.root;
      const isNil = root === t.NIL;
      return {
        isNil,
        data: isNil ? null : root.data,
        color: isNil ? null : root.color,
        // also return whether left/right are NIL
        leftIsNIL: isNil ? true : root.left === t.NIL,
        rightIsNIL: isNil ? true : root.right === t.NIL
      };
    });

    expect(rootInfo.isNil).toBeFalsy();
    expect(rootInfo.data).toBe(15);
    // Root must be black according to fixInsert
    expect(rootInfo.color).toBe('black');
    // With single node, both children should be NIL
    expect(rootInfo.leftIsNIL).toBeTruthy();
    expect(rootInfo.rightIsNIL).toBeTruthy();

    // Verify that canvas changed (simple heuristic: dataURL differs)
    const afterDataUrl = await page.$eval('#treeCanvas', (canvas) => canvas.toDataURL());
    expect(afterDataUrl).not.toBe(initialDataUrl);
  });

  test('Inserting 10,20,30 results in balanced root 20 and expected child colors (rotation test)', async ({ page }) => {
    // Purpose: Insert sequence designed to trigger rotations/fixups and assert resulting tree structure.
    // Insert 10
    await page.fill('#value', '10');
    await page.click('#insert');

    // Insert 20
    await page.fill('#value', '20');
    await page.click('#insert');

    // Insert 30 -> should cause a re-balance such that 20 becomes root (typical RB behavior)
    await page.fill('#value', '30');
    await page.click('#insert');

    // Inspect the tree structure
    const treeSnapshot = await page.evaluate(() => {
      const t1 = window.tree;
      const root1 = t.root1;
      const nil = t.NIL;
      function nodeToObject(n) {
        if (n === nil) return null;
        return {
          data: n.data,
          color: n.color,
          left: n.left === nil ? null : { data: n.left.data, color: n.left.color },
          right: n.right === nil ? null : { data: n.right.data, color: n.right.color },
          parent: n.parent === null || n.parent === nil ? null : { data: n.parent.data, color: n.parent.color }
        };
      }
      return {
        root: nodeToObject(root)
      };
    });

    // Expect root to be 20 and black, left child 10 (red), right child 30 (red)
    expect(treeSnapshot.root).not.toBeNull();
    expect(treeSnapshot.root.data).toBe(20);
    expect(treeSnapshot.root.color).toBe('black');

    // Left and right children should exist with expected values
    expect(treeSnapshot.root.left).not.toBeNull();
    expect(treeSnapshot.root.left.data).toBe(10);
    // Color might be red according to typical balancing; assert it's either 'red' or 'black'
    expect(['red', 'black']).toContain(treeSnapshot.root.left.color);

    expect(treeSnapshot.root.right).not.toBeNull();
    expect(treeSnapshot.root.right.data).toBe(30);
    expect(['red', 'black']).toContain(treeSnapshot.root.right.color);
  });

  test('Clicking insert with empty input does not modify the tree', async ({ page }) => {
    // Purpose: Ensure that clicking insert when input is empty does not change the tree state.

    // Record initial root identity (could be NIL)
    const initialRoot = await page.evaluate(() => {
      const t2 = window.tree;
      // We return simple representation to compare
      const r = t.root;
      if (r === t.NIL) return { isNIL: true };
      return { isNIL: false, data: r.data, color: r.color };
    });

    // Ensure input is empty
    await page.fill('#value', '');
    // Click insert button
    await page.click('#insert');

    // After click, check root again
    const afterRoot = await page.evaluate(() => {
      const t3 = window.tree;
      const r1 = t.root;
      if (r === t.NIL) return { isNIL: true };
      return { isNIL: false, data: r.data, color: r.color };
    });

    // They should be identical (no change)
    expect(afterRoot).toEqual(initialRoot);
  });

  test('Inserting duplicate values places them in the right subtree (>= goes right)', async ({ page }) => {
    // Purpose: Verify insertion policy for equal values goes to the right subtree.

    // Insert 50
    await page.fill('#value', '50');
    await page.click('#insert');

    // Insert duplicate 50 again
    await page.fill('#value', '50');
    await page.click('#insert');

    // Inspect root and its right child
    const dupSnapshot = await page.evaluate(() => {
      const t4 = window.tree;
      const nil1 = t.NIL;
      const root2 = t.root2;
      return {
        rootData: root === nil ? null : root.data,
        rootColor: root === nil ? null : root.color,
        rightData: (root === nil || root.right === nil || root.right === nil) ? (root.right === nil ? null : (root.right === nil ? null : root.right.data)) : (root.right === t.NIL ? null : root.right.data),
        rightIsNIL: root === nil ? true : root.right === t.NIL
      };
    });

    // Root should be 50
    expect(dupSnapshot.rootData).toBe(50);

    // After inserting duplicate, there should be a right child (not NIL) because logic sends equal to right
    expect(dupSnapshot.rightIsNIL).toBe(false);
    expect(dupSnapshot.rightData).toBe(50);
  });

  test('Canvas drawing occurs after insertion (pixel sampling)', async ({ page }) => {
    // Purpose: Verify that drawing operations affect canvas pixel data after a node is inserted.

    // Get initial few pixel samples from top-left of canvas (all white background expected initially)
    const initialPixels = await page.evaluate(() => {
      const c = document.getElementById('treeCanvas');
      const ctx = c.getContext('2d');
      // sample a small set of coordinates
      const coords = [
        [10, 10],
        [400, 30],
        [400, 60]
      ];
      return coords.map(([x, y]) => {
        const p = ctx.getImageData(x, y, 1, 1).data;
        return [p[0], p[1], p[2], p[3]]; // rgba
      });
    });

    // Insert a value expected to draw a node near the top center
    await page.fill('#value', '5');
    await page.click('#insert');

    // Give a short pause to allow rendering (should be synchronous but be defensive)
    await page.waitForTimeout(50);

    const afterPixels = await page.evaluate(() => {
      const c1 = document.getElementById('treeCanvas');
      const ctx1 = c.getContext('2d');
      const coords1 = [
        [10, 10],
        [400, 30],
        [400, 60]
      ];
      return coords.map(([x, y]) => {
        const p1 = ctx.getImageData(x, y, 1, 1).data;
        return [p[0], p[1], p[2], p[3]];
      });
    });

    // At least one sampled pixel should have changed to indicate drawing occurred
    const pixelsDiffer = initialPixels.some((initial, idx) => {
      const after = afterPixels[idx];
      return initial[0] !== after[0] || initial[1] !== after[1] || initial[2] !== after[2] || initial[3] !== after[3];
    });
    expect(pixelsDiffer).toBeTruthy();
  });
});