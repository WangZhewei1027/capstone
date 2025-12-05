import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b66070-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Heap Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the heap visualization application
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Heap Visualization (Min & Max)');
        
        // Check that the input field is present
        const inputField = await page.locator('#valueInput');
        await expect(inputField).toBeVisible();
        
        // Check that both heap sections are present
        await expect(page.locator('#minHeap')).toBeVisible();
        await expect(page.locator('#maxHeap')).toBeVisible();
    });

    test('should insert a value into the Min Heap and update the DOM', async ({ page }) => {
        // Input a value and click the insert button for Min Heap
        await page.fill('#valueInput', '10');
        await page.click('#insertMinHeap');

        // Verify that the value is displayed in the Min Heap
        const minHeapNode = await page.locator('#minHeap .node');
        await expect(minHeapNode).toHaveText('10');
    });

    test('should insert multiple values into the Min Heap and verify order', async ({ page }) => {
        // Insert values into the Min Heap
        await page.fill('#valueInput', '20');
        await page.click('#insertMinHeap');
        await page.fill('#valueInput', '5');
        await page.click('#insertMinHeap');
        await page.fill('#valueInput', '15');
        await page.click('#insertMinHeap');

        // Verify the order of elements in the Min Heap
        const minHeapNodes = await page.locator('#minHeap .node');
        await expect(minHeapNodes).toHaveCount(3);
        await expect(minHeapNodes.nth(0)).toHaveText('5'); // Root should be the smallest
        await expect(minHeapNodes.nth(1)).toHaveText('20');
        await expect(minHeapNodes.nth(2)).toHaveText('15');
    });

    test('should insert a value into the Max Heap and update the DOM', async ({ page }) => {
        // Input a value and click the insert button for Max Heap
        await page.fill('#valueInput', '10');
        await page.click('#insertMaxHeap');

        // Verify that the value is displayed in the Max Heap
        const maxHeapNode = await page.locator('#maxHeap .node');
        await expect(maxHeapNode).toHaveText('10');
    });

    test('should insert multiple values into the Max Heap and verify order', async ({ page }) => {
        // Insert values into the Max Heap
        await page.fill('#valueInput', '20');
        await page.click('#insertMaxHeap');
        await page.fill('#valueInput', '5');
        await page.click('#insertMaxHeap');
        await page.fill('#valueInput', '15');
        await page.click('#insertMaxHeap');

        // Verify the order of elements in the Max Heap
        const maxHeapNodes = await page.locator('#maxHeap .node');
        await expect(maxHeapNodes).toHaveCount(3);
        await expect(maxHeapNodes.nth(0)).toHaveText('20'); // Root should be the largest
        await expect(maxHeapNodes.nth(1)).toHaveText('15');
        await expect(maxHeapNodes.nth(2)).toHaveText('5');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Input an invalid value and try to insert into Min Heap
        await page.fill('#valueInput', 'abc');
        await page.click('#insertMinHeap');

        // Verify that no nodes are added to the Min Heap
        const minHeapNodes = await page.locator('#minHeap .node');
        await expect(minHeapNodes).toHaveCount(0);
        
        // Input an invalid value and try to insert into Max Heap
        await page.fill('#valueInput', 'xyz');
        await page.click('#insertMaxHeap');

        // Verify that no nodes are added to the Max Heap
        const maxHeapNodes = await page.locator('#maxHeap .node');
        await expect(maxHeapNodes).toHaveCount(0);
    });

    test('should clear input field after insertion', async ({ page }) => {
        // Input a value and insert into Min Heap
        await page.fill('#valueInput', '10');
        await page.click('#insertMinHeap');

        // Verify that the input field is cleared
        const inputField = await page.locator('#valueInput');
        await expect(inputField).toHaveValue('');
    });
});