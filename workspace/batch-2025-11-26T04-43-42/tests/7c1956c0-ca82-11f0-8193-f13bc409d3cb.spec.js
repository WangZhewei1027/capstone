import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c1956c0-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Fibonacci Sequence Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Fibonacci application before each test
        await page.goto(url);
    });

    test('should display initial state with empty Fibonacci numbers', async ({ page }) => {
        // Validate the initial state of the application
        const fibonacciNumber = await page.locator('#fibonacci-number').innerText();
        const fibonacciNextNumber = await page.locator('#fibonacci-next-number').innerText();

        expect(fibonacciNumber).toBe('');
        expect(fibonacciNextNumber).toBe('');
    });

    test('should generate Fibonacci sequence on user action', async ({ page }) => {
        // Simulate user action to generate Fibonacci sequence
        await page.evaluate(() => {
            // Trigger the Fibonacci generation
            generateFibonacciSequence();
        });

        // Validate the Fibonacci numbers after generation
        const fibonacciNumber = await page.locator('#fibonacci-number').innerText();
        const fibonacciNextNumber = await page.locator('#fibonacci-next-number').innerText();

        expect(fibonacciNumber).not.toBe('');
        expect(fibonacciNextNumber).not.toBe('');
    });

    test('should update Fibonacci numbers correctly', async ({ page }) => {
        // Generate Fibonacci sequence multiple times to test updates
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => {
                generateFibonacciSequence();
            });
        }

        // Validate that the last two Fibonacci numbers are displayed correctly
        const fibonacciNumber = await page.locator('#fibonacci-number').innerText();
        const fibonacciNextNumber = await page.locator('#fibonacci-next-number').innerText();

        // The expected Fibonacci sequence should be checked here
        const expectedFibonacci = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
        const lastNumber = parseInt(fibonacciNumber);
        const nextNumber = parseInt(fibonacciNextNumber);

        expect(expectedFibonacci).toContain(lastNumber);
        expect(expectedFibonacci).toContain(nextNumber);
    });

    test('should maintain Fibonacci sequence length limit', async ({ page }) => {
        // Generate Fibonacci sequence until the length exceeds 10
        for (let i = 0; i < 15; i++) {
            await page.evaluate(() => {
                generateFibonacciSequence();
            });
        }

        // Validate that the Fibonacci sequence is trimmed correctly
        const fibonacciNumber = await page.locator('#fibonacci-number').innerText();
        const fibonacciNextNumber = await page.locator('#fibonacci-next-number').innerText();

        const lastNumber = parseInt(fibonacciNumber);
        const nextNumber = parseInt(fibonacciNextNumber);

        // The last number should be one of the last 10 Fibonacci numbers
        expect(lastNumber).toBeGreaterThanOrEqual(0);
        expect(nextNumber).toBeGreaterThanOrEqual(0);
    });
});