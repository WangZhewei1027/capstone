import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abdef61-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Adjacency List Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await page.reload();
    });

    test('should add a vertex and display it correctly', async () => {
        await page.fill('#input', 'A');
        await page.click('#add-btn');

        const graphContent = await page.innerHTML('#graph');
        expect(graphContent).toContain('A -> [');
    });

    test('should not add a vertex if input is empty', async () => {
        await page.click('#add-btn');

        const graphContent = await page.innerHTML('#graph');
        expect(graphContent).toBe('');
    });

    test('should remove a vertex and update the display', async () => {
        await page.fill('#input', 'B');
        await page.click('#add-btn');
        await page.fill('#input', 'B');
        await page.click('#remove-btn');

        const graphContent = await page.innerHTML('#graph');
        expect(graphContent).not.toContain('B -> [');
    });

    test('should not remove a vertex if it does not exist', async () => {
        await page.fill('#input', 'C');
        await page.click('#remove-btn');

        const graphContent = await page.innerHTML('#graph');
        expect(graphContent).toBe('');
    });

    test('should print the adjacency list correctly', async () => {
        await page.fill('#input', 'D');
        await page.click('#add-btn');
        await page.fill('#input', 'E');
        await page.click('#add-btn');
        await page.fill('#input', 'D');
        await page.click('#print-btn');

        const graphContent = await page.innerHTML('#graph');
        expect(graphContent).toContain('D -> [');
        expect(graphContent).toContain('E -> [');
    });

    test('should handle printing when no vertices are added', async () => {
        await page.click('#print-btn');

        const graphContent = await page.innerHTML('#graph');
        expect(graphContent).toBe('');
    });
});