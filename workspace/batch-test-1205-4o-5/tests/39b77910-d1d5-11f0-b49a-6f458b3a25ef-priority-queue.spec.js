import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b77910-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object to encapsulate interactions with the Priority Queue page
class PriorityQueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.taskInput = page.locator('#taskInput');
    this.priorityInput = page.locator('#priorityInput');
    this.addButton = page.locator('#addTaskBtn');
    this.processButton = page.locator('#processTaskBtn');
    this.queueRows = page.locator('#queueBody tr');
  }

  // Navigate to the application URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill inputs and click the Add Task button
  async addTask(task, priority) {
    await this.taskInput.fill(String(task));
    await this.priorityInput.fill(String(priority));
    await this.addButton.click();
  }

  // Click the Process Task button
  async processTask() {
    await this.processButton.click();
  }

  // Return number of rows currently shown in the queue
  async getRowCount() {
    return await this.queueRows.count();
  }

  // Return array of { task, priority } objects representing the table rows in order
  async getRows() {
    const count = await this.getRowCount();
    const rows = [];
    for (let i = 0; i < count; i++) {
      const taskText = await this.queueRows.nth(i).locator('td').nth(0).textContent();
      const priorityText = await this.queueRows.nth(i).locator('td').nth(1).textContent();
      rows.push({
        task: taskText?.trim() ?? '',
        priority: priorityText?.trim() ?? ''
      });
    }
    return rows;
  }

  // Helper to clear inputs (via UI actions if needed)
  async clearInputs() {
    await this.taskInput.fill('');
    await this.priorityInput.fill('');
  }

  // Get current input values
  async getInputValues() {
    const task = await this.taskInput.inputValue();
    const priority = await this.priorityInput.inputValue();
    return { task, priority };
  }
}

