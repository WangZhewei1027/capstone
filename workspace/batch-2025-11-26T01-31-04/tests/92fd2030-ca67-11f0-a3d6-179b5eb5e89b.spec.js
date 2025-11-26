import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fd2030-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Deque Visualization Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    const dequeDisplay = await page.locator('#dequeDisplay');
    await expect(dequeDisplay).toHaveText('(empty)');
  });

  test('Push Front operation', async ({ page }) => {
    await page.fill('#inputValue', '10');
    await page.click('#pushFrontBtn');
    
    const dequeDisplay = await page.locator('#dequeDisplay');
    await expect(dequeDisplay).toHaveText('10');
  });

  test('Push Back operation', async ({ page }) => {
    await page.fill('#inputValue', '20');
    await page.click('#pushBackBtn');
    
    const dequeDisplay = await page.locator('#dequeDisplay');
    await expect(dequeDisplay).toHaveText('20');
  });

  test('Pop Front operation', async ({ page }) => {
    await page.fill('#inputValue', '30');
    await page.click('#pushFrontBtn');
    await page.click('#popFrontBtn');
    
    const dequeDisplay = await page.locator('#dequeDisplay');
    await expect(dequeDisplay).toHaveText('(empty)');
  });

  test('Pop Back operation', async ({ page }) => {
    await page.fill('#inputValue', '40');
    await page.click('#pushBackBtn');
    await page.click('#popBackBtn');
    
    const dequeDisplay = await page.locator('#dequeDisplay');
    await expect(dequeDisplay).toHaveText('(empty)');
  });

  test('Push Front with empty input shows alert', async ({ page }) => {
    await page.click('#pushFrontBtn');
    const alert = await page.waitForEvent('dialog');
    await expect(alert.message()).toContain('Please enter a value to push.');
    await alert.dismiss();
  });

  test('Push Back with empty input shows alert', async ({ page }) => {
    await page.click('#pushBackBtn');
    const alert = await page.waitForEvent('dialog');
    await expect(alert.message()).toContain('Please enter a value to push.');
    await alert.dismiss();
  });

  test('Pop Front from empty deque shows alert', async ({ page }) => {
    await page.click('#popFrontBtn');
    const alert = await page.waitForEvent('dialog');
    await expect(alert.message()).toContain('Deque is empty. Nothing to pop at front.');
    await alert.dismiss();
  });

  test('Pop Back from empty deque shows alert', async ({ page }) => {
    await page.click('#popBackBtn');
    const alert = await page.waitForEvent('dialog');
    await expect(alert.message()).toContain('Deque is empty. Nothing to pop at back.');
    await alert.dismiss();
  });

  test('Clear operation on non-empty deque', async ({ page }) => {
    await page.fill('#inputValue', '50');
    await page.click('#pushBackBtn');
    await page.click('#clearBtn');
    
    const dequeDisplay = await page.locator('#dequeDisplay');
    await expect(dequeDisplay).toHaveText('(empty)');
  });

  test('Clear operation on empty deque shows alert', async ({ page }) => {
    await page.click('#clearBtn');
    const alert = await page.waitForEvent('dialog');
    await expect(alert.message()).toContain('Deque is already empty.');
    await alert.dismiss();
  });

  test('Confirm clear operation', async ({ page }) => {
    await page.fill('#inputValue', '60');
    await page.click('#pushBackBtn');
    await page.click('#clearBtn');

    const confirm = await page.waitForEvent('dialog');
    await confirm.accept();

    const dequeDisplay = await page.locator('#dequeDisplay');
    await expect(dequeDisplay).toHaveText('(empty)');
  });

  test('Enter key triggers pushBack', async ({ page }) => {
    await page.fill('#inputValue', '70');
    await page.press('#inputValue', 'Enter');

    const dequeDisplay = await page.locator('#dequeDisplay');
    await expect(dequeDisplay).toHaveText('70');
  });
});