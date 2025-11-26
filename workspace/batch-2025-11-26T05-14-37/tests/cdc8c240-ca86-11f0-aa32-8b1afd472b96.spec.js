import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdc8c240-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Bubble Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Bubble Sort application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the correct title and introduction', async ({ page }) => {
        // Validate that the title of the page is correct
        const title = await page.title();
        expect(title).toBe('Bubble Sort');

        // Validate that the main heading is present
        const heading = await page.locator('h1').innerText();
        expect(heading).toBe('Bubble Sort Example');

        // Validate that the introductory paragraph is present
        const paragraph = await page.locator('p').innerText();
        expect(paragraph).toBe('Here is an example of Bubble Sort:');
    });

    test('should display all bubble elements', async ({ page }) => {
        // Validate that all bubble elements are displayed
        const bubbles = await page.locator('.bubble');
        const count = await bubbles.count();
        expect(count).toBe(100); // Expecting 100 bubble elements

        // Validate that the text of the first bubble is '1' and the last is 'Z bubble'
        expect(await bubbles.nth(0).innerText()).toBe('1');
        expect(await bubbles.nth(99).innerText()).toBe('Z bubble');
    });

    test('should verify the visual representation of bubbles', async ({ page }) => {
        // Validate that the bubbles are visually represented
        const bubbles = await page.locator('.bubble');
        for (let i = 0; i < 100; i++) {
            const bubbleText = await bubbles.nth(i).innerText();
            expect(bubbleText).toMatch(/^[1-9][0-9]?$|^100$|^[A-Z] bubble$/);
        }
    });

    test('should ensure all bubbles are visible and styled correctly', async ({ page }) => {
        // Validate that bubbles are visible and have the correct CSS class
        const bubbles = await page.locator('.bubble');
        for (let i = 0; i < 100; i++) {
            expect(await bubbles.nth(i).isVisible()).toBeTruthy();
            expect(await bubbles.nth(i).evaluate(el => getComputedStyle(el).display)).not.toBe('none');
        }
    });

    test.afterEach(async ({ page }) => {
        // Optional: any cleanup after each test can be done here
    });
});