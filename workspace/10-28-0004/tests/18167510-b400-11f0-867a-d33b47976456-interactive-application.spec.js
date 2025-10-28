import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0004/html/18167510-b400-11f0-867a-d33b47976456.html';

test.describe('Bubble Sort Visualization Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle and array is empty', async () => {
        const arrayContainer = await page.locator('#array');
        const bars = await arrayContainer.locator('.bar');
        expect(await bars.count()).toBe(0); // No bars should be present initially
    });

    test('Generate Random Array transitions to displaying_array state', async () => {
        await page.click('#randomArray');
        const bars = await page.locator('.bar');
        expect(await bars.count()).toBeGreaterThan(0); // Bars should be generated
    });

    test('Change size and generate new array', async () => {
        await page.fill('#size', '15');
        await page.click('#randomArray');
        const bars = await page.locator('.bar');
        expect(await bars.count()).toBe(15); // New array of size 15 should be generated
    });

    test('Start sorting transitions to sorting state', async () => {
        await page.click('#randomArray'); // Generate a random array first
        await page.click('#startSort');
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Sorting...'); // Check if sorting has started
    });

    test('Sorting completes and transitions to done state', async () => {
        await page.click('#randomArray'); // Generate a random array first
        await page.click('#startSort');
        await page.waitForTimeout(3000); // Wait for sorting to complete
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Sorting complete!'); // Check if sorting is complete
    });

    test('Generate new random array after sorting', async () => {
        await page.click('#randomArray'); // Generate a random array first
        await page.click('#startSort');
        await page.waitForTimeout(3000); // Wait for sorting to complete
        await page.click('#randomArray'); // Generate another random array
        const bars = await page.locator('.bar');
        expect(await bars.count()).toBeGreaterThan(0); // New bars should be generated
    });

    test('Change size after sorting', async () => {
        await page.click('#randomArray'); // Generate a random array first
        await page.click('#startSort');
        await page.waitForTimeout(3000); // Wait for sorting to complete
        await page.fill('#size', '10'); // Change size
        await page.click('#randomArray'); // Generate new array
        const bars = await page.locator('.bar');
        expect(await bars.count()).toBe(10); // New array of size 10 should be generated
    });

    test('Edge case: Start sorting with minimum size', async () => {
        await page.fill('#size', '5'); // Set size to minimum
        await page.click('#randomArray'); // Generate a random array
        await page.click('#startSort');
        await page.waitForTimeout(3000); // Wait for sorting to complete
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Sorting complete!'); // Check if sorting is complete
    });

    test('Edge case: Start sorting with maximum size', async () => {
        await page.fill('#size', '20'); // Set size to maximum
        await page.click('#randomArray'); // Generate a random array
        await page.click('#startSort');
        await page.waitForTimeout(3000); // Wait for sorting to complete
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Sorting complete!'); // Check if sorting is complete
    });
});