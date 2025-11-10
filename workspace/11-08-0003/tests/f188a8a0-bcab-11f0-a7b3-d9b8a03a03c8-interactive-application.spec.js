import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f188a8a0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Min/Max Heap Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const feedback = await page.locator('#feedback').textContent();
        expect(feedback).toBe('');
    });

    test('should insert a number into Min Heap', async ({ page }) => {
        await page.fill('#heapInput', '10');
        await page.click('#insertMin');

        const feedback1 = await page.locator('#feedback1').textContent();
        expect(feedback).toBe('Inserted 10 into Min Heap');

        // Verify the visualization reflects the insertion
        const visualization = await page.locator('#heapVisualization').textContent();
        expect(visualization).toContain('10'); // Assuming visualization shows the number
    });

    test('should insert a number into Max Heap', async ({ page }) => {
        await page.fill('#heapInput', '20');
        await page.click('#insertMax');

        const feedback2 = await page.locator('#feedback2').textContent();
        expect(feedback).toBe('Inserted 20 into Max Heap');

        const visualization1 = await page.locator('#heapVisualization').textContent();
        expect(visualization).toContain('20'); // Assuming visualization shows the number
    });

    test('should extract the minimum number from Min Heap', async ({ page }) => {
        await page.fill('#heapInput', '5');
        await page.click('#insertMin');
        await page.fill('#heapInput', '3');
        await page.click('#insertMin');
        await page.fill('#heapInput', '7');
        await page.click('#insertMin');

        await page.click('#extractMin');

        const feedback3 = await page.locator('#feedback3').textContent();
        expect(feedback).toBe('Extracted min from Min Heap');

        const visualization2 = await page.locator('#heapVisualization').textContent();
        expect(visualization).not.toContain('3'); // Assuming 3 was the minimum
    });

    test('should extract the maximum number from Max Heap', async ({ page }) => {
        await page.fill('#heapInput', '15');
        await page.click('#insertMax');
        await page.fill('#heapInput', '25');
        await page.click('#insertMax');
        await page.fill('#heapInput', '10');
        await page.click('#insertMax');

        await page.click('#extractMax');

        const feedback4 = await page.locator('#feedback4').textContent();
        expect(feedback).toBe('Extracted max from Max Heap');

        const visualization3 = await page.locator('#heapVisualization').textContent();
        expect(visualization).not.toContain('25'); // Assuming 25 was the maximum
    });

    test('should handle empty input gracefully', async ({ page }) => {
        await page.click('#insertMin');
        const feedback5 = await page.locator('#feedback5').textContent();
        expect(feedback).toBe(''); // Assuming no feedback for empty input

        await page.click('#extractMin');
        const feedbackExtract = await page.locator('#feedback').textContent();
        expect(feedbackExtract).toBe(''); // Assuming no feedback for extraction from empty heap
    });

    test('should visualize the heap correctly after multiple operations', async ({ page }) => {
        await page.fill('#heapInput', '8');
        await page.click('#insertMin');
        await page.fill('#heapInput', '3');
        await page.click('#insertMin');
        await page.fill('#heapInput', '10');
        await page.click('#insertMax');
        await page.fill('#heapInput', '5');
        await page.click('#insertMax');

        const visualization4 = await page.locator('#heapVisualization').textContent();
        expect(visualization).toContain('3'); // Min Heap should contain 3
        expect(visualization).toContain('10'); // Max Heap should contain 10
    });
});