import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abda141-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Heap (Min/Max) Demo', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the heap demo page before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial state correctly', async ({ page }) => {
        // Validate that the initial state of the application is rendered correctly
        const header = await page.locator('h2').innerText();
        expect(header).toBe('Heap (Min/Max) Demo');

        const heapDiv = await page.locator('#heap').isVisible();
        expect(heapDiv).toBe(true);
    });

    test('should create a heap and log min/max values', async ({ page }) => {
        // Check the console output for min and max values
        const [consoleMessage] = await Promise.all([
            page.waitForEvent('console'),
            page.evaluate(() => {
                const data = [5, 2, 8, 1, 9];
                const priority = (value) => value;
                const heap = new Heap(data, priority);
                const min = heap.getMin();
                const max = heap.getMax();
                console.log(`Min: ${min}, Max: ${max}`);
            })
        ]);

        // Validate that the console message contains the expected min and max values
        expect(consoleMessage.text()).toContain('Min: 1');
        expect(consoleMessage.text()).toContain('Max: 9');
    });

    test('should insert a new value into the heap', async ({ page }) => {
        // Insert a new value and check the heap structure
        await page.evaluate(() => {
            const data = [5, 2, 8, 1, 9];
            const priority = (value) => value;
            const heap = new Heap(data, priority);
            heap.insert(0); // Insert a new value
            return heap.heap; // Return the heap structure
        }).then(heapArray => {
            // Validate the heap structure after insertion
            expect(heapArray).toEqual([0, 1, 8, 5, 9, 2]); // Assuming a Min-Heap structure
        });
    });

    test('should maintain heap properties after multiple insertions', async ({ page }) => {
        // Insert multiple values and validate the heap structure
        await page.evaluate(() => {
            const data = [5, 2, 8, 1, 9];
            const priority = (value) => value;
            const heap = new Heap(data, priority);
            heap.insert(0);
            heap.insert(3);
            heap.insert(7);
            return heap.heap; // Return the heap structure
        }).then(heapArray => {
            // Validate the heap structure after multiple insertions
            expect(heapArray).toEqual([0, 1, 2, 5, 9, 8, 3, 7]); // Assuming a Min-Heap structure
        });
    });

    test('should correctly identify the minimum and maximum values after insertions', async ({ page }) => {
        // Check min and max values after inserting new elements
        const [minValue, maxValue] = await page.evaluate(() => {
            const data = [5, 2, 8, 1, 9];
            const priority = (value) => value;
            const heap = new Heap(data, priority);
            heap.insert(0);
            heap.insert(3);
            return [heap.getMin(), heap.getMax()]; // Return min and max values
        });

        // Validate the min and max values
        expect(minValue).toBe(0);
        expect(maxValue).toBe(9);
    });
});