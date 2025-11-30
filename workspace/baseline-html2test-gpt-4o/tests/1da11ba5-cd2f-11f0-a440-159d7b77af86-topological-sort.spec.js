import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da11ba5-cd2f-11f0-a440-159d7b77af86.html';

test.describe('Topological Sort Visualization - End-to-end', () => {
  // Arrays to collect console messages and page errors for each test
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset collectors before each test
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Capture console events and page errors without modifying runtime behavior
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      // Capture uncaught exceptions / page errors
      pageErrors.push(error && error.message ? error.message : String(error));
    });
  });

  test('Initial page load shows expected controls and default state', async ({ page }) => {
    // Test purpose:
    // - Verify the application loads
    // - Ensure all interactive controls are present and default outputs are empty
    await page.goto(APP_URL);

    // Basic element presence checks
    const title = await page.title();
    expect(title).toContain('Topological Sort');

    // Textarea for graph input
    const graphInput = page.locator('#graphInput');
    await expect(graphInput).toBeVisible();
    await expect(graphInput).toHaveAttribute('placeholder', /Enter edges/);

    // Sort button - it's the only button in the page
    const sortButton = page.locator('button', { hasText: 'Sort' });
    await expect(sortButton).toBeVisible();

    // Result container should be empty by default
    const result = page.locator('#result');
    await expect(result).toBeVisible();
    const resultText = (await result.textContent()) || '';
    expect(resultText.trim()).toBe('');

    // Graph representation should be empty initially
    const graphRepresentation = page.locator('#graphRepresentation');
    await expect(graphRepresentation).toBeVisible();
    const graphText = (await graphRepresentation.textContent()) || '';
    expect(graphText.trim()).toBe('');

    // Ensure no uncaught page errors or console errors occurred during load
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Clicking Sort with empty input triggers alert and no DOM update', async ({ page }) => {
    // Test purpose:
    // - Confirm the empty-input validation triggers an alert
    // - Ensure no graph/result changes are made in that case
    await page.goto(APP_URL);

    // Prepare to capture dialog (alert)
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      // Click the Sort button with empty textarea
      page.locator('button', { hasText: 'Sort' }).click()
    ]);

    // Verify the alert message and accept it
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a graph');
    await dialog.accept();

    // Verify that graphRepresentation and result remain empty
    const graphRepresentationText = (await page.locator('#graphRepresentation').textContent()) || '';
    expect(graphRepresentationText.trim()).toBe('');

    const resultText = (await page.locator('#result').textContent()) || '';
    expect(resultText.trim()).toBe('');

    // Ensure no uncaught exceptions happened
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Valid DAG input produces correct topological order and renders graph', async ({ page }) => {
    // Test purpose:
    // - Input a simple DAG and verify the topological order result
    // - Verify that edges are rendered as node → node elements
    await page.goto(APP_URL);

    const input = 'A->B,B->C,C->D';
    await page.fill('#graphInput', input);

    // Click the Sort button
    await page.locator('button', { hasText: 'Sort' }).click();

    // Verify the result string (expected deterministic order: A B C D)
    const result = page.locator('#result');
    await expect(result).toHaveText('A B C D');

    // Check the graph representation; there should be 3 edges rendered
    const graphNodes = page.locator('#graphRepresentation .graph');
    await expect(graphNodes).toHaveCount(3);

    // Verify each edge includes the arrow and node labels from the input
    const graphText = (await page.locator('#graphRepresentation').textContent()) || '';
    expect(graphText).toContain('Graph:');
    expect(graphText).toContain('A');
    expect(graphText).toContain('B');
    expect(graphText).toContain('C');
    expect(graphText).toContain('D');
    expect(graphText).toContain('→'); // arrow symbol present

    // Ensure no cycle message is displayed
    expect(graphText).not.toContain('Cycle Detected!');

    // Ensure no uncaught exceptions happened
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Cycle in graph triggers alert and shows "Cycle Detected!" without producing a result', async ({ page }) => {
    // Test purpose:
    // - Input a cyclic graph and assert the cycle alert appears
    // - Verify the graph representation shows the cycle message and no result is displayed
    await page.goto(APP_URL);

    const cyclicInput = 'A->B,B->A';
    await page.fill('#graphInput', cyclicInput);

    // Wait for the cycle alert dialog when clicking Sort
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      page.locator('button', { hasText: 'Sort' }).click()
    ]);

    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Graph has a cycle. Topological sort is not possible.');
    await dialog.accept();

    // Verify that "Cycle Detected!" is present in the graph representation
    const graphRepresentation = page.locator('#graphRepresentation');
    const graphText = (await graphRepresentation.textContent()) || '';
    expect(graphText).toContain('Cycle Detected!');

    // Verify edges were still rendered
    const edges = page.locator('#graphRepresentation .graph');
    await expect(edges).toHaveCount(2);

    // Result should remain empty because topological sort is not possible
    const resultText = (await page.locator('#result').textContent()) || '';
    expect(resultText.trim()).toBe('');

    // Ensure no uncaught exceptions happened
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Complex graph with multiple zero in-degree nodes produces deterministic ordering', async ({ page }) => {
    // Test purpose:
    // - Verify deterministic output for a graph with multiple sources
    // - Confirm graph rendering and no cycle message
    await page.goto(APP_URL);

    // A graph where A->C, B->C, C->D -> expected topological order based on insertion: A B C D
    const input = 'A->C,B->C,C->D';
    await page.fill('#graphInput', input);

    await page.locator('button', { hasText: 'Sort' }).click();

    const result = page.locator('#result');
    await expect(result).toHaveText('A B C D');

    // Verify graph rendering contains 3 edges
    await expect(page.locator('#graphRepresentation .graph')).toHaveCount(3);

    // No 'Cycle Detected!' message
    const graphText = (await page.locator('#graphRepresentation').textContent()) || '';
    expect(graphText).not.toContain('Cycle Detected!');

    // Ensure no uncaught exceptions happened
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Observe console logs and page errors during interactions (no uncaught errors expected)', async ({ page }) => {
    // Test purpose:
    // - Demonstrate observation of console messages and page errors during normal interactions
    // - Assert that no ReferenceError/SyntaxError/TypeError occurred in the page runtime
    await page.goto(APP_URL);

    // Perform a few interactions
    await page.fill('#graphInput', 'X->Y,Y->Z');
    await page.locator('button', { hasText: 'Sort' }).click();

    // Allow any potential async logs/errors to surface
    await page.waitForTimeout(100);

    // Inspect collected console messages - ensure none of type 'error'
    const errorMsgs = consoleMessages.filter(m => m.type === 'error').map(m => m.text);
    expect(errorMsgs).toEqual([]);

    // Ensure no uncaught page errors recorded
    expect(pageErrors).toEqual([]);

    // Additionally assert that at least one console message exists (e.g., from rendering) OR simply record that console was observed.
    // We don't require specific console messages; we just ensure we observed the console and it's free of errors.
    expect(consoleMessages.length).toBeGreaterThanOrEqual(0);
  });
});