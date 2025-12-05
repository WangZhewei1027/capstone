import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2493d1d2-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Adjacency Matrix Demonstration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(url);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Verify that the page loads and the initial state is Idle
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
        const matrixContainer = await page.locator('#matrixContainer').innerHTML();
        expect(matrixContainer).toBe('');
    });

    test('Create Matrix - Transition from Idle to Matrix Created', async ({ page }) => {
        // Input number of vertices
        await page.fill('input#vertices', '3');
        
        // Click on Create Matrix button
        await page.click('button[onclick="createMatrix()"]');

        // Verify that the matrix is created
        const matrixContainer1 = await page.locator('#matrixContainer1').innerHTML();
        expect(matrixContainer).toContain('<table');
        expect(matrixContainer).toContain('V1');
        expect(matrixContainer).toContain('V2');
        expect(matrixContainer).toContain('V3');
    });

    test('Generate Adjacency Matrix - Transition from Matrix Created to Matrix Generated', async ({ page }) => {
        // Create the matrix first
        await page.fill('input#vertices', '3');
        await page.click('button[onclick="createMatrix()"]');

        // Fill in the matrix values
        await page.fill('#matrixContainer input:nth-of-type(1)', '0');
        await page.fill('#matrixContainer input:nth-of-type(2)', '1');
        await page.fill('#matrixContainer input:nth-of-type(3)', '0');
        await page.fill('#matrixContainer input:nth-of-type(4)', '1');
        await page.fill('#matrixContainer input:nth-of-type(5)', '0');
        await page.fill('#matrixContainer input:nth-of-type(6)', '1');
        await page.fill('#matrixContainer input:nth-of-type(7)', '0');
        await page.fill('#matrixContainer input:nth-of-type(8)', '0');
        await page.fill('#matrixContainer input:nth-of-type(9)', '1');

        // Click on Generate Adjacency Matrix button
        await page.click('button[onclick="generateMatrix()"]');

        // Verify that the adjacency matrix is displayed
        const output1 = await page.locator('#output1').innerText();
        expect(output).toContain('Adjacency Matrix:');
        expect(output).toContain('0 1 0');
        expect(output).toContain('1 0 1');
        expect(output).toContain('0 1 0');
    });

    test('Edge case - Create Matrix with 0 vertices', async ({ page }) => {
        // Input number of vertices as 0
        await page.fill('input#vertices', '0');
        
        // Click on Create Matrix button
        await page.click('button[onclick="createMatrix()"]');

        // Verify that no matrix is created
        const matrixContainer2 = await page.locator('#matrixContainer2').innerHTML();
        expect(matrixContainer).toBe('');
    });

    test('Edge case - Generate Matrix without creating it', async ({ page }) => {
        // Click on Generate Adjacency Matrix button without creating a matrix
        await page.click('button[onclick="generateMatrix()"]');

        // Verify that the output is still empty
        const output2 = await page.locator('#output2').innerText();
        expect(output).toBe('');
    });

    test('Error handling - Non-numeric input for vertices', async ({ page }) => {
        // Input non-numeric value for vertices
        await page.fill('input#vertices', 'abc');
        
        // Click on Create Matrix button
        await page.click('button[onclick="createMatrix()"]');

        // Verify that no matrix is created
        const matrixContainer3 = await page.locator('#matrixContainer3').innerHTML();
        expect(matrixContainer).toBe('');
    });
});