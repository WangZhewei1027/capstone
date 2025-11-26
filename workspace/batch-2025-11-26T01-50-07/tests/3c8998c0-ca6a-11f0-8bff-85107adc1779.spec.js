import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8998c0-ca6a-11f0-8bff-85107adc1779.html';

test.describe('BFS Visualization Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    // Verify the initial state is Idle by checking the graph is drawn
    const graphInput = await page.locator('#graphInput');
    const startNodeInput = await page.locator('#startNode');
    const stepsDiv = await page.locator('#steps');

    await expect(graphInput).toHaveValue(`{
  "A": ["B", "C"],
  "B": ["A", "D", "E"],
  "C": ["A", "F"],
  "D": ["B"],
  "E": ["B", "F"],
  "F": ["C", "E"]
}`);
    await expect(startNodeInput).toHaveValue('A');
    await expect(stepsDiv).toHaveText('');
  });

  test('Run BFS with valid graph and start node', async ({ page }) => {
    const graphInput = await page.locator('#graphInput');
    const startNodeInput = await page.locator('#startNode');
    const runBFSButton = await page.locator('#runBFS');
    const stepsDiv = await page.locator('#steps');

    await graphInput.fill(`{
      "A": ["B", "C"],
      "B": ["A", "D", "E"],
      "C": ["A", "F"],
      "D": ["B"],
      "E": ["B", "F"],
      "F": ["C", "E"]
    }`);
    await startNodeInput.fill('A');
    await runBFSButton.click();

    // Validate that BFS animation starts and steps are logged
    await expect(stepsDiv).toContainText('Enqueued start node: A');
    await expect(stepsDiv).toContainText('BFS complete! All reachable nodes visited.');
  });

  test('Show error when start node is not found', async ({ page }) => {
    const graphInput = await page.locator('#graphInput');
    const startNodeInput = await page.locator('#startNode');
    const runBFSButton = await page.locator('#runBFS');

    await graphInput.fill(`{
      "A": ["B", "C"],
      "B": ["A", "D", "E"]
    }`);
    await startNodeInput.fill('Z'); // Invalid start node
    await runBFSButton.click();

    // Validate that an error alert is shown
    await page.waitForTimeout(500); // Wait for the alert to show
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toContain('Start node not found in graph.');
  });

  test('Show error when start node input is empty', async ({ page }) => {
    const graphInput = await page.locator('#graphInput');
    const startNodeInput = await page.locator('#startNode');
    const runBFSButton = await page.locator('#runBFS');

    await graphInput.fill(`{
      "A": ["B", "C"],
      "B": ["A", "D", "E"]
    }`);
    await startNodeInput.fill(''); // Empty start node
    await runBFSButton.click();

    // Validate that an error alert is shown
    await page.waitForTimeout(500); // Wait for the alert to show
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toContain('Please enter a start node.');
  });

  test('Show error for invalid graph JSON', async ({ page }) => {
    const graphInput = await page.locator('#graphInput');
    const startNodeInput = await page.locator('#startNode');
    const runBFSButton = await page.locator('#runBFS');

    await graphInput.fill(`{
      "A": ["B", "C"],
      "B": "Invalid value"
    }`); // Invalid JSON
    await startNodeInput.fill('A');
    await runBFSButton.click();

    // Validate that an error alert is shown
    await page.waitForTimeout(500); // Wait for the alert to show
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toContain('Invalid JSON adjacency list:');
  });

  test('Show warning for too many nodes', async ({ page }) => {
    const graphInput = await page.locator('#graphInput');
    const startNodeInput = await page.locator('#startNode');
    const runBFSButton = await page.locator('#runBFS');

    await graphInput.fill(`{
      "A": ["B"],
      "B": ["A"],
      "C": ["A"],
      "D": ["A"],
      "E": ["A"],
      "F": ["A"],
      "G": ["A"],
      "H": ["A"],
      "I": ["A"],
      "J": ["A"],
      "K": ["A"],
      "L": ["A"],
      "M": ["A"],
      "N": ["A"],
      "O": ["A"],
      "P": ["A"]
    }`); // 16 nodes
    await startNodeInput.fill('A');
    await runBFSButton.click();

    // Validate that a warning alert is shown
    await page.waitForTimeout(500); // Wait for the alert to show
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toContain('Warning: too many nodes might slow down the visualization (max 15 recommended).');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup actions if necessary
  });
});