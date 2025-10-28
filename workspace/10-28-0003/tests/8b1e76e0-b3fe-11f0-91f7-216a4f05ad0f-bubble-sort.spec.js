import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/default/html/8b1e76e0-b3fe-11f0-91f7-216a4f05ad0f.html';

test.describe('Bubble Sort Visualizer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display initial array in idle state', async ({ page }) => {
        const arrayElements = await page.$$('.element');
        expect(arrayElements.length).toBe(5); // Check if 5 elements are displayed
        const initialArray = await Promise.all(arrayElements.map(el => el.innerText));
        expect(initialArray).toEqual(['5', '1', '4', '2', '8']); // Validate initial array
    });

    test('should transition to sorting state on sort button click', async ({ page }) => {
        await page.click('#sortButton');
        await page.waitForTimeout(1000); // Wait for sorting to start

        const message = await page.textContent('#message');
        expect(message).toContain('Sorting in progress'); // Check if sorting message is displayed
    });

    test('should transition to done state after sorting completes', async ({ page }) => {
        await page.click('#sortButton');
        await page.waitForTimeout(5000); // Wait for sorting to complete

        const message = await page.textContent('#message');
        expect(message).toContain('Sorting complete'); // Check if sorting complete message is displayed

        const sortedArrayElements = await page.$$('.element.sorted');
        expect(sortedArrayElements.length).toBe(5); // All elements should be sorted
    });

    test('should return to idle state on sort button click after sorting is done', async ({ page }) => {
        await page.click('#sortButton');
        await page.waitForTimeout(5000); // Wait for sorting to complete

        await page.click('#sortButton'); // Click sort button again to reset
        const message = await page.textContent('#message');
        expect(message).toContain('Drag the numbers to reorder them.'); // Check if idle message is displayed

        const arrayElements = await page.$$('.element');
        const resetArray = await Promise.all(arrayElements.map(el => el.innerText));
        expect(resetArray).toEqual(['5', '1', '4', '2', '8']); // Validate reset to initial array
    });

    test('should handle drag and drop correctly', async ({ page }) => {
        const firstElement = await page.$('.element[data-index="0"]');
        const secondElement = await page.$('.element[data-index="1"]');

        await firstElement.dragAndDrop(secondElement); // Drag first element to second position
        await page.waitForTimeout(500); // Wait for the DOM to update

        const updatedArray = await page.$$('.element');
        const updatedValues = await Promise.all(updatedArray.map(el => el.innerText));
        expect(updatedValues).toEqual(['1', '5', '4', '2', '8']); // Validate the new order after drag and drop
    });

    test('should not allow sorting if already sorting', async ({ page }) => {
        await page.click('#sortButton');
        await page.waitForTimeout(1000); // Wait for sorting to start

        const sortButton = await page.$('#sortButton');
        await sortButton.click(); // Attempt to click while sorting
        const message = await page.textContent('#message');
        expect(message).toContain('Sorting in progress'); // Ensure sorting is still in progress
    });

    test('should not allow drag and drop while sorting', async ({ page }) => {
        await page.click('#sortButton');
        await page.waitForTimeout(1000); // Wait for sorting to start

        const firstElement = await page.$('.element[data-index="0"]');
        const secondElement = await page.$('.element[data-index="1"]');

        await expect(firstElement.dragAndDrop(secondElement)).rejects.toThrow(); // Ensure drag and drop fails
    });
});