import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f4b668f0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Stack Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display error message when pushing without input', async ({ page }) => {
        await page.click('#pushButton');
        const errorMessage = await page.locator('#errorMessage').innerText();
        expect(errorMessage).toBe('Please enter a valid number.');
    });

    test('should push an item onto the stack', async ({ page }) => {
        await page.fill('#inputValue', '10');
        await page.click('#pushButton');

        const stackItems = await page.locator('.stack-item').count();
        expect(stackItems).toBe(1);

        const topItem = await page.locator('.stack-item').nth(0).innerText();
        expect(topItem).toBe('10');
        expect(await page.locator('#errorMessage').innerText()).toBe('');
    });

    test('should push multiple items onto the stack', async ({ page }) => {
        await page.fill('#inputValue', '20');
        await page.click('#pushButton');
        await page.fill('#inputValue', '30');
        await page.click('#pushButton');

        const stackItems1 = await page.locator('.stack-item').count();
        expect(stackItems).toBe(2);

        const topItem1 = await page.locator('.stack-item').nth(0).innerText();
        expect(topItem).toBe('30');
    });

    test('should display error message when popping from an empty stack', async ({ page }) => {
        await page.click('#popButton');
        const errorMessage1 = await page.locator('#errorMessage1').innerText();
        expect(errorMessage).toBe('Stack is empty!');
    });

    test('should pop an item from the stack', async ({ page }) => {
        await page.fill('#inputValue', '40');
        await page.click('#pushButton');
        await page.fill('#inputValue', '50');
        await page.click('#pushButton');

        await page.click('#popButton');

        const stackItems2 = await page.locator('.stack-item').count();
        expect(stackItems).toBe(1);

        const topItem2 = await page.locator('.stack-item').nth(0).innerText();
        expect(topItem).toBe('40');
    });

    test('should display error message when pushing invalid input', async ({ page }) => {
        await page.fill('#inputValue', '');
        await page.click('#pushButton');
        const errorMessage2 = await page.locator('#errorMessage2').innerText();
        expect(errorMessage).toBe('Please enter a valid number.');
    });

    test('should handle multiple pops correctly', async ({ page }) => {
        await page.fill('#inputValue', '60');
        await page.click('#pushButton');
        await page.fill('#inputValue', '70');
        await page.click('#pushButton');

        await page.click('#popButton'); // pops 70
        await page.click('#popButton'); // pops 60

        const stackItems3 = await page.locator('.stack-item').count();
        expect(stackItems).toBe(0);
        expect(await page.locator('#errorMessage').innerText()).toBe('Stack is empty!');
    });
});