test.describe('Priority Queue Demo - End-to-End', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Capture uncaught exceptions / page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Test initial load and default state
  test('Initial load: controls are visible and queue is empty', async ({ page }) => {
    const pq = new PriorityQueuePage(page);
    await pq.goto();

    // Verify inputs and buttons are visible and enabled
    await expect(pq.taskInput).toBeVisible();
    await expect(pq.priorityInput).toBeVisible();
    await expect(pq.addButton).toBeVisible();
    await expect(pq.processButton).toBeVisible();
    await expect(pq.addButton).toBeEnabled();
    await expect(pq.processButton).toBeEnabled();

    // Verify queue table initially has zero rows
    expect(await pq.getRowCount()).toBe(0);

    // Verify inputs are empty on load
    const inputs = await pq.getInputValues();
    expect(inputs.task).toBe('');
    expect(inputs.priority).toBe('');

    // Assert there were no console errors or uncaught page errors on load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test adding a single task
  test('Adding one task updates table and clears inputs', async ({ page }) => {
    const pq1 = new PriorityQueuePage(page);
    await pq.goto();

    // Add a single task with priority 2
    await pq.addTask('Task A', 2);

    // Expect one row in the queue with correct values
    await expect(pq.queueRows).toHaveCount(1);
    const rows1 = await pq.getRows();
    expect(rows.length).toBe(1);
    expect(rows[0].task).toBe('Task A');
    expect(rows[0].priority).toBe('2');

    // Inputs should be cleared after successful add
    const inputs1 = await pq.getInputValues();
    expect(inputs.task).toBe('');
    expect(inputs.priority).toBe('');

    // Assert no console errors or page errors occurred during this interaction
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test that multiple tasks are sorted by ascending priority and processing removes the right task
  test('Multiple tasks are sorted by priority; processing removes highest priority (lowest number)', async ({ page }) => {
    const pq2 = new PriorityQueuePage(page);
    await pq.goto();

    // Add three tasks with varying priorities
    await pq.addTask('LowPriority', 5);   // priority 5
    await pq.addTask('HighPriority', 1);  // priority 1
    await pq.addTask('MidPriority', 3);   // priority 3

    // The table should contain three rows
    await expect(pq.queueRows).toHaveCount(3);

    // Rows should be sorted by priority ascending: HighPriority (1), MidPriority (3), LowPriority (5)
    const rows2 = await pq.getRows();
    expect(rows.map(r => r.task)).toEqual(['HighPriority', 'MidPriority', 'LowPriority']);
    expect(rows.map(r => r.priority)).toEqual(['1', '3', '5']);

    // Process one task: should remove 'HighPriority' (priority 1)
    await pq.processTask();

    // After processing, two rows remain and the top should now be 'MidPriority'
    await expect(pq.queueRows).toHaveCount(2);
    const rowsAfterProcess = await pq.getRows();
    expect(rowsAfterProcess.map(r => r.task)).toEqual(['MidPriority', 'LowPriority']);
    expect(rowsAfterProcess.map(r => r.priority)).toEqual(['3', '5']);

    // Assert no console errors or page errors occurred during these interactions
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test processing when queue is empty produces an alert with expected message
  test('Processing an empty queue triggers an alert and does not throw page errors', async ({ page }) => {
    const pq3 = new PriorityQueuePage(page);
    await pq.goto();

    // Ensure queue is empty
    expect(await pq.getRowCount()).toBe(0);

    // Wait for the dialog that should be shown and assert its message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      pq.processButton.click() // trigger the alert by clicking Process Task
    ]);
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('No tasks to process.');
    await dialog.accept();

    // Ensure still no rows in the table
    expect(await pq.getRowCount()).toBe(0);

    // Assert no uncaught page errors and no console errors
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test adding with invalid inputs shows an alert and queue remains unchanged
  test('Adding with empty task or invalid priority shows validation alert and does not change queue', async ({ page }) => {
    const pq4 = new PriorityQueuePage(page);
    await pq.goto();

    // Case 1: Both fields empty -> alert
    const [dialog1] = await Promise.all([
      page.waitForEvent('dialog'),
      pq.addButton.click()
    ]);
    expect(dialog1.type()).toBe('alert');
    expect(dialog1.message()).toBe('Please enter a valid task and priority.');
    await dialog1.accept();

    // Queue should still be empty
    expect(await pq.getRowCount()).toBe(0);

    // Case 2: Valid task but non-numeric priority (type=number input allows typing letters, parseInt will produce NaN)
    await pq.taskInput.fill('Some Task');
    await pq.priorityInput.fill('abc'); // will parse to NaN in app code
    const [dialog2] = await Promise.all([
      page.waitForEvent('dialog'),
      pq.addButton.click()
    ]);
    expect(dialog2.type()).toBe('alert');
    expect(dialog2.message()).toBe('Please enter a valid task and priority.');
    await dialog2.accept();

    // Queue should still be empty after invalid attempt
    expect(await pq.getRowCount()).toBe(0);

    // Case 3: Valid task and priority -> should add
    await pq.taskInput.fill('Valid Task');
    await pq.priorityInput.fill('4');
    await pq.addButton.click();
    await expect(pq.queueRows).toHaveCount(1);
    const rows3 = await pq.getRows();
    expect(rows[0].task).toBe('Valid Task');
    expect(rows[0].priority).toBe('4');

    // Assert no uncaught page errors and no console errors during these interactions
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Accessibility and state checks: ensure buttons are reachable and table header persisted
  test('Accessibility and structural checks: table header remains and controls are reachable', async ({ page }) => {
    const pq5 = new PriorityQueuePage(page);
    await pq.goto();

    // Table header should contain "Task" and "Priority"
    const headerTask = page.locator('#queue thead tr th').nth(0);
    const headerPriority = page.locator('#queue thead tr th').nth(1);
    await expect(headerTask).toHaveText('Task');
    await expect(headerPriority).toHaveText('Priority');

    // Tab through controls to ensure they are focusable: task input -> priority input -> add -> process
    await pq.taskInput.focus();
    expect(await page.evaluate(() => document.activeElement.id)).toBe('taskInput');

    await pq.priorityInput.focus();
    expect(await page.evaluate(() => document.activeElement.id)).toBe('priorityInput');

    await pq.addButton.focus();
    expect(await page.evaluate(() => document.activeElement.id)).toBe('addTaskBtn');

    await pq.processButton.focus();
    expect(await page.evaluate(() => document.activeElement.id)).toBe('processTaskBtn');

    // Assert no uncaught page errors and no console errors
    const consoleErrors5 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});