import { test, expect } from '@playwright/test';

test.describe('Deque Application FSM Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/batch-2025-11-23T16-49-19/html/70efb660-c88c-11f0-bf03-e79702b3342d.html');
  });

  test('Initial state should be empty', async ({ page }) => {
    const dequeContainer = await page.locator('#dequeContainer');
    await expect(dequeContainer).toContainText('(empty)');
    const popFrontBtn = await page.locator('#popFrontBtn');
    const popBackBtn = await page.locator('#popBackBtn');
    await expect(popFrontBtn).toBeDisabled();
    await expect(popBackBtn).toBeDisabled();
  });

  test.describe('State transitions from empty to not_empty', () => {
    test('PUSH_FRONT event should transition to not_empty', async ({ page }) => {
      await page.fill('#elementInput', 'A');
      await page.click('#pushFrontBtn');
      const dequeContainer = await page.locator('#dequeContainer');
      await expect(dequeContainer).toContainText('A');
      const popFrontBtn = await page.locator('#popFrontBtn');
      const popBackBtn = await page.locator('#popBackBtn');
      await expect(popFrontBtn).not.toBeDisabled();
      await expect(popBackBtn).not.toBeDisabled();
    });

    test('PUSH_BACK event should transition to not_empty', async ({ page }) => {
      await page.fill('#elementInput', 'B');
      await page.click('#pushBackBtn');
      const dequeContainer = await page.locator('#dequeContainer');
      await expect(dequeContainer).toContainText('B');
      const popFrontBtn = await page.locator('#popFrontBtn');
      const popBackBtn = await page.locator('#popBackBtn');
      await expect(popFrontBtn).not.toBeDisabled();
      await expect(popBackBtn).not.toBeDisabled();
    });
  });

  test.describe('State transitions within not_empty', () => {
    test.beforeEach(async ({ page }) => {
      await page.fill('#elementInput', 'A');
      await page.click('#pushFrontBtn');
    });

    test('POP_FRONT event should transition to check_empty', async ({ page }) => {
      await page.click('#popFrontBtn');
      const dequeContainer = await page.locator('#dequeContainer');
      await expect(dequeContainer).toContainText('(empty)');
      const popFrontBtn = await page.locator('#popFrontBtn');
      const popBackBtn = await page.locator('#popBackBtn');
      await expect(popFrontBtn).toBeDisabled();
      await expect(popBackBtn).toBeDisabled();
    });

    test('POP_BACK event should transition to check_empty', async ({ page }) => {
      await page.click('#popBackBtn');
      const dequeContainer = await page.locator('#dequeContainer');
      await expect(dequeContainer).toContainText('(empty)');
      const popFrontBtn = await page.locator('#popFrontBtn');
      const popBackBtn = await page.locator('#popBackBtn');
      await expect(popFrontBtn).toBeDisabled();
      await expect(popBackBtn).toBeDisabled();
    });

    test('CLEAR event should transition to empty', async ({ page }) => {
      await page.click('#clearBtn');
      const dequeContainer = await page.locator('#dequeContainer');
      await expect(dequeContainer).toContainText('(empty)');
      const popFrontBtn = await page.locator('#popFrontBtn');
      const popBackBtn = await page.locator('#popBackBtn');
      await expect(popFrontBtn).toBeDisabled();
      await expect(popBackBtn).toBeDisabled();
    });

    test('PUSH_FRONT event should remain in not_empty', async ({ page }) => {
      await page.fill('#elementInput', 'B');
      await page.click('#pushFrontBtn');
      const dequeContainer = await page.locator('#dequeContainer');
      await expect(dequeContainer).toContainText('B');
      const popFrontBtn = await page.locator('#popFrontBtn');
      const popBackBtn = await page.locator('#popBackBtn');
      await expect(popFrontBtn).not.toBeDisabled();
      await expect(popBackBtn).not.toBeDisabled();
    });

    test('PUSH_BACK event should remain in not_empty', async ({ page }) => {
      await page.fill('#elementInput', 'C');
      await page.click('#pushBackBtn');
      const dequeContainer = await page.locator('#dequeContainer');
      await expect(dequeContainer).toContainText('C');
      const popFrontBtn = await page.locator('#popFrontBtn');
      const popBackBtn = await page.locator('#popBackBtn');
      await expect(popFrontBtn).not.toBeDisabled();
      await expect(popBackBtn).not.toBeDisabled();
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Attempting to pop from an empty deque should show an alert', async ({ page }) => {
      await page.click('#popFrontBtn');
      await page.on('dialog', dialog => dialog.dismiss());
      await page.click('#popBackBtn');
      await page.on('dialog', dialog => dialog.dismiss());
    });

    test('Attempting to clear an empty deque should show an alert', async ({ page }) => {
      await page.click('#clearBtn');
      await page.on('dialog', dialog => dialog.dismiss());
    });

    test('Entering empty input should show an alert', async ({ page }) => {
      await page.click('#pushFrontBtn');
      await page.on('dialog', dialog => dialog.dismiss());
      await page.click('#pushBackBtn');
      await page.on('dialog', dialog => dialog.dismiss());
    });
  });
});