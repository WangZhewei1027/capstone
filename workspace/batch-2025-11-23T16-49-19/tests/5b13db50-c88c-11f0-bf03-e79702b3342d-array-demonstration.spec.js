import { test, expect } from '@playwright/test';

test.describe('Array Demonstration FSM Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/batch-2025-11-23T16-49-19/html/5b13db50-c88c-11f0-bf03-e79702b3342d.html');
  });

  test('Initial state should be idle', async ({ page }) => {
    // Verify initial state is idle
    const output = await page.$('#output');
    const operationsOutput = await page.$('#operationsOutput');
    const iterateOutput = await page.$('#iterateOutput');

    expect(await output.textContent()).toBe('');
    expect(await operationsOutput.textContent()).toBe('');
    expect(await iterateOutput.textContent()).toBe('');
  });

  test.describe('Displaying Array State', () => {
    test('Transition to displayingArray state and back to idle', async ({ page }) => {
      // Trigger SHOW_ARRAY_CLICKED event
      await page.click('button[onclick="displayArray()"]');

      // Verify displayingArray state
      const output = await page.$('#output');
      expect(await output.textContent()).toBe('fruits = ["Apple", "Banana", "Cherry", "Date", "Elderberry"]');

      // Simulate SHOW_ARRAY_COMPLETE event (return to idle)
      await page.evaluate(() => {
        const event = new Event('SHOW_ARRAY_COMPLETE');
        document.dispatchEvent(event);
      });

      // Verify return to idle state
      expect(await output.textContent()).toBe('fruits = ["Apple", "Banana", "Cherry", "Date", "Elderberry"]');
    });
  });

  test.describe('Performing Operations State', () => {
    test('Transition to performingOperations state and back to idle', async ({ page }) => {
      // Trigger PERFORM_OPERATIONS_CLICKED event
      await page.click('button[onclick="arrayOperations()"]');

      // Verify performingOperations state
      const operationsOutput = await page.$('#operationsOutput');
      const expectedOperationsOutput = [
        'Original array: [Apple, Banana, Cherry, Date, Elderberry]',
        'After push(\'Fig\'): [Apple, Banana, Cherry, Date, Elderberry, Fig]',
        'After pop(): removed "Fig", array is [Apple, Banana, Cherry, Date, Elderberry]',
        'After shift(): removed "Apple", array is [Banana, Cherry, Date, Elderberry]',
        'After unshift(\'Apricot\'): [Apricot, Banana, Cherry, Date, Elderberry]',
        'After splice(2, 1, \'Blueberry\', \'Cantaloupe\'): removed "Cherry", array is [Apricot, Banana, Blueberry, Cantaloupe, Date, Elderberry]'
      ].join('\n');
      expect(await operationsOutput.textContent()).toBe(expectedOperationsOutput);

      // Simulate OPERATIONS_COMPLETE event (return to idle)
      await page.evaluate(() => {
        const event = new Event('OPERATIONS_COMPLETE');
        document.dispatchEvent(event);
      });

      // Verify return to idle state
      expect(await operationsOutput.textContent()).toBe(expectedOperationsOutput);
    });
  });

  test.describe('Iterating Array State', () => {
    test('Transition to iteratingArray state and back to idle', async ({ page }) => {
      // Trigger ITERATE_ARRAY_CLICKED event
      await page.click('button[onclick="iterateArray()"]');

      // Verify iteratingArray state
      const iterateOutput = await page.$('#iterateOutput');
      const expectedIterateOutput = [
        'forEach - list fruit and their length:',
        'Index 0: Apple (5 chars)',
        'Index 1: Banana (6 chars)',
        'Index 2: Cherry (6 chars)',
        'Index 3: Date (4 chars)',
        'Index 4: Elderberry (10 chars)',
        '',
        'map - create array of uppercase fruits:',
        '[APPLE, BANANA, CHERRY, DATE, ELDERBERRY]'
      ].join('\n');
      expect(await iterateOutput.textContent()).toBe(expectedIterateOutput);

      // Simulate ITERATION_COMPLETE event (return to idle)
      await page.evaluate(() => {
        const event = new Event('ITERATION_COMPLETE');
        document.dispatchEvent(event);
      });

      // Verify return to idle state
      expect(await iterateOutput.textContent()).toBe(expectedIterateOutput);
    });
  });
});