import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c936560-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Priority Queue Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the priority queue application before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify that the page loads correctly
        await expect(page.locator('h1')).toHaveText('Priority Queue Demo');
        await expect(page.locator('#queueList')).toBeEmpty();
    });

    test('should add a high priority task to the queue', async ({ page }) => {
        // Test adding a high priority task
        await page.fill('#priority', 'High');
        await page.fill('#task', 'Task 1');
        await page.click('#addBtn');

        // Verify the task is added correctly
        const queueItems = page.locator('#queueList .queue-item');
        await expect(queueItems).toHaveCount(1);
        await expect(queueItems.first()).toHaveText('HIGH: Task 1');
        await expect(queueItems.first()).toHaveClass(/high/);
    });

    test('should add a medium priority task to the queue', async ({ page }) => {
        // Test adding a medium priority task
        await page.fill('#priority', 'Medium');
        await page.fill('#task', 'Task 2');
        await page.click('#addBtn');

        // Verify the task is added correctly
        const queueItems = page.locator('#queueList .queue-item');
        await expect(queueItems).toHaveCount(1);
        await expect(queueItems.first()).toHaveText('MEDIUM: Task 2');
        await expect(queueItems.first()).toHaveClass(/medium/);
    });

    test('should add a low priority task to the queue', async ({ page }) => {
        // Test adding a low priority task
        await page.fill('#priority', 'Low');
        await page.fill('#task', 'Task 3');
        await page.click('#addBtn');

        // Verify the task is added correctly
        const queueItems = page.locator('#queueList .queue-item');
        await expect(queueItems).toHaveCount(1);
        await expect(queueItems.first()).toHaveText('LOW: Task 3');
        await expect(queueItems.first()).toHaveClass(/low/);
    });

    test('should maintain correct order of tasks based on priority', async ({ page }) => {
        // Add tasks with different priorities
        await page.fill('#priority', 'Low');
        await page.fill('#task', 'Task 1');
        await page.click('#addBtn');

        await page.fill('#priority', 'High');
        await page.fill('#task', 'Task 2');
        await page.click('#addBtn');

        await page.fill('#priority', 'Medium');
        await page.fill('#task', 'Task 3');
        await page.click('#addBtn');

        // Verify the order of tasks in the queue
        const queueItems = page.locator('#queueList .queue-item');
        await expect(queueItems).toHaveCount(3);
        await expect(queueItems.nth(0)).toHaveText('HIGH: Task 2');
        await expect(queueItems.nth(1)).toHaveText('MEDIUM: Task 3');
        await expect(queueItems.nth(2)).toHaveText('LOW: Task 1');
    });

    test('should show alert when task or priority is missing', async ({ page }) => {
        // Test alert when adding without priority
        await page.fill('#task', 'Task without priority');
        await page.click('#addBtn');
        await expect(page).toHaveAlert('Please enter both priority and task.');

        // Test alert when adding without task
        await page.fill('#priority', 'High');
        await page.click('#addBtn');
        await expect(page).toHaveAlert('Please enter both priority and task.');
    });

    test('should clear input fields after adding a task', async ({ page }) => {
        // Add a task and verify input fields are cleared
        await page.fill('#priority', 'High');
        await page.fill('#task', 'Task to clear');
        await page.click('#addBtn');

        await expect(page.locator('#priority')).toHaveValue('');
        await expect(page.locator('#task')).toHaveValue('');
    });
});