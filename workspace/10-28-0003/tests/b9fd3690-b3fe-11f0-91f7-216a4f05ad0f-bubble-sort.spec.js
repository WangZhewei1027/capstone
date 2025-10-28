import { test, expect } from '@playwright/test';

class BubbleSortPage {
    constructor(page) {
        this.page = page;
        this.arrayContainer = page.locator('#array');
        this.generateButton = page.locator('#generate');
        this.sortButton = page.locator('#sort');
        this.speedSlider = page.locator('#speed-slider');
    }

    async generateArray() {
        await this.generateButton.click();
    }

    async startSort() {
        await this.sortButton.click();
    }

    async getBars() {
        return await this.arrayContainer.locator('.bar').count();
    }

    async getBarHeight(index) {
        return await this.arrayContainer.locator('.bar').nth(index).evaluate(el => el.offsetHeight);
    }

    async getBarColor(index) {
        return await this.arrayContainer.locator('.bar').nth(index).evaluate(el => getComputedStyle(el).backgroundColor);
    }
}

test.describe('Bubble Sort Visualizer', () => {
    let page;
    let bubbleSortPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto('http://127.0.0.1:5500/workspace/default/html/b9fd3690-b3fe-11f0-91f7-216a4f05ad0f.html');
        bubbleSortPage = new BubbleSortPage(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle', async () => {
        const barCount = await bubbleSortPage.getBars();
        expect(barCount).toBe(0); // No bars should be present initially
    });

    test('Generate Array transitions to array_generated', async () => {
        await bubbleSortPage.generateArray();
        const barCount = await bubbleSortPage.getBars();
        expect(barCount).toBeGreaterThan(0); // Bars should be generated
    });

    test('Start Sort transitions to sorting', async () => {
        await bubbleSortPage.startSort();
        // Check if the bars are changing color to indicate sorting
        const firstBarColor = await bubbleSortPage.getBarColor(0);
        expect(firstBarColor).toBe('rgb(255, 0, 0)'); // Expecting red color for comparison
    });

    test('Sorting completes and transitions to sorted', async () => {
        await bubbleSortPage.startSort();
        // Wait for sorting to complete
        await page.waitForTimeout(3000); // Adjust timeout based on expected sort duration
        const barCount = await bubbleSortPage.getBars();
        expect(barCount).toBeGreaterThan(0); // Bars should still be present
        const firstBarHeight = await bubbleSortPage.getBarHeight(0);
        const secondBarHeight = await bubbleSortPage.getBarHeight(1);
        expect(firstBarHeight).toBeLessThanOrEqual(secondBarHeight); // Expecting sorted order
    });

    test('Sorted state can generate a new array', async () => {
        await bubbleSortPage.generateArray();
        const barCount = await bubbleSortPage.getBars();
        expect(barCount).toBeGreaterThan(0); // New bars should be generated
    });

    test('Sorted state can start sorting again', async () => {
        await bubbleSortPage.startSort();
        // Wait for sorting to complete
        await page.waitForTimeout(3000); // Adjust timeout based on expected sort duration
        const barCount = await bubbleSortPage.getBars();
        expect(barCount).toBeGreaterThan(0); // Bars should still be present
    });

    test('Edge case: Generate Array multiple times', async () => {
        await bubbleSortPage.generateArray();
        await bubbleSortPage.generateArray(); // Generate again
        const barCount = await bubbleSortPage.getBars();
        expect(barCount).toBeGreaterThan(0); // Bars should be present after multiple generations
    });

    test('Edge case: Start sort without generating an array', async () => {
        await bubbleSortPage.startSort();
        const barCount = await bubbleSortPage.getBars();
        expect(barCount).toBe(0); // No bars should be present, sort should not start
    });
});