import { test, expect } from '@playwright/test';

class BubbleSortPage {
  constructor(page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('http://127.0.0.1:5500/workspace/11-12-0001-fsm-examples/html/9a191480-bf4c-11f0-9b6e-0d26b6a70282.html');
  }

  get generateButton() {
    return this.page.getByRole('button', { name: 'Generate New Array' }).first();
  }

  get startSortButton() {
    return this.page.getByRole('button', { name: 'Start Bubble Sort' }).first();
  }

  get stepButton() {
    return this.page.getByRole('button', { name: 'Step Forward' }).first();
  }

  get resetButton() {
    return this.page.getByRole('button', { name: 'Reset' }).first();
  }

  async getArrayValues() {
    const bars = await this.page.$$('.array-bar');
    const values = [];
    
    for (const bar of bars) {
      const height = await bar.evaluate(node => {
        const heightStyle = node.style.height;
        return parseInt(heightStyle) || parseInt(heightStyle.replace('px', ''));
      });
      values.push(height);
    }
    
    return values;
  }

  async getStatusText() {
    return this.page.textContent('.status');
  }

  async isArraySorted() {
    const values = await this.getArrayValues();
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] > values[i + 1]) return false;
    }
    return true;
  }

  async expectIdleState() {
    await expect(this.generateButton).toBeEnabled();
    await expect(this.startSortButton).toBeEnabled();
    await expect(this.stepButton).toBeDisabled();
    await expect(this.resetButton).toBeDisabled();
  }

  async expectSortingState() {
    await expect(this.generateButton).toBeDisabled();
    await expect(this.startSortButton).toBeDisabled();
    await expect(this.stepButton).toBeEnabled();
    await expect(this.resetButton).toBeEnabled();
  }

  async expectCompletedState() {
    await expect(this.generateButton).toBeEnabled();
    await expect(this.startSortButton).toBeDisabled();
    await expect(this.stepButton).toBeDisabled();
    await expect(this.resetButton).toBeEnabled();
  }
}

test.describe('Bubble Sort Visualization FSM Tests', () => {
  let bubbleSortPage;

  test.beforeEach(async ({ page }) => {
    bubbleSortPage = new BubbleSortPage(page);
    await bubbleSortPage.navigate();
  });

  test('Initial idle state with rendered array', async () => {
    // Validate initial idle state
    await bubbleSortPage.expectIdleState();
    
    // Verify array is rendered with valid values
    const initialArray = await bubbleSortPage.getArrayValues();
    expect(initialArray.length).toBeGreaterThan(0);
    initialArray.forEach(value => {
      expect(value).toBeGreaterThan(0);
    });
  });

  test('GENERATE_ARRAY event in idle state', async () => {
    // Capture initial array
    const initialArray = await bubbleSortPage.getArrayValues();
    
    // Trigger GENERATE_ARRAY event
    await bubbleSortPage.generateButton.click();
    
    // Verify still in idle state
    await bubbleSortPage.expectIdleState();
    
    // Validate new array is different
    const newArray = await bubbleSortPage.getArrayValues();
    expect(newArray).not.toEqual(initialArray);
    expect(newArray.length).toEqual(initialArray.length);
  });

  test('START_SORT transition to sorting state', async () => {
    // Trigger START_SORT event
    await bubbleSortPage.startSortButton.click();
    
    // Verify transition to sorting state
    await bubbleSortPage.expectSortingState();
  });

  test('STEP_FORWARD events during sorting', async () => {
    // Enter sorting state
    await bubbleSortPage.startSortButton.click();
    
    // Capture initial array
    const initialArray = await bubbleSortPage.getArrayValues();
    
    // Execute first step
    await bubbleSortPage.stepButton.click();
    
    // Verify still in sorting state
    await bubbleSortPage.expectSortingState();
    
    // Validate array changed
    const afterFirstStep = await bubbleSortPage.getArrayValues();
    expect(afterFirstStep).not.toEqual(initialArray);
    
    // Execute multiple steps
    for (let i = 0; i < 3; i++) {
      await bubbleSortPage.stepButton.click();
    }
    
    // Verify still in sorting state
    await bubbleSortPage.expectSortingState();
  });

  test('RESET from sorting state returns to idle', async () => {
    // Enter sorting state
    await bubbleSortPage.startSortButton.click();
    
    // Execute a few steps
    for (let i = 0; i < 2; i++) {
      await bubbleSortPage.stepButton.click();
    }
    
    // Trigger RESET event
    await bubbleSortPage.resetButton.click();
    
    // Verify return to idle state
    await bubbleSortPage.expectIdleState();
  });

  test('Complete sorting cycle to completed state', async () => {
    // Enter sorting state
    await bubbleSortPage.startSortButton.click();
    
    // Step through until completion
    while (await bubbleSortPage.stepButton.isEnabled()) {
      await bubbleSortPage.stepButton.click();
    }
    
    // Verify transition to completed state
    await bubbleSortPage.expectCompletedState();
    
    // Validate array is sorted
    const isSorted = await bubbleSortPage.isArraySorted();
    expect(isSorted).toBe(true);
    
    // Verify completion message
    const status = await bubbleSortPage.getStatusText();
    expect(status).toContain('completed');
  });

  test('GENERATE_ARRAY from completed state returns to idle', async () => {
    // Complete sorting
    await bubbleSortPage.startSortButton.click();
    while (await bubbleSortPage.stepButton.isEnabled()) {
      await bubbleSortPage.stepButton.click();
    }
    
    // Capture sorted array
    const sortedArray = await bubbleSortPage.getArrayValues();
    
    // Trigger GENERATE_ARRAY event
    await bubbleSortPage.generateButton.click();
    
    // Verify return to idle state
    await bubbleSortPage.expectIdleState();
    
    // Validate new unsorted array
    const newArray = await bubbleSortPage.getArrayValues();
    expect(newArray).not.toEqual(sortedArray);
    
    const isSorted = await bubbleSortPage.isArraySorted();
    expect(isSorted).toBe(false);
  });

  test('RESET from completed state returns to idle', async () => {
    // Complete sorting
    await bubbleSortPage.startSortButton.click();
    while (await bubbleSortPage.stepButton.isEnabled()) {
      await bubbleSortPage.stepButton.click();
    }
    
    // Trigger RESET event
    await bubbleSortPage.resetButton.click();
    
    // Verify return to idle state
    await bubbleSortPage.expectIdleState();
  });

  test('Button states persist after page reload', async () => {
    // Enter sorting state
    await bubbleSortPage.startSortButton.click();
    
    // Reload page
    await bubbleSortPage.page.reload();
    
    // Should return to idle state after reload
    await bubbleSortPage.expectIdleState();
    
    // Complete sorting workflow
    await bubbleSortPage.startSortButton.click();
    while (await bubbleSortPage.stepButton.isEnabled()) {
      await bubbleSortPage.stepButton.click();
    }
    
    // Reload page from completed state
    await bubbleSortPage.page.reload();
    
    // Should return to idle state
    await bubbleSortPage.expectIdleState();
  });
});