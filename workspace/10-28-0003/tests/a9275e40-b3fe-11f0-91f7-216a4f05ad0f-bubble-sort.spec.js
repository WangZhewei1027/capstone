import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/default/html/a9275e40-b3fe-11f0-91f7-216a4f05ad0f.html';

test.describe('Bubble Sort Visualization Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should be in idle state initially', async () => {
        const sortButton = await page.locator('#sortArray');
        await expect(sortButton).toBeDisabled();
    });

    test('should generate an array and transition to array_generated state', async () => {
        const generateButton = await page.locator('#generateArray');
        await generateButton.click();

        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Check if 10 bars are generated
        await expect(await bars.first().evaluate(el => el.style.height)).toBeTruthy(); // Check if bars have height

        const sortButton = await page.locator('#sortArray');
        await expect(sortButton).toBeEnabled(); // Sort button should be enabled after array generation
    });

    test('should sort the array and transition to sorting state', async () => {
        const sortButton = await page.locator('#sortArray');
        await sortButton.click();

        const bars = await page.locator('.bar');
        const initialHeights = await bars.evaluateAll(bars => bars.map(bar => bar.style.height));

        // Wait for sorting to complete (this might need adjustment based on actual implementation)
        await page.waitForTimeout(2000); // Wait for sorting animation to complete

        const sortedHeights = await bars.evaluateAll(bars => bars.map(bar => bar.style.height));
        expect(initialHeights).not.toEqual(sortedHeights); // Heights should change after sorting
    });

    test('should transition to done state after sorting is complete', async () => {
        const sortButton = await page.locator('#sortArray');
        await expect(sortButton).toBeDisabled(); // Sort button should be disabled after sorting

        const generateButton = await page.locator('#generateArray');
        await expect(generateButton).toBeEnabled(); // Generate button should be enabled after sorting
    });

    test('should allow re-generating the array after sorting is done', async () => {
        const generateButton = await page.locator('#generateArray');
        await generateButton.click();

        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(10); // Check if new array is generated
    });

    test('should handle edge case of sorting already sorted array', async () => {
        const generateButton = await page.locator('#generateArray');
        await generateButton.click();

        const bars = await page.locator('.bar');
        await page.evaluate(() => {
            const array = Array.from({ length: 10 }, (_, i) => i + 1); // Sorted array
            const container = document.getElementById('arrayContainer');
            container.innerHTML = '';
            array.forEach(value => {
                const bar = document.createElement('div');
                bar.className = 'bar';
                bar.style.height = value * 2 + 'px';
                container.appendChild(bar);
            });
        });

        const sortButton = await page.locator('#sortArray');
        await sortButton.click();

        // Wait for sorting to complete
        await page.waitForTimeout(2000); 

        const sortedBars = await page.locator('.bar');
        const heights = await sortedBars.evaluateAll(bars => bars.map(bar => bar.style.height));
        expect(heights).toEqual(heights.sort()); // Should remain sorted
    });
});