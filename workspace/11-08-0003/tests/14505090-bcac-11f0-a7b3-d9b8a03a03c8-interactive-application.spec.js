import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/14505090-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Topological Sort Interactive Module', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await page.reload();
    });

    test('should be in idle state initially', async () => {
        const feedbackText = await page.textContent('#feedback');
        expect(feedbackText).toBe('');
    });

    test('should transition to dragging state on drag start', async () => {
        const node = await page.$('.node');
        await node.dragTo(page.locator('#drop-area'));
        await page.dispatchEvent('.node', 'dragstart');
        const isDragging = await node.evaluate(node => node.classList.contains('dragging'));
        expect(isDragging).toBe(true);
    });

    test('should transition back to idle state on drag end', async () => {
        const node1 = await page.$('.node1');
        await node.dispatchEvent('dragstart');
        await node.dispatchEvent('dragend');
        const isDragging1 = await node.evaluate(node => node.classList.contains('dragging'));
        expect(isDragging).toBe(false);
    });

    test('should transition to validating state on drop', async () => {
        const node2 = await page.$('.node2');
        await node.dispatchEvent('dragstart');
        await page.dispatchEvent('#drop-area', 'drop');
        await page.dispatchEvent('#drop-area', 'dragend');
        const feedbackText1 = await page.textContent('#feedback');
        expect(feedbackText).toBe('Validating...');
    });

    test('should transition to correct state on valid sort', async () => {
        const node3 = await page.$('.node3');
        await node.dispatchEvent('dragstart');
        await page.dispatchEvent('#drop-area', 'drop');
        await page.dispatchEvent('#drop-area', 'VALID_SORT');
        const feedbackText2 = await page.textContent('#feedback');
        expect(feedbackText).toBe('Correct!');
        const feedbackClass = await page.evaluate(() => document.getElementById('feedback').className);
        expect(feedbackClass).toContain('correct');
    });

    test('should transition to incorrect state on invalid sort', async () => {
        const node4 = await page.$('.node4');
        await node.dispatchEvent('dragstart');
        await page.dispatchEvent('#drop-area', 'drop');
        await page.dispatchEvent('#drop-area', 'INVALID_SORT');
        const feedbackText3 = await page.textContent('#feedback');
        expect(feedbackText).toBe('Incorrect!');
        const feedbackClass1 = await page.evaluate(() => document.getElementById('feedback').className);
        expect(feedbackClass).toContain('incorrect');
    });

    test('should reset to idle state on reset button click', async () => {
        const resetButton = await page.$('#reset');
        await resetButton.click();
        const feedbackText4 = await page.textContent('#feedback');
        expect(feedbackText).toBe('');
    });

    test('should handle edge case of dropping without dragging', async () => {
        await page.dispatchEvent('#drop-area', 'drop');
        const feedbackText5 = await page.textContent('#feedback');
        expect(feedbackText).toBe('');
    });
});