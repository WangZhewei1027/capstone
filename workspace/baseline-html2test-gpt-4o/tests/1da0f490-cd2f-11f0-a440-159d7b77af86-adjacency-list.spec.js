import { test, expect } from '@playwright/test';

test.describe('Adjacency List Demo - 1da0f490-cd2f-11f0-a440-159d7b77af86', () => {
  // URL where the HTML is hosted
  const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0f490-cd2f-11f0-a440-159d7b77af86.html';

  // Helper to attach listeners to capture console messages and page errors
  async function attachErrorListeners(page) {
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', err => {
      // collect the error object (message)
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    return { consoleMessages, pageErrors };
  }

  // Before each test navigate to the page and set up listeners
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Test initial page load: check DOM elements and that no runtime errors occurred
  test('Initial load: inputs, buttons, canvas and list container are present and no runtime errors', async ({ page }) => {
    // Attach listeners to gather console messages and page errors
    const { consoleMessages, pageErrors } = await attachErrorListeners(page);

    // Verify presence and visibility of interactive elements
    const vertexInput = page.locator('#vertexInput');
    const neighborInput = page.locator('#neighborInput');
    const addButton = page.getByRole('button', { name: 'Add Vertex' });
    const drawButton = page.getByRole('button', { name: 'Draw Graph' });
    const listRepresentation = page.locator('#listRepresentation');
    const canvas = page.locator('#graphCanvas');

    await expect(vertexInput).toBeVisible();
    await expect(neighborInput).toBeVisible();
    await expect(addButton).toBeVisible();
    await expect(drawButton).toBeVisible();
    await expect(listRepresentation).toBeVisible();
    await expect(canvas).toBeVisible();

    // Initially, listRepresentation should not contain a JSON pre block (empty state)
    const listHtml = await listRepresentation.innerHTML();
    // It may be empty string before any vertices added; assert it's either empty or doesn't include "Adjacency List Representation"
    expect(listHtml === '' || !listHtml.includes('Adjacency List Representation:')).toBeTruthy();

    // Wait a brief moment to capture any asynchronous errors that might occur during load/draw initialization
    await page.waitForTimeout(100);

    // Assert that no uncaught page errors were emitted
    expect(pageErrors, 'No uncaught page errors should be emitted during initial load').toEqual([]);

    // Assert that console does not contain error-level messages or JS runtime error keywords
    const errorConsoleMessages = consoleMessages.filter(m =>
      m.type === 'error' ||
      /ReferenceError|TypeError|SyntaxError|Uncaught/i.test(m.text)
    );
    expect(errorConsoleMessages, 'No error-level console messages expected on initial load').toEqual([]);
  });

  // Test adding a vertex with multiple neighbors updates the adjacency list representation correctly
  test('Add Vertex: entering vertex and comma-separated neighbors updates the DOM adjacency list display', async ({ page }) => {
    // Capture console and page errors
    const { consoleMessages, pageErrors } = await attachErrorListeners(page);

    // Fill the inputs and click "Add Vertex"
    await page.fill('#vertexInput', 'A');
    await page.fill('#neighborInput', 'B, C');
    await page.click('button:has-text("Add Vertex")');

    // The listRepresentation should now include a JSON representation of the adjacency list
    const listRepresentation = page.locator('#listRepresentation');
    await expect(listRepresentation).toContainText('Adjacency List Representation:');

    // The displayed JSON should include "A": ["B", "C"]
    const preText = await listRepresentation.locator('pre').innerText();
    expect(preText).toContain('"A"');
    expect(preText).toContain('"B"');
    expect(preText).toContain('"C"');

    // Ensure no uncaught page errors or console error messages occurred during this interaction
    expect(pageErrors, 'No uncaught page errors should occur when adding a vertex').toEqual([]);
    const errorConsoleMessages = consoleMessages.filter(m =>
      m.type === 'error' ||
      /ReferenceError|TypeError|SyntaxError|Uncaught/i.test(m.text)
    );
    expect(errorConsoleMessages, 'No error-level console messages expected when adding a vertex').toEqual([]);
  });

  // Test that adding a vertex with an empty neighbor input results in a neighbor array containing an empty string (per implementation)
  test('Add Vertex with empty neighbor input: neighbor array contains an empty string and is displayed', async ({ page }) => {
    const { consoleMessages, pageErrors } = await attachErrorListeners(page);

    await page.fill('#vertexInput', 'Solo');
    // Intentionally leave neighborInput blank
    await page.fill('#neighborInput', '');
    await page.click('button:has-text("Add Vertex")');

    // The JSON representation should include "Solo": [""]
    const preText = await page.locator('#listRepresentation pre').innerText();
    // The stringified JSON representation will show an empty string in the array
    expect(preText).toContain('"Solo"');
    expect(preText).toContain('""'); // presence of empty string value in array

    // No runtime errors or console errors
    expect(pageErrors, 'No uncaught page errors when adding vertex with empty neighbor input').toEqual([]);
    const errorConsoleMessages = consoleMessages.filter(m =>
      m.type === 'error' ||
      /ReferenceError|TypeError|SyntaxError|Uncaught/i.test(m.text)
    );
    expect(errorConsoleMessages, 'No error-level console messages expected for empty neighbor input').toEqual([]);
  });

  // Test that clicking Add Vertex without providing a vertex does nothing (no new adjacency list entry) and doesn't throw errors
  test('Add Vertex without vertex name: should not add entry and should not throw errors', async ({ page }) => {
    const { consoleMessages, pageErrors } = await attachErrorListeners(page);

    // Ensure inputs are empty
    await page.fill('#vertexInput', '');
    await page.fill('#neighborInput', 'X');

    // Click Add Vertex with empty vertex input
    await page.click('button:has-text("Add Vertex")');

    // listRepresentation should remain empty (no pre element)
    const listRepresentation = page.locator('#listRepresentation');
    const inner = await listRepresentation.innerHTML();
    // Expect no pre content created
    expect(inner === '' || !inner.includes('<pre>')).toBeTruthy();

    // No runtime errors or console errors
    expect(pageErrors, 'No uncaught page errors when clicking Add Vertex without vertex name').toEqual([]);
    const errorConsoleMessages = consoleMessages.filter(m =>
      m.type === 'error' ||
      /ReferenceError|TypeError|SyntaxError|Uncaught/i.test(m.text)
    );
    expect(errorConsoleMessages, 'No error-level console messages expected when Add Vertex clicked without vertex name').toEqual([]);
  });

  // Test drawing the graph: canvas content must change after drawing and no drawing-time errors occur
  test('Draw Graph: drawing after adding vertices updates the canvas and does not produce runtime errors', async ({ page }) => {
    const { consoleMessages, pageErrors } = await attachErrorListeners(page);

    // Add two vertices that reference each other so edges will be drawn
    await page.fill('#vertexInput', 'N1');
    await page.fill('#neighborInput', 'N2');
    await page.click('button:has-text("Add Vertex")');

    await page.fill('#vertexInput', 'N2');
    await page.fill('#neighborInput', 'N1');
    await page.click('button:has-text("Add Vertex")');

    // Capture canvas data URL before drawing (should be blank / minimal)
    const beforeDataUrl = await page.evaluate(() => {
      const c = document.getElementById('graphCanvas');
      return c.toDataURL();
    });

    // Click draw graph to render nodes and edges on canvas
    await page.click('button:has-text("Draw Graph")');

    // Wait a short time to allow drawing commands to execute
    await page.waitForTimeout(100);

    // Capture canvas data URL after drawing
    const afterDataUrl = await page.evaluate(() => {
      const c = document.getElementById('graphCanvas');
      return c.toDataURL();
    });

    // The data URL after drawing should differ from before if something was drawn
    expect(afterDataUrl).not.toBeUndefined();
    expect(afterDataUrl.length).toBeGreaterThan(0);
    // Assert that the canvas changed (common sign of drawing)
    expect(afterDataUrl).not.toEqual(beforeDataUrl);

    // Ensure no errors were emitted while drawing
    expect(pageErrors, 'No uncaught page errors should occur during drawGraph').toEqual([]);
    const errorConsoleMessages = consoleMessages.filter(m =>
      m.type === 'error' ||
      /ReferenceError|TypeError|SyntaxError|Uncaught/i.test(m.text)
    );
    expect(errorConsoleMessages, 'No error-level console messages expected during drawGraph').toEqual([]);
  });

  // Test edge case: drawing with neighbors that reference nonexistent vertices should not throw errors
  test('Draw Graph with missing neighbor positions: no runtime errors when neighbors refer to undefined vertices', async ({ page }) => {
    const { consoleMessages, pageErrors } = await attachErrorListeners(page);

    // Add a vertex that references a neighbor that hasn't been added (neighbor missing)
    await page.fill('#vertexInput', 'OnlyOne');
    await page.fill('#neighborInput', 'MissingVertex');
    await page.click('button:has-text("Add Vertex")');

    // Attempt to draw; implementation should simply skip drawing edges if positions are undefined
    await page.click('button:has-text("Draw Graph")');

    // Wait briefly for drawing actions
    await page.waitForTimeout(100);

    // No uncaught page errors expected
    expect(pageErrors, 'No uncaught page errors when drawing with missing neighbor positions').toEqual([]);
    const errorConsoleMessages = consoleMessages.filter(m =>
      m.type === 'error' ||
      /ReferenceError|TypeError|SyntaxError|Uncaught/i.test(m.text)
    );
    expect(errorConsoleMessages, 'No error-level console messages expected when drawing with missing neighbor').toEqual([]);
  });
});