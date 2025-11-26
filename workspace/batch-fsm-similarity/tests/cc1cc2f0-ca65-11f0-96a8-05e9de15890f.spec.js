import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1cc2f0-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Deque Interactive Application Tests', () => {
  
  test('Initial state should be idle', async ({ page }) => {
    const log = await page.locator('#log').innerText();
    expect(log).toContain('Deque demo ready. Enter a value and use the buttons or press Enter.');
  });

  test('Push Front with valid input', async ({ page }) => {
    await page.fill('#valueInput', 'A');
    await page.click('#pushFrontBtn');
    
    const dequeRow = await page.locator('#dequeRow').innerHTML();
    expect(dequeRow).toContain('A');
    
    const log = await page.locator('#log').innerText();
    expect(log).toContain('pushFront(A)');
  });

  test('Push Back with valid input', async ({ page }) => {
    await page.fill('#valueInput', 'B');
    await page.click('#pushBackBtn');
    
    const dequeRow = await page.locator('#dequeRow').innerHTML();
    expect(dequeRow).toContain('B');
    
    const log = await page.locator('#log').innerText();
    expect(log).toContain('pushBack(B)');
  });

  test('Push Front with empty input should show error', async ({ page }) => {
    await page.click('#pushFrontBtn');
    
    const log = await page.locator('#log').innerText();
    expect(log).toContain('Enter a value to push (front).');
  });

  test('Push Back with empty input should show error', async ({ page }) => {
    await page.click('#pushBackBtn');
    
    const log = await page.locator('#log').innerText();
    expect(log).toContain('Enter a value to push (back).');
  });

  test('Pop Front from non-empty deque', async ({ page }) => {
    await page.fill('#valueInput', 'C');
    await page.click('#pushBackBtn'); // Add C
    await page.click('#popFrontBtn');

    const log = await page.locator('#log').innerText();
    expect(log).toContain('popFront() → C');
    
    const dequeRow = await page.locator('#dequeRow').innerHTML();
    expect(dequeRow).not.toContain('C');
  });

  test('Pop Front from empty deque should show error', async ({ page }) => {
    await page.click('#popFrontBtn');

    const log = await page.locator('#log').innerText();
    expect(log).toContain('popFront() → undefined (deque empty)');
  });

  test('Pop Back from non-empty deque', async ({ page }) => {
    await page.fill('#valueInput', 'D');
    await page.click('#pushBackBtn'); // Add D
    await page.click('#popBackBtn');

    const log = await page.locator('#log').innerText();
    expect(log).toContain('popBack() → D');
    
    const dequeRow = await page.locator('#dequeRow').innerHTML();
    expect(dequeRow).not.toContain('D');
  });

  test('Pop Back from empty deque should show error', async ({ page }) => {
    await page.click('#popBackBtn');

    const log = await page.locator('#log').innerText();
    expect(log).toContain('popBack() → undefined (deque empty)');
  });

  test('Peek Front on non-empty deque', async ({ page }) => {
    await page.fill('#valueInput', 'E');
    await page.click('#pushBackBtn'); // Add E
    await page.click('#peekFrontBtn');

    const log = await page.locator('#log').innerText();
    expect(log).toContain('peekFront() → E');
  });

  test('Peek Front on empty deque should show error', async ({ page }) => {
    await page.click('#peekFrontBtn');

    const log = await page.locator('#log').innerText();
    expect(log).toContain('peekFront() → undefined (deque empty)');
  });

  test('Peek Back on non-empty deque', async ({ page }) => {
    await page.fill('#valueInput', 'F');
    await page.click('#pushBackBtn'); // Add F
    await page.click('#peekBackBtn');

    const log = await page.locator('#log').innerText();
    expect(log).toContain('peekBack() → F');
  });

  test('Peek Back on empty deque should show error', async ({ page }) => {
    await page.click('#peekBackBtn');

    const log = await page.locator('#log').innerText();
    expect(log).toContain('peekBack() → undefined (deque empty)');
  });

  test('Clear the deque', async ({ page }) => {
    await page.fill('#valueInput', 'G');
    await page.click('#pushBackBtn'); // Add G
    await page.click('#clearBtn');

    const log = await page.locator('#log').innerText();
    expect(log).toContain('clear()');
    
    const dequeRow = await page.locator('#dequeRow').innerHTML();
    expect(dequeRow).toContain('EMPTY DEQUE');
  });

  test('Random operations', async ({ page }) => {
    await page.click('#randomBtn');

    // Wait for some time to allow random operations to execute
    await page.waitForTimeout(3000);

    const log = await page.locator('#log').innerText();
    expect(log).toContain('random ops: complete');
  });

  test('Keyboard shortcuts for pushing and clearing', async ({ page }) => {
    await page.fill('#valueInput', 'H');
    await page.keyboard.press('Enter'); // Push Back

    const log = await page.locator('#log').innerText();
    expect(log).toContain('pushBack(H)');

    await page.fill('#valueInput', 'I');
    await page.keyboard.press('Shift+Enter'); // Push Front

    const dequeRow = await page.locator('#dequeRow').innerHTML();
    expect(dequeRow).toContain('I');

    await page.keyboard.press('Escape'); // Clear

    const clearLog = await page.locator('#log').innerText();
    expect(clearLog).toContain('clear()');
    expect(await page.locator('#dequeRow').innerHTML()).toContain('EMPTY DEQUE');
  });

});