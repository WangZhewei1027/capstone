import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b6ce42-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Bellman-Ford Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default values', async ({ page }) => {
        // Verify the initial state of the inputs and the result area
        const verticesInput = await page.locator('#vertices');
        const edgesInput = await page.locator('#edges');
        const resultDiv = await page.locator('#result');

        await expect(verticesInput).toHaveValue('5');
        await expect(edgesInput).toHaveValue('7');
        await expect(resultDiv).toHaveText('');
    });

    test('should add edge inputs when clicking "Add Edge Inputs"', async ({ page }) => {
        const addEdgesButton = await page.locator('#add-edges');
        const edgeInputsContainer = await page.locator('#edge-inputs');

        // Click to add edge inputs
        await addEdgesButton.click();
        await expect(edgeInputsContainer).toContainText('Edge 1 (from, to, weight):');

        // Add another edge input
        await addEdgesButton.click();
        await expect(edgeInputsContainer).toContainText('Edge 2 (from, to, weight):');
    });

    test('should not add more edge inputs than specified', async ({ page }) => {
        const addEdgesButton = await page.locator('#add-edges');
        const edgesInput = await page.locator('#edges');

        // Set edges to 1 and try to add two edge inputs
        await edgesInput.fill('1');
        await addEdgesButton.click();
        await addEdgesButton.click();

        // Expect an alert for maximum edges reached
        await page.waitForTimeout(100); // Wait for potential alert
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('Maximum edges reached!');
    });

    test('should run the Bellman-Ford algorithm and display results', async ({ page }) => {
        // Set up the inputs
        await page.fill('#vertices', '5');
        await page.fill('#edges', '2');
        await page.fill('#source', '0');

        // Add edges
        await page.click('#add-edges');
        const edgeInputs = await page.locator('#edge-inputs div');
        await edgeInputs.nth(0).fill('0');
        await edgeInputs.nth(0).fill('1');
        await edgeInputs.nth(0).fill('4');
        await edgeInputs.nth(1).fill('1');
        await edgeInputs.nth(1).fill('2');
        await edgeInputs.nth(1).fill('1');

        // Run the algorithm
        const runAlgorithmButton = await page.locator('#run-algorithm');
        await runAlgorithmButton.click();

        // Verify the result
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toContainText('Distance from source to vertex 0: 0');
        await expect(resultDiv).toContainText('Distance from source to vertex 1: 4');
        await expect(resultDiv).toContainText('Distance from source to vertex 2: 5');
    });

    test('should handle negative-weight cycles gracefully', async ({ page }) => {
        // Set up the inputs
        await page.fill('#vertices', '3');
        await page.fill('#edges', '3');
        await page.fill('#source', '0');

        // Add edges that create a negative cycle
        await page.click('#add-edges');
        const edgeInputs = await page.locator('#edge-inputs div');
        await edgeInputs.nth(0).fill('0');
        await edgeInputs.nth(0).fill('1');
        await edgeInputs.nth(0).fill('1');
        await edgeInputs.nth(1).fill('1');
        await edgeInputs.nth(1).fill('2');
        await edgeInputs.nth(1).fill('-1');
        await edgeInputs.nth(2).fill('2');
        await edgeInputs.nth(2).fill('0');
        await edgeInputs.nth(2).fill('-1');

        // Run the algorithm
        const runAlgorithmButton = await page.locator('#run-algorithm');
        await runAlgorithmButton.click();

        // Expect an error to be thrown
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toContainText('Graph contains a negative-weight cycle');
    });

    test('should display "Infinity" for unreachable vertices', async ({ page }) => {
        // Set up the inputs
        await page.fill('#vertices', '3');
        await page.fill('#edges', '1');
        await page.fill('#source', '0');

        // Add a single edge
        await page.click('#add-edges');
        const edgeInputs = await page.locator('#edge-inputs div');
        await edgeInputs.nth(0).fill('0');
        await edgeInputs.nth(0).fill('1');
        await edgeInputs.nth(0).fill('10');

        // Run the algorithm
        const runAlgorithmButton = await page.locator('#run-algorithm');
        await runAlgorithmButton.click();

        // Verify the result
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toContainText('Distance from source to vertex 2: Infinity');
    });
});