import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/0b244ad0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Insertion Sort Interactive Module', () => {
    
    test('should display initial array in idle state', async ({ page }) => {
        const blocks = await page.locator('.block').count();
        expect(blocks).toBe(6); // Initial array has 6 elements
    });

    test('should transition to sorting state on sort button click', async ({ page }) => {
        await page.click('#sortBtn');
        await page.waitForTimeout(1000); // Wait for sorting animation
        const blocks1 = await page.locator('.block');
        const firstBlockHeight = await blocks.nth(0).evaluate(block => block.style.height);
        expect(firstBlockHeight).toBeTruthy(); // Check if the first block is rendered
    });

    test('should highlight blocks during sorting', async ({ page }) => {
        await page.click('#sortBtn');
        await page.waitForTimeout(500); // Wait for the first highlight
        const highlightedBlock = await page.locator('.highlight').count();
        expect(highlightedBlock).toBeGreaterThan(0); // At least one block should be highlighted
    });

    test('should transition to done state after sorting is complete', async ({ page }) => {
        await page.click('#sortBtn');
        await page.waitForTimeout(5000); // Wait for sorting to complete
        const sortedBlocks = await page.locator('.sorted').count();
        expect(sortedBlocks).toBe(6); // All blocks should be sorted
    });

    test('should transition to shuffled state on shuffle button click', async ({ page }) => {
        await page.click('#sortBtn'); // Start sorting
        await page.waitForTimeout(5000); // Wait for sorting to complete
        await page.click('#shuffleBtn'); // Shuffle the array
        const blocks2 = await page.locator('.block');
        const shuffledHeight = await blocks.nth(0).evaluate(block => block.style.height);
        expect(shuffledHeight).toBeTruthy(); // Check if the blocks are rendered again
    });

    test('should allow sorting again after shuffling', async ({ page }) => {
        await page.click('#sortBtn'); // Start sorting
        await page.waitForTimeout(5000); // Wait for sorting to complete
        await page.click('#shuffleBtn'); // Shuffle the array
        await page.click('#sortBtn'); // Sort again
        await page.waitForTimeout(5000); // Wait for sorting to complete
        const sortedBlocks1 = await page.locator('.sorted').count();
        expect(sortedBlocks).toBe(6); // All blocks should be sorted again
    });

    test('should handle multiple shuffle and sort actions', async ({ page }) => {
        for (let i = 0; i < 3; i++) {
            await page.click('#shuffleBtn');
            await page.click('#sortBtn');
            await page.waitForTimeout(5000); // Wait for sorting to complete
        }
        const sortedBlocks2 = await page.locator('.sorted').count();
        expect(sortedBlocks).toBe(6); // All blocks should be sorted after multiple actions
    });
    
    test('should maintain visual feedback during sorting', async ({ page }) => {
        await page.click('#sortBtn');
        await page.waitForTimeout(1000); // Wait for sorting animation
        const highlightedBlocks = await page.locator('.highlight').count();
        expect(highlightedBlocks).toBeGreaterThan(0); // At least one block should be highlighted
    });
});