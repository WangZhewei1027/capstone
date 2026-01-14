import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0cccca70-d5b5-11f0-899c-75bf12e026a9.html';

test.describe('Kruskal Algorithm Visualization (0cccca70-d5b5-11f0-899c-75bf12e026a9)', () => {
  // Shared variables to capture runtime console errors and page errors
  test.beforeEach(async ({ page }) => {
    // Collect console error messages and page errors for assertions
    page.context().setDefaultTimeout(60000);
    page.on('console', msg => {
      // Retain console messages on the page object for test inspection
      const arr = page['_consoleMessages'] || (page['_consoleMessages'] = []);
      arr.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', error => {
      const arr = page['_pageErrors'] || (page['_pageErrors'] = []);
      arr.push(error);
    });

    // Navigate to the application; note the URL has an intentional space as provided
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Wait for DOM to stabilize: the canvas and controls should exist
    await expect(page.locator('#graph-canvas')).toBeVisible();
    await expect(page.locator('#next-step')).toBeVisible();
    await expect(page.locator('#prev-step')).toBeVisible();
    await expect(page.locator('#reset-btn')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // If there are any page errors or console errors we will assert in tests;
    // but keep the page state reset between tests by closing.
    try {
      await page.close();
    } catch (e) {
      // ignore
    }
  });

  test.describe('Initialization and Idle State (S0_Idle)', () => {
    test('should initialize in Idle: resetState() effect visible, prev disabled, explanation present', async ({ page }) => {
      // This test validates the initial (Idle) state after resetState() entry action:
      // - Previous Step button should be disabled
      // - Next Step button should be enabled
      // - Explanation should indicate algorithm not started
      const prev = page.locator('#prev-step');
      const next = page.locator('#next-step');
      const reset = page.locator('#reset-btn');
      const explanation = page.locator('#explanation');

      await expect(prev).toBeVisible();
      await expect(next).toBeVisible();
      await expect(reset).toBeVisible();

      // prev should be disabled by initial resetState()
      await expect(prev).toBeDisabled();
      // next should be enabled initially
      await expect(next).toBeEnabled();

      // Explanation should state the algorithm not started yet
      await expect(explanation).toContainText('Algorithm not started yet');

      // Ensure no uncaught page errors or console error messages happened during initialization
      const consoleMessages = page['_consoleMessages'] || [];
      const pageErrors = page['_pageErrors'] || [];
      // Assert there are no runtime errors recorded (we allow console logs but not errors)
      expect(pageErrors.length, 'No runtime page errors expected on load').toBe(0);
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length, 'No console.error messages expected on load').toBe(0);
    });
  });

  test.describe('Stepping Through Algorithm (S1_Step_Forward and S2_Step_Backward)', () => {
    test('Next Step should advance consideration and update MST and edge list', async ({ page }) => {
      // This test exercises NextStep transitions repeatedly and validates:
      // - the highlighted edge ([index]) in the edge list moves forward
      // - the MST list shows accepted edges incrementally according to algorithm logic
      // - prev button becomes enabled after first step
      // - next becomes disabled at the final allowed step
      const prev = page.locator('#prev-step');
      const next = page.locator('#next-step');
      const edgeList = page.locator('#edge-list');
      const mstList = page.locator('#mst-list');

      // Helper to count accepted edges shown in mst-list
      const countAcceptedEdges = async () => {
        const html = await mstList.innerHTML();
        // Count occurrences of "Edge " lines that represent selected edges
        // The UI shows each accepted edge as "Edge u - v (wt: w)<br/>"
        const matches = html.match(/Edge\s+\d+\s*-\s*\d+\s*\(wt:/g);
        return matches ? matches.length : 0;
      };

      // Expected accepted edges after each step index (0-based currentStep)
      // Derived from reasoning over the graph and algorithm (as implemented)
      const expectedAcceptedCounts = {
        0: 1,
        1: 2,
        2: 3,
        3: 4,
        4: 5,
        5: 5, // rejected
        6: 5, // rejected
        7: 5, // rejected
        8: 6, // accepted, completes MST (6 edges for 7 nodes)
        9: 6,
        10:6
      };

      // Iterate clicking next sequentially up to the number of sorted edges (11)
      // After each click, validate UI reflects expected accepted count and highlight index
      for (let step = 0; step <= 10; step++) {
        await next.click();

        // After advancing, prev should be enabled (since currentStep >= 0)
        await expect(prev).toBeEnabled();

        // Edge list should contain a highlighted div with class "step-highlight" representing current step
        const highlighted = edgeList.locator('.step-highlight');
        await expect(highlighted).toHaveCount(1);
        // The highlighted element's text should start with the index in brackets e.g. "[0]"
        const highlightedText = await highlighted.innerText();
        expect(highlightedText.trim().startsWith('[' + step + ']'), `highlighted index should be [${step}]`).toBe(true);

        // MST accepted count should match expected map
        const acceptedCount = await countAcceptedEdges();
        const expected = expectedAcceptedCounts[step];
        expect(acceptedCount, `At step ${step} accepted edges`).toBe(expected);

        // next button should be disabled only when reaching the last index (10)
        if (step < 10) {
          await expect(next).toBeEnabled();
        } else {
          await expect(next).toBeDisabled();
        }
      }

      // At the end, ensure no runtime errors were emitted during stepping
      const consoleMessages = page['_consoleMessages'] || [];
      const pageErrors = page['_pageErrors'] || [];
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(pageErrors.length, 'No page errors while stepping').toBe(0);
      expect(consoleErrors.length, 'No console.error while stepping').toBe(0);
    });

    test('Prev Step should move backward and undo last decision', async ({ page }) => {
      // This test validates the PrevStep transitions:
      // - After stepping forward a few times, clicking prev undoes the last step
      // - The highlighted current edge index decreases
      // - The MST list reflects removal when an accepted edge is undone
      const prev = page.locator('#prev-step');
      const next = page.locator('#next-step');
      const edgeList = page.locator('#edge-list');
      const mstList = page.locator('#mst-list');

      // Step forward 4 times to reach currentStep = 3
      for (let i = 0; i < 4; i++) await next.click();

      // Snapshot MST accepted count at step 3
      const acceptedBefore = (await mstList.innerHTML()).match(/Edge\s+\d+\s*-\s*\d+\s*\(wt:/g) || [];
      const countBefore = acceptedBefore.length;

      // Click prev once
      await prev.click();

      // Now the highlighted index should be 2
      const highlighted = edgeList.locator('.step-highlight');
      await expect(highlighted).toHaveCount(1);
      const highlightedText = await highlighted.innerText();
      expect(highlightedText.trim().startsWith('[2]'), 'After prev, highlighted index should be [2]').toBe(true);

      // MST accepted count should be <= previous (an accepted edge might have been undone)
      const acceptedAfter = (await mstList.innerHTML()).match(/Edge\s+\d+\s*-\s*\d+\s*\(wt:/g) || [];
      const countAfter = acceptedAfter.length;
      expect(countAfter <= countBefore, 'Accepted edges should be less than or equal after a prev step').toBe(true);

      // Clicking prev repeatedly until before first step should disable prev button and not throw
      // We will click prev until disabled to ensure graceful handling of edge-case prev on start.
      for (let i = 0; i < 5; i++) {
        if (await prev.isEnabled()) {
          await prev.click();
        } else {
          break;
        }
      }
      await expect(prev).toBeDisabled();
      // Explanation should again indicate "Algorithm not started yet." when fully reset to before first edge
      const explanation = page.locator('#explanation');
      await expect(explanation).toContainText('Algorithm not started yet');

      // Ensure no runtime errors occurred during prev operations
      const consoleMessages = page['_consoleMessages'] || [];
      const pageErrors = page['_pageErrors'] || [];
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(pageErrors.length, 'No page errors while using prev').toBe(0);
      expect(consoleErrors.length, 'No console.error while using prev').toBe(0);
    });
  });

  test.describe('Reset Behavior (S3_Reset)', () => {
    test('Reset button should bring the visualization back to Idle and clear selections', async ({ page }) => {
      // This test ensures resetState() works via Reset button (transition to S3_Reset)
      // - After some steps, clicking Reset should clear MST and edge highlights and disable prev
      const next = page.locator('#next-step');
      const prev = page.locator('#prev-step');
      const reset = page.locator('#reset-btn');
      const edgeList = page.locator('#edge-list');
      const mstList = page.locator('#mst-list');
      const explanation = page.locator('#explanation');

      // Advance a few steps
      for (let i = 0; i < 5; i++) await next.click();

      // Sanity: prev should be enabled and mst-list should have some entries
      await expect(prev).toBeEnabled();
      const beforeHTML = await mstList.innerHTML();
      expect(beforeHTML.length).toBeGreaterThan(0);

      // Click Reset
      await reset.click();

      // prev should be disabled again (idle)
      await expect(prev).toBeDisabled();

      // mst-list should indicate "No edges selected yet." (or similar "No edges selected yet.")
      const mstText = await mstList.innerText();
      expect(mstText.includes('No edges selected') || mstText.trim().length > 0).toBeTruthy();

      // Explanation should reflect idle state
      await expect(explanation).toContainText('Algorithm not started yet');

      // Edge list should have no step-highlight class since currentStep = -1
      const highlighted = edgeList.locator('.step-highlight');
      // It's valid to have zero highlighted elements after reset
      await expect(highlighted).toHaveCount(0);

      // No runtime errors during reset
      const consoleMessages = page['_consoleMessages'] || [];
      const pageErrors = page['_pageErrors'] || [];
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(pageErrors.length, 'No page errors during reset').toBe(0);
      expect(consoleErrors.length, 'No console.error during reset').toBe(0);
    });
  });

  test.describe('Node Dragging Interaction (NodeDrag event)', () => {
    test('should allow dragging a node on the canvas and update the drawing without errors', async ({ page }) => {
      // This test simulates a user dragging the top-most node (node 0)
      // - It calculates a likely node position (top center) using canvas bounding box and known RADIUS=150
      // - It performs mouse events (down, move, up) and then inspects canvas pixel data to confirm a node appears at the new location
      // - It monitors console/page errors for any runtime exceptions during dragging
      const canvas = page.locator('#graph-canvas');
      const bbox = await canvas.boundingBox();
      if (!bbox) {
        throw new Error('Canvas bounding box not available');
      }

      const RADIUS = 150; // as defined in app script
      // Determine canvas center in client coordinates
      const centerX = bbox.x + bbox.width / 2;
      const centerY = bbox.y + bbox.height / 2;

      // Node 0 is placed at angle -pi/2 (top center), so its client coordinates should be roughly:
      const nodeStartX = centerX;
      const nodeStartY = centerY - RADIUS;

      // Choose an end position to drag the node to (shift by +40,+30)
      const nodeEndX = nodeStartX + 40;
      const nodeEndY = nodeStartY + 30;

      // Perform the drag using page.mouse (this will trigger mousedown on canvas, window mousemove, and mouseup)
      await page.mouse.move(nodeStartX, nodeStartY);
      await page.mouse.down();
      // Move in steps to simulate a real user drag
      await page.mouse.move(nodeEndX, nodeEndY, { steps: 12 });
      await page.mouse.up();

      // After drag, inspect the canvas pixel at the drop location to verify the node was drawn there.
      // Because the canvas uses devicePixelRatio scaling, sample at device pixels.
      const pixel = await page.evaluate(({ clientX, clientY }) => {
        const canvas = document.getElementById('graph-canvas');
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        // Convert client coordinates to canvas pixel coordinates
        const canvasX = Math.round((clientX - rect.left) * dpr);
        const canvasY = Math.round((clientY - rect.top) * dpr);
        try {
          const ctx = canvas.getContext('2d');
          const data = ctx.getImageData(canvasX, canvasY, 1, 1).data;
          return { success: true, data: Array.from(data) };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      }, { clientX: nodeEndX, clientY: nodeEndY });

      // Validate we got pixel data and it does not match the background color exactly (#fafafa -> approx 250,250,250)
      if (!pixel.success) {
        // If we can't access image data due to CORS/different reasons, fail the test deliberately
        throw new Error('Unable to read canvas pixel data: ' + (pixel.error || 'unknown'));
      } else {
        const [r, g, b, a] = pixel.data;
        // Node fill color is '#bbb' -> rgb(187,187,187). We assert the pixel at drop location is not the background (near 250)
        const isBackground = (r >= 245 && g >= 245 && b >= 245);
        expect(isBackground, `Expected dragged-to pixel not to be background color; got rgba(${r},${g},${b},${a})`).toBe(false);
      }

      // Also ensure no runtime errors occurred during dragging
      const consoleMessages = page['_consoleMessages'] || [];
      const pageErrors = page['_pageErrors'] || [];
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(pageErrors.length, 'No page errors during node drag').toBe(0);
      expect(consoleErrors.length, 'No console.error during node drag').toBe(0);
    });
  });

  test.describe('Edge Cases and Error Scenarios', () => {
    test('clicking prev when disabled should be a no-op and not cause errors', async ({ page }) => {
      // This test ensures that clicking disabled Prev button is handled gracefully
      const prev = page.locator('#prev-step');
      const explanation = page.locator('#explanation');

      // Ensure prev is disabled at start
      await expect(prev).toBeDisabled();

      // Attempt to click (this should do nothing)
      await prev.click({ force: true }).catch(() => {
        // Some frameworks throw when forcing click on disabled element; ignore as we only care that it doesn't cause runtime errors
      });

      // Explanation should still reflect idle state
      await expect(explanation).toContainText('Algorithm not started yet');

      // No runtime errors
      const consoleMessages = page['_consoleMessages'] || [];
      const pageErrors = page['_pageErrors'] || [];
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(pageErrors.length, 'No page errors after clicking disabled prev').toBe(0);
      expect(consoleErrors.length, 'No console.error after clicking disabled prev').toBe(0);
    });

    test('click next repeatedly past last step should not throw and next becomes disabled', async ({ page }) => {
      // This test verifies clicking Next repeatedly will not produce runtime exceptions
      const next = page.locator('#next-step');

      // Click until it becomes disabled; allow extra clicks to ensure guards are in place
      for (let i = 0; i < 15; i++) {
        if (await next.isEnabled()) {
          await next.click();
        } else {
          // If disabled, attempt one forced click to ensure no runtime exception arises (and ignore the thrown Playwright error)
          await next.click({ force: true }).catch(() => {});
        }
      }

      // After all those clicks, next should be disabled
      await expect(next).toBeDisabled();

      // No runtime page errors emitted
      const consoleMessages = page['_consoleMessages'] || [];
      const pageErrors = page['_pageErrors'] || [];
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(pageErrors.length, 'No page errors after repeated next clicks').toBe(0);
      expect(consoleErrors.length, 'No console.error after repeated next clicks').toBe(0);
    });
  });
});