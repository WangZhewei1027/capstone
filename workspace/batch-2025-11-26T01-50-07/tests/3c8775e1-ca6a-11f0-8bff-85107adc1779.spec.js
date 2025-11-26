import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8775e1-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Deque Application Tests', () => {
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

  test('Initial state should render empty deque', async () => {
    const dequeDisplay = await page.locator('#dequeDisplay');
    await expect(dequeDisplay).toHaveText('(deque is empty)');
  });

  test('Add to Front with valid input', async () => {
    await page.fill('#inputValue', '10');
    await page.click('#addFront');
    await expect(page.locator('#status')).toHaveText('Added "10" to the front.');
    await expect(page.locator('#dequeDisplay')).toHaveText('10');
  });

  test('Add to Back with valid input', async () => {
    await page.fill('#inputValue', '20');
    await page.click('#addBack');
    await expect(page.locator('#status')).toHaveText('Added "20" to the back.');
    await expect(page.locator('#dequeDisplay')).toHaveText('20');
  });

  test('Add to Front with empty input shows error', async () => {
    await page.fill('#inputValue', '');
    await page.click('#addFront');
    await expect(page.locator('#status')).toHaveText('Please enter a non-empty value to add.');
  });

  test('Add to Back with empty input shows error', async () => {
    await page.fill('#inputValue', '');
    await page.click('#addBack');
    await expect(page.locator('#status')).toHaveText('Please enter a non-empty value to add.');
  });

  test('Remove from Front when deque is not empty', async () => {
    await page.fill('#inputValue', '30');
    await page.click('#addFront');
    await page.click('#removeFront');
    await expect(page.locator('#status')).toHaveText('Removed "30" from the front.');
    await expect(page.locator('#dequeDisplay')).toHaveText('(deque is empty)');
  });

  test('Remove from Back when deque is not empty', async () => {
    await page.fill('#inputValue', '40');
    await page.click('#addBack');
    await page.click('#removeBack');
    await expect(page.locator('#status')).toHaveText('Removed "40" from the back.');
    await expect(page.locator('#dequeDisplay')).toHaveText('(deque is empty)');
  });

  test('Remove from Front when deque is empty shows error', async () => {
    await page.click('#removeFront');
    await expect(page.locator('#status')).toHaveText('Cannot remove from front, deque is empty.');
  });

  test('Remove from Back when deque is empty shows error', async () => {
    await page.click('#removeBack');
    await expect(page.locator('#status')).toHaveText('Cannot remove from back, deque is empty.');
  });

  test('Add multiple items and verify deque state', async () => {
    await page.fill('#inputValue', '50');
    await page.click('#addFront');
    await page.fill('#inputValue', '60');
    await page.click('#addBack');
    await expect(page.locator('#dequeDisplay')).toHaveText('50');
    await expect(page.locator('#dequeDisplay')).toHaveText('60');
  });

  test('Error handling when trying to remove from empty deque', async () => {
    await page.click('#removeFront');
    await expect(page.locator('#status')).toHaveText('Cannot remove from front, deque is empty.');
    await page.click('#removeBack');
    await expect(page.locator('#status')).toHaveText('Cannot remove from back, deque is empty.');
  });
});