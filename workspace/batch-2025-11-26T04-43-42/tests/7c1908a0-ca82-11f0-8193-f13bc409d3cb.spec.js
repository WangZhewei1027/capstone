import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c1908a0-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Bellman-Ford Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const sourceInput = await page.locator('#source');
        const verticesInput = await page.locator('#vertices');
        const edgesInput = await page.locator('#edges');
        const weightInput = await page.locator('#weight');

        // Verify that input fields are enabled
        await expect(sourceInput).toBeEnabled();
        await expect(verticesInput).toBeEnabled();
        await expect(edgesInput).toBeEnabled();
        await expect(weightInput).toBeEnabled();
    });

    test('Transition from Idle to InputtingGraph on valid input', async ({ page }) => {
        await page.fill('#source', '0');
        await page.fill('#vertices', '5');
        await page.fill('#edges', '4');
        await page.fill('#weight', '1');

        // Submit the form
        await page.click('#graph button[type="submit"]');

        // Verify that input fields are highlighted
        const inputFieldsHighlighted = await page.evaluate(() => {
            return document.querySelector('#graph').classList.contains('highlighted');
        });
        expect(inputFieldsHighlighted).toBe(true);
    });

    test('Transition from InputtingGraph to ProcessingGraph on valid input', async ({ page }) => {
        await page.fill('#source', '0');
        await page.fill('#vertices', '5');
        await page.fill('#edges', '4');
        await page.fill('#weight', '1');

        await page.click('#graph button[type="submit"]'); // Move to InputtingGraph state

        // Simulate valid input processing
        await page.evaluate(() => {
            // Assume input is valid
            window.inputIsValid = true;
        });

        // Submit again to process the graph
        await page.click('#graph button[type="submit"]');

        // Verify that graph input is processed
        const graphInputProcessed = await page.evaluate(() => {
            return document.querySelector('#graph').classList.contains('processed');
        });
        expect(graphInputProcessed).toBe(true);
    });

    test('Transition from ProcessingGraph to DisplayResults', async ({ page }) => {
        await page.fill('#source', '0');
        await page.fill('#vertices', '5');
        await page.fill('#edges', '4');
        await page.fill('#weight', '1');

        await page.click('#graph button[type="submit"]'); // Move to InputtingGraph state
        await page.evaluate(() => {
            window.inputIsValid = true; // Simulate valid input
        });
        await page.click('#graph button[type="submit"]'); // Move to ProcessingGraph state

        // Simulate algorithm completion
        await page.evaluate(() => {
            window.algorithmCompleted = true;
        });

        // Submit again to display results
        await page.click('#graph button[type="submit"]');

        // Verify that results are displayed
        const resultsDisplayed = await page.locator('#output').innerText();
        expect(resultsDisplayed).toContain('Vertex\tDistance from Source');
    });

    test('Transition from DisplayResults back to Idle', async ({ page }) => {
        await page.fill('#source', '0');
        await page.fill('#vertices', '5');
        await page.fill('#edges', '4');
        await page.fill('#weight', '1');

        await page.click('#graph button[type="submit"]'); // Move to InputtingGraph state
        await page.evaluate(() => {
            window.inputIsValid = true; // Simulate valid input
        });
        await page.click('#graph button[type="submit"]'); // Move to ProcessingGraph state
        await page.evaluate(() => {
            window.algorithmCompleted = true; // Simulate algorithm completion
        });
        await page.click('#graph button[type="submit"]'); // Move to DisplayResults state

        // Submit again to reset input fields
        await page.click('#graph button[type="submit"]');

        // Verify that input fields are reset
        const sourceValue = await page.locator('#source').inputValue();
        const verticesValue = await page.locator('#vertices').inputValue();
        const edgesValue = await page.locator('#edges').inputValue();
        const weightValue = await page.locator('#weight').inputValue();

        expect(sourceValue).toBe('');
        expect(verticesValue).toBe('');
        expect(edgesValue).toBe('');
        expect(weightValue).toBe('');
    });

    test('Handle invalid input gracefully', async ({ page }) => {
        await page.fill('#source', 'invalid'); // Invalid input
        await page.fill('#vertices', '5');
        await page.fill('#edges', '4');
        await page.fill('#weight', '1');

        // Attempt to submit the form
        await page.click('#graph button[type="submit"]');

        // Verify that the state remains Idle and input fields are still enabled
        const sourceInput = await page.locator('#source');
        await expect(sourceInput).toBeEnabled();
    });
});