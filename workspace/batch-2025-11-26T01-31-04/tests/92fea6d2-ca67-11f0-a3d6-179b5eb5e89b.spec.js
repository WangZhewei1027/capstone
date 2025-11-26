import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fea6d2-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Dijkstra\'s Algorithm Visualization Tests', () => {
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
    await page.waitForSelector('#start-node');
  });

  test('Initial state should be Idle', async () => {
    const nextStepButton = await page.$('#next-step-btn');
    const autoRunButton = await page.$('#auto-run-btn');
    const resetButton = await page.$('#reset-btn');

    expect(await nextStepButton.isDisabled()).toBe(true);
    expect(await autoRunButton.isDisabled()).toBe(true);
    expect(await resetButton.isDisabled()).toBe(false);
  });

  test('Reset button should transition from Idle to Resetting', async () => {
    await page.click('#reset-btn');
    await page.waitForTimeout(500); // Wait for the transition to complete

    const logText = await page.$eval('#log', el => el.innerHTML);
    expect(logText).toContain('Graph reset.');
  });

  test('Next Step button should transition from Idle to StepExecuting', async () => {
    await page.click('#reset-btn');
    await page.waitForTimeout(500); // Wait for the reset to complete

    await page.click('#next-step-btn');
    await page.waitForTimeout(500); // Wait for the transition to complete

    const logText = await page.$eval('#log', el => el.innerHTML);
    expect(logText).toContain('Visiting node');
  });

  test('Next Step button should remain in StepExecuting', async () => {
    await page.click('#reset-btn');
    await page.waitForTimeout(500); // Wait for the reset to complete

    await page.click('#next-step-btn');
    await page.waitForTimeout(500); // Wait for the first step

    await page.click('#next-step-btn');
    await page.waitForTimeout(500); // Wait for the next step

    const logText = await page.$eval('#log', el => el.innerHTML);
    expect(logText).toContain('Visiting node');
  });

  test('Auto Run button should transition from Idle to AutoRunning', async () => {
    await page.click('#reset-btn');
    await page.waitForTimeout(500); // Wait for the reset to complete

    await page.click('#auto-run-btn');
    await page.waitForTimeout(900); // Allow some time for auto run

    const logText = await page.$eval('#log', el => el.innerHTML);
    expect(logText).toContain('Visiting node');
  });

  test('Stop Auto Run button should transition back to Idle', async () => {
    await page.click('#reset-btn');
    await page.waitForTimeout(500); // Wait for the reset to complete

    await page.click('#auto-run-btn');
    await page.waitForTimeout(900); // Allow some time for auto run

    await page.click('#stop-auto-btn');
    await page.waitForTimeout(500); // Wait for the stop to complete

    const logText = await page.$eval('#log', el => el.innerHTML);
    expect(logText).toContain('Algorithm completed.');
  });

  test('Completing the algorithm should transition to Completed state', async () => {
    await page.click('#reset-btn');
    await page.waitForTimeout(500); // Wait for the reset to complete

    await page.click('#next-step-btn');
    await page.waitForTimeout(500); // Wait for the first step

    // Simulate running until completion
    while (true) {
      const logText = await page.$eval('#log', el => el.innerHTML);
      if (logText.includes('All nodes finalized.')) break;
      await page.click('#next-step-btn');
      await page.waitForTimeout(500); // Wait for each step
    }

    const finalLogText = await page.$eval('#log', el => el.innerHTML);
    expect(finalLogText).toContain('Shortest paths from start node to all reachable nodes displayed.');
  });

  test('Reset button should reinitialize the state', async () => {
    await page.click('#reset-btn');
    await page.waitForTimeout(500); // Wait for the reset to complete

    const logText = await page.$eval('#log', el => el.innerHTML);
    expect(logText).toContain('Graph reset.');
  });

  test('Auto Run button should not start if no start node is selected', async () => {
    await page.selectOption('#start-node', ''); // Select no start node
    await page.click('#auto-run-btn');

    const logText = await page.$eval('#log', el => el.innerHTML);
    expect(logText).not.toContain('Visiting node');
  });
});