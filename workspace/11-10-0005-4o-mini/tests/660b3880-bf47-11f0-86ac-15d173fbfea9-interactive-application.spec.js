import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0005-4o-mini/html/660b3880-bf47-11f0-86ac-15d173fbfea9.html';

test.describe('Interactive Binary Search Tree Explorer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('State: Idle', () => {
        test('should transition to inserting state on insert button click', async ({ page }) => {
            await page.fill('#valueInput', '10');
            await page.click('#insertButton');
            // Validate the state transition and the visualization update
            const visualization = await page.locator('#visualization').innerHTML();
            expect(visualization).toContain('10'); // Assuming the visualization updates with the inserted value
        });

        test('should transition to traversing_in_order state on in-order button click', async ({ page }) => {
            await page.click('#inOrderButton');
            // Check if traversal is initiated
            const visualization = await page.locator('#visualization').innerHTML();
            expect(visualization).toContain('In-order Traversal'); // Assuming some indication of traversal
        });

        test('should transition to traversing_pre_order state on pre-order button click', async ({ page }) => {
            await page.click('#preOrderButton');
            const visualization = await page.locator('#visualization').innerHTML();
            expect(visualization).toContain('Pre-order Traversal');
        });

        test('should transition to traversing_post_order state on post-order button click', async ({ page }) => {
            await page.click('#postOrderButton');
            const visualization = await page.locator('#visualization').innerHTML();
            expect(visualization).toContain('Post-order Traversal');
        });
    });

    test.describe('State: Inserting', () => {
        test('should insert value and return to idle state', async ({ page }) => {
            await page.fill('#valueInput', '20');
            await page.click('#insertButton');
            const visualization = await page.locator('#visualization').innerHTML();
            expect(visualization).toContain('20');
            // Assuming some indication of returning to idle state
        });
    });

    test.describe('State: Traversing', () => {
        test('should complete in-order traversal and return to idle state', async ({ page }) => {
            await page.click('#inOrderButton');
            // Simulate traversal completion
            await page.waitForTimeout(1000); // Wait for the traversal to complete
            const visualization = await page.locator('#visualization').innerHTML();
            expect(visualization).toContain('Traversal Complete'); // Assuming some indication of completion
        });

        test('should complete pre-order traversal and return to idle state', async ({ page }) => {
            await page.click('#preOrderButton');
            await page.waitForTimeout(1000);
            const visualization = await page.locator('#visualization').innerHTML();
            expect(visualization).toContain('Traversal Complete');
        });

        test('should complete post-order traversal and return to idle state', async ({ page }) => {
            await page.click('#postOrderButton');
            await page.waitForTimeout(1000);
            const visualization = await page.locator('#visualization').innerHTML();
            expect(visualization).toContain('Traversal Complete');
        });
    });

    test.describe('Edge Cases', () => {
        test('should not insert invalid value', async ({ page }) => {
            await page.fill('#valueInput', 'abc'); // Invalid input
            await page.click('#insertButton');
            const errorMessage = await page.locator('#error').innerText(); // Assuming there's an error element
            expect(errorMessage).toContain('Invalid value'); // Assuming some error message is displayed
        });

        test('should handle empty input on insert button click', async ({ page }) => {
            await page.fill('#valueInput', ''); // Empty input
            await page.click('#insertButton');
            const errorMessage = await page.locator('#error').innerText();
            expect(errorMessage).toContain('Please enter a value');
        });
    });

    test.afterEach(async ({ page }) => {
        // Any cleanup if necessary
    });
});