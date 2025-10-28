import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0004/html/2c821e50-b400-11f0-867a-d33b47976456.html';

test.describe('Bubble Sort Visualization Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle and random array is generated', async () => {
        const initialBlocks = await page.locator('.block').count();
        expect(initialBlocks).toBeGreaterThan(0); // Ensure an array is generated
    });

    test('Clicking Start Sort transitions to sorting state', async () => {
        await page.click('#startBtn');
        const sortingState = await page.evaluate(() => document.body.classList.contains('sorting'));
        expect(sortingState).toBe(true); // Check if sorting state is active
    });

    test('Sorting completes and transitions to done state', async () => {
        await page.click('#startBtn'); // Start sorting again
        await page.waitForTimeout(2000); // Wait for sorting to complete (adjust as necessary)
        const doneState = await page.evaluate(() => document.body.classList.contains('done'));
        expect(doneState).toBe(true); // Check if done state is active
    });

    test('Resetting transitions back to idle state', async () => {
        await page.click('#resetBtn');
        const idleState = await page.evaluate(() => document.body.classList.contains('idle'));
        expect(idleState).toBe(true); // Check if idle state is active
        const resetBlocks = await page.locator('.block').count();
        expect(resetBlocks).toBeGreaterThan(0); // Ensure a new random array is generated
    });

    test('Changing array size updates the array', async () => {
        await page.fill('#size', '15'); // Change size to 15
        await page.click('#resetBtn'); // Reset to generate new array
        const newSizeBlocks = await page.locator('.block').count();
        expect(newSizeBlocks).toBe(15); // Ensure the array size is updated
    });

    test('Sorting can be started multiple times', async () => {
        await page.click('#startBtn'); // Start sorting
        await page.waitForTimeout(2000); // Wait for sorting to complete
        await page.click('#resetBtn'); // Reset
        await page.click('#startBtn'); // Start sorting again
        await page.waitForTimeout(2000); // Wait for sorting to complete
        const doneState = await page.evaluate(() => document.body.classList.contains('done'));
        expect(doneState).toBe(true); // Check if done state is active again
    });

    test('Visual feedback during sorting', async () => {
        await page.click('#startBtn'); // Start sorting
        const blocksBeforeSorting = await page.locator('.block').allTextContents();
        await page.waitForTimeout(2000); // Wait for sorting to complete
        const blocksAfterSorting = await page.locator('.block').allTextContents();
        expect(blocksBeforeSorting).not.toEqual(blocksAfterSorting); // Check if the array has changed
    });
});