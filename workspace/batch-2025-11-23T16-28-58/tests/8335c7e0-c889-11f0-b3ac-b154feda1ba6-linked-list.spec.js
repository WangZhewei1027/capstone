import { test, expect } from '@playwright/test';

test.describe('Interactive Linked List Visualization', () => {
  const baseUrl = 'http://127.0.0.1:5500/workspace/batch-2025-11-23T16-28-58/html/8335c7e0-c889-11f0-b3ac-b154feda1ba6.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(baseUrl);
  });

  test('Initial state should be idle with no nodes', async ({ page }) => {
    const nodes = await page.$$('.node');
    expect(nodes.length).toBe(0);
  });

  test.describe('Adding Nodes', () => {
    test('should transition to addingNode state and back to idle after adding a node', async ({ page }) => {
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('prompt');
        await dialog.accept('Node 1');
      });

      await page.click('button:has-text("Add Node")');
      const node = await page.$('.node');
      expect(node).not.toBeNull();
      expect(await node.textContent()).toBe('Node 1');
    });

    test('should handle multiple node additions', async ({ page }) => {
      for (let i = 1; i <= 3; i++) {
        page.once('dialog', async dialog => {
          await dialog.accept(`Node ${i}`);
        });
        await page.click('button:has-text("Add Node")');
      }

      const nodes = await page.$$('.node');
      expect(nodes.length).toBe(3);
      expect(await nodes[0].textContent()).toBe('Node 1');
      expect(await nodes[1].textContent()).toBe('Node 2');
      expect(await nodes[2].textContent()).toBe('Node 3');
    });
  });

  test.describe('Removing Nodes', () => {
    test('should transition to removingNode state and back to idle after removing a node', async ({ page }) => {
      page.once('dialog', async dialog => {
        await dialog.accept('Node 1');
      });
      await page.click('button:has-text("Add Node")');

      await page.click('button:has-text("Remove Node")');
      const nodes = await page.$$('.node');
      expect(nodes.length).toBe(0);
    });

    test('should handle removing from an empty list', async ({ page }) => {
      await page.click('button:has-text("Remove Node")');
      const alertMessage = await page.evaluate(() => window.alertMessage);
      expect(alertMessage).toBe('List is empty. Nothing to remove.');
    });
  });

  test.describe('Clearing List', () => {
    test('should transition to clearingList state and back to idle after clearing the list', async ({ page }) => {
      for (let i = 1; i <= 3; i++) {
        page.once('dialog', async dialog => {
          await dialog.accept(`Node ${i}`);
        });
        await page.click('button:has-text("Add Node")');
      }

      await page.click('button:has-text("Clear List")');
      const nodes = await page.$$('.node');
      expect(nodes.length).toBe(0);
    });
  });

  test.describe('Edge Cases', () => {
    test('should not add a node if prompt is cancelled', async ({ page }) => {
      page.once('dialog', async dialog => {
        await dialog.dismiss();
      });
      await page.click('button:has-text("Add Node")');
      const nodes = await page.$$('.node');
      expect(nodes.length).toBe(0);
    });
  });
});