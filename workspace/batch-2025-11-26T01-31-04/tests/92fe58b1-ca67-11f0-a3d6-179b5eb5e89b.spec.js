import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fe58b1-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Heap Sort Visualization Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state should be Idle', async () => {
    const sortBtn = await page.$('#sortBtn');
    const generateBtn = await page.$('#generateBtn');
    const log = await page.$('#log');

    // Verify that buttons are enabled in Idle state
    expect(await sortBtn.isEnabled()).toBe(true);
    expect(await generateBtn.isEnabled()).toBe(true);
    expect(await log.innerText()).toBe('');
  });

  test('Generate Random Array', async () => {
    const generateBtn = await page.$('#generateBtn');
    await generateBtn.click();

    // Verify that the array is rendered
    const arrayContainer = await page.$('#arrayContainer');
    const bars = await arrayContainer.$$('.bar');
    expect(bars.length).toBeGreaterThan(0);
  });

  test('Sort Button should be disabled when no array is generated', async () => {
    const sortBtn = await page.$('#sortBtn');
    await sortBtn.click();

    // Verify alert is shown
    await page.waitForTimeout(500); // Wait for alert to show
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toContain('Please input an array or generate a random one first.');
  });

  test('Sort with generated array', async () => {
    const generateBtn = await page.$('#generateBtn');
    const sortBtn = await page.$('#sortBtn');

    await generateBtn.click();
    await sortBtn.click();

    // Verify that sorting starts
    const log = await page.$('#log');
    await page.waitForTimeout(1000); // Wait for sorting to start
    const logText = await log.innerText();
    expect(logText).toContain('Starting Heap Sort...');
  });

  test('Sort with user input', async () => {
    const arrayInput = await page.$('#arrayInput');
    const sortBtn = await page.$('#sortBtn');

    await arrayInput.fill('5, 3, 8, 1, 2');
    await sortBtn.click();

    // Verify that sorting starts
    const log = await page.$('#log');
    await page.waitForTimeout(1000); // Wait for sorting to start
    const logText = await log.innerText();
    expect(logText).toContain('Starting Heap Sort...');
  });

  test('Heapifying and Swapping actions', async () => {
    const generateBtn = await page.$('#generateBtn');
    await generateBtn.click();

    const sortBtn = await page.$('#sortBtn');
    await sortBtn.click();

    // Wait for the heapifying process
    await page.waitForTimeout(3000); // Adjust based on expected timing of heapifying

    const log = await page.$('#log');
    const logText = await log.innerText();
    expect(logText).toContain('Heapifying at index');
    expect(logText).toContain('Swapping index');
  });

  test('Sorting completed', async () => {
    const log = await page.$('#log');
    await page.waitForTimeout(3000); // Wait for sorting to complete

    const logText = await log.innerText();
    expect(logText).toContain('Heap Sort completed!');
  });

  test('Check visual feedback during sorting', async () => {
    const arrayContainer = await page.$('#arrayContainer');
    const initialBars = await arrayContainer.$$('.bar');

    // Trigger sorting
    const sortBtn = await page.$('#sortBtn');
    await sortBtn.click();

    // Wait for some time to allow sorting animations
    await page.waitForTimeout(2000);

    const finalBars = await arrayContainer.$$('.bar');
    expect(initialBars.length).toBe(finalBars.length); // Ensure the number of bars remains the same
  });

  test('Handle invalid input gracefully', async () => {
    const arrayInput = await page.$('#arrayInput');
    const sortBtn = await page.$('#sortBtn');

    await arrayInput.fill('invalid input');
    await sortBtn.click();

    // Verify alert is shown
    await page.waitForTimeout(500); // Wait for alert to show
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toContain('Please enter valid numbers separated by commas.');
  });
});