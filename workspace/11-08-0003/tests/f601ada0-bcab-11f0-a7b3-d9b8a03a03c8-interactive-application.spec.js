import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f601ada0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Linked List Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const nodeValueInput = page.locator('#nodeValue');
        const createNodeBtn = page.locator('#createNodeBtn');
        const insertAfterBtn = page.locator('#insertAfterBtn');

        // Verify input is empty and buttons are enabled
        await expect(nodeValueInput).toHaveValue('');
        await expect(createNodeBtn).toBeEnabled();
        await expect(insertAfterBtn).toBeEnabled();
    });

    test('should create a node and transition to node_created state', async ({ page }) => {
        const nodeValueInput1 = page.locator('#nodeValue');
        const createNodeBtn1 = page.locator('#createNodeBtn1');
        const linkedListContainer = page.locator('#linkedListContainer');

        // Create a node
        await nodeValueInput.fill('Node 1');
        await createNodeBtn.click();

        // Verify node is created and displayed
        const node = linkedListContainer.locator('.node');
        await expect(node).toHaveCount(1);
        await expect(node).toHaveText('Node 1');
    });

    test('should create multiple nodes', async ({ page }) => {
        const nodeValueInput2 = page.locator('#nodeValue');
        const createNodeBtn2 = page.locator('#createNodeBtn2');
        const linkedListContainer1 = page.locator('#linkedListContainer1');

        // Create first node
        await nodeValueInput.fill('Node 1');
        await createNodeBtn.click();

        // Create second node
        await nodeValueInput.fill('Node 2');
        await createNodeBtn.click();

        // Verify both nodes are created
        const nodes = linkedListContainer.locator('.node');
        await expect(nodes).toHaveCount(2);
        await expect(nodes.nth(0)).toHaveText('Node 1');
        await expect(nodes.nth(1)).toHaveText('Node 2');
    });

    test('should prompt for index when inserting after', async ({ page }) => {
        const nodeValueInput3 = page.locator('#nodeValue');
        const createNodeBtn3 = page.locator('#createNodeBtn3');
        const insertAfterBtn1 = page.locator('#insertAfterBtn1');
        const linkedListContainer2 = page.locator('#linkedListContainer2');

        // Create nodes
        await nodeValueInput.fill('Node 1');
        await createNodeBtn.click();
        await nodeValueInput.fill('Node 2');
        await createNodeBtn.click();

        // Insert after first node
        await nodeValueInput.fill('Node 3');
        await page.evaluate(() => window.prompt = () => '0'); // Mock prompt to return '0'
        await insertAfterBtn.click();

        // Verify the new node is inserted correctly
        const nodes1 = linkedListContainer.locator('.node');
        await expect(nodes).toHaveCount(3);
        await expect(nodes.nth(1)).toHaveText('Node 3');
    });

    test('should cancel insertion and return to idle state', async ({ page }) => {
        const nodeValueInput4 = page.locator('#nodeValue');
        const createNodeBtn4 = page.locator('#createNodeBtn4');
        const insertAfterBtn2 = page.locator('#insertAfterBtn2');
        const linkedListContainer3 = page.locator('#linkedListContainer3');

        // Create a node
        await nodeValueInput.fill('Node 1');
        await createNodeBtn.click();

        // Attempt to insert after but cancel
        await nodeValueInput.fill('Node 2');
        await page.evaluate(() => window.prompt = () => null); // Mock prompt to return null
        await insertAfterBtn.click();

        // Verify no new node is added
        const nodes2 = linkedListContainer.locator('.node');
        await expect(nodes).toHaveCount(1);
    });

    test('should handle invalid index during insertion', async ({ page }) => {
        const nodeValueInput5 = page.locator('#nodeValue');
        const createNodeBtn5 = page.locator('#createNodeBtn5');
        const insertAfterBtn3 = page.locator('#insertAfterBtn3');
        const linkedListContainer4 = page.locator('#linkedListContainer4');

        // Create a node
        await nodeValueInput.fill('Node 1');
        await createNodeBtn.click();

        // Attempt to insert after with invalid index
        await nodeValueInput.fill('Node 2');
        await page.evaluate(() => window.prompt = () => '-1'); // Mock prompt to return invalid index
        await insertAfterBtn.click();

        // Verify no new node is added
        const nodes3 = linkedListContainer.locator('.node');
        await expect(nodes).toHaveCount(1);
    });

    test('should allow multiple insertions', async ({ page }) => {
        const nodeValueInput6 = page.locator('#nodeValue');
        const createNodeBtn6 = page.locator('#createNodeBtn6');
        const insertAfterBtn4 = page.locator('#insertAfterBtn4');
        const linkedListContainer5 = page.locator('#linkedListContainer5');

        // Create initial nodes
        await nodeValueInput.fill('Node 1');
        await createNodeBtn.click();
        await nodeValueInput.fill('Node 2');
        await createNodeBtn.click();

        // Insert after first node
        await nodeValueInput.fill('Node 3');
        await page.evaluate(() => window.prompt = () => '0'); // Mock prompt to return '0'
        await insertAfterBtn.click();

        // Insert after second node
        await nodeValueInput.fill('Node 4');
        await page.evaluate(() => window.prompt = () => '1'); // Mock prompt to return '1'
        await insertAfterBtn.click();

        // Verify all nodes are correctly inserted
        const nodes4 = linkedListContainer.locator('.node');
        await expect(nodes).toHaveCount(4);
        await expect(nodes.nth(1)).toHaveText('Node 3');
        await expect(nodes.nth(2)).toHaveText('Node 4');
    });

    test('should clear input after creating a node', async ({ page }) => {
        const nodeValueInput7 = page.locator('#nodeValue');
        const createNodeBtn7 = page.locator('#createNodeBtn7');

        // Create a node
        await nodeValueInput.fill('Node 1');
        await createNodeBtn.click();

        // Verify input is cleared
        await expect(nodeValueInput).toHaveValue('');
    });
});