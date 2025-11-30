import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/262784d1-cd2a-11f0-bee4-a3a342d77f94.html';

test.describe('Graph Visualization (Directed and Undirected) - Application ID 262784d1-cd2a-11f0-bee4-a3a342d77f94', () => {
  // Arrays to record console errors and page errors during each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize error collectors before each test
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          type: msg.type(),
          text: msg.text(),
        });
      }
    });

    // Listen for unhandled exceptions (pageerror)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async ({ page }) => {
    // If there were any errors captured, print them to test logs for debugging
    if (consoleErrors.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Console errors captured:', consoleErrors);
    }
    if (pageErrors.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Page errors captured:', pageErrors);
    }
    // Ensure clean state by closing the page
    await page.close();
  });

  test('Page loads and shows header and container', async ({ page }) => {
    // Purpose: Verify the page loads and main elements exist (title, header, graph container)
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Check document title
    await expect(page).toHaveTitle(/Graph Visualization/i);

    // Header exists and contains expected text
    const header = await page.locator('h1');
    await expect(header).toHaveText(/Graph Visualization \(Directed and Undirected\)/i);

    // Graph container exists and has the expected id
    const container = await page.locator('#graph-container');
    await expect(container).toBeVisible();

    // The container should have the style-defined width and height in px as inline/computed style
    const box = await container.boundingBox();
    expect(box).not.toBeNull();
    // The HTML sets width and height to 600px (CSS). Allow some tolerance in different environments.
    expect(box.width).toBeGreaterThanOrEqual(590);
    expect(box.height).toBeGreaterThanOrEqual(590);

    // Assert no console errors or page errors occurred during basic load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Renders exactly three nodes with correct labels and positions', async ({ page }) => {
    // Purpose: Verify nodes are created, have correct labels A, B, C, and expected positions
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Collect node elements
    const nodes = await page.$$('.node');
    // There should be exactly 3 nodes as per the HTML script
    expect(nodes.length).toBe(3);

    // Map of expected nodes and their positions from the script
    const expected = {
      A: { x: 100, y: 100 },
      B: { x: 300, y: 100 },
      C: { x: 200, y: 300 },
    };

    // For each node element verify label and inline left/top styles (positioning)
    const foundLabels = [];
    for (const nodeEl of nodes) {
      const label = await nodeEl.evaluate(n => n.innerText);
      foundLabels.push(label);

      // Read inline style.left and style.top (in pixels)
      const style = await nodeEl.evaluate(n => ({
        left: n.style.left,
        top: n.style.top
      }));

      // Expect style to be like "100px"
      expect(style.left).toMatch(/^\d+px$/);
      expect(style.top).toMatch(/^\d+px$/);

      // Parse numeric values
      const leftPx = parseInt(style.left, 10);
      const topPx = parseInt(style.top, 10);

      // The script sets left = node.x + 'px' and top = node.y + 'px'
      // Validate that this corresponds approximately to expected coordinates
      expect(Object.keys(expected).length).toBe(3);
      if (expected[label]) {
        expect(leftPx).toBe(expected[label].x);
        expect(topPx).toBe(expected[label].y);
      } else {
        // If unexpected label found, fail the test
        throw new Error(`Unexpected node label found: ${label}`);
      }
    }

    // Ensure all expected labels are present
    expect(foundLabels.sort()).toEqual(Object.keys(expected).sort());

    // Assert no console or page errors occurred during node rendering
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Renders three edges with correct widths, rotations and directed/undirected styling', async ({ page }) => {
    // Purpose: Verify edges are created, have expected count, widths roughly equal to distances between nodes,
    // rotation applied, and directed edges have arrow-like borderTop styling while undirected do not.
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Grab node positions as used by the graph script (center coordinates were node.x + 10, node.y + 10)
    const nodePositions = await page.evaluate(() => {
      // Reconstruct nodes by reading .node elements and their labels and styles
      const nodes = Array.from(document.querySelectorAll('.node')).map(n => {
        return {
          label: n.innerText,
          left: parseFloat(n.style.left || '0'),
          top: parseFloat(n.style.top || '0'),
        };
      });
      // Convert to the same coordinate reference used when drawing edges (node.x + 10, node.y + 10)
      const map = {};
      nodes.forEach(n => {
        map[n.label] = { cx: n.left + 10, cy: n.top + 10 };
      });
      return map;
    });

    // There should be three edges
    const edges = await page.$$('.edge');
    expect(edges.length).toBe(3);

    // Helper to extract inline styles for each edge
    const edgeData = await Promise.all(edges.map(edge => edge.evaluate(e => {
      return {
        width: e.style.width,           // e.g., "200px" or "223.606797749979px"
        left: e.style.left,             // starting x
        top: e.style.top,               // starting y
        transform: e.style.transform,   // rotation "rotate(Xdeg)"
        borderTop: e.style.borderTop,   // set for directed edges
        // presence of border properties relevant to directed arrow styling
        borderRight: e.style.borderRight,
        borderLeft: e.style.borderLeft,
        height: e.style.height
      };
    })));

    // Determine which edges are directed by inspecting borderTop presence
    const directedEdges = edgeData.filter(e => e.borderTop && e.borderTop.trim() !== '');
    const undirectedEdges = edgeData.filter(e => !e.borderTop || e.borderTop.trim() === '');

    // According to the script, there are two directed edges (A->B, A->C) and one undirected (B--C)
    expect(directedEdges.length).toBe(2);
    expect(undirectedEdges.length).toBe(1);

    // Validate widths approximately match computed distances between nodes
    // We'll match each edge by comparing its left/top (start point) to expected node centers, then compute expected length
    for (const e of edgeData) {
      // Parse numeric left/top/width
      const left = parseFloat(e.left || '0');
      const top = parseFloat(e.top || '0');
      const width = parseFloat(e.width || '0');

      // Find which node center this start point is closest to (A, B, or C)
      const distancesToNodes = Object.entries(nodePositions).map(([label, pos]) => {
        const dx = Math.abs(pos.cx - left);
        const dy = Math.abs(pos.cy - top);
        return { label, distance: Math.hypot(dx, dy), pos };
      }).sort((a, b) => a.distance - b.distance);

      // The closest should be within a small threshold (<= 1 px)
      expect(distancesToNodes[0].distance).toBeLessThanOrEqual(1.5);

      const startNodeLabel = distancesToNodes[0].label;
      const startPos = distancesToNodes[0].pos;

      // Now compute expected target by finding the other node that yields the width distance
      // Search among remaining node centers and compare expected distance to the width
      const otherNodes = Object.entries(nodePositions).filter(([lbl]) => lbl !== startNodeLabel);
      let matched = false;
      for (const [lbl, pos] of otherNodes) {
        const dx = pos.cx - startPos.cx;
        const dy = pos.cy - startPos.cy;
        const expectedLength = Math.hypot(dx, dy);

        // Allow a tiny tolerance due to floating point representation
        const tolerance = 0.6; // px
        if (Math.abs(expectedLength - width) <= tolerance) {
          matched = true;
          // Also ensure transform includes "rotate(" which indicates rotation applied
          expect(e.transform).toMatch(/rotate\(-?\d+(\.\d+)?deg\)/);
          break;
        }
      }
      if (!matched) {
        // Fail test if edge length doesn't match any expected node-to-node distance
        throw new Error(`Edge starting at (${left}px, ${top}px) has width ${width}px which doesn't match expected node distances.`);
      }
    }

    // Final check: directed edges should have arrow-like inline styling (borderTop set and height '0')
    for (const de of directedEdges) {
      // borderTop was set to "10px solid #000" in the script - different browsers may represent color differently,
      // so check that borderTop contains '10px' and 'solid'
      expect(de.borderTop).toMatch(/10px/);
      expect(de.borderTop).toMatch(/solid/);
      // Height should be '0' as set in script for arrow triangles
      expect(de.height).toBe('0');
    }

    // Undirected edge should not have borderTop arrow styling
    for (const ue of undirectedEdges) {
      expect(ue.borderTop === '' || ue.borderTop === undefined).toBeTruthy();
    }

    // Assert no console or page errors occurred during edge rendering
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('No interactive controls exist (buttons, inputs, forms, selects) and app is static as implemented', async ({ page }) => {
    // Purpose: Verify there are no interactive controls in the DOM since the provided implementation has none.
    await page.goto(APP_URL, { waitUntil: 'load' });

    const interactiveSelector = 'button, input, textarea, select, form, [role="button"], [type="button"]';

    const interactiveElements = await page.$$(interactiveSelector);

    // The script does not create any interactive controls; expect zero interactive elements
    expect(interactiveElements.length).toBe(0);

    // Additionally assert that the app doesn't respond to clicks by changing DOM (since no interactive elements)
    // Click at the center of the container and ensure the number of nodes and edges remain unchanged afterwards
    const nodesBefore = (await page.$$('.node')).length;
    const edgesBefore = (await page.$$('.edge')).length;

    // Click in the middle of the container
    const container = await page.$('#graph-container');
    const box = await container.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }

    const nodesAfter = (await page.$$('.node')).length;
    const edgesAfter = (await page.$$('.edge')).length;

    expect(nodesAfter).toBe(nodesBefore);
    expect(edgesAfter).toBe(edgesBefore);

    // Assert no console or page errors occurred during this interaction
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Accessibility basics: nodes are present in DOM and have readable text (labels)', async ({ page }) => {
    // Purpose: Basic accessibility assertion - visible text labels exist for nodes
    await page.goto(APP_URL, { waitUntil: 'load' });

    const nodeLocators = await page.$$('.node');
    expect(nodeLocators.length).toBe(3);

    // Ensure each node has non-empty innerText and is visible
    for (const node of nodeLocators) {
      const text = await node.evaluate(n => n.innerText);
      expect(text).toMatch(/^[A-C]$/); // Expect single letter labels A, B, or C

      // Also ensure the node is within the bounding container (visible coordinates)
      const rect = await node.boundingBox();
      expect(rect).not.toBeNull();
      if (rect) {
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
      }
    }

    // Assert no console or page errors occurred during accessibility checks
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});