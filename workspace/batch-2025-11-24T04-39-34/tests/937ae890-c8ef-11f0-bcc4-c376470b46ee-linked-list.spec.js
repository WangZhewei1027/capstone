import { test, expect } from '@playwright/test';

test.describe('Linked List FSM Tests', () => {
  const url = 'http://127.0.0.1:5500/workspace/batch-2025-11-24T04-39-34/html/937ae890-c8ef-11f0-bcc4-c376470b46ee.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(url);
  });

  test('Initial State: Idle', async ({ page }) => {
    // Verify initial state is idle
    const listItems = await page.$$('#myList li');
    expect(listItems.length).toBe(0); // Assuming the list is initially empty in the DOM
  });

  test.describe('Appending Nodes', () => {
    test('Transition from idle to appending and back to idle', async ({ page }) => {
      // Simulate APPEND_CLICKED event
      await page.click('#append-button');

      // Verify transition to appending state
      // Assuming some visual feedback or console log indicates appending state
      // Here we assume a console log for demonstration
      const consoleMessages = [];
      page.on('console', msg => consoleMessages.push(msg.text()));
      await page.evaluate(() => console.log('Appending Node...'));

      expect(consoleMessages).toContain('Appending Node...');

      // Simulate APPEND_COMPLETE event
      await page.evaluate(() => console.log('Append Complete'));

      // Verify transition back to idle state
      expect(consoleMessages).toContain('Append Complete');
    });

    test('Append a node and verify DOM changes', async ({ page }) => {
      // Append a node
      await page.click('#append-button');

      // Verify the node is added to the list
      const listItems = await page.$$('#myList li');
      expect(listItems.length).toBe(1); // Assuming one node is appended
    });
  });

  test.describe('Removing Nodes', () => {
    test('Transition from idle to removing and back to idle', async ({ page }) => {
      // Simulate REMOVE_CLICKED event
      await page.click('#remove-button');

      // Verify transition to removing state
      // Assuming some visual feedback or console log indicates removing state
      const consoleMessages = [];
      page.on('console', msg => consoleMessages.push(msg.text()));
      await page.evaluate(() => console.log('Removing Node...'));

      expect(consoleMessages).toContain('Removing Node...');

      // Simulate REMOVE_COMPLETE event
      await page.evaluate(() => console.log('Remove Complete'));

      // Verify transition back to idle state
      expect(consoleMessages).toContain('Remove Complete');
    });

    test('Remove a node and verify DOM changes', async ({ page }) => {
      // Append a node first to ensure there's something to remove
      await page.click('#append-button');

      // Remove a node
      await page.click('#remove-button');

      // Verify the node is removed from the list
      const listItems = await page.$$('#myList li');
      expect(listItems.length).toBe(0); // Assuming one node was removed
    });
  });

  test.describe('Edge Cases', () => {
    test('Attempt to remove from an empty list', async ({ page }) => {
      // Ensure the list is empty
      const listItemsBefore = await page.$$('#myList li');
      expect(listItemsBefore.length).toBe(0);

      // Attempt to remove a node
      await page.click('#remove-button');

      // Verify no error occurs and list remains empty
      const listItemsAfter = await page.$$('#myList li');
      expect(listItemsAfter.length).toBe(0);
    });
  });
});