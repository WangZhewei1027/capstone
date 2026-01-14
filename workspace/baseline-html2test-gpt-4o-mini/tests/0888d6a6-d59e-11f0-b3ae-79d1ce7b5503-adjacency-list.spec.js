import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888d6a6-d59e-11f0-b3ae-79d1ce7b5503.html';

test.describe('Adjacency List Application - 0888d6a6-d59e-11f0-b3ae-79d1ce7b5503', () => {
  // Arrays to collect console errors and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset trackers before each test
    consoleMessages = [];
    pageErrors = [];

    // Listen for console messages and page errors for diagnostics and assertions
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page and ensure main elements are present
    await page.goto(APP_URL);
    await expect(page).toHaveURL(APP_URL);

    // Ensure essential UI elements are available before each test
    await expect(page.locator('h1')).toHaveText(/Graph Adjacency List/i);
    await expect(page.locator('#edgesInput')).toBeVisible();
    await expect(page.locator('#generateBtn')).toBeVisible();
    await expect(page.locator('#graph')).toBeVisible();
  });

  test.afterEach(async () => {
    // After each test, assert that no uncaught page errors occurred
    // and no console errors were logged. This helps detect runtime exceptions.
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(pageErrors, 'No page errors should occur').toEqual([]);
    expect(consoleErrors, 'No console.error messages should be logged').toEqual([]);
  });

  // Helper: get the textual content of the graph container
  async function getGraphText(page) {
    return (await page.locator('#graph').textContent()) || '';
  }

  test('Initial state: page loads with input, button, and empty graph area', async ({ page }) => {
    // Verify textarea is empty on load
    await expect(page.locator('#edgesInput')).toHaveValue('');
    // Graph container should be empty on initial load (no adjacency list shown until generate clicked)
    const graphHtml = await page.locator('#graph').innerHTML();
    expect(graphHtml.trim(), 'Graph container should be empty before generation').toBe('');
  });

  test('Clicking Generate with empty input shows only the Adjacency List header', async ({ page }) => {
    // Click generate with empty textarea
    await page.click('#generateBtn');

    // After clicking, the application always writes a header (<h2>Adjacency List</h2>)
    const graphText = await getGraphText(page);
    expect(graphText).toMatch(/Adjacency List/);
    // There should be no node paragraphs when no edges are provided
    // Ensure only the header is present (no ":" lines representing nodes)
    expect(graphText).not.toMatch(/:/);
  });

  test('Generate adjacency list for a set of well-formed edges', async ({ page }) => {
    // Enter edges: A-B, A-C, B-D (each on its own line)
    const edges = ['A-B', 'A-C', 'B-D'].join('\n');
    await page.fill('#edgesInput', edges);
    await page.click('#generateBtn');

    // Verify the adjacency list heading and the expected node lines are present
    const graphText1 = await getGraphText(page);

    // Expect header
    expect(graphText).toMatch(/Adjacency List/);

    // Expected adjacency in insertion order:
    // A: B, C
    // B: A, D
    // C: A
    // D: B
    // Use regex to be tolerant of whitespace and minor formatting
    expect(graphText).toMatch(/A:\s*B,\s*C/);
    expect(graphText).toMatch(/B:\s*A,\s*D/);
    expect(graphText).toMatch(/C:\s*A/);
    expect(graphText).toMatch(/D:\s*B/);

    // Also ensure the order of node paragraphs corresponds to insertion order (A then B then C then D)
    const html = await page.locator('#graph').innerHTML();
    const firstOccurrence = html.indexOf('A:');
    const secondOccurrence = html.indexOf('B:');
    const thirdOccurrence = html.indexOf('C:');
    const fourthOccurrence = html.indexOf('D:');
    expect(firstOccurrence).toBeGreaterThan(-1);
    expect(secondOccurrence).toBeGreaterThan(firstOccurrence);
    expect(thirdOccurrence).toBeGreaterThan(secondOccurrence);
    expect(fourthOccurrence).toBeGreaterThan(thirdOccurrence);
  });

  test('Handles duplicate edges and whitespace: duplicates are preserved', async ({ page }) => {
    // Input contains duplicates and extra whitespace
    const edges1 = [
      ' A - B ',
      'A-B',
      'B-A'
    ].join('\n');
    await page.fill('#edgesInput', edges);
    await page.click('#generateBtn');

    const graphText2 = await getGraphText(page);

    // The implementation does not deduplicate neighbors, so repeated neighbors should appear
    // For node A, after processing those three edges, neighbors should be "B, B, B"
    expect(graphText).toMatch(/A:\s*B,\s*B,\s*B/);
    // For node B, neighbors should be "A, A, A"
    expect(graphText).toMatch(/B:\s*A,\s*A,\s*A/);
  });

  test('Malformed edge input (missing node) results in an "undefined" key shown in adjacency list', async ({ page }) => {
    // Input a malformed edge without a dash or with missing node
    // Example: "A" (no dash) should lead to nodeB being undefined in the implementation
    await page.fill('#edgesInput', 'A');
    await page.click('#generateBtn');

    const graphText3 = await getGraphText(page);

    // Because the code uses undefined as a key when nodeB is missing, we expect to see "undefined: A"
    // and the A: line may show an empty neighbor list (joining [undefined] yields an empty string)
    expect(graphText).toMatch(/undefined:\s*A/);

    // The A line may appear with an empty neighbors string; ensure A is present
    expect(graphText).toMatch(/A:/);
  });

  test('Multiple lines and mixed separators produce correct adjacency mapping', async ({ page }) => {
    // A more complex example with multiple nodes and repeated relationships
    const edges2 = [
      'X-Y',
      'Y-Z',
      'X-Z',
      'Z-W',
      'W-X'
    ].join('\n');
    await page.fill('#edgesInput', edges);
    await page.click('#generateBtn');

    const graphText4 = await getGraphText(page);

    // Verify all nodes and expected neighbors exist (unordered neighbor lists are acceptable,
    // but we can check presence of each expected neighbor pair)
    expect(graphText).toMatch(/X:\s*Y/);
    expect(graphText).toMatch(/X:\s*Z/);
    expect(graphText).toMatch(/Y:\s*X/);
    expect(graphText).toMatch(/Y:\s*Z/);
    expect(graphText).toMatch(/Z:\s*X/);
    expect(graphText).toMatch(/Z:\s*Y/);
    expect(graphText).toMatch(/Z:\s*W/);
    expect(graphText).toMatch(/W:\s*Z/);
    expect(graphText).toMatch(/W:\s*X/);
  });

  test('Accessibility smoke-check: inputs and button have accessible names and are focusable', async ({ page }) => {
    // Ensure the textarea can be focused and accepts input
    const textarea = page.locator('#edgesInput');
    await textarea.focus();
    await expect(textarea).toBeFocused();

    // Ensure the button is focusable and has an accessible name (text content)
    const button = page.locator('#generateBtn');
    await button.focus();
    await expect(button).toBeFocused();
    await expect(button).toHaveText(/Generate Adjacency List/);
  });
});