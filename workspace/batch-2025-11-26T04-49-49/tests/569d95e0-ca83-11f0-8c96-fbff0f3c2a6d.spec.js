import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569d95e0-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Linear Search Application', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state is Idle', async () => {
    // Verify that the application starts in the Idle state
    const input = await page.locator('input[type=text]');
    const button = await page.locator('button');

    expect(await input.isEnabled()).toBe(true);
    expect(await button.isEnabled()).toBe(true);
  });

  test('Transition from Idle to Searching when input is not empty', async () => {
    const input = await page.locator('input[type=text]');
    const button = await page.locator('button');

    await input.fill('Test Value');
    await button.click();

    // Verify that the application transitions to Searching state
    expect(await page.locator('text=Searching...').isVisible()).toBe(true);
  });

  test('Transition from Searching to SearchComplete', async () => {
    // Simulate search completion
    await page.evaluate(() => {
      window.dispatchEvent(new Event('SEARCH_COMPLETE'));
    });

    // Verify that the application transitions to SearchComplete state
    expect(await page.locator('text=Search Results:').isVisible()).toBe(true);
  });

  test('Transition from Searching to ErrorAlert when input is empty', async () => {
    const input = await page.locator('input[type=text]');
    const button = await page.locator('button');

    await input.fill('');
    await button.click();

    // Verify that the application transitions to ErrorAlert state
    expect(await page.locator('text=Error: Input cannot be empty').isVisible()).toBe(true);
  });

  test('Transition from ErrorAlert to Idle on search button click', async () => {
    const button = await page.locator('button');

    await button.click();

    // Verify that the application transitions back to Idle state
    expect(await page.locator('text=Error: Input cannot be empty').isHidden()).toBe(true);
    expect(await page.locator('input[type=text]').isEnabled()).toBe(true);
  });

  test('Transition from SearchComplete to Idle', async () => {
    // Simulate search completion
    await page.evaluate(() => {
      window.dispatchEvent(new Event('SEARCH_COMPLETE'));
    });

    // Verify that the application transitions back to Idle state
    expect(await page.locator('text=Search Results:').isHidden()).toBe(true);
    expect(await page.locator('input[type=text]').isEnabled()).toBe(true);
  });
});