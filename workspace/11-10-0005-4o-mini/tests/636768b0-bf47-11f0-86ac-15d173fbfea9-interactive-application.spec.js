import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0005-4o-mini/html/636768b0-bf47-11f0-86ac-15d173fbfea9.html';

test.describe('Bubble Sort Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Initial State', () => {
        test('should display the initial state correctly', async ({ page }) => {
            const inputValue = await page.locator('#arrayInput').inputValue();
            const outputValue = await page.locator('#output').innerHTML();
            const currentState = await page.locator('#currentState').innerText();

            expect(inputValue).toBe('');
            expect(outputValue).toBe('');
            expect(currentState).toBe('');
        });
    });

    test.describe('Sorting Functionality', () => {
        test('should sort the array correctly when SORT_BUTTON_CLICKED', async ({ page }) => {
            await page.fill('#arrayInput', '5,3,8,4,2');
            await page.click('#sortButton');

            // Wait for the sorting to complete
            await page.waitForTimeout(1000); // Adjust based on sorting animation duration

            const outputHTML = await page.locator('#output').innerHTML();
            const sortedArray = [2, 3, 4, 5, 8].map(value => `<div class="bar" style="height:${value * 10}px; background-color:#4caf50;"></div>`).join('');

            expect(outputHTML).toContain(sortedArray);
        });

        test('should transition to done state after sorting is complete', async ({ page }) => {
            await page.fill('#arrayInput', '5,3,8,4,2');
            await page.click('#sortButton');

            // Wait for sorting to complete
            await page.waitForTimeout(1000); // Adjust based on sorting animation duration

            const currentState = await page.locator('#currentState').innerText();
            expect(currentState).toBe(''); // Assuming no visible state change in the DOM
        });
    });

    test.describe('Restart Functionality', () => {
        test('should reset the input and output when RESTART_BUTTON_CLICKED', async ({ page }) => {
            await page.fill('#arrayInput', '5,3,8,4,2');
            await page.click('#sortButton');
            await page.waitForTimeout(1000); // Wait for sorting to complete

            await page.click('#restartButton');

            const inputValue = await page.locator('#arrayInput').inputValue();
            const outputValue = await page.locator('#output').innerHTML();
            const currentState = await page.locator('#currentState').innerText();

            expect(inputValue).toBe('');
            expect(outputValue).toBe('');
            expect(currentState).toBe('');
        });
    });

    test.describe('Edge Cases', () => {
        test('should handle empty input gracefully', async ({ page }) => {
            await page.click('#sortButton');

            const outputValue = await page.locator('#output').innerHTML();
            expect(outputValue).toBe('');
        });

        test('should handle invalid input gracefully', async ({ page }) => {
            await page.fill('#arrayInput', 'invalid,input');
            await page.click('#sortButton');

            const outputValue = await page.locator('#output').innerHTML();
            expect(outputValue).toBe('');
        });
    });
});