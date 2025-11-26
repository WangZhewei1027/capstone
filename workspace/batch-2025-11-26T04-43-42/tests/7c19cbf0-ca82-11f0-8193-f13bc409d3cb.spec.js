import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c19cbf0-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Linear Regression Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state of the form', async ({ page }) => {
        // Validate that the form is in the idle state
        const equationText = await page.textContent('#equation');
        const interceptSlopeText = await page.textContent('#intercept-slope');

        expect(equationText).toBe('');
        expect(interceptSlopeText).toBe('');
    });

    test('should calculate regression when valid inputs are submitted', async ({ page }) => {
        // Input valid values and submit the form
        await page.fill('#x', '10');
        await page.fill('#y', '20');
        await page.click('button[type="submit"]');

        // Validate that the results are displayed correctly
        const equationText = await page.textContent('#equation');
        const interceptSlopeText = await page.textContent('#intercept-slope');

        expect(equationText).toContain('y =');
        expect(interceptSlopeText).toContain('Intercept:');
        expect(interceptSlopeText).toContain('Slope:');
    });

    test('should not calculate regression with empty inputs', async ({ page }) => {
        // Submit the form without filling inputs
        await page.click('button[type="submit"]');

        // Validate that results are not displayed
        const equationText = await page.textContent('#equation');
        const interceptSlopeText = await page.textContent('#intercept-slope');

        expect(equationText).toBe('');
        expect(interceptSlopeText).toBe('');
    });

    test('should handle negative values correctly', async ({ page }) => {
        // Input negative values and submit the form
        await page.fill('#x', '-5');
        await page.fill('#y', '-10');
        await page.click('button[type="submit"]');

        // Validate that the results are displayed correctly
        const equationText = await page.textContent('#equation');
        const interceptSlopeText = await page.textContent('#intercept-slope');

        expect(equationText).toContain('y =');
        expect(interceptSlopeText).toContain('Intercept:');
        expect(interceptSlopeText).toContain('Slope:');
    });

    test('should handle zero values correctly', async ({ page }) => {
        // Input zero values and submit the form
        await page.fill('#x', '0');
        await page.fill('#y', '0');
        await page.click('button[type="submit"]');

        // Validate that the results are displayed correctly
        const equationText = await page.textContent('#equation');
        const interceptSlopeText = await page.textContent('#intercept-slope');

        expect(equationText).toContain('y =');
        expect(interceptSlopeText).toContain('Intercept:');
        expect(interceptSlopeText).toContain('Slope:');
    });

    test('should not allow non-numeric input', async ({ page }) => {
        // Input non-numeric values and try to submit the form
        await page.fill('#x', 'abc');
        await page.fill('#y', 'xyz');
        await page.click('button[type="submit"]');

        // Validate that results are not displayed
        const equationText = await page.textContent('#equation');
        const interceptSlopeText = await page.textContent('#intercept-slope');

        expect(equationText).toBe('');
        expect(interceptSlopeText).toBe('');
    });
});