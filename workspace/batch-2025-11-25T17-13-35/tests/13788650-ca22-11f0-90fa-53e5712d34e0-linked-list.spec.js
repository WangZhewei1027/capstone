import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-13-35/html/13788650-ca22-11f0-90fa-53e5712d34e0.html';

test.describe('Linked List Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Linked List application
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        // Verify that the list is empty and no nodes are displayed
        const listContent = await page.locator('#list').innerText();
        expect(listContent).toBe('');
    });

    test('should transition to adding_node state when add node button is clicked', async ({ page }) => {
        // Simulate clicking the add node button
        await page.click('#add-node-button');
        
        // Verify that the application is in the adding_node state
        const listContent = await page.locator('#list').innerText();
        expect(listContent).toContain('Item 1');
        expect(listContent).toContain('Item 2');
        expect(listContent).toContain('Item 3');
    });

    test('should return to idle state after node is added', async ({ page }) => {
        // Simulate adding a new node
        await page.click('#add-node-button');
        await page.click('#list'); // Simulate the event that triggers NODE_ADDED

        // Verify that the application is back in the idle state
        const listContent = await page.locator('#list').innerText();
        expect(listContent).toContain('Item 1');
        expect(listContent).toContain('Item 2');
        expect(listContent).toContain('Item 3');
    });

    test('should transition to displaying_list state when display list button is clicked', async ({ page }) => {
        // Simulate clicking the display list button
        await page.click('#display-list-button');

        // Verify that the application is in the displaying_list state
        const listContent = await page.locator('#list').innerText();
        expect(listContent).toContain('Item 1');
        expect(listContent).toContain('Item 2');
        expect(listContent).toContain('Item 3');
    });

    test('should return to idle state after the list is displayed', async ({ page }) => {
        // Simulate displaying the list
        await page.click('#display-list-button');
        await page.click('#list'); // Simulate the event that triggers LIST_DISPLAYED

        // Verify that the application is back in the idle state
        const listContent = await page.locator('#list').innerText();
        expect(listContent).toContain('Item 1');
        expect(listContent).toContain('Item 2');
        expect(listContent).toContain('Item 3');
    });

    test('should handle edge cases when adding nodes', async ({ page }) => {
        // Attempt to add an empty node
        await page.click('#add-node-button');
        await page.click('#list'); // Simulate the event that triggers NODE_ADDED

        // Verify that no empty nodes are added
        const listContent = await page.locator('#list').innerText();
        expect(listContent).not.toContain('');
    });

    test('should handle edge cases when displaying list', async ({ page }) => {
        // Simulate displaying the list without any nodes
        await page.click('#display-list-button');

        // Verify that the list displays correctly
        const listContent = await page.locator('#list').innerText();
        expect(listContent).toBe(''); // Expect no items if no nodes were added
    });
});