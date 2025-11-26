import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c881220-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Binary Search Tree Visualization Tests', () => {
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

  test('Initial state should be Idle', async () => {
    const message = await page.locator('#message').innerText();
    expect(message).toBe('');
  });

  test.describe('Insert Node Tests', () => {
    test('Insert a valid node', async () => {
      await page.fill('#valueInput', '10');
      await page.click('#insertBtn');
      const message = await page.locator('#message').innerText();
      expect(message).toBe('Inserted 10 successfully.');
    });

    test('Insert a duplicate node', async () => {
      await page.fill('#valueInput', '10');
      await page.click('#insertBtn');
      await page.fill('#valueInput', '10');
      await page.click('#insertBtn');
      const message = await page.locator('#message').innerText();
      expect(message).toBe('Value 10 already exists in the tree. Duplicates not allowed.');
    });

    test('Insert an invalid node', async () => {
      await page.fill('#valueInput', 'abc');
      await page.click('#insertBtn');
      const message = await page.locator('#message').innerText();
      expect(message).toBe('Please enter a valid number to insert.');
    });
  });

  test.describe('Delete Node Tests', () => {
    test('Delete an existing node', async () => {
      await page.fill('#valueInput', '20');
      await page.click('#insertBtn');
      await page.fill('#valueInput', '20');
      await page.click('#deleteBtn');
      const message = await page.locator('#message').innerText();
      expect(message).toBe('Deleted 20 successfully.');
    });

    test('Delete a non-existing node', async () => {
      await page.fill('#valueInput', '30');
      await page.click('#deleteBtn');
      const message = await page.locator('#message').innerText();
      expect(message).toBe('Value 30 was not found in the tree.');
    });

    test('Delete an invalid node', async () => {
      await page.fill('#valueInput', 'xyz');
      await page.click('#deleteBtn');
      const message = await page.locator('#message').innerText();
      expect(message).toBe('Please enter a valid number to delete.');
    });
  });

  test.describe('Search Node Tests', () => {
    test('Search for an existing node', async () => {
      await page.fill('#valueInput', '15');
      await page.click('#insertBtn');
      await page.fill('#valueInput', '15');
      await page.click('#searchBtn');
      const message = await page.locator('#message').innerText();
      expect(message).toBe('Value 15 found in the tree.');
    });

    test('Search for a non-existing node', async () => {
      await page.fill('#valueInput', '25');
      await page.click('#searchBtn');
      const message = await page.locator('#message').innerText();
      expect(message).toBe('Value 25 NOT found in the tree.');
    });

    test('Search with invalid input', async () => {
      await page.fill('#valueInput', 'invalid');
      await page.click('#searchBtn');
      const message = await page.locator('#message').innerText();
      expect(message).toBe('Please enter a valid number to search.');
    });
  });

  test.describe('Clear Tree Tests', () => {
    test('Clear a non-empty tree', async () => {
      await page.fill('#valueInput', '5');
      await page.click('#insertBtn');
      await page.click('#clearBtn');
      const message = await page.locator('#message').innerText();
      expect(message).toBe('Tree cleared successfully.');
    });

    test('Clear an already empty tree', async () => {
      await page.click('#clearBtn');
      const message = await page.locator('#message').innerText();
      expect(message).toBe('Tree is already empty.');
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('Insert with empty input', async () => {
      await page.fill('#valueInput', '');
      await page.click('#insertBtn');
      const message = await page.locator('#message').innerText();
      expect(message).toBe('Please enter a valid number to insert.');
    });

    test('Delete with empty input', async () => {
      await page.fill('#valueInput', '');
      await page.click('#deleteBtn');
      const message = await page.locator('#message').innerText();
      expect(message).toBe('Please enter a valid number to delete.');
    });

    test('Search with empty input', async () => {
      await page.fill('#valueInput', '');
      await page.click('#searchBtn');
      const message = await page.locator('#message').innerText();
      expect(message).toBe('Please enter a valid number to search.');
    });
  });
});