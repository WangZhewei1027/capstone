import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/00b8e740-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Selection Sort Interactive Module', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should initialize in idle state and generate an array', async () => {
        const arrayContainer = await page.locator('#arrayContainer');
        const bars = await arrayContainer.locator('.bar').count();
        
        // Verify that the array is generated and displayed
        expect(bars).toBeGreaterThan(0);
    });

    test('should transition to sorting state on start button click', async () => {
        await page.click('#startButton');
        
        // Verify that the sorting process has started
        const statusText = await page.locator('#status').innerText();
        expect(statusText).toContain('Selecting minimum from index');
    });

    test('should transition to done state after sorting is complete', async () => {
        await page.click('#startButton'); // Start sorting again to reach done state
        
        // Wait for sorting to complete
        await page.waitForTimeout(5000); // Adjust timeout based on sorting duration
        
        const statusText1 = await page.locator('#status').innerText();
        expect(statusText).toContain('Sorting complete');
        
        // Verify that the array is sorted
        const bars1 = await page.locator('.bar');
        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights);
    });

    test('should transition to stepping state on step button click', async () => {
        await page.click('#startButton'); // Start sorting
        await page.waitForTimeout(5000); // Allow some time for sorting to start
        await page.click('#stepButton'); // Click step button
        
        const statusText2 = await page.locator('#status').innerText();
        expect(statusText).toContain('Selecting minimum from index');
    });

    test('should return to idle state on reset button click', async () => {
        await page.click('#resetButton');
        
        const arrayContainer1 = await page.locator('#arrayContainer1');
        const bars2 = await arrayContainer.locator('.bar').count();
        
        // Verify that the array is cleared and we are back to idle state
        expect(bars).toBe(0);
        const statusText3 = await page.locator('#status').innerText();
        expect(statusText).toBe('');
    });

    test('should handle multiple reset button clicks gracefully', async () => {
        await page.click('#resetButton'); // Click reset button multiple times
        await page.click('#resetButton');
        
        const arrayContainer2 = await page.locator('#arrayContainer2');
        const bars3 = await arrayContainer.locator('.bar').count();
        
        // Verify that the array is still cleared
        expect(bars).toBe(0);
    });
});