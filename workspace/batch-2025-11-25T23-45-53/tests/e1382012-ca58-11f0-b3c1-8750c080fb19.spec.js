import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1382012-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Floyd-Warshall Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        // Verify that the input fields are enabled and instructions are shown
        const inputFields = await page.$$('#adjacencyMatrix input');
        const instructionsVisible = await page.isVisible('h2:has-text("Input Adjacency Matrix")');

        expect(await Promise.all(inputFields.map(field => field.isEnabled()))).toBe(true);
        expect(instructionsVisible).toBe(true;
    });

    test('Calculate button should trigger calculation', async ({ page }) => {
        // Click the Calculate button and verify the transition to Calculating state
        await page.click('button[type="button"]');

        // Check for loading indicator (assuming it shows up during calculation)
        const loadingIndicatorVisible = await page.isVisible('text=Loading...');
        expect(loadingIndicatorVisible).toBe(true);

        // Simulate waiting for calculation to complete
        await page.waitForTimeout(2000); // wait for the calculation timeout
    });

    test('Calculation should complete and display results', async ({ page }) => {
        await page.click('button[type="button"]'); // Trigger calculation

        // Wait for the result to be displayed
        await page.waitForTimeout(1000); // wait for the calculation completion timeout

        // Verify that the result table is displayed
        const resultTableVisible = await page.isVisible('#result h2:has-text("Shortest Path Matrix")');
        expect(resultTableVisible).toBe(true);

        // Verify that the result contains the expected values
        const resultCells = await page.$$('#result td');
        const expectedResults = ['0', '5', 'Infinity', 'Infinity', '0', '2', 'Infinity', 'Infinity', '0'];
        for (let i = 0; i < resultCells.length; i++) {
            const cellText = await resultCells[i].innerText();
            expect(cellText).toBe(expectedResults[i]);
        }
    });

    test('Resetting should return to Idle state', async ({ page }) => {
        await page.click('button[type="button"]'); // Trigger calculation
        await page.waitForTimeout(1000); // wait for the calculation completion timeout

        // Assuming there's a reset button to reset the input fields
        await page.click('button:has-text("Reset")'); // Click reset button

        // Verify that the input fields are enabled again
        const inputFields = await page.$$('#adjacencyMatrix input');
        expect(await Promise.all(inputFields.map(field => field.isEnabled()))).toBe(true);

        // Verify that results are cleared
        const resultVisible = await page.isVisible('#result');
        expect(resultVisible).toBe(false);
    });

    test('Edge case: Invalid input should not trigger calculation', async ({ page }) => {
        // Set an invalid value in the input fields
        const inputField = await page.$('#adjacencyMatrix input');
        await inputField.fill('abc'); // Fill with invalid input

        // Click the Calculate button
        await page.click('button[type="button"]');

        // Verify that no loading indicator appears
        const loadingIndicatorVisible = await page.isVisible('text=Loading...');
        expect(loadingIndicatorVisible).toBe(false);

        // Verify that results are not displayed
        const resultVisible = await page.isVisible('#result');
        expect(resultVisible).toBe(false);
    });
});