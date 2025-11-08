import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f9d5e720-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Stack Operations Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display initial instructions in idle state', async ({ page }) => {
        const output = await page.locator('#output').innerText();
        expect(output).toContain('Click the buttons to interact with the stack.');
    });

    test('should push a value onto the stack and update output', async ({ page }) => {
        await page.click('#push');
        const output1 = await page.locator('#output1').innerText();
        expect(output).toMatch(/pushed onto the stack/);

        const stackChildren = await page.locator('#stack .block').count();
        expect(stackChildren).toBeGreaterThan(0);
    });

    test('should pop a value from the stack and update output', async ({ page }) => {
        await page.click('#push'); // Push a value first
        await page.click('#pop');
        const output2 = await page.locator('#output2').innerText();
        expect(output).toMatch(/popped/);

        const stackChildren1 = await page.locator('#stack .block').count();
        expect(stackChildren).toBeLessThan(1);
    });

    test('should not pop from an empty stack and display error message', async ({ page }) => {
        await page.click('#pop');
        const output3 = await page.locator('#output3').innerText();
        expect(output).toBe("Stack is empty; can't pop.");
    });

    test('should peek at the top value of the stack and update output', async ({ page }) => {
        await page.click('#push'); // Push a value first
        await page.click('#peek');
        const output4 = await page.locator('#output4').innerText();
        expect(output).toMatch(/peeked/);
    });

    test('should handle peek when stack is empty and display error message', async ({ page }) => {
        await page.click('#peek');
        const output5 = await page.locator('#output5').innerText();
        expect(output).toBe("Stack is empty; can't peek.");
    });

    test('should verify visual feedback on push operation', async ({ page }) => {
        await page.click('#push');
        const stackChildren2 = await page.locator('#stack .block').count();
        expect(stackChildren).toBeGreaterThan(0);

        const lastBlock = await page.locator('#stack .block').nth(stackChildren - 1);
        await expect(lastBlock).toBeVisible();
    });

    test('should verify visual feedback on pop operation', async ({ page }) => {
        await page.click('#push'); // Push a value first
        const initialCount = await page.locator('#stack .block').count();
        await page.click('#pop');
        const finalCount = await page.locator('#stack .block').count();
        expect(finalCount).toBeLessThan(initialCount);
    });

    test('should verify visual feedback on peek operation', async ({ page }) => {
        await page.click('#push'); // Push a value first
        await page.click('#peek');
        const output6 = await page.locator('#output6').innerText();
        expect(output).toMatch(/peeked/);
    });

    test.afterEach(async ({ page }) => {
        // Optional: Reset the stack or clear output after each test if needed
        await page.evaluate(() => {
            const stackElement = document.getElementById('stack');
            stackElement.innerHTML = '';
            const outputElement = document.getElementById('output');
            outputElement.innerText = '';
        });
    });
});