import { test, expect } from '@playwright/test';

test.describe('Array Demo FSM Tests', () => {
  const url = 'http://127.0.0.1:5500/workspace/batch-2025-11-24T04-39-34/html/937a9a70-c8ef-11f0-bcc4-c376470b46ee.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(url);
  });

  test('should start in idle state and transition to adding state', async ({ page }) => {
    // Verify initial state is idle
    const arrayDisplay = await page.$('#array');
    expect(await arrayDisplay.innerHTML()).toBe('');

    // Transition to adding state by clicking add button
    await page.fill('#num', '1,2,3');
    await page.click('#add-btn');

    // Verify elements are added and displayed
    expect(await arrayDisplay.innerHTML()).toBe('1<br>2<br>3<br>');
  });

  test('should transition from adding to displaying state', async ({ page }) => {
    // Add elements
    await page.fill('#num', '4,5,6');
    await page.click('#add-btn');

    // Verify elements are added
    const arrayDisplay = await page.$('#array');
    expect(await arrayDisplay.innerHTML()).toBe('4<br>5<br>6<br>');

    // Transition to displaying state by clicking display button
    await page.click('#display-btn');

    // Verify display remains unchanged
    expect(await arrayDisplay.innerHTML()).toBe('4<br>5<br>6<br>');
  });

  test('should transition from displaying to clearing state', async ({ page }) => {
    // Add elements and display them
    await page.fill('#num', '7,8,9');
    await page.click('#add-btn');
    await page.click('#display-btn');

    const arrayDisplay = await page.$('#array');
    expect(await arrayDisplay.innerHTML()).toBe('7<br>8<br>9<br>');

    // Transition to clearing state by clicking clear button
    await page.click('#clear-btn');

    // Verify array is cleared
    expect(await arrayDisplay.innerHTML()).toBe('');
  });

  test('should transition from clearing to adding state', async ({ page }) => {
    // Clear array
    await page.click('#clear-btn');

    const arrayDisplay = await page.$('#array');
    expect(await arrayDisplay.innerHTML()).toBe('');

    // Transition to adding state by clicking add button
    await page.fill('#num', '10,11,12');
    await page.click('#add-btn');

    // Verify elements are added
    expect(await arrayDisplay.innerHTML()).toBe('10<br>11<br>12<br>');
  });

  test('should handle edge case of empty input', async ({ page }) => {
    // Attempt to add empty input
    await page.fill('#num', '');
    await page.click('#add-btn');

    const arrayDisplay = await page.$('#array');
    // Verify no elements are added
    expect(await arrayDisplay.innerHTML()).toBe('');
  });

  test('should handle edge case of clearing already empty array', async ({ page }) => {
    // Clear already empty array
    await page.click('#clear-btn');

    const arrayDisplay = await page.$('#array');
    // Verify array remains empty
    expect(await arrayDisplay.innerHTML()).toBe('');
  });
});