import { test, expect } from '@playwright/test';

class HeapPage {
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/10-28-0006/html/5736e9c0-b408-11f0-ab52-fbe7249bf639.html';
    this.heap = this.page.locator('#heap');
    this.input = this.page.locator('#nodeValue');
    this.insertButton = this.page.locator('#insertNode');
    this.feedback = this.page.locator('#feedback');
    this.nodes = this.page.locator('#heap .node');
  }

  async goto() {
    await this.page.goto(this.url);
    await expect(this.page).toHaveTitle(/Min\/Max Heap Interactive Module/i);
  }

  async focusInput() {
    await this.input.focus();
  }

  async blurInput() {
    // Clicking outside the input to trigger blur
    await this.page.locator('h1').click();
  }

  async fillInput(value) {
    await this.input.fill(String(value));
  }

  async clickInsert() {
    await this.insertButton.click();
  }

  async getFeedbackText() {
    return (await this.feedback.textContent())?.trim() || '';
  }

  async getInputValue() {
    return await this.input.inputValue();
  }

  async getNodesTexts() {
    const texts = await this.nodes.allInnerTexts();
    return texts.map(t => t.trim());
  }

  async getNodesNumbers() {
    const texts = await this.getNodesTexts();
    return texts.map(t => parseInt(t, 10)).filter(n => !Number.isNaN(n));
  }

  async getRootValue() {
    const count = await this.nodes.count();
    if (count === 0) return null;
    const text = (await this.nodes.nth(0).textContent())?.trim();
    return text !== undefined && text !== null && text !== '' ? parseInt(text, 10) : null;
  }

  async countNodes() {
    return await this.nodes.count();
  }

  async assertFeedbackContains(substring) {
    await expect(this.feedback).toContainText(substring);
  }

  async assertFeedbackEmpty() {
    await expect(this.feedback).toHaveText('');
  }

  async reload() {
    await this.page.reload();
  }
}

test.describe('Min/Max Heap Interactive Module FSM - idle and editing_input states', () => {
  test.beforeEach(async ({ page }) => {
    const heapPage = new HeapPage(page);
    await heapPage.goto();
  });

  test('Initial idle state: heap empty, input empty, feedback empty', async ({ page }) => {
    // Validates FSM: initial "idle" state visual indicators
    const heapPage = new HeapPage(page);

    await expect(heapPage.nodes).toHaveCount(0);
    await expect(heapPage.input).toHaveAttribute('placeholder', 'Enter a value');
    await heapPage.assertFeedbackEmpty();
    const inputValue = await heapPage.getInputValue();
    expect(inputValue).toBe('');
  });

  test('Transition: INPUT_FOCUS -> editing_input, INPUT_CHANGE keeps editing_input, INPUT_BLUR -> idle (no side effects)', async ({ page }) => {
    // Validates FSM transitions between idle and editing_input without committing any insertion
    const heapPage = new HeapPage(page);

    // INPUT_FOCUS to editing_input
    await heapPage.focusInput();
    await expect(heapPage.input).toBeFocused();

    // INPUT_CHANGE stays in editing_input
    await heapPage.fillInput('12');
    await expect(heapPage.input).toHaveValue('12');

    // INPUT_BLUR returns to idle; verify no heap changes or feedback
    await heapPage.blurInput();
    await expect(heapPage.nodes).toHaveCount(0);
    await heapPage.assertFeedbackEmpty();
    // Input value remains until clearing_input occurs post-insert; here input remains '12'
    const val = await heapPage.getInputValue();
    expect(val).toBe('12');
  });
});

