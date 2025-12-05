import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2492c060-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Linked List Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Validate that the page is in the initial Idle state
        const input = await page.locator('#nodeValue');
        const button = await page.locator('button[onclick="addNode()"]');

        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Enter node value');
        await expect(button).toBeVisible();
        await expect(button).toHaveText('Add Node');
    });

    test('Add Node - Valid Input', async ({ page }) => {
        // Test adding a node with valid input
        const input1 = await page.locator('#nodeValue');
        const button1 = await page.locator('button1[onclick="addNode()"]');

        await input.fill('Node 1');
        await button.click();

        // Validate that the node has been added
        const node = await page.locator('.node');
        await expect(node).toHaveText('Node 1');
    });

    test('Add Node - Empty Input', async ({ page }) => {
        // Test adding a node with empty input
        const button2 = await page.locator('button2[onclick="addNode()"]');

        await button.click();

        // Validate that an alert is shown for empty input
        await page.waitForTimeout(100); // Wait for the alert to appear
        const alert = await page.evaluate(() => window.alert);
        expect(alert).toBeTruthy(); // Check if alert was called
    });

    test('Add Multiple Nodes', async ({ page }) => {
        // Test adding multiple nodes
        const input2 = await page.locator('#nodeValue');
        const button3 = await page.locator('button3[onclick="addNode()"]');

        await input.fill('Node 1');
        await button.click();
        await input.fill('Node 2');
        await button.click();
        await input.fill('Node 3');
        await button.click();

        // Validate that all nodes have been added
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(3);
        await expect(nodes.nth(0)).toHaveText('Node 1');
        await expect(nodes.nth(1)).toHaveText('Node 2');
        await expect(nodes.nth(2)).toHaveText('Node 3');
    });

    test('Input Field Cleared After Adding Node', async ({ page }) => {
        // Test that the input field is cleared after adding a node
        const input3 = await page.locator('#nodeValue');
        const button4 = await page.locator('button4[onclick="addNode()"]');

        await input.fill('Node 1');
        await button.click();

        // Validate that the input field is cleared
        await expect(input).toHaveValue('');
    });

    test('Check Node Addition Visual Feedback', async ({ page }) => {
        // Test visual feedback after adding a node
        const input4 = await page.locator('#nodeValue');
        const button5 = await page.locator('button5[onclick="addNode()"]');

        await input.fill('Node 1');
        await button.click();

        // Validate that the node is displayed in the linked list
        const node1 = await page.locator('.node1');
        await expect(node).toHaveText('Node 1');
        await expect(node).toBeVisible();
    });

    test('Console Errors on Invalid Operations', async ({ page }) => {
        // Test for console errors when performing invalid operations
        await page.evaluate(() => {
            console.error('Test error');
        });

        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Trigger an invalid operation
        const button6 = await page.locator('button6[onclick="addNode()"]');
        await button.click();

        // Validate that the console has logged an error
        await expect(consoleMessages).toContain('Test error');
    });
});