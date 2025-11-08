import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f0c0c4c0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Adjacency Matrix Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is idle', async ({ page }) => {
        // Verify that the initial state is idle
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toBe('');
        const matrixDiv = await page.locator('#matrix').innerHTML();
        expect(matrixDiv).toBe('');
    });

    test('Generate matrix from idle state', async ({ page }) => {
        // Generate a matrix and verify the transition to matrix_generated state
        await page.fill('#nodes', '3');
        await page.click('#generate');

        const matrixDiv1 = await page.locator('#matrix').innerHTML();
        expect(matrixDiv).not.toBe('');
        const inputs = await page.locator('#matrix input').count();
        expect(inputs).toBe(9); // 3x3 matrix
    });

    test('Submit matrix from matrix_generated state', async ({ page }) => {
        // Generate a matrix and then submit it
        await page.fill('#nodes', '3');
        await page.click('#generate');
        await page.click('#submit');

        const resultText1 = await page.locator('#result').innerText();
        expect(resultText).toContain('Result:'); // Assuming some result is displayed
    });

    test('Reset from matrix_submitted state', async ({ page }) => {
        // Generate and submit a matrix, then reset to idle
        await page.fill('#nodes', '3');
        await page.click('#generate');
        await page.click('#submit');
        await page.click('#generate'); // This acts as a reset

        const resultText2 = await page.locator('#result').innerText();
        expect(resultText).toBe('');
        const matrixDiv2 = await page.locator('#matrix').innerHTML();
        expect(matrixDiv).not.toBe('');
    });

    test('Edge case: Generate matrix with 0 nodes', async ({ page }) => {
        // Attempt to generate a matrix with 0 nodes and check for error handling
        await page.fill('#nodes', '0');
        await page.click('#generate');

        const matrixDiv3 = await page.locator('#matrix').innerHTML();
        expect(matrixDiv).toBe('');
        const resultText3 = await page.locator('#result').innerText();
        expect(resultText).toBe('Please enter a valid number of nodes.'); // Assuming error message
    });

    test('Edge case: Submit matrix without generating', async ({ page }) => {
        // Attempt to submit without generating a matrix
        await page.click('#submit');

        const resultText4 = await page.locator('#result').innerText();
        expect(resultText).toBe('Please generate a matrix first.'); // Assuming error message
    });
});