test.describe('Validation and error_feedback state with invalid inputs', () => {
  test.beforeEach(async ({ page }) => {
    const heapPage = new HeapPage(page);
    await heapPage.goto();
  });

  test('CLICK_INSERT with empty input triggers validating_input -> error_feedback and shows error message', async ({ page }) => {
    // Validates FSM: idle -> validating_input -> error_feedback on INVALID_NUMBER
    const heapPage = new HeapPage(page);

    // Ensure input is empty
    await heapPage.fillInput('');
    await heapPage.clickInsert();

    await heapPage.assertFeedbackContains('Please enter a valid number.');
    await expect(heapPage.nodes).toHaveCount(0);
  });

  test('From error_feedback, INPUT_CHANGE then CLICK_INSERT with valid number leads to success path', async ({ page }) => {
    // Validates FSM: error_feedback -> editing_input (on INPUT_CHANGE) -> validating_input -> inserting_value -> heapify -> rendering -> success_feedback -> clearing_input -> idle
    const heapPage = new HeapPage(page);

    // Trigger error
    await heapPage.fillInput('');
    await heapPage.clickInsert();
    await heapPage.assertFeedbackContains('Please enter a valid number.');

    // INPUT_CHANGE to editing_input
    await heapPage.fillInput('42');
    // Click insert to validate and proceed
    await heapPage.clickInsert();

    // Success feedback
    await heapPage.assertFeedbackContains('Inserted 42');
    // Heap should have 1 node with 42
    await expect(heapPage.nodes).toHaveCount(1);
    const root = await heapPage.getRootValue();
    expect(root).toBe(42);

    // Input should be cleared by clearing_input
    const val = await heapPage.getInputValue();
    expect(val).toBe('');
  });

  test('CLICK_INSERT with invalid content (still empty/invalid) remains in error_feedback', async ({ page }) => {
    // Validates FSM: error_feedback loop on repeated CLICK_INSERT without valid input
    const heapPage = new HeapPage(page);

    // Trigger error
    await heapPage.fillInput('');
    await heapPage.clickInsert();
    await heapPage.assertFeedbackContains('Please enter a valid number.');

    // Click insert again with empty input still invalid
    await heapPage.clickInsert();
    await heapPage.assertFeedbackContains('Please enter a valid number.');
    await expect(heapPage.nodes).toHaveCount(0);
  });
});

