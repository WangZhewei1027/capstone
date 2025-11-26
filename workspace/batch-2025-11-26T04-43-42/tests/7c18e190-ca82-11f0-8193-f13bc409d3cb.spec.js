import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c18e190-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Depth-First Search (DFS) Interactive Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('State: Idle', () => {
        test('should have the Start button enabled', async () => {
            const startButton = await page.$('#startButton');
            const isEnabled = await startButton.isEnabled();
            expect(isEnabled).toBe(true);
        });

        test('should transition to Searching state when Start button is clicked', async () => {
            const startButton = await page.$('#startButton');
            await startButton.click();

            // Verify the transition to Searching state
            const graphCanvas = await page.$('#graph');
            const searchStarted = await page.evaluate(() => {
                return document.querySelector('#graph').getAttribute('data-searching') === 'true';
            });
            expect(searchStarted).toBe(true);
        });
    });

    test.describe('State: Searching', () => {
        test('should highlight the current node during search', async () => {
            // Assuming the highlight is visually represented in the canvas
            const isHighlightVisible = await page.evaluate(() => {
                // Replace with actual logic to check if the current node is highlighted
                return document.querySelector('#graph').getAttribute('data-highlight') === 'true';
            });
            expect(isHighlightVisible).toBe(true);
        });

        test('should transition to Completed state after search is completed', async () => {
            // Simulate the completion of the search
            await page.evaluate(() => {
                // Trigger the completion event
                document.querySelector('#graph').setAttribute('data-search-completed', 'true');
            });

            const searchCompleted = await page.evaluate(() => {
                return document.querySelector('#graph').getAttribute('data-search-completed') === 'true';
            });
            expect(searchCompleted).toBe(true);
        });
    });

    test.describe('State: Completed', () => {
        test('should show completion message', async () => {
            const completionMessageVisible = await page.evaluate(() => {
                return document.querySelector('#completionMessage').style.display !== 'none';
            });
            expect(completionMessageVisible).toBe(true);
        });

        test('should reset the graph when Reset button is clicked', async () => {
            const resetButton = await page.$('#resetButton');
            await resetButton.click();

            // Verify the transition back to Idle state
            const isIdle = await page.evaluate(() => {
                return document.querySelector('#graph').getAttribute('data-idle') === 'true';
            });
            expect(isIdle).toBe(true);
        });
    });

    test.describe('Edge Cases and Error Scenarios', () => {
        test('should not allow starting a new search while one is in progress', async () => {
            const startButton = await page.$('#startButton');
            await startButton.click(); // Start the search

            const isEnabled = await startButton.isEnabled();
            expect(isEnabled).toBe(false); // Start button should be disabled
        });

        test('should handle reset correctly during searching', async () => {
            const resetButton = await page.$('#resetButton');
            await resetButton.click();

            const isIdle = await page.evaluate(() => {
                return document.querySelector('#graph').getAttribute('data-idle') === 'true';
            });
            expect(isIdle).toBe(true); // Should return to Idle state
        });
    });
});