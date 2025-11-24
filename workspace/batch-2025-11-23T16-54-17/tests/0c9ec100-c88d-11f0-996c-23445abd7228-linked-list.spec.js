import { test, expect } from '@playwright/test';

test.describe('Linked List Application', () => {
  const url = 'http://127.0.0.1:5500/workspace/batch-2025-11-23T16-54-17/html/0c9ec100-c88d-11f0-996c-23445abd7228.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(url);
  });

  test('Initial state should be empty', async ({ page }) => {
    const visualization = await page.locator('#visualization');
    await expect(visualization).toHaveText('(empty list)');
  });

  test.describe('Append and Prepend operations', () => {
    test('Append operation should add a node to the end', async ({ page }) => {
      await page.fill('#value-input', '10');
      await page.click('#append-btn');
      const nodes = await page.locator('.node');
      await expect(nodes).toHaveCount(1);
      await expect(nodes.first()).toHaveText('10');
    });

    test('Prepend operation should add a node to the start', async ({ page }) => {
      await page.fill('#value-input', '20');
      await page.click('#prepend-btn');
      const nodes = await page.locator('.node');
      await expect(nodes).toHaveCount(1);
      await expect(nodes.first()).toHaveText('20');
    });
  });

  test.describe('Insert and Remove operations', () => {
    test('Insert operation should add a node at specified index', async ({ page }) => {
      await page.fill('#value-input', '30');
      await page.click('#append-btn');
      await page.fill('#value-input', '40');
      await page.click('#append-btn');
      await page.fill('#value-input', '35');
      await page.fill('#index-input', '1');
      await page.click('#insert-btn');
      const nodes = await page.locator('.node');
      await expect(nodes).toHaveCount(3);
      await expect(nodes.nth(1)).toHaveText('35');
    });

    test('Remove operation should delete a node at specified index', async ({ page }) => {
      await page.fill('#value-input', '50');
      await page.click('#append-btn');
      await page.fill('#value-input', '60');
      await page.click('#append-btn');
      await page.fill('#index-input', '0');
      await page.click('#remove-btn');
      const nodes = await page.locator('.node');
      await expect(nodes).toHaveCount(1);
      await expect(nodes.first()).toHaveText('60');
    });
  });

  test.describe('Pop and Shift operations', () => {
    test('Pop operation should remove the last node', async ({ page }) => {
      await page.fill('#value-input', '70');
      await page.click('#append-btn');
      await page.fill('#value-input', '80');
      await page.click('#append-btn');
      await page.click('#pop-btn');
      const nodes = await page.locator('.node');
      await expect(nodes).toHaveCount(1);
      await expect(nodes.first()).toHaveText('70');
    });

    test('Shift operation should remove the first node', async ({ page }) => {
      await page.fill('#value-input', '90');
      await page.click('#append-btn');
      await page.fill('#value-input', '100');
      await page.click('#append-btn');
      await page.click('#shift-btn');
      const nodes = await page.locator('.node');
      await expect(nodes).toHaveCount(1);
      await expect(nodes.first()).toHaveText('100');
    });
  });

  test.describe('Clear operation', () => {
    test('Clear operation should empty the list', async ({ page }) => {
      await page.fill('#value-input', '110');
      await page.click('#append-btn');
      await page.fill('#value-input', '120');
      await page.click('#append-btn');
      await page.click('#clear-btn');
      const visualization = await page.locator('#visualization');
      await expect(visualization).toHaveText('(empty list)');
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Insert with invalid index should show error', async ({ page }) => {
      await page.fill('#value-input', '130');
      await page.fill('#index-input', '5');
      await page.click('#insert-btn');
      const status = await page.locator('#status');
      await expect(status).toHaveText('Index out of bounds. List length is 0.');
    });

    test('Remove with invalid index should show error', async ({ page }) => {
      await page.fill('#index-input', '0');
      await page.click('#remove-btn');
      const status = await page.locator('#status');
      await expect(status).toHaveText('Index out of bounds. List length is 0.');
    });

    test('Pop on empty list should show error', async ({ page }) => {
      await page.click('#pop-btn');
      const status = await page.locator('#status');
      await expect(status).toHaveText('List is empty, nothing to pop.');
    });

    test('Shift on empty list should show error', async ({ page }) => {
      await page.click('#shift-btn');
      const status = await page.locator('#status');
      await expect(status).toHaveText('List is empty, nothing to remove from start.');
    });
  });
});