test.describe('Heap insertion, heapify compare/swap and rendering', () => {
  test.beforeEach(async ({ page }) => {
    const heapPage = new HeapPage(page);
    await heapPage.goto();
  });

  test('Heapify swap occurs when new value should move above parent; no-swap when appropriate', async ({ page }) => {
    // Validates FSM: validating_input -> inserting_value (pushToHeap) -> heapify_compare (compareWithParent)
    // Path 1: SHOULD_SWAP -> heapify_swap -> SWAP_DONE -> heapify_compare ... -> HEAPIFY_DONE -> rendering -> success_feedback -> clearing_input
    // Path 2: HEAPIFY_DONE directly without swap
    const heapPage = new HeapPage(page);

    // Case A: Insert 10 then 5, detect heap type based on root
    await heapPage.fillInput('10');
    await heapPage.clickInsert();
    await heapPage.assertFeedbackContains('Inserted 10');

    await heapPage.fillInput('5');
    await heapPage.clickInsert();
    await heapPage.assertFeedbackContains('Inserted 5');

    const rootAfterTwo = await heapPage.getRootValue();
    const isMinHeap = rootAfterTwo === 5;

    // Reset to test both swap and no-swap cleanly
    await heapPage.reload();

    if (isMinHeap) {
      // Min-heap detected: smaller values promote (swap)
      await heapPage.fillInput('10');
      await heapPage.clickInsert();
      await heapPage.assertFeedbackContains('Inserted 10');
      expect(await heapPage.getRootValue()).toBe(10);

      // Insert smaller -> should swap to root
      await heapPage.fillInput('5');
      await heapPage.clickInsert();
      await heapPage.assertFeedbackContains('Inserted 5');
      expect(await heapPage.getRootValue()).toBe(5);
      await expect(heapPage.nodes).toHaveCount(2);

      // Insert larger -> no swap; root stays 5
      await heapPage.fillInput('20');
      await heapPage.clickInsert();
      await heapPage.assertFeedbackContains('Inserted 20');
      expect(await heapPage.getRootValue()).toBe(5);
      const texts = await heapPage.getNodesTexts();
      expect(texts).toContain('20');
      await expect(heapPage.nodes).toHaveCount(3);
    } else {
      // Max-heap detected: larger values promote (swap)
      await heapPage.fillInput('10');
      await heapPage.clickInsert();
      await heapPage.assertFeedbackContains('Inserted 10');
      expect(await heapPage.getRootValue()).toBe(10);

      // Insert smaller -> no swap; root stays 10
      await heapPage.fillInput('5');
      await heapPage.clickInsert();
      await heapPage.assertFeedbackContains('Inserted 5');
      expect(await heapPage.getRootValue()).toBe(10);
      await expect(heapPage.nodes).toHaveCount(2);

      // Insert larger -> should swap to root
      await heapPage.fillInput('20');
      await heapPage.clickInsert();
      await heapPage.assertFeedbackContains('Inserted 20');
      expect(await heapPage.getRootValue()).toBe(20);
      const texts = await heapPage.getNodesTexts();
      expect(texts).toContain('5');
      await expect(heapPage.nodes).toHaveCount(3);
    }

    // After each valid insertion, input should be cleared automatically
    expect(await heapPage.getInputValue()).toBe('');
  });

  test('Heapify_swap may loop through multiple levels until heapify_compare signals HEAPIFY_DONE', async ({ page }) => {
    // Validates FSM: repetitive swap path until heap property restored, then rendering and success feedback
    const heapPage = new HeapPage(page);

    // Detect heap type quickly
    await heapPage.fillInput('10');
    await heapPage.clickInsert();
    await heapPage.fillInput('5');
    await heapPage.clickInsert();
    const isMinHeap = (await heapPage.getRootValue()) === 5;

    // Reset
    await heapPage.reload();

    if (isMinHeap) {
      // Build deeper heap then insert a very small value to bubble up multiple swaps
      const base = [50, 40, 30, 20, 10];
      for (const v of base) {
        await heapPage.fillInput(String(v));
        await heapPage.clickInsert();
        await heapPage.assertFeedbackContains(`Inserted ${v}`);
      }
      await expect(heapPage.nodes).toHaveCount(base.length);

      // Insert 5 to trigger multiple swaps
      await heapPage.fillInput('5');
      await heapPage.clickInsert();
      await heapPage.assertFeedbackContains('Inserted 5');
      expect(await heapPage.getRootValue()).toBe(5);
      await expect(heapPage.nodes).toHaveCount(base.length + 1);
    } else {
      // Max-heap: build deeper heap then insert a very large value to bubble up
      const base = [10, 20, 30, 40, 50];
      for (const v of base) {
        await heapPage.fillInput(String(v));
        await heapPage.clickInsert();
        await heapPage.assertFeedbackContains(`Inserted ${v}`);
      }
      await expect(heapPage.nodes).toHaveCount(base.length);

      // Insert 100 to trigger multiple swaps
      await heapPage.fillInput('100');
      await heapPage.clickInsert();
      await heapPage.assertFeedbackContains('Inserted 100');
      expect(await heapPage.getRootValue()).toBe(100);
      await expect(heapPage.nodes).toHaveCount(base.length + 1);
    }
  });
});

