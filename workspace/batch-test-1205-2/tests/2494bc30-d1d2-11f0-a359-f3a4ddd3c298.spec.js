import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2494bc30-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Bellman-Ford Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state correctly', async ({ page }) => {
        // Validate that the initial state (Idle) is displayed correctly
        const title = await page.locator('h2').innerText();
        expect(title).toBe('Bellman-Ford Algorithm Visualization');

        const textareaPlaceholder = await page.locator('#edges').getAttribute('placeholder');
        expect(textareaPlaceholder).toBe('0 1 4\n0 2 1\n1 2 2\n1 3 5');

        const outputText = await page.locator('#output').innerText();
        expect(outputText).toBe('');
    });

    test('should transition to Running state on button click', async ({ page }) => {
        // Input edges into the textarea
        await page.fill('#edges', '0 1 4\n0 2 1\n1 2 2\n1 3 5');

        // Click the Run Bellman-Ford button
        await page.click('#run');

        // Validate that the output is being processed
        const outputText1 = await page.locator('#output').innerText();
        expect(outputText).not.toBe('');
    });

    test('should display results after running the algorithm', async ({ page }) => {
        // Input edges into the textarea
        await page.fill('#edges', '0 1 4\n0 2 1\n1 2 2\n1 3 5');

        // Click the Run Bellman-Ford button
        await page.click('#run');

        // Validate that the result is displayed correctly
        const outputText2 = await page.locator('#output').innerText();
        expect(outputText).toMatch(/^\[0,1,3,6\]$/); // Example output for the given input
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click the Run Bellman-Ford button without input
        await page.click('#run');

        // Validate that the output is empty or an error message is displayed
        const outputText3 = await page.locator('#output').innerText();
        expect(outputText).toBe(''); // Expecting empty output for no input
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Input invalid edges into the textarea
        await page.fill('#edges', 'invalid input');

        // Click the Run Bellman-Ford button
        await page.click('#run');

        // Validate that the output is empty or an error message is displayed
        const outputText4 = await page.locator('#output').innerText();
        expect(outputText).toBe(''); // Expecting empty output for invalid input
    });

    test('should handle negative weight cycle detection', async ({ page }) => {
        // Input edges that create a negative weight cycle
        await page.fill('#edges', '0 1 -1\n1 2 -1\n2 0 -1');

        // Click the Run Bellman-Ford button
        await page.click('#run');

        // Validate that the output indicates a negative weight cycle
        const outputText5 = await page.locator('#output').innerText();
        expect(outputText).toBe('Graph contains negative weight cycle');
    });

    test.afterEach(async ({ page }) => {
        // Log any console errors after each test
        page.on('console', msg => console.log(msg.text()));
    });
});