import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0004/html/1ab40350-b400-11f0-867a-d33b47976456.html';

test.describe('Bubble Sort Visualization Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('Initial State: Idle', () => {
        test('should display input section and buttons', async () => {
            const inputSection = await page.locator('#input-section');
            const startButton = await page.locator('#start-button');
            const resetButton = await page.locator('#reset-button');

            await expect(inputSection).toBeVisible();
            await expect(startButton).toBeVisible();
            await expect(resetButton).toBeVisible();
        });

        test('should reset visualization on reset button click', async () => {
            await page.locator('#number-input').fill('5,3,8,4,2');
            await page.locator('#reset-button').click();
            const inputValue = await page.locator('#number-input').inputValue();
            const visualizationContent = await page.locator('#visualization').innerHTML();

            expect(inputValue).toBe('');
            expect(visualizationContent).toBe('');
        });
    });

    test.describe('State: Sorting', () => {
        test('should start sorting when start button is clicked', async () => {
            await page.locator('#number-input').fill('5,3,8,4,2');
            await page.locator('#start-button').click();

            const visualizationBlocks = await page.locator('.num-block');
            await expect(visualizationBlocks).toHaveCount(5); // Check if 5 blocks are created
        });

        test('should sort numbers correctly', async () => {
            await page.locator('#number-input').fill('5,3,8,4,2');
            await page.locator('#start-button').click();

            // Wait for sorting to complete
            await page.waitForTimeout(3000); // Adjust based on sorting speed

            const sortedNumbers = await page.locator('.num-block').allTextContents();
            expect(sortedNumbers).toEqual(['2', '3', '4', '5', '8']); // Check if sorted
        });

        test('should reset to idle state on reset button click during sorting', async () => {
            await page.locator('#number-input').fill('5,3,8,4,2');
            await page.locator('#start-button').click();
            await page.locator('#reset-button').click();

            const visualizationContent = await page.locator('#visualization').innerHTML();
            expect(visualizationContent).toBe('');
        });
    });

    test.describe('State: Done', () => {
        test('should display sorted result after sorting is complete', async () => {
            await page.locator('#number-input').fill('5,3,8,4,2');
            await page.locator('#start-button').click();

            // Wait for sorting to complete
            await page.waitForTimeout(3000); // Adjust based on sorting speed

            const visualizationBlocks = await page.locator('.num-block');
            await expect(visualizationBlocks).toHaveCount(5); // Check if 5 blocks are created
            const sortedNumbers = await visualizationBlocks.allTextContents();
            expect(sortedNumbers).toEqual(['2', '3', '4', '5', '8']); // Check if sorted
        });

        test('should reset to idle state on reset button click after sorting is done', async () => {
            await page.locator('#number-input').fill('5,3,8,4,2');
            await page.locator('#start-button').click();
            await page.waitForTimeout(3000); // Wait for sorting to complete
            await page.locator('#reset-button').click();

            const inputValue = await page.locator('#number-input').inputValue();
            const visualizationContent = await page.locator('#visualization').innerHTML();

            expect(inputValue).toBe('');
            expect(visualizationContent).toBe('');
        });
    });

    test.describe('Edge Cases and Error Scenarios', () => {
        test('should handle empty input gracefully', async () => {
            await page.locator('#number-input').fill('');
            await page.locator('#start-button').click();

            const visualizationContent = await page.locator('#visualization').innerHTML();
            expect(visualizationContent).toBe(''); // No visualization should occur
        });

        test('should handle invalid input gracefully', async () => {
            await page.locator('#number-input').fill('invalid,input');
            await page.locator('#start-button').click();

            const visualizationContent = await page.locator('#visualization').innerHTML();
            expect(visualizationContent).toBe(''); // No visualization should occur
        });
    });
});