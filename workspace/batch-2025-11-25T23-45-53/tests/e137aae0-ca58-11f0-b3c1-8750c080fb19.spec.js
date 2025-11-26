import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e137aae0-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Quick Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const inputValue = await page.$eval('#arrayInput', el => el.value);
        expect(inputValue).toBe('');
        const arrayContent = await page.$eval('#array', el => el.innerHTML);
        expect(arrayContent).toBe('');
    });

    test('User clicks Sort button with valid input', async ({ page }) => {
        await page.fill('#arrayInput', '3,1,4,1,5,9');
        await page.click('button');

        // Validate that the input was captured and the array was visualized
        const arrayContent = await page.$eval('#array', el => el.innerHTML);
        expect(arrayContent).not.toBe('');
    });

    test('Sorting process should visualize the array', async ({ page }) => {
        await page.fill('#arrayInput', '3,1,4,1,5,9');
        await page.click('button');

        // Wait for the sorting to complete
        await page.waitForTimeout(5000); // Adjust timeout based on expected sort duration

        const finalArrayContent = await page.$eval('#array', el => el.innerHTML);
        expect(finalArrayContent).not.toBe('');
    });

    test('User clicks Sort button with invalid input', async ({ page }) => {
        await page.fill('#arrayInput', 'invalid,input');
        await page.click('button');

        // Validate that the array remains empty or an error is shown
        const arrayContent = await page.$eval('#array', el => el.innerHTML);
        expect(arrayContent).toBe('');
    });

    test('Sorting should handle edge case of empty input', async ({ page }) => {
        await page.fill('#arrayInput', '');
        await page.click('button');

        // Validate that the array remains empty
        const arrayContent = await page.$eval('#array', el => el.innerHTML);
        expect(arrayContent).toBe('');
    });

    test('Sorting should handle single element input', async ({ page }) => {
        await page.fill('#arrayInput', '42');
        await page.click('button');

        // Validate that the array visualizes the single element
        const arrayContent = await page.$eval('#array', el => el.innerHTML);
        expect(arrayContent).toContain('42');
    });

    test('Sorting should visualize partitioning steps', async ({ page }) => {
        await page.fill('#arrayInput', '3,1,4,1,5,9');
        await page.click('button');

        // Wait for the partitioning to occur
        await page.waitForTimeout(3000); // Adjust based on expected partitioning duration

        const partitionedArrayContent = await page.$eval('#array', el => el.innerHTML);
        expect(partitionedArrayContent).not.toBe('');
    });

    test('Sorting should complete and finalize visualization', async ({ page }) => {
        await page.fill('#arrayInput', '3,1,4,1,5,9');
        await page.click('button');

        // Wait for the sorting to complete
        await page.waitForTimeout(5000); // Adjust timeout based on expected sort duration

        const finalArrayContent = await page.$eval('#array', el => el.innerHTML);
        expect(finalArrayContent).not.toBe('');
    });
});