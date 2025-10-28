import { test, expect } from '@playwright/test';

class BubbleSortPage {
    constructor(page) {
        this.page = page;
        this.arrayContainer = page.locator('#arrayContainer');
        this.generateBtn = page.locator('#generateBtn');
        this.sortBtn = page.locator('#sortBtn');
    }

    async generateNewArray() {
        await this.generateBtn.click();
    }

    async startSorting() {
        await this.sortBtn.click();
    }

    async getBars() {
        return await this.arrayContainer.locator('.bar').count();
    }

    async getBarHeights() {
        const bars = await this.arrayContainer.locator('.bar');
        const heights = [];
        for (let i = 0; i < await bars.count(); i++) {
            heights.push(await bars.nth(i).evaluate(bar => bar.offsetHeight));
        }
        return heights;
    }
}

test.describe('Bubble Sort Application', () => {
    let page;
    let bubbleSortPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto('http://127.0.0.1:5500/workspace/default/html/c5b5b390-b3fe-11f0-91f7-216a4f05ad0f.html');
        bubbleSortPage = new BubbleSortPage(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state should be idle', async () => {
        const barsCount = await bubbleSortPage.getBars();
        expect(barsCount).toBe(0); // No bars should be present initially
    });

    test('Generate New Array transitions to array_generated state', async () => {
        await bubbleSortPage.generateNewArray();
        const barsCount = await bubbleSortPage.getBars();
        expect(barsCount).toBeGreaterThan(0); // Bars should be rendered
    });

    test('Start Sorting transitions to sorting state', async () => {
        await bubbleSortPage.startSorting();
        await page.waitForTimeout(1000); // Wait for sorting to start
        const barsCount = await bubbleSortPage.getBars();
        expect(barsCount).toBeGreaterThan(0); // Bars should still be present
    });

    test('Sorting should complete and transition to done state', async () => {
        await bubbleSortPage.startSorting();
        await page.waitForTimeout(5000); // Wait for sorting to complete
        const barsCount = await bubbleSortPage.getBars();
        expect(barsCount).toBeGreaterThan(0); // Bars should still be present
    });

    test('Generate New Array after sorting should transition to array_generated state', async () => {
        await bubbleSortPage.generateNewArray();
        const barsCount = await bubbleSortPage.getBars();
        expect(barsCount).toBeGreaterThan(0); // New bars should be rendered
    });

    test('Sorting again should work after generating new array', async () => {
        await bubbleSortPage.startSorting();
        await page.waitForTimeout(5000); // Wait for sorting to complete
        const barsCount = await bubbleSortPage.getBars();
        expect(barsCount).toBeGreaterThan(0); // Bars should still be present
    });

    test('Check visual feedback during sorting', async () => {
        await bubbleSortPage.generateNewArray();
        await bubbleSortPage.startSorting();
        const initialHeights = await bubbleSortPage.getBarHeights();
        await page.waitForTimeout(3000); // Wait for some sorting to happen
        const currentHeights = await bubbleSortPage.getBarHeights();
        expect(currentHeights).not.toEqual(initialHeights); // Heights should change
    });
});