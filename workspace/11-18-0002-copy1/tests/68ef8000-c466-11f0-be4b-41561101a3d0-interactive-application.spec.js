import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-18-0002/html/68ef8000-c466-11f0-be4b-41561101a3d0.html';

test.describe('Heap (Min/Max) Interactive Exploration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display initial state correctly', async ({ page }) => {
        const heapContainer = await page.locator('#heapContainer');
        const inputArray = await page.locator('#inputArray');
        
        // Verify that the heap container is empty initially
        await expect(heapContainer).toBeEmpty();
        // Verify that the input field is empty
        await expect(inputArray).toHaveValue('');
    });

    test('should alert when trying to build heap with empty input', async ({ page }) => {
        await page.click('button:has-text("Build Min/Max Heap")');
        const alert = await page.waitForEvent('dialog');
        await expect(alert.message()).toContain('Please enter valid array elements.');
        await alert.dismiss();
    });

    test('should alert when trying to build heap with non-numeric input', async ({ page }) => {
        await page.fill('#inputArray', 'a,b,c');
        await page.click('button:has-text("Build Min/Max Heap")');
        const alert = await page.waitForEvent('dialog');
        await expect(alert.message()).toContain('Array elements must be numbers.');
        await alert.dismiss();
    });

    test('should build a min heap and display it', async ({ page }) => {
        await page.fill('#inputArray', '3,1,4,1,5,9');
        await page.click('button:has-text("Build Min/Max Heap")');

        // Verify that the heap is displayed correctly
        const heapContainer = await page.locator('#heapContainer');
        const nodes = await heapContainer.locator('.node');
        await expect(nodes).toHaveCount(6);
        await expect(nodes.nth(0)).toHaveText('1'); // Root of the min heap
    });

    test('should build a max heap and display it', async ({ page }) => {
        await page.fill('#inputArray', '3,1,4,1,5,9');
        await page.locator('input[name="heapType"][value="max"]').check();
        await page.click('button:has-text("Build Min/Max Heap")');

        // Verify that the heap is displayed correctly
        const heapContainer = await page.locator('#heapContainer');
        const nodes = await heapContainer.locator('.node');
        await expect(nodes).toHaveCount(6);
        await expect(nodes.nth(0)).toHaveText('9'); // Root of the max heap
    });

    test('should heapify the current heap', async ({ page }) => {
        await page.fill('#inputArray', '3,1,4,1,5,9');
        await page.click('button:has-text("Build Min/Max Heap")');
        await page.click('button:has-text("Heapify")');

        // Verify that the heap is heapified correctly
        const heapContainer = await page.locator('#heapContainer');
        const nodes = await heapContainer.locator('.node');
        await expect(nodes.nth(0)).toHaveText('1'); // Root of the min heap after heapify
    });

    test('should handle heapify on an empty heap', async ({ page }) => {
        await page.click('button:has-text("Heapify")');
        const heapContainer = await page.locator('#heapContainer');
        await expect(heapContainer).toBeEmpty(); // Should still be empty
    });

    test('should handle heapify with no elements', async ({ page }) => {
        await page.fill('#inputArray', '');
        await page.click('button:has-text("Build Min/Max Heap")');
        const alert = await page.waitForEvent('dialog');
        await expect(alert.message()).toContain('Please enter valid array elements.');
        await alert.dismiss();
    });
});