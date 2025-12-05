import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c9401a2-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('BFS Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the BFS Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify the page title
        await expect(page).toHaveTitle('BFS Visualization');
        
        // Check if the BFS button is visible
        const bfsButton = await page.locator('#startBFS');
        await expect(bfsButton).toBeVisible();
        
        // Check if the result div is empty initially
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
        
        // Check if all nodes are displayed
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(7);
    });

    test('should perform BFS and display the correct traversal order', async ({ page }) => {
        // Click the BFS start button
        await page.click('#startBFS');

        // Wait for the result to be displayed
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText(/BFS Traversal Order: A -> B -> C -> D -> E -> F -> G/);

        // Verify that nodes are highlighted in the correct order
        const highlightedNodes = await page.locator('.node[style*="background-color: rgb(40, 167, 69)"]');
        await expect(highlightedNodes).toHaveCount(7); // All nodes should be highlighted
    });

    test('should highlight nodes with correct colors during BFS', async ({ page }) => {
        // Click the BFS start button
        await page.click('#startBFS');

        // Wait for the first node to be highlighted
        const firstNode = await page.locator('.node[data-id="A"]');
        await expect(firstNode).toHaveCSS('background-color', 'rgb(40, 167, 69)');
        
        // Wait for the second node to be highlighted
        await page.waitForTimeout(1000); // Wait for 1 second
        const secondNode = await page.locator('.node[data-id="B"]');
        await expect(secondNode).toHaveCSS('background-color', 'rgb(40, 167, 69)');
        
        // Continue checking for the third node
        await page.waitForTimeout(1000); // Wait for another second
        const thirdNode = await page.locator('.node[data-id="C"]');
        await expect(thirdNode).toHaveCSS('background-color', 'rgb(40, 167, 69)');
    });

    test('should reset node colors after BFS completion', async ({ page }) => {
        // Click the BFS start button
        await page.click('#startBFS');

        // Wait for the BFS to complete
        await page.waitForTimeout(7000); // Wait for enough time for BFS to complete

        // Check that all nodes are reset to original colors
        const nodes = await page.locator('.node');
        for (let i = 0; i < await nodes.count(); i++) {
            const node = nodes.nth(i);
            await expect(node).toHaveCSS('background-color', 'rgb(255, 255, 255)'); // Original color
            await expect(node).toHaveCSS('color', 'rgb(0, 0, 0)'); // Original text color
        }
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Simulate an error scenario (not applicable in this case, but we can check for console errors)
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('Error message: ' + msg.text());
            }
        });

        // Click the BFS start button
        await page.click('#startBFS');

        // Wait for some time to observe any potential errors in the console
        await page.waitForTimeout(5000); // Wait for enough time to observe console logs
    });
});