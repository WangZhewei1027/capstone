import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/088e0f90-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Binary Search Interactive Module', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should display initial array in idle state', async () => {
        const arrayDisplay = await page.locator('#array-display');
        await expect(arrayDisplay).toHaveText('1 | 3 | 5 | 7 | 9 | 11 | 13 | 15 | 17 | 19');
    });

    test('should transition to searching state on search button click', async () => {
        await page.fill('#target', '7');
        await page.click('#search-button');

        const feedback = await page.locator('#feedback');
        await expect(feedback).toHaveText('Searching...');
    });

    test('should display search result in done state', async () => {
        await page.fill('#target', '7');
        await page.click('#search-button');

        // Simulate search complete event
        await page.evaluate(() => {
            const feedbackElement = document.getElementById('feedback');
            feedbackElement.innerText = 'Found at index 3'; // Simulating search complete
        });

        const arrayDisplay1 = await page.locator('#array-display');
        await expect(arrayDisplay).toHaveText('1 | 3 | [5] | 7 | 9 | 11 | 13 | 15 | 17 | 19');
        const feedback1 = await page.locator('#feedback1');
        await expect(feedback).toHaveText('Found at index 3');
    });

    test('should return to idle state on invalid input', async () => {
        await page.fill('#target', '20'); // Invalid input
        await page.click('#search-button');

        const feedback2 = await page.locator('#feedback2');
        await expect(feedback).toHaveText('Invalid input, please try again.');

        const arrayDisplay2 = await page.locator('#array-display');
        await expect(arrayDisplay).toHaveText('1 | 3 | 5 | 7 | 9 | 11 | 13 | 15 | 17 | 19');
    });

    test('should handle edge case of empty input', async () => {
        await page.fill('#target', ''); // Empty input
        await page.click('#search-button');

        const feedback3 = await page.locator('#feedback3');
        await expect(feedback).toHaveText('Invalid input, please try again.');
    });

    test('should allow searching again after done state', async () => {
        await page.fill('#target', '5');
        await page.click('#search-button');

        await page.evaluate(() => {
            const feedbackElement1 = document.getElementById('feedback');
            feedbackElement.innerText = 'Found at index 2'; // Simulating search complete
        });

        const arrayDisplay3 = await page.locator('#array-display');
        await expect(arrayDisplay).toHaveText('1 | 3 | [5] | 7 | 9 | 11 | 13 | 15 | 17 | 19');
        const feedback4 = await page.locator('#feedback4');
        await expect(feedback).toHaveText('Found at index 2');

        // Search again
        await page.fill('#target', '3');
        await page.click('#search-button');

        await page.evaluate(() => {
            const feedbackElement2 = document.getElementById('feedback');
            feedbackElement.innerText = 'Found at index 1'; // Simulating search complete
        });

        const newArrayDisplay = await page.locator('#array-display');
        await expect(newArrayDisplay).toHaveText('1 | [3] | 5 | 7 | 9 | 11 | 13 | 15 | 17 | 19');
        const newFeedback = await page.locator('#feedback');
        await expect(newFeedback).toHaveText('Found at index 1');
    });
});