import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/075122c0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Heap Sort Visualization Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should start in idle state and clear visualization', async () => {
        const visualization = await page.locator('#visualization');
        const content = await visualization.innerHTML();
        expect(content).toBe('');
    });

    test('should create heap and transition to heap_created state', async () => {
        await page.fill('#numberInput', '5, 3, 8, 4');
        await page.click('#createHeapBtn');

        const visualization1 = await page.locator('#visualization1');
        const content1 = await visualization.innerHTML();
        expect(content).not.toBe('');
    });

    test('should transition to heapifying state on heapify button click', async () => {
        await page.click('#heapifyBtn');

        // Here we would check for visual feedback indicating heapifying
        const visualization2 = await page.locator('#visualization2');
        // Assuming some specific content or animation appears during heapifying
        await page.waitForTimeout(1000); // Wait for animation to complete
        const content2 = await visualization.innerHTML();
        expect(content).toContain('Heapifying...'); // Replace with actual expected content
    });

    test('should complete heapifying and return to heap_created state', async () => {
        await page.click('#heapifyBtn'); // Trigger heapify again to simulate completion
        await page.waitForTimeout(1000); // Wait for animation to complete

        const visualization3 = await page.locator('#visualization3');
        const content3 = await visualization.innerHTML();
        expect(content).not.toBe('');
    });

    test('should transition to sorting state on sort button click', async () => {
        await page.click('#sortBtn');

        // Check for visual feedback indicating sorting
        const visualization4 = await page.locator('#visualization4');
        await page.waitForTimeout(1000); // Wait for animation to complete
        const content4 = await visualization.innerHTML();
        expect(content).toContain('Sorting...'); // Replace with actual expected content
    });

    test('should complete sorting and return to heap_created state', async () => {
        await page.click('#sortBtn'); // Trigger sort again to simulate completion
        await page.waitForTimeout(1000); // Wait for animation to complete

        const visualization5 = await page.locator('#visualization5');
        const content5 = await visualization.innerHTML();
        expect(content).not.toBe('');
    });

    test('should reset to idle state on reset button click', async () => {
        await page.click('#resetBtn');

        const visualization6 = await page.locator('#visualization6');
        const content6 = await visualization.innerHTML();
        expect(content).toBe('');
    });

    test('should handle edge case of empty input', async () => {
        await page.fill('#numberInput', '');
        await page.click('#createHeapBtn');

        const visualization7 = await page.locator('#visualization7');
        const content7 = await visualization.innerHTML();
        expect(content).toBe(''); // Expect no visualization for empty input
    });

    test('should handle invalid input gracefully', async () => {
        await page.fill('#numberInput', 'abc, def');
        await page.click('#createHeapBtn');

        const visualization8 = await page.locator('#visualization8');
        const content8 = await visualization.innerHTML();
        expect(content).toBe(''); // Expect no visualization for invalid input
    });
});