import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abf7600-ca8a-11f0-8532-d714b1159c0d.html';

class SlidingWindowPage {
    constructor(page) {
        this.page = page;
        this.slidingWindow = this.page.locator('#sliding-window');
    }

    async navigate() {
        await this.page.goto(BASE_URL);
    }

    async clickSlidingWindow() {
        await this.slidingWindow.click();
    }

    async scrollSlidingWindow() {
        await this.slidingWindow.scrollIntoViewIfNeeded();
        await this.page.evaluate(() => {
            const slidingWindow = document.getElementById('sliding-window');
            slidingWindow.scrollTop = slidingWindow.scrollHeight;
        });
    }

    async resizeWindow() {
        await this.page.evaluate(() => {
            window.dispatchEvent(new Event('resize'));
        });
    }

    async getWindowStart() {
        return await this.page.evaluate(() => window.windowStart);
    }

    async getWindowEnd() {
        return await this.page.evaluate(() => window.windowEnd);
    }
}

test.describe('Sliding Window Application Tests', () => {
    let page;
    let slidingWindowPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        slidingWindowPage = new SlidingWindowPage(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await slidingWindowPage.navigate();
    });

    test('Initial State - Verify window start and end', async () => {
        const windowStart = await slidingWindowPage.getWindowStart();
        const windowEnd = await slidingWindowPage.getWindowEnd();
        expect(windowStart).toBe(0); // Initial state should have windowStart at 0
        expect(windowEnd).toBe(0); // Initial state should have windowEnd at 0
    });

    test('Item Changed - Verify state transition on item change', async () => {
        await slidingWindowPage.clickSlidingWindow(); // Trigger ITEM_CHANGE event
        const windowStart = await slidingWindowPage.getWindowStart();
        const windowEnd = await slidingWindowPage.getWindowEnd();
        expect(windowStart).toBe(0); // After change, windowStart should still be 0
        expect(windowEnd).toBe(1); // windowEnd should be updated to 1
    });

    test('Window Scrolled - Verify state transition on scroll', async () => {
        await slidingWindowPage.scrollSlidingWindow(); // Trigger WINDOW_SCROLL event
        const windowStart = await slidingWindowPage.getWindowStart();
        const windowEnd = await slidingWindowPage.getWindowEnd();
        expect(windowStart).toBe(0); // windowStart should remain 0
        expect(windowEnd).toBeGreaterThan(1); // windowEnd should reflect the scroll
    });

    test('Window Resized - Verify state transition on resize', async () => {
        await slidingWindowPage.resizeWindow(); // Trigger WINDOW_RESIZE event
        const windowStart = await slidingWindowPage.getWindowStart();
        const windowEnd = await slidingWindowPage.getWindowEnd();
        expect(windowStart).toBe(0); // windowStart should remain 0
        expect(windowEnd).toBeGreaterThan(1); // windowEnd should reflect the resize
    });

    test('Edge Case - Click outside of sliding window', async () => {
        await page.mouse.click(100, 100); // Click outside the sliding window
        const windowStart = await slidingWindowPage.getWindowStart();
        const windowEnd = await slidingWindowPage.getWindowEnd();
        expect(windowStart).toBe(0); // No change should occur
        expect(windowEnd).toBeGreaterThan(1); // windowEnd should remain unchanged
    });
});