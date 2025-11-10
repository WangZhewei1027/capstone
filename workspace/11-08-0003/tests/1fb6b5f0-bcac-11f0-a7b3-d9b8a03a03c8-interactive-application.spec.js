import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1fb6b5f0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Two Pointers Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the interactive application before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state with the array visualized', async ({ page }) => {
        // Validate that the array is visualized in the idle state
        const arrayElements = await page.locator('#array .element');
        expect(await arrayElements.count()).toBe(10); // Check that 10 elements are rendered
        await expect(page.locator('#result')).toHaveText(''); // Ensure result is empty
    });

    test('should transition to running state when start button is clicked', async ({ page }) => {
        // Click the start button to transition to the running state
        await page.click('#startBtn');
        
        // Validate that the visualization starts
        await expect(page.locator('#result')).toHaveText(''); // Result should still be empty
        const leftPointer = await page.locator('#array .element').nth(0);
        const rightPointer = await page.locator('#array .element').nth(9);
        await expect(leftPointer).toHaveCSS('background-color', 'rgb(255, 193, 7)'); // Left pointer highlighted
        await expect(rightPointer).toHaveCSS('background-color', 'rgb(220, 53, 69)'); // Right pointer highlighted
    });

    test('should transition to done state when pointers meet', async ({ page }) => {
        // Click the start button to begin the visualization
        await page.click('#startBtn');
        
        // Simulate the pointers meeting by clicking a button or triggering the event
        await page.evaluate(() => {
            const event = new Event('POINTERS_MET');
            document.dispatchEvent(event);
        });

        // Validate that the state transitions to done
        await expect(page.locator('#result')).toHaveText('Pointers have met!'); // Assuming this is the expected result
        const arrayElements1 = await page.locator('#array .element');
        expect(await arrayElements.count()).toBe(10); // Ensure the array is still displayed
    });

    test('should return to idle state when reset button is clicked', async ({ page }) => {
        // Click the start button to transition to running state first
        await page.click('#startBtn');
        
        // Click the reset button to transition back to idle state
        await page.click('#resetBtn');

        // Validate that the application returns to idle state
        const arrayElements2 = await page.locator('#array .element');
        expect(await arrayElements.count()).toBe(10); // Ensure the array is still displayed
        await expect(page.locator('#result')).toHaveText(''); // Result should be empty again
    });

    test('should handle multiple resets correctly', async ({ page }) => {
        // Click the start button to transition to running state
        await page.click('#startBtn');
        
        // Simulate the pointers meeting
        await page.evaluate(() => {
            const event1 = new Event('POINTERS_MET');
            document.dispatchEvent(event);
        });

        // Click the reset button
        await page.click('#resetBtn');

        // Click the start button again
        await page.click('#startBtn');

        // Validate that the application starts fresh
        await expect(page.locator('#result')).toHaveText(''); // Result should still be empty
        const leftPointer1 = await page.locator('#array .element').nth(0);
        const rightPointer1 = await page.locator('#array .element').nth(9);
        await expect(leftPointer).toHaveCSS('background-color', 'rgb(255, 193, 7)'); // Left pointer highlighted
        await expect(rightPointer).toHaveCSS('background-color', 'rgb(220, 53, 69)'); // Right pointer highlighted
    });
});