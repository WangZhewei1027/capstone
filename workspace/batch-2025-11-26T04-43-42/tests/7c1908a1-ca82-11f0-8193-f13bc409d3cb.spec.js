import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c1908a1-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Floyd-Warshall Algorithm Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in Idle state and enable input', async ({ page }) => {
        // Verify that the input fields are enabled in Idle state
        const inputFields = await page.$$('#distanceMatrix td');
        for (const field of inputFields) {
            const isDisabled = await field.evaluate(el => el.hasAttribute('disabled'));
            expect(isDisabled).toBe(false);
        }
    });

    test('should transition to InputMatrix state when user enters matrix', async ({ page }) => {
        // Simulate user entering a valid matrix
        const inputFields = await page.$$('#distanceMatrix td');
        await inputFields[0].fill('0');
        await inputFields[1].fill('1');
        await inputFields[2].fill('2');

        // Check if the input fields are highlighted
        const highlighted = await page.evaluate(() => {
            return document.querySelector('#distanceMatrix').classList.contains('highlight');
        });
        expect(highlighted).toBe(true);
    });

    test('should show error alert when matrix is invalid', async ({ page }) => {
        // Simulate user entering an invalid matrix
        const inputFields = await page.$$('#distanceMatrix td');
        await inputFields[0].fill('a'); // Invalid input

        // Click calculate button
        await page.click('button#calculateButton');

        // Verify that the error dialog is shown
        const errorDialog = await page.$('#errorDialog');
        expect(errorDialog).toBeTruthy();

        // Verify the error message
        const errorMessage = await errorDialog.innerText();
        expect(errorMessage).toContain('Invalid matrix input');
    });

    test('should transition to CalculatingPaths state when user clicks calculate with valid matrix', async ({ page }) => {
        // Simulate user entering a valid matrix
        const inputFields = await page.$$('#distanceMatrix td');
        await inputFields[0].fill('0');
        await inputFields[1].fill('1');
        await inputFields[2].fill('2');

        // Click calculate button
        await page.click('button#calculateButton');

        // Verify that the calculation has started
        const calculationStarted = await page.evaluate(() => {
            return document.querySelector('#calculationStatus').innerText.includes('Calculating...');
        });
        expect(calculationStarted).toBe(true);
    });

    test('should display results after calculation is complete', async ({ page }) => {
        // Simulate user entering a valid matrix
        const inputFields = await page.$$('#distanceMatrix td');
        await inputFields[0].fill('0');
        await inputFields[1].fill('1');
        await inputFields[2].fill('2');

        // Click calculate button
        await page.click('button#calculateButton');

        // Wait for calculation to complete
        await page.waitForSelector('#results', { state: 'visible' });

        // Verify that results are displayed
        const results = await page.$('#results');
        expect(results).toBeTruthy();
    });

    test('should return to Idle state when user dismisses error', async ({ page }) => {
        // Simulate user entering an invalid matrix
        const inputFields = await page.$$('#distanceMatrix td');
        await inputFields[0].fill('a'); // Invalid input

        // Click calculate button
        await page.click('button#calculateButton');

        // Dismiss the error
        await page.click('#errorDialog button#dismiss');

        // Verify that the error dialog is closed
        const errorDialog = await page.$('#errorDialog');
        expect(errorDialog).toBeFalsy();

        // Verify that input fields are enabled again
        const inputFieldsAfterDismiss = await page.$$('#distanceMatrix td');
        for (const field of inputFieldsAfterDismiss) {
            const isDisabled = await field.evaluate(el => el.hasAttribute('disabled'));
            expect(isDisabled).toBe(false);
        }
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions if necessary
    });
});