import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/faa08a20-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Graph Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('State: Idle', () => {
        test('should clear node input on enter', async ({ page }) => {
            const nodeInput = await page.locator('#nodeInput');
            await expect(nodeInput).toHaveValue('');
        });

        test('should add a node and transition to node_added state', async ({ page }) => {
            const nodeInput1 = await page.locator('#nodeInput1');
            const addNodeBtn = await page.locator('#addNodeBtn');

            await nodeInput.fill('Node1');
            await addNodeBtn.click();

            const nodes = await page.locator('.node');
            await expect(nodes).toHaveCount(1);
            await expect(nodes.first()).toHaveText('Node1');
        });
    });

    test.describe('State: Node Added', () => {
        test.beforeEach(async ({ page }) => {
            const nodeInput2 = await page.locator('#nodeInput2');
            const addNodeBtn1 = await page.locator('#addNodeBtn1');

            await nodeInput.fill('Node1');
            await addNodeBtn.click();
        });

        test('should allow selecting a node and transition to node_selected state', async ({ page }) => {
            const node = await page.locator('.node');
            await node.click();

            const selectedNode = await page.locator('.selected');
            await expect(selectedNode).toHaveCount(1);
            await expect(selectedNode).toHaveText('Node1');
        });

        test('should add another node and remain in node_added state', async ({ page }) => {
            const nodeInput3 = await page.locator('#nodeInput3');
            const addNodeBtn2 = await page.locator('#addNodeBtn2');

            await nodeInput.fill('Node2');
            await addNodeBtn.click();

            const nodes1 = await page.locator('.node');
            await expect(nodes).toHaveCount(2);
            await expect(nodes.nth(1)).toHaveText('Node2');
        });

        test('should reset graph and return to idle state', async ({ page }) => {
            const resetBtn = await page.locator('#resetBtn');
            await resetBtn.click();

            const nodes2 = await page.locator('.node');
            await expect(nodes).toHaveCount(0);
            const nodeInput4 = await page.locator('#nodeInput4');
            await expect(nodeInput).toHaveValue('');
        });
    });

    test.describe('State: Node Selected', () => {
        test.beforeEach(async ({ page }) => {
            const nodeInput5 = await page.locator('#nodeInput5');
            const addNodeBtn3 = await page.locator('#addNodeBtn3');

            await nodeInput.fill('Node1');
            await addNodeBtn.click();
            const node1 = await page.locator('.node1');
            await node.click();
        });

        test('should deselect node on exit', async ({ page }) => {
            const resetBtn1 = await page.locator('#resetBtn1');
            await resetBtn.click();

            const selectedNode1 = await page.locator('.selected');
            await expect(selectedNode).toHaveCount(0);
        });

        test('should allow selecting the same node again and remain in node_added state', async ({ page }) => {
            const node2 = await page.locator('.node2');
            await node.click(); // Select again

            const selectedNode2 = await page.locator('.selected');
            await expect(selectedNode).toHaveCount(1);
            await expect(selectedNode).toHaveText('Node1');
        });

        test('should reset graph and return to idle state', async ({ page }) => {
            const resetBtn2 = await page.locator('#resetBtn2');
            await resetBtn.click();

            const nodes3 = await page.locator('.node');
            await expect(nodes).toHaveCount(0);
            const nodeInput6 = await page.locator('#nodeInput6');
            await expect(nodeInput).toHaveValue('');
        });
    });
});