import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/000d3df0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Insertion Sort Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle and generates a random array', async () => {
        const barsBefore = await page.locator('.bar').count();
        expect(barsBefore).toBe(0); // No bars should be present initially

        await page.click('#generateArray');

        const barsAfter = await page.locator('.bar').count();
        expect(barsAfter).toBeGreaterThan(0); // Bars should be generated
    });

    test('Transition from idle to array_generated state', async () => {
        await page.click('#generateArray');
        const bars = await page.locator('.bar');
        const count = await bars.count();
        expect(count).toBeGreaterThan(0); // Ensure array is generated

        await page.click('#sortArray');
        const sortingMessage = await page.locator('#learning-objective').innerText();
        expect(sortingMessage).toContain('Learn how Insertion Sort works'); // Validate the message remains unchanged
    });

    test('Transition from array_generated to sorting state', async () => {
        await page.click('#generateArray');
        await page.click('#sortArray');

        const sortingBars = await page.locator('.bar');
        const initialHeights = await sortingBars.evaluateAll(bars => bars.map(bar => bar.style.height));

        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Adjust timeout based on expected sort duration

        const sortedHeights = await sortingBars.evaluateAll(bars => bars.map(bar => bar.style.height));
        expect(initialHeights).not.toEqual(sortedHeights); // Heights should change after sorting
    });

    test('Transition from sorting to sorted state', async () => {
        await page.click('#generateArray');
        await page.click('#sortArray');

        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Adjust timeout based on expected sort duration

        const sortedBars = await page.locator('.bar');
        const sortedCount = await sortedBars.count();
        for (let i = 0; i < sortedCount; i++) {
            const barClass = await sortedBars.nth(i).getAttribute('class');
            expect(barClass).toContain('sorted'); // Each bar should have the 'sorted' class
        }
    });

    test('Return to array_generated state from sorted state', async () => {
        await page.click('#generateArray');
        await page.click('#sortArray');

        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Adjust timeout based on expected sort duration

        await page.click('#generateArray'); // Generate a new array

        const newBars = await page.locator('.bar');
        const newCount = await newBars.count();
        expect(newCount).toBeGreaterThan(0); // New bars should be generated
    });

    test('Edge case: Generate an array of size 1', async () => {
        await page.fill('#inputSize', '1');
        await page.click('#generateArray');

        const barsCount = await page.locator('.bar').count();
        expect(barsCount).toBe(1); // Only one bar should be generated

        await page.click('#sortArray');
        const sortedBars1 = await page.locator('.bar');
        const sortedCount1 = await sortedBars.count();
        expect(sortedCount).toBe(1); // Still one bar after sorting
    });

    test('Edge case: Generate an array of size 10', async () => {
        await page.fill('#inputSize', '10');
        await page.click('#generateArray');

        const barsCount1 = await page.locator('.bar').count();
        expect(barsCount).toBe(10); // Ten bars should be generated

        await page.click('#sortArray');
        const sortedBars2 = await page.locator('.bar');
        const sortedCount2 = await sortedBars.count();
        expect(sortedCount).toBe(10); // Still ten bars after sorting
    });
});