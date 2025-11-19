import { test, expect } from '@playwright/test';

const htmlFilePath = 'http://127.0.0.1:5500/workspace/11-12-0001-fsm-examples/html/5d8dd330-bf50-11f0-9278-a57cfa0a44e5.html';

// Helper function to wait for a specific element to be visible
async function waitForElement(page, selector) {
    await page.waitForSelector(selector, { state: 'visible' });
}

// Helper function to wait for a specific element to have specific text content
async function waitForElementWithText(page, selector, text) {
    await page.waitForSelector(selector, { state: 'visible' });
    await expect(await page.textContent(selector)).toContain(text);
}

// Test suite for the Binary Search Tree (BST) interactive demonstration
test.describe('Binary Search Tree (BST) Interactive Demo Tests', () => {
    let page;

    test.beforeEach(async ({ page }) => {
        page = page;
        await page.goto(htmlFilePath);
    });

    test('Initial State: IDLE', async () => {
        // Verify initial state is IDLE
        await waitForElement(page, '.input');
        await waitForElement(page, 'button');
    });

    test('Transition from IDLE to BUILDING_BST on BUILD_BST event', async () => {
        // Trigger BUILD_BST event
        await page.fill('.input', '10, 5, 15');
        await page.click('button');

        // Verify transition to BUILDING_BST state
        await waitForElementWithText(page, '#bst', '10');
        await waitForElementWithText(page, '#bst', '5');
        await waitForElementWithText(page, '#bst', '15');
    });

    test('Transition from BUILDING_BST to BST_DISPLAYED on BST_BUILT event', async () => {
        // Trigger BUILD_BST event
        await page.fill('.input', '10, 5, 15');
        await page.click('button');

        // Verify transition to BST_DISPLAYED state
        await waitForElementWithText(page, '#bst', '10');
        await waitForElementWithText(page, '#bst', '5');
        await waitForElementWithText(page, '#bst', '15');

        // Trigger BST_BUILT event
        await page.fill('.input', '20, 12, 25');
        await page.click('button');

        // Verify transition to BUILDING_BST state
        await waitForElementWithText(page, '#bst', '20');
        await waitForElementWithText(page, '#bst', '12');
        await waitForElementWithText(page, '#bst', '25');
    });

    test('Transition from BST_DISPLAYED back to BUILDING_BST on BUILD_BST event', async () => {
        // Trigger BUILD_BST event
        await page.fill('.input', '10, 5, 15');
        await page.click('button');

        // Verify transition to BST_DISPLAYED state
        await waitForElementWithText(page, '#bst', '10');
        await waitForElementWithText(page, '#bst', '5');
        await waitForElementWithText(page, '#bst', '15');

        // Trigger BUILD_BST event again
        await page.fill('.input', '20, 12, 25');
        await page.click('button');

        // Verify transition back to BUILDING_BST state
        await waitForElementWithText(page, '#bst', '20');
        await waitForElementWithText(page, '#bst', '12');
        await waitForElementWithText(page, '#bst', '25');
    });

    test('Edge Case: Empty input on BUILD_BST event', async () => {
        // Trigger BUILD_BST event with empty input
        await page.click('button');

        // Verify no change in state
        await expect(page.locator('#bst').textContent()).resolves.toEqual('');
    });

    test('Edge Case: Invalid input on BUILD_BST event', async () => {
        // Trigger BUILD_BST event with invalid input
        await page.fill('.input', 'abc, def');
        await page.click('button');

        // Verify no change in state
        await expect(page.locator('#bst').textContent()).resolves.toEqual('');
    });
});