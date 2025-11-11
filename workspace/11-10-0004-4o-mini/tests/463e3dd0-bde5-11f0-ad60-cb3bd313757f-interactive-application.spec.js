import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0004-4o-mini/html/463e3dd0-bde5-11f0-ad60-cb3bd313757f.html';

test.describe('Min/Max Heap Exploration Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const minHeapContent = await page.locator('#minHeap').innerHTML();
        const maxHeapContent = await page.locator('#maxHeap').innerHTML();
        expect(minHeapContent).toBe('<h2>Min Heap</h2>');
        expect(maxHeapContent).toBe('<h2>Max Heap</h2>');
    });

    test.describe('Adding to Min Heap', () => {
        test('should add a number to the Min Heap', async ({ page }) => {
            await page.fill('#inputNumber', '5');
            await page.click('#addMinButton');
            await page.waitForTimeout(500); // Wait for the heap to update
            const minHeapContent = await page.locator('#minHeap').innerHTML();
            expect(minHeapContent).toContain('<div class="node">5</div>');
        });

        test('should update state to updating_min_heap on ADD_MIN', async ({ page }) => {
            await page.fill('#inputNumber', '10');
            await page.click('#addMinButton');
            await page.waitForTimeout(500); // Wait for the heap to update
            const minHeapContent = await page.locator('#minHeap').innerHTML();
            expect(minHeapContent).toContain('<div class="node">10</div>');
        });

        test('should remove the minimum element from Min Heap', async ({ page }) => {
            await page.fill('#inputNumber', '15');
            await page.click('#addMinButton');
            await page.fill('#inputNumber', '5');
            await page.click('#addMinButton');
            await page.click('#removeMinButton');
            await page.waitForTimeout(500); // Wait for the heap to update
            const minHeapContent = await page.locator('#minHeap').innerHTML();
            expect(minHeapContent).not.toContain('<div class="node">5</div>');
        });
    });

    test.describe('Adding to Max Heap', () => {
        test('should add a number to the Max Heap', async ({ page }) => {
            await page.fill('#inputNumber', '20');
            await page.click('#addMaxButton');
            await page.waitForTimeout(500); // Wait for the heap to update
            const maxHeapContent = await page.locator('#maxHeap').innerHTML();
            expect(maxHeapContent).toContain('<div class="node">20</div>');
        });

        test('should update state to updating_max_heap on ADD_MAX', async ({ page }) => {
            await page.fill('#inputNumber', '25');
            await page.click('#addMaxButton');
            await page.waitForTimeout(500); // Wait for the heap to update
            const maxHeapContent = await page.locator('#maxHeap').innerHTML();
            expect(maxHeapContent).toContain('<div class="node">25</div>');
        });

        test('should remove the maximum element from Max Heap', async ({ page }) => {
            await page.fill('#inputNumber', '30');
            await page.click('#addMaxButton');
            await page.fill('#inputNumber', '35');
            await page.click('#addMaxButton');
            await page.click('#removeMaxButton');
            await page.waitForTimeout(500); // Wait for the heap to update
            const maxHeapContent = await page.locator('#maxHeap').innerHTML();
            expect(maxHeapContent).not.toContain('<div class="node">35</div>');
        });
    });

    test.describe('Edge Cases and Error Scenarios', () => {
        test('should not add a non-numeric value to Min Heap', async ({ page }) => {
            await page.fill('#inputNumber', 'abc');
            await page.click('#addMinButton');
            const minHeapContent = await page.locator('#minHeap').innerHTML();
            expect(minHeapContent).toBe('<h2>Min Heap</h2>'); // No change
        });

        test('should not add a non-numeric value to Max Heap', async ({ page }) => {
            await page.fill('#inputNumber', 'xyz');
            await page.click('#addMaxButton');
            const maxHeapContent = await page.locator('#maxHeap').innerHTML();
            expect(maxHeapContent).toBe('<h2>Max Heap</h2>'); // No change
        });
    });
});