import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/057bc680-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Heap Sort Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should initialize in idle state', async ({ page }) => {
        const arrayInput = await page.locator('#arrayInput');
        const outputDiv = await page.locator('#output');
        
        // Check that input field is empty and output is cleared
        await expect(arrayInput).toHaveValue('');
        await expect(outputDiv).toHaveText('');
    });

    test('should transition to building_heap state on CREATE_HEAP', async ({ page }) => {
        await page.fill('#arrayInput', '3, 1, 4, 1, 5');
        await page.click('#createHeap');

        // Verify that the heap visualization is rendered
        const heapDiv = await page.locator('#heap-visualization');
        await expect(heapDiv).toBeVisible();
    });

    test('should transition to heap_visualized state after heap is built', async ({ page }) => {
        await page.fill('#arrayInput', '3, 1, 4, 1, 5');
        await page.click('#createHeap');

        // Simulate heap built event
        await page.evaluate(() => {
            document.dispatchEvent(new Event('HEAP_BUILT'));
        });

        const heapDiv1 = await page.locator('#heap-visualization');
        await expect(heapDiv).toHaveText(/1|3|4|5/); // Check if heap is visualized
    });

    test('should transition to sorting state on SORT', async ({ page }) => {
        await page.fill('#arrayInput', '3, 1, 4, 1, 5');
        await page.click('#createHeap');
        await page.evaluate(() => {
            document.dispatchEvent(new Event('HEAP_BUILT'));
        });

        await page.click('#sort');

        // Verify sorting state
        const outputDiv1 = await page.locator('#output');
        await expect(outputDiv).toHaveText(/Sorting.../); // Assuming sorting feedback is shown
    });

    test('should transition to done state after SORT_COMPLETE', async ({ page }) => {
        await page.fill('#arrayInput', '3, 1, 4, 1, 5');
        await page.click('#createHeap');
        await page.evaluate(() => {
            document.dispatchEvent(new Event('HEAP_BUILT'));
        });
        await page.click('#sort');

        // Simulate sort complete event
        await page.evaluate(() => {
            document.dispatchEvent(new Event('SORT_COMPLETE'));
        });

        const outputDiv2 = await page.locator('#output');
        await expect(outputDiv).toHaveText(/Sorted Output:/); // Assuming output is displayed
    });

    test('should reset to idle state on RESET', async ({ page }) => {
        await page.fill('#arrayInput', '3, 1, 4, 1, 5');
        await page.click('#createHeap');
        await page.evaluate(() => {
            document.dispatchEvent(new Event('HEAP_BUILT'));
        });
        await page.click('#sort');
        await page.evaluate(() => {
            document.dispatchEvent(new Event('SORT_COMPLETE'));
        });

        await page.evaluate(() => {
            document.dispatchEvent(new Event('RESET'));
        });

        const arrayInput1 = await page.locator('#arrayInput1');
        const outputDiv3 = await page.locator('#output');
        
        // Check that input field is empty and output is cleared
        await expect(arrayInput).toHaveValue('');
        await expect(outputDiv).toHaveText('');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        await page.fill('#arrayInput', 'invalid,input');
        await page.click('#createHeap');

        const outputDiv4 = await page.locator('#output');
        await expect(outputDiv).toHaveText(/Invalid input/); // Assuming error feedback is shown
    });

    test('should visualize heap correctly for random array', async ({ page }) => {
        await page.click('#randomArray');

        // Verify that the heap visualization is rendered
        const heapDiv2 = await page.locator('#heap-visualization');
        await expect(heapDiv).toBeVisible();
    });

    test('should visualize heap correctly for ascending array', async ({ page }) => {
        await page.click('#ascendingArray');

        // Verify that the heap visualization is rendered
        const heapDiv3 = await page.locator('#heap-visualization');
        await expect(heapDiv).toBeVisible();
    });

    test('should visualize heap correctly for descending array', async ({ page }) => {
        await page.click('#descendingArray');

        // Verify that the heap visualization is rendered
        const heapDiv4 = await page.locator('#heap-visualization');
        await expect(heapDiv).toBeVisible();
    });
});