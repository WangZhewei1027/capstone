import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0f492-cd2f-11f0-a440-159d7b77af86.html';

// Page Object for the Priority Queue application
class PriorityQueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.taskInput = page.locator('#task-input');
    this.prioritySelect = page.locator('#priority-input');
    this.addButton = page.locator('button', { hasText: 'Add Task' });
    this.dequeueButton = page.locator('button', { hasText: 'Dequeue Task' });
    this.queueContainer = page.locator('#queue-tasks');
    this.taskItems = () => this.queueContainer.locator('.task');
  }

  // Navigate to the app page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill task name
  async fillTaskName(name) {
    await this.taskInput.fill(name);
  }

  // Select priority by value (string or number)
  async selectPriority(value) {
    await this.prioritySelect.selectOption(String(value));
  }

  // Click Add Task (enqueue)
  async clickAdd() {
    await this.addButton.click();
  }

  // Click Dequeue Task
  async clickDequeue() {
    await this.dequeueButton.click();
  }

  // Add a task (without expecting an alert). Use when task name non-empty.
  async addTask(name, priority = 1) {
    await this.fillTaskName(name);
    await this.selectPriority(priority);
    await this.clickAdd();
  }

  // Read text contents of all tasks in the queue in DOM order
  async getTaskTexts() {
    const count = await this.taskItems().count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.taskItems().nth(i).textContent());
    }
    return texts;
  }

  // Number of tasks displayed
  async taskCount() {
    return this.taskItems().count();
  }

  // Get value of the priority select
  async getSelectedPriority() {
    return this.prioritySelect.inputValue();
  }

  // Get placeholder of input
  async getInputPlaceholder() {
    return this.taskInput.getAttribute('placeholder');
  }

  // Clear the input explicitly
  async clearInput() {
    await this.taskInput.fill('');
  }

  // Get the value of the text input
  async getInputValue() {
    return this.taskInput.inputValue();
  }
}

