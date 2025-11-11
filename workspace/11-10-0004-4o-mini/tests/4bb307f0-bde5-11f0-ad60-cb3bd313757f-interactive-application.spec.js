import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0004-4o-mini/html/4bb307f0-bde5-11f0-ad60-cb3bd313757f.html';

class BubbleSortPage {
    constructor(page) {
        this.page = page;
        this.startButton = page.locator('#start-btn');
        this.resetButton = page.locator('#reset-btn');
        this.arrayContainer = page.locator('#array-container');
    }

    async navigate() {
        await this.page.goto(BASE_URL);
    }

    async startSorting() {
        await this.startButton.click();
    }

    async resetSorting() {
        await this.resetButton.click();
    }

    async getBars() {
        return this.arrayContainer.locator('.bar');
    }

    async getBarHeights() {
        const bars = await this.getBars();
        return Promise.all(bars.evaluateAll(b => b.map(bar => bar.offsetHeight)));
    }

    async isActive(index) {
        const bars = await this.getBars();
        return bars.nth(index).evaluate(bar => bar.classList.contains('active'));
    }

    async isSorted(index) {
        const bars = await this.getBars();
        return bars.nth(index).evaluate(bar => bar.classList.contains('sorted'));
    }
}

test.describe('Bubble Sort Visualization Tests', () => {
    let page;
    let bubbleSortPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        bubbleSortPage = new BubbleSortPage(page);
        await bubbleSortPage.navigate();
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should generate an array on idle state', async () => {
        const bars = await bubbleSortPage.getBars();
        expect(await bars.count()).toBeGreaterThan(0); // Ensure bars are generated
    });

    test('should start sorting and visualize the sorting process', async () => {
        await bubbleSortPage.startSorting();
        await page.waitForTimeout(1000); // Wait for the sorting to start

        const bars = await bubbleSortPage.getBars();
        const initialHeights = await bubbleSortPage.getBarHeights();

        // Check if at least one bar is active during sorting
        let activeCount = 0;
        for (let i = 0; i < await bars.count(); i++) {
            if (await bubbleSortPage.isActive(i)) {
                activeCount++;
            }
        }
        expect(activeCount).toBeGreaterThan(0);

        // Wait for sorting to complete
        await page.waitForTimeout(5000); // Wait for the sort to finish, adjust as necessary

        const finalHeights = await bubbleSortPage.getBarHeights();
        expect(finalHeights).toEqual([...initialHeights].sort((a, b) => a - b)); // Ensure array is sorted
    });

    test('should transition to done state after sorting', async () => {
        await bubbleSortPage.startSorting();
        await page.waitForTimeout(5000); // Wait for sorting to complete

        const bars = await bubbleSortPage.getBars();
        for (let i = 0; i < await bars.count(); i++) {
            expect(await bubbleSortPage.isSorted(i)).toBeTruthy(); // Ensure all bars are sorted
        }
    });

    test('should reset to idle state', async () => {
        await bubbleSortPage.resetSorting();
        const bars = await bubbleSortPage.getBars();
        expect(await bars.count()).toBeGreaterThan(0); // Ensure bars are generated again
    });
});