import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c17d021-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Heap (Min/Max) Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const heapItems = await page.locator('.heap .item').count();
        expect(heapItems).toBe(0); // Heap should be empty
    });

    test.describe('Adding Nodes', () => {
        test('Should transition to AddingNode state and update heap', async ({ page }) => {
            await page.fill('#input', '5');
            await page.click('#add-btn');

            const heapItems = await page.locator('.heap .item').count();
            expect(heapItems).toBe(1); // One item should be added
            expect(await page.locator('.heap .item').nth(0).innerText()).toBe('5'); // Check the value
        });

        test('Should not add empty input', async ({ page }) => {
            await page.click('#add-btn');
            const heapItems = await page.locator('.heap .item').count();
            expect(heapItems).toBe(0); // Heap should still be empty
        });
    });

    test.describe('Removing Nodes', () => {
        test.beforeEach(async ({ page }) => {
            await page.fill('#input', '10');
            await page.click('#add-btn'); // Add an item to remove
        });

        test('Should transition to RemovingNode state and update heap', async ({ page }) => {
            await page.click('#remove-btn');

            const heapItems = await page.locator('.heap .item').count();
            expect(heapItems).toBe(0); // Heap should be empty after removal
        });

        test('Should not remove from empty heap', async ({ page }) => {
            await page.click('#remove-btn'); // Attempt to remove from empty heap
            const heapItems = await page.locator('.heap .item').count();
            expect(heapItems).toBe(1); // Heap should still have the initial item
        });
    });

    test.describe('Clearing Heap', () => {
        test.beforeEach(async ({ page }) => {
            await page.fill('#input', '20');
            await page.click('#add-btn'); // Add an item to clear
        });

        test('Should transition to ClearingHeap state and clear heap', async ({ page }) => {
            await page.click('#clear-btn');

            const heapItems = await page.locator('.heap .item').count();
            expect(heapItems).toBe(0); // Heap should be empty after clearing
        });
    });

    test('Should handle multiple operations correctly', async ({ page }) => {
        await page.fill('#input', '30');
        await page.click('#add-btn');
        await page.fill('#input', '25');
        await page.click('#add-btn');
        await page.click('#remove-btn');

        const heapItems = await page.locator('.heap .item').count();
        expect(heapItems).toBe(1); // One item should remain after removal
        expect(await page.locator('.heap .item').nth(0).innerText()).toBe('30'); // Check the remaining value
    });

    test('Should show visual feedback on button highlight', async ({ page }) => {
        await page.fill('#input', '15');
        await page.hover('#add-btn');
        await expect(page.locator('#add-btn')).toHaveCSS('background-color', /rgb/); // Check if button is highlighted
    });

    test.afterEach(async ({ page }) => {
        await page.click('#clear-btn'); // Clear the heap after each test
    });
});