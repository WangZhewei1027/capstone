import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/079d6e00-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Insertion Sort Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should render the initial array in idle state', async ({ page }) => {
        const arrayElements = await page.$$('.element');
        expect(arrayElements.length).toBe(8); // Check if the initial array has 8 elements

        const initialValues = await Promise.all(arrayElements.map(el => el.textContent()));
        expect(initialValues).toEqual(['4', '3', '2', '10', '12', '1', '5', '6']); // Validate initial values
    });

    test('should transition to sorting state on START_SORT', async ({ page }) => {
        await page.click('button:has-text("Start Insertion Sort")');
        await page.waitForTimeout(1000); // Wait for sorting to start

        const statusText = await page.textContent('#status');
        expect(statusText).toContain('Sorting in progress'); // Check if status updates correctly
    });

    test('should transition to done state after sorting is completed', async ({ page }) => {
        await page.click('button:has-text("Start Insertion Sort")');
        await page.waitForTimeout(3000); // Wait for sorting to complete

        const statusText1 = await page.textContent('#status');
        expect(statusText).toContain('Sorting completed'); // Check if status updates correctly

        const arrayElements1 = await page.$$('.element');
        const sortedValues = await Promise.all(arrayElements.map(el => el.textContent()));
        expect(sortedValues).toEqual(['1', '2', '3', '4', '5', '6', '10', '12']); // Validate sorted values
    });

    test('should reset the array to initial state on RESET_ARRAY', async ({ page }) => {
        await page.click('button:has-text("Start Insertion Sort")');
        await page.waitForTimeout(3000); // Allow sorting to complete

        await page.click('button:has-text("Reset Array")');
        const statusText2 = await page.textContent('#status');
        expect(statusText).toContain("Click 'Start Insertion Sort' to see the algorithm in action!"); // Check status after reset

        const arrayElements2 = await page.$$('.element');
        const initialValues1 = await Promise.all(arrayElements.map(el => el.textContent()));
        expect(initialValues).toEqual(['4', '3', '2', '10', '12', '1', '5', '6']); // Validate reset values
    });

    test('should handle multiple resets and sorts correctly', async ({ page }) => {
        await page.click('button:has-text("Start Insertion Sort")');
        await page.waitForTimeout(3000); // Allow sorting to complete

        await page.click('button:has-text("Reset Array")');
        await page.click('button:has-text("Start Insertion Sort")');
        await page.waitForTimeout(3000); // Allow sorting to complete again

        const statusText3 = await page.textContent('#status');
        expect(statusText).toContain('Sorting completed'); // Check if status updates correctly after second sort

        const arrayElements3 = await page.$$('.element');
        const sortedValues1 = await Promise.all(arrayElements.map(el => el.textContent()));
        expect(sortedValues).toEqual(['1', '2', '3', '4', '5', '6', '10', '12']); // Validate sorted values again
    });

    test('should not allow sorting if already sorting', async ({ page }) => {
        await page.click('button:has-text("Start Insertion Sort")');
        await page.waitForTimeout(1000); // Wait for sorting to start

        const initialStatusText = await page.textContent('#status');
        await page.click('button:has-text("Start Insertion Sort")'); // Attempt to start sorting again
        const statusText4 = await page.textContent('#status');
        expect(statusText).toBe(initialStatusText); // Status should remain the same
    });
});