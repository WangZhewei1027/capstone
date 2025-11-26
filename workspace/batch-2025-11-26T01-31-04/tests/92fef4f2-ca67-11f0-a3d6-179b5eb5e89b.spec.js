import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fef4f2-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Topological Sort Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state should be Idle', async ({ page }) => {
    const runButton = await page.locator('#runBtn');
    const output = await page.locator('#output');
    
    // Verify that the run button is enabled and output is empty
    await expect(runButton).toBeEnabled();
    await expect(output).toHaveText('');
  });

  test('Valid input triggers ValidatingInput state', async ({ page }) => {
    const runButton = await page.locator('#runBtn');
    const inputField = await page.locator('#graphInput');
    
    // Input valid graph
    await inputField.fill('{"5": ["2", "0"], "4": ["0","1"], "2": ["3"], "3": ["1"], "0": [], "1": []}');
    await runButton.click();
    
    // Check if output is still empty while validating
    const output = await page.locator('#output');
    await expect(output).toHaveText('');
  });

  test('Invalid input shows error message', async ({ page }) => {
    const runButton = await page.locator('#runBtn');
    const inputField = await page.locator('#graphInput');
    
    // Input invalid graph
    await inputField.fill('{"5": ["2", "0"], "4": "invalid", "2": ["3"], "3": ["1"], "0": [], "1": []}');
    await runButton.click();
    
    // Verify error message is shown
    const output = await page.locator('#output');
    await expect(output).toHaveText(/Invalid JSON or input/);
  });

  test('Valid input leads to RunningSort state and displays result', async ({ page }) => {
    const runButton = await page.locator('#runBtn');
    const inputField = await page.locator('#graphInput');
    
    // Input valid graph
    await inputField.fill('{"5": ["2", "0"], "4": ["0","1"], "2": ["3"], "3": ["1"], "0": [], "1": []}');
    await runButton.click();
    
    // Wait for output to show the result
    const output = await page.locator('#output');
    await expect(output).toHaveText(/Topological order:/);
    
    // Check if the graph visualization is present
    const graphViz = await page.locator('#graphViz svg');
    await expect(graphViz).toBeVisible();
  });

  test('Cycle detection shows error message', async ({ page }) => {
    const runButton = await page.locator('#runBtn');
    const inputField = await page.locator('#graphInput');
    
    // Input graph with a cycle
    await inputField.fill('{"1": ["2"], "2": ["3"], "3": ["1"]}');
    await runButton.click();
    
    // Verify cycle error message is shown
    const output = await page.locator('#output');
    await expect(output).toHaveText(/Cycle detected! Topological sort is not possible/);
    
    // Check if the graph visualization is present
    const graphViz = await page.locator('#graphViz svg');
    await expect(graphViz).toBeVisible();
  });

  test('Reset state after error alert', async ({ page }) => {
    const runButton = await page.locator('#runBtn');
    const inputField = await page.locator('#graphInput');
    
    // Input invalid graph
    await inputField.fill('{"5": ["2", "0"], "4": "invalid"}');
    await runButton.click();
    
    // Verify error message is shown
    const output = await page.locator('#output');
    await expect(output).toHaveText(/Invalid JSON or input/);
    
    // Click run button again to reset
    await runButton.click();
    
    // Verify that the output is cleared and input is reset
    await expect(output).toHaveText('');
    await expect(inputField).toHaveValue('');
  });
});