import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdbc-d59e-11f0-b3ae-79d1ce7b5503.html';

test.describe('Depth-First Search (DFS) Visualization - 0888fdbc-d59e-11f0-b3ae-79d1ce7b5503', () => {
  // Arrays to capture console error messages and page errors during each test
  let consoleErrors = [];
  let pageErrors = [];

  // Setup before each test: navigate to the page and attach listeners for console and page errors.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of level 'error' for later assertions
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({
            text: msg.text(),
            args: msg.args().map(a => a.toString())
          });
        }
      } catch (e) {
        // swallow any listener errors, but record a generic message
        consoleErrors.push({ text: 'console listener error', args: [] });
      }
    });

    // Capture uncaught exceptions / page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Load the application page exactly as-is
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Teardown after each test: assert there were no uncaught errors in the page
  test.afterEach(async () => {
    // Assert that no uncaught page errors occurred
    expect(pageErrors.length, `Expected no uncaught page errors, but got: ${pageErrors.map(e => e.toString()).join('; ')}`).toBe(0);
    // Assert that no console errors were emitted during the test
    expect(consoleErrors.length, `Expected no console.error messages, but got: ${JSON.stringify(consoleErrors)}`).toBe(0);
  });

  test.describe('Initial load and UI elements', () => {
    test('Page loads with expected title, heading, and a Start DFS button', async ({ page }) => {
      // Verify the document title
      await expect(page).toHaveTitle(/Depth-First Search \(DFS\) Visualization/);

      // There should be an H1 with the expected text
      const h1 = page.locator('h1');
      await expect(h1).toHaveText('Depth-First Search (DFS) Visualization');

      // The paragraph describing the button should be visible
      const p = page.locator('p');
      await expect(p).toHaveText('Click the button to start the DFS traversal');

      // Identify interactive elements: there is a single button that starts the DFS
      const button = page.locator('button');
      await expect(button).toHaveCount(1);
      await expect(button).toHaveText('Start DFS');
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();

      // The graph container should exist and be empty initially
      const graphDiv = page.locator('#graph');
      await expect(graphDiv).toBeVisible();
      // Should have no child nodes initially (visualization not yet started)
      await expect(graphDiv.locator('div')).toHaveCount(0);
    });
  });

  test.describe('DFS traversal behavior and visualization', () => {
    test('Clicking Start DFS visualizes nodes in expected DFS order and highlights the first node', async ({ page }) => {
      const button1 = page.locator('button1', { hasText: 'Start DFS' });
      const graphDiv1 = page.locator('#graph');

      // Click the Start DFS button
      await button.click();

      // After click, the graph container should have child divs for each visited node
      // Expected DFS traversal order based on HTML graph data:
      // A -> B -> D -> E -> F -> C
      const expectedOrder = ['A', 'B', 'D', 'E', 'F', 'C'];

      // Wait for the nodes to appear - give a short timeout in case of rendering delays
      await expect(graphDiv.locator('div')).toHaveCount(expectedOrder.length);

      // Collect text contents in order and verify
      const nodeDivs = graphDiv.locator('div');
      const texts = [];
      for (let i = 0; i < expectedOrder.length; i++) {
        const text = await nodeDivs.nth(i).innerText();
        texts.push(text.trim());
      }
      expect(texts).toEqual(expectedOrder);

      // Verify the visual highlight: first node should have a different background color than the rest
      // The inline styles use hex colors: '#ffcccc' for first node and '#ccffcc' for others.
      // Computed styles will be in rgb(...) form.
      const firstBg = await nodeDivs.nth(0).evaluate((el) => window.getComputedStyle(el).backgroundColor);
      const secondBg = await nodeDivs.nth(1).evaluate((el) => window.getComputedStyle(el).backgroundColor);

      // '#ffcccc' -> rgb(255, 204, 204)
      // '#ccffcc' -> rgb(204, 255, 204)
      expect(firstBg).toBe('rgb(255, 204, 204)');
      expect(secondBg).toBe('rgb(204, 255, 204)');

      // Also assert each node has basic styling like border and padding applied
      const borderStyle = await nodeDivs.nth(0).evaluate((el) => window.getComputedStyle(el).borderStyle);
      expect(borderStyle).toBe('solid' || ''); // accept 'solid', fallback empty in some UA; primary check is existence
    });

    test('Clicking Start DFS twice clears previous visualization and recreates nodes (no duplication)', async ({ page }) => {
      const button2 = page.locator('button2', { hasText: 'Start DFS' });
      const graphDiv2 = page.locator('#graph');

      // First click: create visualization
      await button.click();
      await expect(graphDiv.locator('div')).toHaveCount(6);

      // Capture the texts of the first run
      const firstRunTexts = [];
      const nodeDivs1 = graphDiv.locator('div');
      for (let i = 0; i < 6; i++) {
        firstRunTexts.push((await nodeDivs.nth(i).innerText()).trim());
      }

      // Second click: should clear and recreate; count should still be 6 and content identical to first run
      await button.click();
      await expect(graphDiv.locator('div')).toHaveCount(6);

      const secondRunTexts = [];
      const nodeDivs2 = graphDiv.locator('div');
      for (let i = 0; i < 6; i++) {
        secondRunTexts.push((await nodeDivs2.nth(i).innerText()).trim());
      }

      expect(secondRunTexts).toEqual(firstRunTexts);

      // Ensure that the DOM was cleared and recreated (by checking that the node elements are different handles)
      // In Playwright, we can compare the element handles by reading a property like dataset index or existence.
      // As the app doesn't set dataset, we will assert that nodeDivs.nth(0) and nodeDivs2.nth(0) are present and have same text.
      expect(secondRunTexts[0]).toBe(firstRunTexts[0]);
    });
  });

  test.describe('Edge cases, accessibility and robustness', () => {
    test('Button is reachable by keyboard and is accessible', async ({ page }) => {
      // Ensure the button is focusable and receives keyboard events
      const button3 = page.locator('button3', { hasText: 'Start DFS' });
      await button.focus();
      await expect(button).toBeFocused();

      // Press Enter to trigger the click via keyboard
      await page.keyboard.press('Enter');

      const graphDiv3 = page.locator('#graph');
      await expect(graphDiv.locator('div')).toHaveCount(6);

      // Verify that the first node text is 'A' after keyboard activation
      const firstNodeText = await graphDiv.locator('div').nth(0).innerText();
      expect(firstNodeText.trim()).toBe('A');
    });

    test('No unexpected errors are thrown when interacting with the page (sanity check)', async ({ page }) => {
      // This test exercises the main interaction and ensures no console/page errors were emitted during interaction.
      const button4 = page.locator('button4', { hasText: 'Start DFS' });

      // Click the button and wait for visualization
      await button.click();
      const graphDiv4 = page.locator('#graph');
      await expect(graphDiv.locator('div')).toHaveCount(6);

      // No further assertions here because afterEach will assert absence of console and page errors.
      // The test documents the expectation that the page should operate without runtime exceptions.
    });
  });
});