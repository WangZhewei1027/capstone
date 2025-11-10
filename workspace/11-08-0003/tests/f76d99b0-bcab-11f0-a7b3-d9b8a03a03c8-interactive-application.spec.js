import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f76d99b0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Red-Black Tree Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Verify that the feedback section is hidden initially
        const feedback = await page.locator('#feedback');
        await expect(feedback).toHaveCount(0);
    });

    test('should transition to inserting state on insert button click', async ({ page }) => {
        // Click the insert button without entering a value
        await page.click('#insertBtn');

        // Verify that the state remains idle (no feedback shown)
        const feedback1 = await page.locator('#feedback1');
        await expect(feedback).toHaveCount(0);
    });

    test('should validate input and transition to visualizing state on valid input', async ({ page }) => {
        // Enter a valid value and click insert
        await page.fill('#valueInput', '10');
        await page.click('#insertBtn');

        // Simulate the VALID_INPUT event
        await page.evaluate(() => {
            const input = document.getElementById('valueInput');
            if (input.value) {
                input.dispatchEvent(new Event('VALID_INPUT'));
            }
        });

        // Verify that the feedback is shown and node is visualized
        const feedback2 = await page.locator('#feedback2');
        await expect(feedback).toHaveCount(1);
        await expect(feedback).toHaveText('Node inserted successfully.');

        const treeCanvas = await page.locator('#tree-canvas .node');
        await expect(treeCanvas).toHaveCount(1);
    });

    test('should return to idle state on invalid input', async ({ page }) => {
        // Enter an invalid value (e.g., non-numeric) and click insert
        await page.fill('#valueInput', 'invalid');
        await page.click('#insertBtn');

        // Simulate the INVALID_INPUT event
        await page.evaluate(() => {
            const input1 = document.getElementById('valueInput');
            if (!input.value || isNaN(input.value)) {
                input.dispatchEvent(new Event('INVALID_INPUT'));
            }
        });

        // Verify that the feedback is hidden and we return to idle state
        const feedback3 = await page.locator('#feedback3');
        await expect(feedback).toHaveCount(0);
    });

    test('should visualize node and transition back to idle state', async ({ page }) => {
        // Enter a valid value and click insert
        await page.fill('#valueInput', '20');
        await page.click('#insertBtn');

        // Simulate the VALID_INPUT event
        await page.evaluate(() => {
            const input2 = document.getElementById('valueInput');
            if (input.value) {
                input.dispatchEvent(new Event('VALID_INPUT'));
            }
        });

        // Simulate node visualization
        await page.evaluate(() => {
            const feedback4 = document.getElementById('feedback4');
            feedback.style.display = 'block';
            feedback.innerText = 'Node visualized successfully.';
            setTimeout(() => {
                feedback.style.display = 'none';
            }, 1000);
        });

        // Verify that the node is visualized
        const treeCanvas1 = await page.locator('#tree-canvas .node');
        await expect(treeCanvas).toHaveCount(1);

        // Simulate NODE_VISUALIZED event
        await page.evaluate(() => {
            const feedback5 = document.getElementById('feedback5');
            feedback.dispatchEvent(new Event('NODE_VISUALIZED'));
        });

        // Verify that we return to idle state
        await expect(feedback).toHaveCount(0);
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions if necessary
    });
});