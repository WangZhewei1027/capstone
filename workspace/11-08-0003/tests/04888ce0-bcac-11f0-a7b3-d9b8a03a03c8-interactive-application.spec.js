import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/04888ce0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Interactive Quick Sort Application', () => {
    test('Initial state should display the initial message', async ({ page }) => {
        const message = await page.textContent('#message');
        expect(message).toBe("Click 'Generate Array' to start.");
    });

    test('Should generate an array and display it', async ({ page }) => {
        await page.click('#generate');
        
        const message1 = await page.textContent('#message1');
        expect(message).toBe("Array generated! Click 'Sort Array' to see Quick Sort in action.");

        const bars = await page.$$('#arr-container .bar');
        expect(bars.length).toBeGreaterThan(0); // Ensure at least one bar is generated
    });

    test('Should sort the array when sorting is triggered', async ({ page }) => {
        await page.click('#generate'); // Generate an array first
        await page.click('#sort');

        const message2 = await page.textContent('#message2');
        expect(message).toContain("Sorting in progress"); // Assuming this message is displayed during sorting

        // Add a small delay to allow sorting to complete
        await page.waitForTimeout(2000); // Adjust based on sorting duration

        const bars1 = await page.$$('#arr-container .bar');
        const heights = await Promise.all(bars.map(bar => bar.evaluate(el => el.offsetHeight)));

        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights); // Check if the array is sorted
    });

    test('Should handle sorting without generating an array', async ({ page }) => {
        await page.click('#sort');

        const message3 = await page.textContent('#message3');
        expect(message).toBe("Error: No array to sort."); // Assuming this is the error message
    });

    test('Should allow generating a new array after sorting is done', async ({ page }) => {
        await page.click('#generate'); // Generate an array
        await page.click('#sort'); // Sort the array

        // Wait for sorting to complete
        await page.waitForTimeout(2000);

        await page.click('#generate'); // Generate a new array
        const message4 = await page.textContent('#message4');
        expect(message).toBe("Array generated! Click 'Sort Array' to see Quick Sort in action.");
    });

    test('Should display error message when trying to sort without an array', async ({ page }) => {
        await page.click('#sort'); // Attempt to sort without generating an array

        const message5 = await page.textContent('#message5');
        expect(message).toBe("Error: No array to sort."); // Assuming this is the error message
    });

    test('Should allow retrying after an error', async ({ page }) => {
        await page.click('#sort'); // Attempt to sort without generating an array
        await page.click('#generate'); // Generate an array

        const message6 = await page.textContent('#message6');
        expect(message).toBe("Array generated! Click 'Sort Array' to see Quick Sort in action.");
    });
});