test.describe('Priority Queue Demo - End-to-end', () => {
  // We'll capture any console errors and page errors to assert none occurred unexpectedly.
  test.beforeEach(async ({ page }) => {
    // No-op here; individual tests set up listeners and navigate via page object.
  });

  test.describe('Initial load and UI checks', () => {
    test('Initial page load shows controls and empty queue', async ({ page }) => {
      // Purpose: Verify initial DOM state: inputs, selects, buttons, and empty queue.
      const consoleErrors = [];
      const pageErrors = [];

      // Capture console.error messages
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Capture runtime page errors
      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
      });

      const pq = new PriorityQueuePage(page);
      await pq.goto();

      // Controls exist
      await expect(pq.taskInput).toBeVisible();
      await expect(pq.prioritySelect).toBeVisible();
      await expect(pq.addButton).toBeVisible();
      await expect(pq.dequeueButton).toBeVisible();

      // Default values and placeholders
      expect(await pq.getInputPlaceholder()).toBe('Task Name');
      expect(await pq.getSelectedPriority()).toBe('1'); // default Low Priority

      // Queue should be empty initially
      expect(await pq.taskCount()).toBe(0);
      const texts = await pq.getTaskTexts();
      expect(texts).toEqual([]);

      // No console errors or page errors occurred during load
      expect(consoleErrors, 'No console.error messages should appear').toEqual([]);
      expect(pageErrors, 'No uncaught page errors should occur').toEqual([]);
    });
  });

  test.describe('Task operations and ordering', () => {
    test('Adding a single task displays it in the queue and clears input', async ({ page }) => {
      // Purpose: Verify enqueue with valid input updates DOM correctly and clears input field.
      const consoleErrors = [];
      const pageErrors = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const pq = new PriorityQueuePage(page);
      await pq.goto();

      // Add a task with medium priority (2)
      await pq.addTask('Task A', 2);

      // Ensure one task displayed with expected text
      expect(await pq.taskCount()).toBe(1);
      const texts = await pq.getTaskTexts();
      expect(texts[0]).toContain('Task: Task A');
      expect(texts[0]).toContain('Priority: 2');

      // Input should be cleared after successful enqueue
      expect(await pq.getInputValue()).toBe('');

      // No console or page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Tasks are ordered by descending priority (High -> Medium -> Low)', async ({ page }) => {
      // Purpose: Verify that the PriorityQueue sorts tasks by priority descending.
      const consoleErrors = [];
      const pageErrors = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const pq = new PriorityQueuePage(page);
      await pq.goto();

      // Add three tasks with different priorities
      await pq.addTask('Low Task', 1);
      await pq.addTask('High Task', 3);
      await pq.addTask('Mid Task', 2);

      // Expect order: High Task (3), Mid Task (2), Low Task (1)
      const texts = await pq.getTaskTexts();
      expect(texts.length).toBe(3);
      expect(texts[0]).toContain('Task: High Task');
      expect(texts[0]).toContain('Priority: 3');
      expect(texts[1]).toContain('Task: Mid Task');
      expect(texts[1]).toContain('Priority: 2');
      expect(texts[2]).toContain('Task: Low Task');
      expect(texts[2]).toContain('Priority: 1');

      // No console or page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Dequeue behavior and alerts', () => {
    test('Dequeue removes highest priority and shows alert with task details', async ({ page }) => {
      // Purpose: Ensure dequeue pops highest priority item, triggers alert with details, and updates DOM.
      const consoleErrors = [];
      const pageErrors = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const pq = new PriorityQueuePage(page);
      await pq.goto();

      // Add multiple tasks
      await pq.addTask('Task One', 1);
      await pq.addTask('Task Two', 3); // highest
      await pq.addTask('Task Three', 2);

      // Prepare to capture the alert dialog
      let capturedDialogText = '';
      page.once('dialog', async (dialog) => {
        capturedDialogText = dialog.message();
        await dialog.accept();
      });

      // Click Dequeue - should remove 'Task Two' (priority 3)
      await pq.clickDequeue();

      // Verify dialog content
      expect(capturedDialogText).toContain('Dequeued Task: Task Two');
      expect(capturedDialogText).toContain('Priority: 3');

      // After dequeue, Task Two should no longer be present; remaining order should be Task Three (2), Task One (1)
      const textsAfter = await pq.getTaskTexts();
      expect(textsAfter.length).toBe(2);
      expect(textsAfter[0]).toContain('Task: Task Three');
      expect(textsAfter[1]).toContain('Task: Task One');

      // No console or page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Dequeue on empty queue alerts "No task to dequeue."', async ({ page }) => {
      // Purpose: Ensure user is alerted when attempting to dequeue from an empty queue.
      const consoleErrors = [];
      const pageErrors = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const pq = new PriorityQueuePage(page);
      await pq.goto();

      // Ensure queue is empty
      expect(await pq.taskCount()).toBe(0);

      // Capture dialog
      let dialogText = '';
      page.once('dialog', async (dialog) => {
        dialogText = dialog.message();
        await dialog.accept();
      });

      await pq.clickDequeue();

      // Validate alert text
      expect(dialogText).toBe('No task to dequeue.');

      // Queue should still be empty
      expect(await pq.taskCount()).toBe(0);

      // No console or page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Validation and edge cases', () => {
    test('Enqueue with empty task name shows alert and does not add a task', async ({ page }) => {
      // Purpose: Verify validation prevents adding empty task names and shows an alert.
      const consoleErrors = [];
      const pageErrors = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(err.message));

      const pq = new PriorityQueuePage(page);
      await pq.goto();

      // Ensure input empty
      await pq.clearInput();
      expect(await pq.getInputValue()).toBe('');

      // Prepare to capture the alert
      let dialogText = '';
      page.once('dialog', async (dialog) => {
        dialogText = dialog.message();
        await dialog.accept();
      });

      // Click Add Task with empty input
      await pq.clickAdd();

      // Validate alert text and no new task added
      expect(dialogText).toBe('Please enter a task name.');
      expect(await pq.taskCount()).toBe(0);

      // No console or page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });
});