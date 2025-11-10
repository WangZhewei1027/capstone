import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f5d43500-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Linked List Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Verify that the input field is empty and the list is empty
        const inputValue = await page.locator('#nodeValue').inputValue();
        const listContainer = await page.locator('#listContainer').innerHTML();
        
        expect(inputValue).toBe('');
        expect(listContainer).toBe('');
    });

    test('should add a node and transition to addingNode state', async ({ page }) => {
        // Input a value and click the Add Node button
        await page.fill('#nodeValue', 'Node 1');
        await page.click('#addNode');

        // Verify that the node is added to the list
        const listContainer1 = await page.locator('#listContainer1').innerHTML();
        expect(listContainer).toContain('Node 1');
    });

    test('should remove a node and transition to idle state', async ({ page }) => {
        // Add a node first
        await page.fill('#nodeValue', 'Node 1');
        await page.click('#addNode');

        // Click the remove button
        await page.click('text=Remove');

        // Wait for the node to be removed and verify the list is empty
        await page.waitForTimeout(600); // Wait for the animation to complete
        const listContainer2 = await page.locator('#listContainer2').innerHTML();
        expect(listContainer).toBe('');
    });

    test('should not add a node if input is empty', async ({ page }) => {
        // Click the Add Node button without input
        await page.click('#addNode');

        // Verify that the list is still empty
        const listContainer3 = await page.locator('#listContainer3').innerHTML();
        expect(listContainer).toBe('');
    });

    test('should handle multiple nodes', async ({ page }) => {
        // Add multiple nodes
        await page.fill('#nodeValue', 'Node 1');
        await page.click('#addNode');
        await page.fill('#nodeValue', 'Node 2');
        await page.click('#addNode');

        // Verify that both nodes are present
        const listContainer4 = await page.locator('#listContainer4').innerHTML();
        expect(listContainer).toContain('Node 1');
        expect(listContainer).toContain('Node 2');
    });

    test('should remove nodes correctly and maintain state', async ({ page }) => {
        // Add nodes
        await page.fill('#nodeValue', 'Node 1');
        await page.click('#addNode');
        await page.fill('#nodeValue', 'Node 2');
        await page.click('#addNode');

        // Remove the first node
        await page.click('text=Remove');

        // Verify that the first node is removed and the second node remains
        const listContainer5 = await page.locator('#listContainer5').innerHTML();
        expect(listContainer).not.toContain('Node 1');
        expect(listContainer).toContain('Node 2');
    });

    test('should not allow adding empty nodes', async ({ page }) => {
        // Attempt to add an empty node
        await page.click('#addNode');

        // Verify that the list is still empty
        const listContainer6 = await page.locator('#listContainer6').innerHTML();
        expect(listContainer).toBe('');
    });
});