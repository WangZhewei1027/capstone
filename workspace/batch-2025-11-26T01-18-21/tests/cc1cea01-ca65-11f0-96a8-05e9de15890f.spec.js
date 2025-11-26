import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1cea01-ca65-11f0-96a8-05e9de15890f.html';

test.describe('JavaScript Set Interactive Playground', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state should display ready message', async () => {
    const resultText = await page.textContent('#result');
    expect(resultText).toBe('Ready — try adding values to Set A.');
  });

  test.describe('Set A Operations', () => {
    test('Add value to Set A', async () => {
      await page.selectOption('#type-a', 'string');
      await page.fill('#value-a', 'hello');
      await page.click('#add-a');

      const resultText = await page.textContent('#result');
      expect(resultText).toContain('Added to A: "hello"');

      const listA = await page.innerHTML('#list-a');
      expect(listA).toContain('hello');
      
      const sizeA = await page.textContent('#size-a');
      expect(sizeA).toBe('size: 1');
    });

    test('Delete value from Set A', async () => {
      await page.fill('#value-a', 'hello');
      await page.click('#del-a');

      const resultText = await page.textContent('#result');
      expect(resultText).toContain('Deleted from A: "hello"');

      const listA = await page.innerHTML('#list-a');
      expect(listA).not.toContain('hello');

      const sizeA = await page.textContent('#size-a');
      expect(sizeA).toBe('size: 0');
    });

    test('Check if value exists in Set A', async () => {
      await page.fill('#value-a', 'hello');
      await page.click('#add-a'); // Add it back for checking

      await page.click('#has-a');
      const resultText = await page.textContent('#result');
      expect(resultText).toContain('A.has("hello") → true');
    });

    test('Clear Set A', async () => {
      await page.click('#clear-a');
      const resultText = await page.textContent('#result');
      expect(resultText).toBe('Cleared A');

      const sizeA = await page.textContent('#size-a');
      expect(sizeA).toBe('size: 0');
    });

    test('Convert Set A to Array', async () => {
      await page.selectOption('#type-a', 'string');
      await page.fill('#value-a', 'world');
      await page.click('#add-a');

      await page.click('#to-array-a');
      const resultText = await page.textContent('#result');
      expect(resultText).toContain('Array.from(A): ["world"]');
    });

    test('Iterate over Set A', async () => {
      await page.click('#iterate-a');
      const resultText = await page.textContent('#result');
      expect(resultText).toContain('Iterating A: world');
    });

    test('Create new object in pool', async () => {
      await page.click('#create-obj');
      const resultText = await page.textContent('#result');
      expect(resultText).toContain('Created Object{id:');
    });

    test('Add sample items to Set B', async () => {
      await page.click('#create-sample-b');
      const resultText = await page.textContent('#result');
      expect(resultText).toContain('B populated with sample items (1,2,"a","b",object)');
      
      const sizeB = await page.textContent('#size-b');
      expect(sizeB).toBe('size: 5');
    });

    test('Perform Union operation', async () => {
      await page.click('#union');
      const resultText = await page.textContent('#result');
      expect(resultText).toContain('A ∪ B');
    });

    test('Perform Intersection operation', async () => {
      await page.click('#intersection');
      const resultText = await page.textContent('#result');
      expect(resultText).toContain('A ∩ B');
    });

    test('Perform Difference operation', async () => {
      await page.click('#difference');
      const resultText = await page.textContent('#result');
      expect(resultText).toContain('A \\ B');
    });

    test('Perform Symmetric Difference operation', async () => {
      await page.click('#symmetric');
      const resultText = await page.textContent('#result');
      expect(resultText).toContain('A △ B (symmetric difference)');
    });
  });

  test.describe('Error Handling', () => {
    test('Invalid pool selection when adding to Set A', async () => {
      await page.selectOption('#type-a', 'reuseObject');
      await page.fill('#value-a', 'invalid');
      await page.click('#add-a');

      const resultText = await page.textContent('#result');
      expect(resultText).toContain('Invalid pool selection');
    });
  });
});