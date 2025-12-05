import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2493f8e0-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Union-Find Application Tests', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state should be Idle', async () => {
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
    });

    test.describe('Union Operation Tests', () => {
        test('Perform valid union operation', async () => {
            await page.fill('#element1', '1');
            await page.fill('#element2', '2');
            await page.click('button[onclick="union()"]');

            const resultText1 = await page.textContent('#result');
            expect(resultText).toBe('Union(1, 2) performed.');
        });

        test('Perform union operation with invalid input', async () => {
            await page.fill('#element1', '-1');
            await page.fill('#element2', '2');
            await page.click('button[onclick="union()"]');

            const resultText2 = await page.textContent('#result');
            expect(resultText).toBe('Please enter valid elements (0 to 9).');
        });

        test('Perform union operation with out of range input', async () => {
            await page.fill('#element1', '10');
            await page.fill('#element2', '2');
            await page.click('button[onclick="union()"]');

            const resultText3 = await page.textContent('#result');
            expect(resultText).toBe('Please enter valid elements (0 to 9).');
        });
    });

    test.describe('Find Operation Tests', () => {
        test('Perform valid find operation', async () => {
            await page.fill('#element1', '1');
            await page.click('button[onclick="find()"]');

            const resultText4 = await page.textContent('#result');
            expect(resultText).toBe('Root of 1 is 1.');
        });

        test('Perform find operation with invalid input', async () => {
            await page.fill('#element1', '-1');
            await page.click('button[onclick="find()"]');

            const resultText5 = await page.textContent('#result');
            expect(resultText).toBe('Please enter a valid element (0 to 9).');
        });

        test('Perform find operation with out of range input', async () => {
            await page.fill('#element1', '10');
            await page.click('button[onclick="find()"]');

            const resultText6 = await page.textContent('#result');
            expect(resultText).toBe('Please enter a valid element (0 to 9).');
        });
    });
});