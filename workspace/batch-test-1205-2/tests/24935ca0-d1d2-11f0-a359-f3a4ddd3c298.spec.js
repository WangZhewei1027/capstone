import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24935ca0-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Set Operations Example', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display initial input fields and button', async ({ page }) => {
        // Validate that the initial state (Idle) is rendered correctly
        const setAInput = await page.locator('#setA');
        const setBInput = await page.locator('#setB');
        const calculateButton = await page.locator('#calculate');
        
        await expect(setAInput).toBeVisible();
        await expect(setBInput).toBeVisible();
        await expect(calculateButton).toBeVisible();
    });

    test('should calculate set operations and display results', async ({ page }) => {
        // Input numbers for Set A and Set B
        await page.fill('#setA', '1, 2, 3, 4');
        await page.fill('#setB', '3, 4, 5, 6');

        // Click the Calculate button
        await page.click('#calculate');

        // Validate that the results are displayed correctly
        const result = await page.locator('#result');
        await expect(result).toContainText('Union (A ∪ B): 1, 2, 3, 4, 5, 6');
        await expect(result).toContainText('Intersection (A ∩ B): 3, 4');
        await expect(result).toContainText('Difference (A - B): 1, 2');
    });

    test('should handle empty input for Set A and Set B', async ({ page }) => {
        // Input empty values for Set A and Set B
        await page.fill('#setA', '');
        await page.fill('#setB', '');

        // Click the Calculate button
        await page.click('#calculate');

        // Validate that the results are displayed correctly (should handle empty sets)
        const result1 = await page.locator('#result1');
        await expect(result).toContainText('Union (A ∪ B): ');
        await expect(result).toContainText('Intersection (A ∩ B): ');
        await expect(result).toContainText('Difference (A - B): ');
    });

    test('should handle invalid input for Set A and Set B', async ({ page }) => {
        // Input invalid values for Set A and Set B
        await page.fill('#setA', 'a, b, c');
        await page.fill('#setB', 'd, e, f');

        // Click the Calculate button
        await page.click('#calculate');

        // Validate that the results are displayed correctly (should handle non-numeric input)
        const result2 = await page.locator('#result2');
        await expect(result).toContainText('Union (A ∪ B): ');
        await expect(result).toContainText('Intersection (A ∩ B): ');
        await expect(result).toContainText('Difference (A - B): ');
    });

    test('should handle whitespace in input for Set A and Set B', async ({ page }) => {
        // Input values with leading/trailing whitespace
        await page.fill('#setA', ' 1, 2, 3, 4 ');
        await page.fill('#setB', ' 3, 4, 5, 6 ');

        // Click the Calculate button
        await page.click('#calculate');

        // Validate that the results are displayed correctly
        const result3 = await page.locator('#result3');
        await expect(result).toContainText('Union (A ∪ B): 1, 2, 3, 4, 5, 6');
        await expect(result).toContainText('Intersection (A ∩ B): 3, 4');
        await expect(result).toContainText('Difference (A - B): 1, 2');
    });

    test('should handle single element sets', async ({ page }) => {
        // Input single element sets
        await page.fill('#setA', '1');
        await page.fill('#setB', '1');

        // Click the Calculate button
        await page.click('#calculate');

        // Validate that the results are displayed correctly
        const result4 = await page.locator('#result4');
        await expect(result).toContainText('Union (A ∪ B): 1');
        await expect(result).toContainText('Intersection (A ∩ B): 1');
        await expect(result).toContainText('Difference (A - B): ');
    });

    test('should handle large input sets', async ({ page }) => {
        // Input large sets
        await page.fill('#setA', '1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
        await page.fill('#setB', '5, 6, 7, 8, 9, 10, 11, 12, 13, 14');

        // Click the Calculate button
        await page.click('#calculate');

        // Validate that the results are displayed correctly
        const result5 = await page.locator('#result5');
        await expect(result).toContainText('Union (A ∪ B): 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14');
        await expect(result).toContainText('Intersection (A ∩ B): 5, 6, 7, 8, 9, 10');
        await expect(result).toContainText('Difference (A - B): 1, 2, 3, 4');
    });

    test('should display console errors for broken JavaScript', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Trigger an error by clicking Calculate without input
        await page.click('#calculate');

        // Wait for a moment to capture console errors
        await page.waitForTimeout(1000);

        // Validate that an error was logged
        expect(consoleErrors.length).toBeGreaterThan(0);
    });
});