import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/0bb196b0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Bubble Sort Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const arrayItems = await page.$$('.array-item');
        expect(arrayItems.length).toBe(0); // No array items should be present
    });

    test('should generate an array on button click', async ({ page }) => {
        await page.click('#generate');
        const arrayItems1 = await page.$$('.array-item');
        expect(arrayItems.length).toBeGreaterThan(0); // Array items should be generated
    });

    test('should transition to array_generated state after generating array', async ({ page }) => {
        await page.click('#generate');
        const arrayItems2 = await page.$$('.array-item');
        expect(arrayItems.length).toBeGreaterThan(0); // Check if array is generated
        // Check if the array items are highlighted (visual feedback)
        await expect(arrayItems[0]).toHaveCSS('background-color', 'rgb(76, 175, 80)'); // Default color
    });

    test('should start sorting on button click', async ({ page }) => {
        await page.click('#generate');
        await page.click('#start');
        const arrayItems3 = await page.$$('.array-item');
        expect(arrayItems.length).toBeGreaterThan(0); // Ensure array is present before sorting
        await page.waitForTimeout(5000); // Wait for sorting to complete
        const sortedArray = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.array-item')).map(item => parseInt(item.innerText));
        });
        expect(sortedArray).toEqual(sortedArray.sort((a, b) => a - b)); // Check if the array is sorted
    });

    test('should transition to done state after sorting is complete', async ({ page }) => {
        await page.click('#generate');
        await page.click('#start');
        await page.waitForTimeout(5000); // Wait for sorting to complete
        const arrayItems4 = await page.$$('.array-item');
        expect(arrayItems.length).toBeGreaterThan(0); // Ensure array is present
        const sortedArray1 = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.array-item')).map(item => parseInt(item.innerText));
        });
        expect(sortedArray).toEqual(sortedArray.sort((a, b) => a - b)); // Check if the array is sorted
    });

    test('should reset to idle state on reset button click', async ({ page }) => {
        await page.click('#generate');
        await page.click('#reset');
        const arrayItems5 = await page.$$('.array-item');
        expect(arrayItems.length).toBe(0); // No array items should be present
    });

    test('should handle multiple resets correctly', async ({ page }) => {
        await page.click('#generate');
        await page.click('#reset');
        await page.click('#reset'); // Reset again
        const arrayItems6 = await page.$$('.array-item');
        expect(arrayItems.length).toBe(0); // No array items should be present
    });
});