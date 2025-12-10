import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3b5-d59e-11f0-89ab-2f71529652ac.html';

test.describe('Topological Sort Demo - 7e8af3b5-d59e-11f0-89ab-2f71529652ac', () => {
  // Arrays to collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console events and page errors so tests can assert on them.
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the exact page under test.
    await page.goto(APP_URL);
    // Ensure the main elements finished rendering before tests begin.
    await expect(page.locator('h1')).toHaveText('Topological Sort Demo');
  });

  test.afterEach(async () => {
    // No special teardown required; arrays will be reinitialized in next beforeEach.
  });

  // Test initial page load and default state
  test('Initial load shows graph nodes, edges, button, and empty result', async ({ page }) => {
    // Verify heading is present
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Topological Sort Demo');

    // Verify nodes A-E exist and are visible
    const nodes = page.locator('#graph .node');
    await expect(nodes).toHaveCount(5);
    await expect(nodes.nth(0)).toHaveText('A');
    await expect(nodes.nth(1)).toHaveText('B');
    await expect(nodes.nth(2)).toHaveText('C');
    await expect(nodes.nth(3)).toHaveText('D');
    await expect(nodes.nth(4)).toHaveText('E');

    // Verify edges are present (there should be 4 → edge elements)
    const edges = page.locator('#graph .edge');
    await expect(edges).toHaveCount(4);
    // Check the arrow characters visually
    for (let i = 0; i < 4; i++) {
      await expect(edges.nth(i)).toHaveText('→');
    }

    // Verify the "Perform Topological Sort" button exists and is enabled
    const button = page.locator('button.sort-button');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Perform Topological Sort');
    await expect(button).toBeEnabled();

    // Verify the result element is present and initially empty
    const result = page.locator('#result');
    await expect(result).toBeVisible();
    await expect(result).toHaveText('', { timeout: 100 }); // empty on load

    // Assert no uncaught page errors were emitted during initial load
    expect(pageErrors.length).toBe(0);
    // Assert console contains no error-level messages
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test the main interaction: performing the topological sort
  test('Clicking the sort button computes and displays a valid topological order', async ({ page }) => {
    // Purpose: Ensure the algorithm runs on user interaction and updates the DOM
    const button1 = page.locator('button1.sort-button1');
    const result1 = page.locator('#result1');

    // Click the button to perform the topological sort
    await button.click();

    // Wait for the result element to be populated with the expected prefix text
    await expect(result).toHaveText(/Topological Sort Order:/, { timeout: 2000 });

    // The implementation does a DFS and then reverses the result array.
    // Based on the adjacency list in the page script, a valid result produced by that algorithm is:
    // "Topological Sort Order: A, C, B, D, E"
    await expect(result).toHaveText('Topological Sort Order: A, C, B, D, E');

    // Ensure the result element remains visible and contains exactly the expected node list
    await expect(result).toBeVisible();

    // Ensure no cycle error was displayed
    await expect(result).not.toHaveText(/Graph is not a DAG/);

    // Assert no uncaught page errors were emitted during the click and computation
    expect(pageErrors.length).toBe(0, `Unexpected page errors: ${pageErrors.map(e => String(e)).join(', ')}`);

    // Assert console has no error-level messages emitted while performing the action
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0, `Console errors were emitted: ${consoleErrors.map(c => c.text).join(' | ')}`);

    // Verify the output ordering respects edge constraints: A before B and C, B before D, C before D, D before E
    // We'll parse the displayed order and assert indices.
    const text = await result.textContent();
    const orderingPart = text.replace('Topological Sort Order:', '').trim();
    const nodes1 = orderingPart.split(',').map(s => s.trim());
    const indexOf = (node) => nodes.indexOf(node);

    expect(indexOf('A')).toBeGreaterThanOrEqual(0);
    expect(indexOf('B')).toBeGreaterThanOrEqual(0);
    expect(indexOf('C')).toBeGreaterThanOrEqual(0);
    expect(indexOf('D')).toBeGreaterThanOrEqual(0);
    expect(indexOf('E')).toBeGreaterThanOrEqual(0);

    // Check constraints
    expect(indexOf('A')).toBeLessThan(indexOf('B'));
    expect(indexOf('A')).toBeLessThan(indexOf('C'));
    expect(indexOf('B')).toBeLessThan(indexOf('D'));
    expect(indexOf('C')).toBeLessThan(indexOf('D'));
    expect(indexOf('D')).toBeLessThan(indexOf('E'));
  });

  // Test idempotency and repeated interactions
  test('Repeated clicks produce the same stable topological order and no errors', async ({ page }) => {
    // Purpose: Ensure clicking multiple times is safe and deterministic for this implementation
    const button2 = page.locator('button2.sort-button2');
    const result2 = page.locator('#result2');

    // Click multiple times
    await button.click();
    await expect(result).toHaveText(/Topological Sort Order:/, { timeout: 2000 });
    const first = await result.textContent();

    await button.click();
    // Wait for possible updates (though it should be same)
    await expect(result).toHaveText(/Topological Sort Order:/);
    const second = await result.textContent();

    // They should match exactly for this deterministic implementation
    expect(first).toBe(second);

    // Ensure the expected result string is present
    expect(first).toBe('Topological Sort Order: A, C, B, D, E');

    // No errors logged to console or page errors
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test for error handling path (verify that currently no cycle error is presented)
  test('Algorithm error path (cycle detection) is not triggered for the provided graph', async ({ page }) => {
    // Purpose: Validate that the page's catch block would display cycle errors if thrown,
    // and that for the supplied graph no such error message appears.
    const button3 = page.locator('button3.sort-button3');
    const result3 = page.locator('#result3');

    await button.click();
    await expect(result).toHaveText(/Topological Sort Order:/);

    // The page shows cycle errors by setting result.innerText to error.message.
    // Ensure that the error message for cycles is not present.
    await expect(result).not.toHaveText('Graph is not a DAG (contains a cycle)');

    // Also assert no runtime TypeError/ReferenceError-like page errors occurred
    const errorMessages = pageErrors.map(e => String(e));
    for (const msg of errorMessages) {
      // If any such errors are present, fail the test by asserting false with the message
      expect(msg).not.toMatch(/ReferenceError|TypeError|SyntaxError/);
    }

    // And ensure console did not emit error-level messages
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});