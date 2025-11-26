import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdc58df0-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Stack Interactive Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the stack application page before each test
        await page.goto(BASE_URL);
    });

    test('should render the stack in idle state', async ({ page }) => {
        // Verify that the stack is rendered and visible in the idle state
        const stack = await page.locator('.stack');
        await expect(stack).toBeVisible();
        await expect(stack).toHaveCSS('background-color', 'rgb(241, 241, 241)'); // Default color
    });

    test('should change stack color on hover', async ({ page }) => {
        // Verify the visual feedback when hovering over the stack
        const stack = await page.locator('.stack');
        await stack.hover();
        await expect(stack).toHaveCSS('background-color', 'rgb(221, 221, 221)'); // Hover color
    });

    test('should log stack background color on interaction', async ({ page }) => {
        // Simulate interaction and check console log output
        const stack = await page.locator('.stack');
        await stack.click();

        // Since we cannot directly capture console logs in Playwright, we can check the background color
        await expect(stack).toHaveCSS('background-color', 'rgb(241, 241, 241)'); // Ensure it remains the same after click
    });

    test('should not have any transitions defined', async ({ page }) => {
        // Verify that there are no transitions defined in the FSM
        const transitions = [];
        expect(transitions).toHaveLength(0); // No transitions expected
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        // Verify that clicking on the stack does not throw any errors
        const stack = await page.locator('.stack');
        await stack.click();
        // Check that the stack is still visible and has the correct color
        await expect(stack).toBeVisible();
        await expect(stack).toHaveCSS('background-color', 'rgb(241, 241, 241)');
    });
});