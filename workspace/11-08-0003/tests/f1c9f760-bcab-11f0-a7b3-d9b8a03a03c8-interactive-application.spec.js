import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f1c9f760-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Union-Find Interactive Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle', async () => {
        const infoText = await page.locator('#info').innerText();
        expect(infoText).toBe('Select nodes to explore Union-Find operations.');
    });

    test('Select a node transitions to node_selected state', async () => {
        await page.locator('.node').nth(0).click();
        const infoText1 = await page.locator('#info').innerText();
        expect(infoText).toContain('Node 0 selected');
    });

    test('Select a second node and verify state', async () => {
        await page.locator('.node').nth(1).click();
        const infoText2 = await page.locator('#info').innerText();
        expect(infoText).toContain('Nodes 0 and 1 selected');
    });

    test('Click Union button transitions to union_processing state', async () => {
        await page.locator('#unionButton').click();
        const infoText3 = await page.locator('#info').innerText();
        expect(infoText).toContain('Union operation in progress...');
    });

    test('Union operation completes and returns to idle state', async () => {
        await page.waitForTimeout(1000); // Wait for union to complete
        const infoText4 = await page.locator('#info').innerText();
        expect(infoText).toBe('Select nodes to explore Union-Find operations.');
    });

    test('Select a node and click Find button', async () => {
        await page.locator('.node').nth(0).click();
        await page.locator('#findButton').click();
        const infoText5 = await page.locator('#info').innerText();
        expect(infoText).toContain('Find operation in progress...');
    });

    test('Find operation completes and returns to idle state', async () => {
        await page.waitForTimeout(1000); // Wait for find to complete
        const infoText6 = await page.locator('#info').innerText();
        expect(infoText).toBe('Select nodes to explore Union-Find operations.');
    });

    test('Attempt to union without selecting two nodes', async () => {
        await page.locator('.node').nth(0).click();
        await page.locator('#unionButton').click();
        const infoText7 = await page.locator('#info').innerText();
        expect(infoText).toContain('Please select two nodes for union.');
    });

    test('Attempt to find without selecting a node', async () => {
        await page.locator('#findButton').click();
        const infoText8 = await page.locator('#info').innerText();
        expect(infoText).toContain('Please select a node for find.');
    });

    test('Select a node, then deselect it', async () => {
        await page.locator('.node').nth(0).click();
        await page.locator('.node').nth(0).click(); // Deselect
        const infoText9 = await page.locator('#info').innerText();
        expect(infoText).toBe('Select nodes to explore Union-Find operations.');
    });

    test('Select two nodes, union them, and check visual feedback', async () => {
        await page.locator('.node').nth(0).click();
        await page.locator('.node').nth(1).click();
        await page.locator('#unionButton').click();
        await page.waitForTimeout(1000); // Wait for union to complete
        const firstNode = await page.locator('.node').nth(0);
        const secondNode = await page.locator('.node').nth(1);
        expect(await firstNode.evaluate(node => node.classList.contains('connected'))).toBe(true);
        expect(await secondNode.evaluate(node => node.classList.contains('connected'))).toBe(true);
    });
});