import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/15584ab0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Bellman-Ford Algorithm Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should initialize in idle state', async ({ page }) => {
        const logText = await page.locator('#log').innerText();
        expect(logText).toContain('Logs will appear here...');
    });

    test('should add a node and transition to idle state', async ({ page }) => {
        await page.click('#addNodeBtn');
        const logText1 = await page.locator('#log').innerText();
        expect(logText).toContain('Added Node1');
    });

    test('should add multiple nodes', async ({ page }) => {
        await page.click('#addNodeBtn');
        await page.click('#addNodeBtn');
        const logText2 = await page.locator('#log').innerText();
        expect(logText).toContain('Added Node1');
        expect(logText).toContain('Added Node2');
    });

    test('should add an edge and transition to idle state', async ({ page }) => {
        await page.click('#addNodeBtn'); // Add Node1
        await page.click('#addNodeBtn'); // Add Node2
        await page.click('#addEdgeBtn');
        
        const edgeWeightInput = page.locator('#edgeWeight');
        await edgeWeightInput.fill('5');
        await edgeWeightInput.press('Enter');

        const logText3 = await page.locator('#log').innerText();
        expect(logText).toContain('Edge added from Node1 to Node2 with weight 5');
    });

    test('should cancel adding an edge and return to idle state', async ({ page }) => {
        await page.click('#addNodeBtn'); // Add Node1
        await page.click('#addNodeBtn'); // Add Node2
        await page.click('#addEdgeBtn');
        
        const edgeWeightInput1 = page.locator('#edgeWeight');
        await edgeWeightInput.fill('5');
        await page.keyboard.press('Escape'); // Simulate cancel action

        const logText4 = await page.locator('#log').innerText();
        expect(logText).not.toContain('Edge added');
    });

    test('should run the algorithm and transition to idle state', async ({ page }) => {
        await page.click('#addNodeBtn'); // Add Node1
        await page.click('#addNodeBtn'); // Add Node2
        await page.click('#addEdgeBtn');
        
        const edgeWeightInput2 = page.locator('#edgeWeight');
        await edgeWeightInput.fill('5');
        await edgeWeightInput.press('Enter');

        await page.click('#runAlgorithmBtn');
        const logText5 = await page.locator('#log').innerText();
        expect(logText).toContain('Algorithm completed');
    });

    test('should handle running the algorithm with no edges', async ({ page }) => {
        await page.click('#addNodeBtn'); // Add Node1
        await page.click('#runAlgorithmBtn'); // Attempt to run without edges

        const logText6 = await page.locator('#log').innerText();
        expect(logText).toContain('No edges to run the algorithm');
    });

    test('should log actions correctly on state transitions', async ({ page }) => {
        await page.click('#addNodeBtn'); // Add Node1
        await page.click('#addEdgeBtn'); // Start adding edge
        const edgeWeightInput3 = page.locator('#edgeWeight');
        await edgeWeightInput.fill('5');
        await edgeWeightInput.press('Enter'); // Add edge
        await page.click('#runAlgorithmBtn'); // Run algorithm
        
        const logText7 = await page.locator('#log').innerText();
        expect(logText).toContain('Added Node1');
        expect(logText).toContain('Edge added from Node1 to Node2 with weight 5');
        expect(logText).toContain('Algorithm completed');
    });

    test.afterEach(async ({ page }) => {
        // Optionally clear logs or reset state if needed
        await page.locator('#log').evaluate((el) => el.innerHTML = 'Logs will appear here...');
    });
});