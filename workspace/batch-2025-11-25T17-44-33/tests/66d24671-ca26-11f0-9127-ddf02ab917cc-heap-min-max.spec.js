import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-44-33/html/66d24671-ca26-11f0-9127-ddf02ab917cc.html';

test.describe('Min/Max Heap Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Min/Max Heap Visualization application
        await page.goto(BASE_URL);
    });

    test('should display the initial state of the heap', async ({ page }) => {
        // Verify that the heap container is empty on initial load
        const heapContainer = await page.locator('#heap-container');
        await expect(heapContainer).toBeEmpty();
    });

    test('should insert a value into the heap', async ({ page }) => {
        // Insert a value and verify the heap state
        await page.fill('#value-input', '10');
        await page.click('button:has-text("Insert")');

        // Verify that the heap container displays the inserted value
        const heapContainer = await page.locator('#heap-container');
        await expect(heapContainer).toContainText('10');
    });

    test('should insert multiple values into the heap', async ({ page }) => {
        // Insert multiple values and verify the heap state
        await page.fill('#value-input', '20');
        await page.click('button:has-text("Insert")');
        await page.fill('#value-input', '5');
        await page.click('button:has-text("Insert")');

        // Verify that the heap container displays the values in the correct order
        const heapContainer = await page.locator('#heap-container');
        await expect(heapContainer).toContainText('5');
        await expect(heapContainer).toContainText('20');
        await expect(heapContainer).toContainText('10'); // 10 should still be there
    });

    test('should remove the root value from the heap', async ({ page }) => {
        // Insert values first
        await page.fill('#value-input', '15');
        await page.click('button:has-text("Insert")');
        await page.fill('#value-input', '25');
        await page.click('button:has-text("Insert")');
        await page.fill('#value-input', '5');
        await page.click('button:has-text("Insert")');

        // Remove the root value and verify the heap state
        await page.click('button:has-text("Remove Root")');

        // Verify that the root value (5) has been removed
        const heapContainer = await page.locator('#heap-container');
        await expect(heapContainer).not.toContainText('5');
        await expect(heapContainer).toContainText('15');
        await expect(heapContainer).toContainText('25');
    });

    test('should handle inserting invalid values gracefully', async ({ page }) => {
        // Attempt to insert an invalid value (non-numeric)
        await page.fill('#value-input', 'abc');
        await page.click('button:has-text("Insert")');

        // Verify that the heap remains unchanged
        const heapContainer = await page.locator('#heap-container');
        await expect(heapContainer).toBeEmpty();
    });

    test('should handle removing from an empty heap gracefully', async ({ page }) => {
        // Attempt to remove from an empty heap
        await page.click('button:has-text("Remove Root")');

        // Verify that the heap remains empty
        const heapContainer = await page.locator('#heap-container');
        await expect(heapContainer).toBeEmpty();
    });

    test('should maintain heap properties after multiple operations', async ({ page }) => {
        // Insert values
        await page.fill('#value-input', '30');
        await page.click('button:has-text("Insert")');
        await page.fill('#value-input', '10');
        await page.click('button:has-text("Insert")');
        await page.fill('#value-input', '20');
        await page.click('button:has-text("Insert")');

        // Remove a value
        await page.click('button:has-text("Remove Root")');

        // Verify that the remaining values maintain the heap property
        const heapContainer = await page.locator('#heap-container');
        await expect(heapContainer).toContainText('10');
        await expect(heapContainer).toContainText('20');
        await expect(heapContainer).not.toContainText('30');
    });
});