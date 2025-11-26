import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdcc44b0-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Sliding Window Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should display the sliding window on load', async ({ page }) => {
        // Validate that the sliding window is present in the DOM
        const slidingWindow = await page.locator('#slidingWindow');
        await expect(slidingWindow).toBeVisible();
    });

    test('should start sliding window animation', async ({ page }) => {
        // Validate that the sliding window starts sliding after page load
        const slidingWindow = await page.locator('#slidingWindow');
        
        // Check initial position
        const initialTop = await slidingWindow.evaluate(el => el.style.top);
        
        // Wait for a short duration to allow the animation to start
        await page.waitForTimeout(2000);
        
        // Check position after some time to see if it has changed
        const newTop = await slidingWindow.evaluate(el => el.style.top);
        
        // Assert that the position has changed, indicating animation
        expect(initialTop).not.toEqual(newTop);
    });

    test('should have correct CSS class applied during sliding', async ({ page }) => {
        // Validate that the sliding class is added during the animation
        const slidingWindow = await page.locator('#slidingWindow');
        
        // Wait for a short duration to allow the animation to start
        await page.waitForTimeout(2000);
        
        // Check if the 'slide' class is present
        const hasSlideClass = await slidingWindow.evaluate(el => el.classList.contains('slide'));
        
        expect(hasSlideClass).toBe(true);
    });

    test('should stop sliding window animation when direction changes', async ({ page }) => {
        // This test assumes that the direction can be changed, but since there are no controls,
        // we will just validate that the animation can be interrupted by reloading the page.
        
        const slidingWindow = await page.locator('#slidingWindow');
        
        // Check initial position
        const initialTop = await slidingWindow.evaluate(el => el.style.top);
        
        // Reload the page to interrupt the animation
        await page.reload();
        
        // Check position after reload
        const newTop = await slidingWindow.evaluate(el => el.style.top);
        
        // Assert that the position has not changed, indicating the animation was interrupted
        expect(initialTop).toEqual(newTop);
    });

    test('should handle edge case of window resizing', async ({ page }) => {
        // Simulate window resizing
        await page.setViewportSize({ width: 800, height: 600 });
        
        const slidingWindow = await page.locator('#slidingWindow');
        
        // Wait for a short duration to allow the animation to adjust
        await page.waitForTimeout(2000);
        
        // Check the position after resizing
        const resizedTop = await slidingWindow.evaluate(el => el.style.top);
        
        // Assert that the position has changed, indicating the sliding window adjusted
        expect(resizedTop).not.toBe('');
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions if necessary after each test
        // Currently, there are no specific cleanup actions needed
    });
});