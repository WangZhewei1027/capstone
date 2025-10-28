import { test, expect } from '@playwright/test';

class BubbleSortPage {
    constructor(page) {
        this.page = page;
        this.generateButton = page.locator('#generate');
        this.sortButton = page.locator('#sort');
        this.arrayContainer = page.locator('#arrayContainer');
    }

    async generateArray() {
        await this.generateButton.click();
    }

    async startSorting() {
        await this.sortButton.click();
    }

    async getArrayBars() {
        return await this.arrayContainer.locator('.array-bar');
    }

    async getBarHeight(index) {
        return await this.getArrayBars().nth(index).evaluate(bar => bar.offsetHeight);
    }

    async getBarValue(index) {
        return await this.getArrayBars().nth(index).innerText();
    }

    async isSortButtonDisabled() {
        return await this.sortButton.isDisabled();
    }
}

test.describe('Bubble Sort Interactive Module', () => {
    let page;
    let bubbleSortPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto('http://127.0.0.1:5500/workspace/10-28-0003/html/e416b090-b3ff-11f0-b68e-b3da5f0f2d2c.html');
        bubbleSortPage = new BubbleSortPage(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle', async () => {
        // Verify that the sort button is disabled initially
        expect(await bubbleSortPage.isSortButtonDisabled()).toBe(true);
    });

    test('Generate Array transitions to array_generated', async () => {
        await bubbleSortPage.generateArray();

        // Verify that the sort button is enabled after generating the array
        expect(await bubbleSortPage.isSortButtonDisabled()).toBe(false);
        
        // Verify that the array bars are displayed
        const bars = await bubbleSortPage.getArrayBars();
        expect(await bars.count()).toBeGreaterThan(0);
    });

    test('Start Sort transitions to sorting', async () => {
        await bubbleSortPage.startSorting();

        // Verify that the sort button is disabled during sorting
        expect(await bubbleSortPage.isSortButtonDisabled()).toBe(true);

        // Verify that the sorting process is initiated (you may want to add more checks here)
        const bars = await bubbleSortPage.getArrayBars();
        expect(await bars.count()).toBeGreaterThan(0);
    });

    test('Sorting completes and transitions to done', async () => {
        // Wait for sorting to complete (this may need adjustment based on your implementation)
        await page.waitForTimeout(2000); // Adjust this timeout as necessary

        // Verify that the bars are sorted
        const bars = await bubbleSortPage.getArrayBars();
        const values = [];
        for (let i = 0; i < await bars.count(); i++) {
            values.push(parseInt(await bubbleSortPage.getBarValue(i)));
        }

        // Check if the array is sorted
        const sortedValues = [...values].sort((a, b) => a - b);
        expect(values).toEqual(sortedValues);

        // Verify that we can generate a new array
        await bubbleSortPage.generateArray();
        expect(await bubbleSortPage.isSortButtonDisabled()).toBe(false);
    });

    test('Generate Array again from done state', async () => {
        await bubbleSortPage.generateArray();

        // Verify that the sort button is enabled after generating the array
        expect(await bubbleSortPage.isSortButtonDisabled()).toBe(false);
        
        // Verify that the array bars are displayed
        const bars = await bubbleSortPage.getArrayBars();
        expect(await bars.count()).toBeGreaterThan(0);
    });
});