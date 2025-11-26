import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c17f732-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Adjacency Matrix Visualization', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is Idle', async () => {
        // Verify that the form is enabled and no results are displayed
        const form = await page.$('#matrix-form');
        const resultDiv = await page.$('#result');
        const formDisabled = await form.evaluate(form => form.hasAttribute('disabled'));
        
        expect(formDisabled).toBe(false);
        expect(await resultDiv.innerHTML()).toBe('');
    });

    test('Submit invalid matrix (non-square)', async () => {
        // Input a non-square matrix
        await page.fill('#matrix', '1,0,1\n0,1');
        await page.click('button[type="submit"]');

        // Verify that an error alert is shown
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('The matrix must be square.');
        
        // Verify that the form is enabled again
        const form = await page.$('#matrix-form');
        const formDisabled = await form.evaluate(form => form.hasAttribute('disabled'));
        expect(formDisabled).toBe(false);
    });

    test('Submit valid matrix', async () => {
        // Input a valid square matrix
        await page.fill('#matrix', 'true,false,true\nfalse,true,false\ntrue,false,true');
        await page.click('button[type="submit"]');

        // Verify that the result is displayed
        const resultDiv = await page.$('#result');
        const resultContent = await resultDiv.innerHTML();
        
        expect(resultContent).toContain('<td>1</td>');
        expect(resultContent).toContain('<td>0</td>');
        expect(resultContent).toContain('<td>1</td>');
        expect(resultContent).toContain('<td>0</td>');
        expect(resultContent).toContain('<td>1</td>');
        expect(resultContent).toContain('<td>0</td>');
        expect(resultContent).toContain('<td>1</td>');
    });

    test('Submit another invalid matrix (non-square)', async () => {
        // Input another non-square matrix
        await page.fill('#matrix', '1,0\n0,1,1');
        await page.click('button[type="submit"]');

        // Verify that an error alert is shown
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('The matrix must be square.');

        // Verify that the form is enabled again
        const form = await page.$('#matrix-form');
        const formDisabled = await form.evaluate(form => form.hasAttribute('disabled'));
        expect(formDisabled).toBe(false);
    });

    test('Submit empty matrix', async () => {
        // Input an empty matrix
        await page.fill('#matrix', '');
        await page.click('button[type="submit"]');

        // Verify that an error alert is shown
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('The matrix must be square.');

        // Verify that the form is enabled again
        const form = await page.$('#matrix-form');
        const formDisabled = await form.evaluate(form => form.hasAttribute('disabled'));
        expect(formDisabled).toBe(false);
    });
});