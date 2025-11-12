import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-12-0001-fsm-examples/html/bbb16100-bf48-11f0-9d56-0b246eb7b43c.html';

test.describe('Interactive Binary Search Tree Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const feedback = await page.locator('#feedback').innerText();
        expect(feedback).toBe('');
    });

    test('should transition to validating_input state on INSERT_NODE', async ({ page }) => {
        await page.fill('#nodeValue', '10');
        await page.click('button');
        const feedback = await page.locator('#feedback').innerText();
        expect(feedback).toBe('');
    });

    test('should transition to inserting_node state on VALID_INPUT', async ({ page }) => {
        await page.fill('#nodeValue', '10');
        await page.click('button');
        await page.evaluate(() => {
            // Simulate valid input event
            window.bst.insert(10);
        });
        const feedback = await page.locator('#feedback').innerText();
        expect(feedback).toBe('');
    });

    test('should insert node and return to idle state', async ({ page }) => {
        await page.fill('#nodeValue', '10');
        await page.click('button');
        await page.evaluate(() => {
            // Simulate node inserted event
            window.bst.insert(10);
        });
        const bstDisplay = await page.locator('#bstDisplay');
        const nodes = await bstDisplay.locator('.node').count();
        expect(nodes).toBe(1); // Expect one node to be inserted
    });

    test('should handle invalid input and transition to input_error state', async ({ page }) => {
        await page.fill('#nodeValue', 'abc'); // Invalid input
        await page.click('button');
        const feedback = await page.locator('#feedback').innerText();
        expect(feedback).toContain('Invalid input'); // Assuming an error message is displayed
    });

    test('should transition back to idle state on RETRY_INPUT', async ({ page }) => {
        await page.fill('#nodeValue', 'abc'); // Invalid input
        await page.click('button');
        await page.evaluate(() => {
            // Simulate retry input event
            document.getElementById('nodeValue').value = ''; // Clear input
        });
        const feedback = await page.locator('#feedback').innerText();
        expect(feedback).toBe('');
    });

    test('should display error message for invalid input', async ({ page }) => {
        await page.fill('#nodeValue', 'abc'); // Invalid input
        await page.click('button');
        const feedback = await page.locator('#feedback').innerText();
        expect(feedback).toContain('Invalid input'); // Assuming an error message is displayed
    });

    test('should clear feedback on exit from input_error state', async ({ page }) => {
        await page.fill('#nodeValue', 'abc'); // Invalid input
        await page.click('button');
        await page.evaluate(() => {
            // Simulate retry input event
            document.getElementById('nodeValue').value = '5'; // Valid input
            document.querySelector('button').click(); // Click to insert
        });
        const feedback = await page.locator('#feedback').innerText();
        expect(feedback).toBe('');
    });

    test('should insert multiple nodes correctly', async ({ page }) => {
        await page.fill('#nodeValue', '10');
        await page.click('button');
        await page.evaluate(() => window.bst.insert(10));
        await page.fill('#nodeValue', '5');
        await page.click('button');
        await page.evaluate(() => window.bst.insert(5));
        await page.fill('#nodeValue', '15');
        await page.click('button');
        await page.evaluate(() => window.bst.insert(15));

        const bstDisplay = await page.locator('#bstDisplay');
        const nodes = await bstDisplay.locator('.node').count();
        expect(nodes).toBe(3); // Expect three nodes to be inserted
    });
});