import { test, expect } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1dfb70-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Counting Sort Visualization Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(baseUrl);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await page.reload();
  });

  test('Initial state should be idle', async () => {
    const status = await page.locator('#status').textContent();
    expect(status).toBe('Status: Idle. Enter array and press Record.');
  });

  test('Generate Random button transitions to generating_random state', async () => {
    await page.fill('#nInput', '10');
    await page.fill('#kInput', '20');
    await page.click('#genRnd');
    
    const status = await page.locator('#status').textContent();
    expect(status).toBe('Status: Random array generated.');
    const arrInputValue = await page.locator('#arrInput').inputValue();
    expect(arrInputValue.split(',').length).toBe(10);
  });

  test('Use From Text button with valid input transitions to use_custom state', async () => {
    await page.fill('#arrInput', '3,1,2');
    await page.click('#useCustom');
    
    const status = await page.locator('#status').textContent();
    expect(status).toBe('Status: Using custom array from text.');
  });

  test('Use From Text button with invalid input shows error alert', async () => {
    await page.fill('#arrInput', '3,-1,2');
    await page.click('#useCustom');
    
    const alert = await page.waitForEvent('dialog');
    expect(alert.message()).toContain('Values must be non-negative.');
    await alert.dismiss();
  });

  test('Record button transitions to recording state', async () => {
    await page.fill('#arrInput', '4,2,2,8,3,3,1');
    await page.click('#recordBtn');
    
    const status = await page.locator('#status').textContent();
    expect(status).toBe('Status: Steps recorded. Ready.');
  });

  test('Play button transitions to playing state', async () => {
    await page.fill('#arrInput', '4,2,2,8,3,3,1');
    await page.click('#recordBtn');
    await page.click('#playBtn');
    
    const status = await page.locator('#status').textContent();
    expect(status).toBe('Status: Playing...');
  });

  test('Step forward and backward functionality', async () => {
    await page.fill('#arrInput', '4,2,2,8,3,3,1');
    await page.click('#recordBtn');
    await page.click('#playBtn');
    
    await page.click('#stepFwd');
    let curStep = await page.locator('#curStep').textContent();
    expect(curStep).toBe('1');

    await page.click('#stepBack');
    curStep = await page.locator('#curStep').textContent();
    expect(curStep).toBe('0');
  });

  test('Jump to start and end functionality', async () => {
    await page.fill('#arrInput', '4,2,2,8,3,3,1');
    await page.click('#recordBtn');
    
    await page.click('#fwdBtn');
    let curStep = await page.locator('#curStep').textContent();
    expect(curStep).toBe('0');

    await page.click('#stepFwd');
    await page.click('#backBtn');
    curStep = await page.locator('#curStep').textContent();
    expect(curStep).toBe('0');
  });

  test('Reset button should reset the application state', async () => {
    await page.fill('#arrInput', '4,2,2,8,3,3,1');
    await page.click('#recordBtn');
    await page.click('#resetBtn');

    const status = await page.locator('#status').textContent();
    expect(status).toBe('Status: Reset.');
    const curStep = await page.locator('#curStep').textContent();
    expect(curStep).toBe('0');
  });

  test('Changing speed while playing stops playback', async () => {
    await page.fill('#arrInput', '4,2,2,8,3,3,1');
    await page.click('#recordBtn');
    await page.click('#playBtn');
    
    await page.fill('#speed', '300');
    const status = await page.locator('#status').textContent();
    expect(status).toContain('Speed changed; playback stopped. Press Play again.');
  });

  test('Error handling when recording with invalid input', async () => {
    await page.fill('#arrInput', '4,2,2,8,3,3,-1');
    await page.click('#recordBtn');
    
    const alert = await page.waitForEvent('dialog');
    expect(alert.message()).toContain('Values must be non-negative.');
    await alert.dismiss();
  });

  test('Play button should finish playback correctly', async () => {
    await page.fill('#arrInput', '4,2,2,8,3,3,1');
    await page.click('#recordBtn');
    await page.click('#playBtn');

    await page.waitForTimeout(2000); // Wait for playback to finish
    const status = await page.locator('#status').textContent();
    expect(status).toBe('Status: Finished.');
  });
});