test.describe('Rendering correctness, edge cases, and success_feedback/clearing_input', () => {
  test.beforeEach(async ({ page }) => {
    const heapPage = new HeapPage(page);
    await heapPage.goto();
  });

  test('Decimal input is parsed via validateInput (parseInt) and rendered; success_feedback shows inserted integer', async ({ page }) => {
    // Validates FSM: validating_input onEnter validateInput parseInt; ensures decimals truncated to int
    const heapPage = new HeapPage(page);

    await heapPage.fillInput('3.14');
    await heapPage.clickInsert();

    await heapPage.assertFeedbackContains('Inserted 3');
    const numbers = await heapPage.getNodesNumbers();
    expect(numbers).toContain(3);
    expect(await heapPage.getInputValue()).toBe('');
  });

  test('Negative and zero values are accepted and rendered; heap root reflects heap type', async ({ page }) => {
    // Validates correct handling of edge cases and rendering
    const heapPage = new HeapPage(page);

    await heapPage.fillInput('0');
    await heapPage.clickInsert();
    await heapPage.assertFeedbackContains('Inserted 0');

    await heapPage.fillInput('-1');
    await heapPage.clickInsert();
    await heapPage.assertFeedbackContains('Inserted -1');

    const texts = await heapPage.getNodesTexts();
    expect(texts).toContain('0');
    expect(texts).toContain('-1');

    const root = await heapPage.getRootValue();
    // Root expected: -1 for min-heap, otherwise could be 0 for max-heap
    expect([-1, 0]).toContain(root);
  });

  test('Duplicate values are rendered as separate nodes and count increases accordingly', async ({ page }) => {
    // Validates rendering of duplicates and success_feedback each time
    const heapPage = new HeapPage(page);

    await heapPage.fillInput('7');
    await heapPage.clickInsert();
    await heapPage.assertFeedbackContains('Inserted 7');

    await heapPage.fillInput('7');
    await heapPage.clickInsert();
    await heapPage.assertFeedbackContains('Inserted 7');

    await expect(heapPage.nodes).toHaveCount(2);
    const texts = await heapPage.getNodesTexts();
    const sevens = texts.filter(t => t === '7').length;
    expect(sevens).toBe(2);
  });

  test('Very large number insertion displays correct feedback and updates DOM', async ({ page }) => {
    // Validates robustness: large integer values
    const heapPage = new HeapPage(page);

    const big = 999999999;
    await heapPage.fillInput(String(big));
    await heapPage.clickInsert();
    await heapPage.assertFeedbackContains(`Inserted ${big}`);

    const numbers = await heapPage.getNodesNumbers();
    expect(numbers).toContain(big);
    expect(await heapPage.getInputValue()).toBe('');
  });

  test('Input blur from editing_input returns to idle with no unintended side effects', async ({ page }) => {
    // Validates FSM: editing_input -> idle via INPUT_BLUR; no rendering or feedback changes without insert
    const heapPage = new HeapPage(page);

    await heapPage.focusInput();
    await heapPage.fillInput('123');
    await heapPage.blurInput();

    await expect(heapPage.nodes).toHaveCount(0);
    // Feedback remains empty
    await heapPage.assertFeedbackEmpty();

    // Clicking insert now should insert and show success_feedback
    await heapPage.clickInsert();
    await heapPage.assertFeedbackContains('Inserted 123');
    await expect(heapPage.nodes).toHaveCount(1);
    expect(await heapPage.getRootValue()).toBe(123);
    expect(await heapPage.getInputValue()).toBe('');
  });
});

// Additional grouping to explicitly validate success_feedback and clearing_input behavior consistently
test.describe('Success feedback and input clearing after each valid insertion', () => {
  test.beforeEach(async ({ page }) => {
    const heapPage = new HeapPage(page);
    await heapPage.goto();
  });

  test('Each valid insertion shows success feedback and clears input field', async ({ page }) => {
    // Validates FSM: rendering -> success_feedback (onEnter showSuccessFeedback) -> FEEDBACK_SHOWN -> clearing_input (onEnter clearInputField)
    const heapPage = new HeapPage(page);

    const values = [9, 2, 11];
    for (const v of values) {
      await heapPage.fillInput(String(v));
      await heapPage.clickInsert();
      await heapPage.assertFeedbackContains(`Inserted ${v}`);
      expect(await heapPage.getInputValue()).toBe('');
    }

    await expect(heapPage.nodes).toHaveCount(values.length);
    const numbers = await heapPage.getNodesNumbers();
    for (const v of values) {
      expect(numbers).toContain(v);
    }
  });
});