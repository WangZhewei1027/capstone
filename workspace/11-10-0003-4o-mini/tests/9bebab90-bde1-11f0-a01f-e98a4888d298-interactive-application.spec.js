import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0003-4o-mini/html/9bebab90-bde1-11f0-a01f-e98a4888d298.html';

test.describe('Bubble Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should initialize with random array in idle state', async ({ page }) => {
        const elements = await page.$$('.element');
        expect(elements.length).toBeGreaterThan(0); // Ensure that the array is generated
    });

    test('should transition to sorting state on Start Sorting button click', async ({ page }) => {
        await page.click('#startButton');
        const instructions = await page.locator('#instructions').innerText();
        expect(instructions).toBe('Sorting in progress...'); // Check if sorting has started
    });

    test('should complete sorting and transition to done state', async ({ page }) => {
        await page.click('#startButton');
        await page.waitForTimeout(500); // Wait for sorting to progress
        const elements = await page.$$('.element');
        const sortedArray = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.element')).map(el => parseInt(el.textContent));
        });
        const isSorted = sortedArray.every((val, i, arr) => !i || (val >= arr[i - 1]));
        expect(isSorted).toBe(true); // Ensure the array is sorted
    });

    test('should reset to idle state on Reset button click', async ({ page }) => {
        await page.click('#startButton');
        await page.waitForTimeout(500); // Allow some time for sorting
        await page.click('#resetButton');
        const elements = await page.$$('.element');
        expect(elements.length).toBeGreaterThan(0); // Ensure that the array is regenerated
        const instructions = await page.locator('#instructions').innerText();
        expect(instructions).toBe('Click "Start Sorting" to see bubble sort in action!'); // Check if instructions reset
    });

    test('should handle edge case of already sorted array', async ({ page }) => {
        await page.evaluate(() => {
            // Manually set the array to a sorted state
            const sortedArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const arrayContainer = document.getElementById("arrayContainer");
            arrayContainer.innerHTML = '';
            sortedArray.forEach(value => {
                const element = document.createElement("div");
                element.className = "element";
                element.textContent = value;
                arrayContainer.appendChild(element);
            });
        });
        await page.click('#startButton');
        await page.waitForTimeout(500); // Allow some time for sorting
        const instructions = await page.locator('#instructions').innerText();
        expect(instructions).toBe('Sorting in progress...'); // Check if sorting has started
        await page.waitForTimeout(500); // Wait for sorting to complete
        const elements = await page.$$('.element');
        const sortedArray = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.element')).map(el => parseInt(el.textContent));
        });
        const isSorted = sortedArray.every((val, i, arr) => !i || (val >= arr[i - 1]));
        expect(isSorted).toBe(true); // Ensure the array is still sorted
    });
});