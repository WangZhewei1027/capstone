import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1375cc0-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Priority Queue Demo', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in Idle state with enabled controls', async ({ page }) => {
        const taskInput = await page.locator('#task');
        const priorityInput = await page.locator('#priority');
        const addButton = await page.locator("button[onclick='enqueue()']");
        const processButton = await page.locator("button[onclick='dequeue()']");

        await expect(taskInput).toBeEnabled();
        await expect(priorityInput).toBeEnabled();
        await expect(addButton).toBeEnabled();
        await expect(processButton).toBeEnabled();
    });

    test('should transition to Enqueueing state on valid input', async ({ page }) => {
        await page.fill('#task', 'Test Task');
        await page.fill('#priority', '1');
        await page.click("button[onclick='enqueue()']");

        const queueDisplay = await page.locator('#queueDisplay');
        await expect(queueDisplay).toContainText('Test Task (Priority: 1)');
    });

    test('should show validation error on invalid input', async ({ page }) => {
        await page.fill('#task', '');
        await page.fill('#priority', '1');
        await page.click("button[onclick='enqueue()']");

        await expect(page).toHaveAlert('Please enter a valid task and priority.');
    });

    test('should process task and transition to ProcessingTask state', async ({ page }) => {
        await page.fill('#task', 'Test Task');
        await page.fill('#priority', '1');
        await page.click("button[onclick='enqueue()']");
        
        await page.click("button[onclick='dequeue()']");
        await expect(page).toHaveAlert('Processed task: Test Task');
    });

    test('should show empty queue alert when processing an empty queue', async ({ page }) => {
        await page.click("button[onclick='dequeue()']");
        await expect(page).toHaveAlert('The queue is empty!');
    });

    test('should handle multiple enqueue and dequeue operations', async ({ page }) => {
        await page.fill('#task', 'Task 1');
        await page.fill('#priority', '2');
        await page.click("button[onclick='enqueue()']");
        
        await page.fill('#task', 'Task 2');
        await page.fill('#priority', '1');
        await page.click("button[onclick='enqueue()']");
        
        const queueDisplay = await page.locator('#queueDisplay');
        await expect(queueDisplay).toContainText('Task 2 (Priority: 1)');
        await expect(queueDisplay).toContainText('Task 1 (Priority: 2)');

        await page.click("button[onclick='dequeue()']");
        await expect(page).toHaveAlert('Processed task: Task 2');
        
        await page.click("button[onclick='dequeue()']");
        await expect(page).toHaveAlert('Processed task: Task 1');
    });

    test('should show validation error when priority is not a number', async ({ page }) => {
        await page.fill('#task', 'Task with Invalid Priority');
        await page.fill('#priority', 'not-a-number');
        await page.click("button[onclick='enqueue()']");

        await expect(page).toHaveAlert('Please enter a valid task and priority.');
    });
});