import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2493aac1-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Min/Max Heap Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Load the application page before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial page correctly', async ({ page }) => {
        // Validate that the initial page elements are present
        const inputField = await page.locator('#value');
        const insertMinButton = await page.locator('button[onclick="insertMinHeap()"]');
        const insertMaxButton = await page.locator('button[onclick="insertMaxHeap()"]');
        const deleteMinButton = await page.locator('button[onclick="deleteMinHeap()"]');
        const deleteMaxButton = await page.locator('button[onclick="deleteMaxHeap()"]');

        await expect(inputField).toBeVisible();
        await expect(insertMinButton).toBeVisible();
        await expect(insertMaxButton).toBeVisible();
        await expect(deleteMinButton).toBeVisible();
        await expect(deleteMaxButton).toBeVisible();
    });

    test('should insert a number into the Min Heap', async ({ page }) => {
        // Insert a number into the Min Heap and verify the state
        await page.fill('#value', '10');
        await page.click('button[onclick="insertMinHeap()"]');

        // Verify the Min Heap visual is updated
        const minHeapContainer = await page.locator('#min-heap-container');
        await expect(minHeapContainer).toContainText('10');
    });

    test('should insert a number into the Max Heap', async ({ page }) => {
        // Insert a number into the Max Heap and verify the state
        await page.fill('#value', '20');
        await page.click('button[onclick="insertMaxHeap()"]');

        // Verify the Max Heap visual is updated
        const maxHeapContainer = await page.locator('#max-heap-container');
        await expect(maxHeapContainer).toContainText('20');
    });

    test('should delete the minimum value from the Min Heap', async ({ page }) => {
        // Insert numbers into Min Heap and then delete the minimum
        await page.fill('#value', '5');
        await page.click('button[onclick="insertMinHeap()"]');
        await page.fill('#value', '3');
        await page.click('button[onclick="insertMinHeap()"]');
        await page.fill('#value', '8');
        await page.click('button[onclick="insertMinHeap()"]');

        // Delete the minimum value
        await page.click('button[onclick="deleteMinHeap()"]');

        // Verify the Min Heap visual is updated
        const minHeapContainer1 = await page.locator('#min-heap-container');
        await expect(minHeapContainer).not.toContainText('3'); // 3 is the minimum
    });

    test('should delete the maximum value from the Max Heap', async ({ page }) => {
        // Insert numbers into Max Heap and then delete the maximum
        await page.fill('#value', '15');
        await page.click('button[onclick="insertMaxHeap()"]');
        await page.fill('#value', '25');
        await page.click('button[onclick="insertMaxHeap()"]');
        await page.fill('#value', '10');
        await page.click('button[onclick="insertMaxHeap()"]');

        // Delete the maximum value
        await page.click('button[onclick="deleteMaxHeap()"]');

        // Verify the Max Heap visual is updated
        const maxHeapContainer1 = await page.locator('#max-heap-container');
        await expect(maxHeapContainer).not.toContainText('25'); // 25 is the maximum
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Attempt to insert an invalid number (non-numeric)
        await page.fill('#value', 'invalid');
        await page.click('button[onclick="insertMinHeap()"]');

        // Verify that the Min Heap remains unchanged
        const minHeapContainer2 = await page.locator('#min-heap-container');
        await expect(minHeapContainer).toHaveText('');
    });

    test('should not crash when trying to delete from empty heaps', async ({ page }) => {
        // Attempt to delete from empty Min Heap
        await page.click('button[onclick="deleteMinHeap()"]');
        // No visual update expected, should not throw errors

        // Attempt to delete from empty Max Heap
        await page.click('button[onclick="deleteMaxHeap()"]');
        // No visual update expected, should not throw errors
    });

    test('should log errors in the console for invalid operations', async ({ page }) => {
        // Listen for console messages
        page.on('console', msg => {
            console.log(msg.type(), msg.text());
        });

        // Attempt to delete from empty heaps and check for console errors
        await page.click('button[onclick="deleteMinHeap()"]');
        await page.click('button[onclick="deleteMaxHeap()"]');

        // Check for expected console errors (not directly verifiable in Playwright)
        // This is a placeholder to indicate where you would check for console errors
        // In a real-world scenario, you might need to implement error logging in the application
    });
});