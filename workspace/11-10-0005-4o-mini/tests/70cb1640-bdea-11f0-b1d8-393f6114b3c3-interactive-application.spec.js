import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0005-4o-mini/html/70cb1640-bdea-11f0-b1d8-393f6114b3c3.html';

test.describe('Interactive Linked List Explorer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Idle State Tests', () => {
        test('should display the initial state with no nodes', async ({ page }) => {
            const listContainer = await page.locator('#listContainer');
            await expect(listContainer).toHaveText('');
        });

        test('should transition to addingNode state when Add Node button is clicked', async ({ page }) => {
            await page.fill('#nodeValue', 'Node 1');
            await page.click('button:has-text("Add Node")');
            await page.waitForTimeout(100); // Wait for state transition
            const listContainer = await page.locator('#listContainer');
            await expect(listContainer).toContainText('Node 1');
        });

        test('should transition to traversing state when Traverse List button is clicked', async ({ page }) => {
            await page.fill('#nodeValue', 'Node 1');
            await page.click('button:has-text("Add Node")');
            await page.click('button:has-text("Traverse List")');
            await page.waitForTimeout(100); // Wait for state transition
            const listContainer = await page.locator('#listContainer');
            await expect(listContainer).toContainText('Node 1');
        });

        test('should transition to deleting state when Delete Last Node button is clicked', async ({ page }) => {
            await page.fill('#nodeValue', 'Node 1');
            await page.click('button:has-text("Add Node")');
            await page.click('button:has-text("Delete Last Node")');
            await page.waitForTimeout(100); // Wait for state transition
            const listContainer = await page.locator('#listContainer');
            await expect(listContainer).not.toContainText('Node 1');
        });
    });

    test.describe('Adding Node Tests', () => {
        test('should return to idle state after successfully adding a node', async ({ page }) => {
            await page.fill('#nodeValue', 'Node 1');
            await page.click('button:has-text("Add Node")');
            await page.waitForTimeout(100); // Wait for state transition
            const listContainer = await page.locator('#listContainer');
            await expect(listContainer).toContainText('Node 1');
        });

        test('should handle node add failure gracefully', async ({ page }) => {
            // Simulate a failure scenario (e.g., empty input)
            await page.fill('#nodeValue', '');
            await page.click('button:has-text("Add Node")');
            await page.waitForTimeout(100); // Wait for state transition
            const listContainer = await page.locator('#listContainer');
            await expect(listContainer).not.toContainText(''); // Ensure no empty node is added
        });
    });

    test.describe('Traversing Tests', () => {
        test('should complete traversal and return to idle state', async ({ page }) => {
            await page.fill('#nodeValue', 'Node 1');
            await page.click('button:has-text("Add Node")');
            await page.click('button:has-text("Traverse List")');
            await page.waitForTimeout(100); // Wait for state transition
            const listContainer = await page.locator('#listContainer');
            await expect(listContainer).toContainText('Node 1');
        });

        test('should handle traversal with no nodes gracefully', async ({ page }) => {
            await page.click('button:has-text("Traverse List")');
            await page.waitForTimeout(100); // Wait for state transition
            const listContainer = await page.locator('#listContainer');
            await expect(listContainer).toHaveText(''); // Ensure no nodes are shown
        });
    });

    test.describe('Deleting Node Tests', () => {
        test('should delete the last node and return to idle state', async ({ page }) => {
            await page.fill('#nodeValue', 'Node 1');
            await page.click('button:has-text("Add Node")');
            await page.click('button:has-text("Delete Last Node")');
            await page.waitForTimeout(100); // Wait for state transition
            const listContainer = await page.locator('#listContainer');
            await expect(listContainer).not.toContainText('Node 1');
        });

        test('should handle delete failure gracefully when no nodes exist', async ({ page }) => {
            await page.click('button:has-text("Delete Last Node")');
            await page.waitForTimeout(100); // Wait for state transition
            const listContainer = await page.locator('#listContainer');
            await expect(listContainer).toHaveText(''); // Ensure no nodes are shown
        });
    });

    test.afterEach(async ({ page }) => {
        // Optionally reset the application state if needed
    });
});