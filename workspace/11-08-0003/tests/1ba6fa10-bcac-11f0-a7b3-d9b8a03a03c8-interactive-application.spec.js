import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1ba6fa10-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Sliding Window Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is idle', async ({ page }) => {
        // Validate that the application starts in the idle state
        const window = page.locator('.window');
        const arrayElements = page.locator('.array-element');

        // Check that the window is not active initially
        const activeElements = await arrayElements.evaluateAll(elements => 
            elements.filter(el => el.classList.contains('active')).length
        );
        expect(activeElements).toBe(0);
    });

    test('Clicking Next transitions to moving_forward', async ({ page }) => {
        // Simulate clicking the Next button
        await page.click('#next');

        // Validate that the window is updated and the state is now moving_forward
        const window1 = page.locator('.window1');
        await expect(window).toHaveClass(/active/);
    });

    test('Clicking Previous transitions to moving_backward', async ({ page }) => {
        // Simulate clicking the Previous button
        await page.click('#prev');

        // Validate that the window is updated and the state is now moving_backward
        const window2 = page.locator('.window2');
        await expect(window).toHaveClass(/active/);
    });

    test('Clicking Next updates the window and returns to idle', async ({ page }) => {
        // Click Next to move forward
        await page.click('#next');
        await page.waitForTimeout(500); // Wait for the window to update

        // Validate that the window is updated
        const window3 = page.locator('.window3');
        await expect(window).toHaveClass(/active/);

        // Click Next again to return to idle
        await page.click('#next');
        await page.waitForTimeout(500); // Wait for the window to update

        // Validate that the application returns to idle state
        const activeElements1 = await page.locator('.array-element.active').count();
        expect(activeElements).toBe(0);
    });

    test('Clicking Previous updates the window and returns to idle', async ({ page }) => {
        // Click Previous to move backward
        await page.click('#prev');
        await page.waitForTimeout(500); // Wait for the window to update

        // Validate that the window is updated
        const window4 = page.locator('.window4');
        await expect(window).toHaveClass(/active/);

        // Click Previous again to return to idle
        await page.click('#prev');
        await page.waitForTimeout(500); // Wait for the window to update

        // Validate that the application returns to idle state
        const activeElements2 = await page.locator('.array-element.active').count();
        expect(activeElements).toBe(0);
    });

    test('Edge case: Clicking Next when at the end of the array', async ({ page }) => {
        // Click Next until we reach the end
        for (let i = 0; i < 6; i++) {
            await page.click('#next');
            await page.waitForTimeout(500);
        }

        // Validate that the last window is displayed correctly
        const window5 = page.locator('.window5');
        await expect(window).toHaveClass(/active/);
    });

    test('Edge case: Clicking Previous when at the start of the array', async ({ page }) => {
        // Click Previous until we reach the start
        for (let i = 0; i < 6; i++) {
            await page.click('#prev');
            await page.waitForTimeout(500);
        }

        // Validate that the first window is displayed correctly
        const window6 = page.locator('.window6');
        await expect(window).toHaveClass(/active/);
    });

    test.afterEach(async ({ page }) => {
        // Optionally, you can add any cleanup code here if needed
    });
});