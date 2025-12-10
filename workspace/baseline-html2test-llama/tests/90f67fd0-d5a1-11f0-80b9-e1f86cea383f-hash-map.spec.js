import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f67fd0-d5a1-11f0-80b9-e1f86cea383f.html';

// Page Object for the HashMap app
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#input');
    this.addBtn = page.locator('#add-btn');
    this.displayBtn = page.locator('#display-btn');
    this.hashmapDiv = page.locator('#hashmap');
    this.paragraphs = () => this.hashmapDiv.locator('p');
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Type a key into the input
  async fillKey(key) {
    await this.input.fill(key);
  }

  // Click the Add button
  async clickAdd() {
    await this.addBtn.click();
  }

  // Click the Display button
  async clickDisplay() {
    await this.displayBtn.click();
  }

  // Add a key (fill + click)
  async addKey(key) {
    await this.fillKey(key);
    await this.clickAdd();
  }

  // Return array of paragraph texts currently inside #hashmap
  async getParagraphTexts() {
    const count = await this.paragraphs().count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.paragraphs().nth(i).innerText());
    }
    return texts;
  }

  // Count paragraphs
  async getParagraphCount() {
    return await this.paragraphs().count();
  }

  // Get the current input value
  async getInputValue() {
    return await this.input.inputValue();
  }
}

test.describe('HashMap App - interactive behavior and DOM updates', () => {
  let consoleMessages = [];
  let pageErrors = [];

  // Setup: navigate and wire listeners before each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for inspection
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught page errors
    page.on('pageerror', (err) => {
      // store the error message for assertions
      pageErrors.push(err.message);
    });

    // Navigate to the app
    await page.goto(APP_URL);
  });

  // Teardown not required beyond Playwright automatic cleanup,
  // but we will assert no unexpected runtime errors happened in each test.

  test('Initial load: page structure and default state are correct', async ({ page }) => {
    const app = new HashMapPage(page);

    // Verify core UI elements are visible and present
    await expect(page.locator('h1')).toHaveText('HashMap');
    await expect(app.input).toBeVisible();
    await expect(app.addBtn).toBeVisible();
    await expect(app.displayBtn).toBeVisible();
    await expect(app.hashmapDiv).toBeVisible();

    // On initial load, there should be no paragraphs inside the hashmap container
    expect(await app.getParagraphCount()).toBe(0);

    // Ensure input is empty initially
    expect(await app.getInputValue()).toBe('');

    // Ensure there were no runtime page errors or console errors on load
    expect(pageErrors, 'No uncaught page errors should occur on load').toEqual([]);
    const consoleErrorMessages = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrorMessages, 'No console.error calls expected on load').toEqual([]);
  });

  test('Adding a non-empty key appends a paragraph showing key: null', async ({ page }) => {
    const app1 = new HashMapPage(page);

    // Add a key 'foo' and verify a paragraph is appended with "foo: null"
    await app.addKey('foo');

    const texts1 = await app.getParagraphTexts();
    // there should be exactly one paragraph and its text should match "foo: null"
    expect(texts.length).toBe(1);
    expect(texts[0]).toBe('foo: null');

    // The input is not cleared by the implementation, verify it still contains the key
    expect(await app.getInputValue()).toBe('foo');

    // No runtime errors or console errors expected from this interaction
    expect(pageErrors).toEqual([]);
    const consoleErrorMessages1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrorMessages).toEqual([]);
  });

  test('Adding an empty key shows an error message paragraph "Key cannot be empty."', async ({ page }) => {
    const app2 = new HashMapPage(page);

    // Ensure input is empty and click Add
    await app.fillKey('');
    await app.clickAdd();

    // One paragraph should be appended with the error message
    const texts2 = await app.getParagraphTexts();
    expect(texts.length).toBe(1);
    expect(texts[0]).toBe('Key cannot be empty.');

    // No runtime errors or console errors expected from this interaction
    expect(pageErrors).toEqual([]);
    const consoleErrorMessages2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrorMessages).toEqual([]);
  });

  test('Display button iterates stored keys and appends paragraphs for each unique key', async ({ page }) => {
    const app3 = new HashMapPage(page);

    // Add multiple distinct keys
    await app.addKey('alpha');
    await app.addKey('beta');

    // After two adds, there should be two paragraphs already (alpha and beta with null)
    let texts3 = await app.getParagraphTexts();
    expect(texts).toEqual(['alpha: null', 'beta: null']);

    // Now click Display which iterates over the Map and appends one paragraph per key.
    // Since there are 2 keys in the Map, we expect two more paragraphs appended.
    const beforeCount = await app.getParagraphCount();
    await app.clickDisplay();
    const afterCount = await app.getParagraphCount();
    expect(afterCount - beforeCount).toBe(2);

    // The full list should now contain duplicates: initial add entries and the display entries
    texts = await app.getParagraphTexts();
    // Validate that both keys appear at least twice overall (added + displayed)
    const occurrencesOfAlpha = texts.filter(t => t === 'alpha: null').length;
    const occurrencesOfBeta = texts.filter(t => t === 'beta: null').length;
    expect(occurrencesOfAlpha).toBeGreaterThanOrEqual(2);
    expect(occurrencesOfBeta).toBeGreaterThanOrEqual(2);

    // No runtime page errors or console errors expected
    expect(pageErrors).toEqual([]);
    const consoleErrorMessages3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrorMessages).toEqual([]);
  });

  test('Adding the same key multiple times: Map should contain unique keys and display appends only one entry per unique key', async ({ page }) => {
    const app4 = new HashMapPage(page);

    // Add the same key twice via Add button
    await app.addKey('dup');
    await app.addKey('dup');

    // Two paragraphs should exist from the two add actions
    let texts4 = await app.getParagraphTexts();
    expect(texts.filter(t => t === 'dup: null').length).toBe(2);

    // Now click Display. Map should have only one unique key 'dup', so display should append 1 paragraph.
    const before = await app.getParagraphCount();
    await app.clickDisplay();
    const after = await app.getParagraphCount();
    expect(after - before).toBe(1);

    // Now total occurrences should be 3 (two from adds + one from display)
    texts = await app.getParagraphTexts();
    expect(texts.filter(t => t === 'dup: null').length).toBe(3);

    // No runtime page errors or console errors expected
    expect(pageErrors).toEqual([]);
    const consoleErrorMessages4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrorMessages).toEqual([]);
  });

  test('Edge case: Adding whitespace-only string is allowed (not considered empty) and will be stored and displayed', async ({ page }) => {
    const app5 = new HashMapPage(page);

    // Add a whitespace-only key (e.g., a single space)
    await app.addKey(' ');

    // The app treats non-empty string (not equal to '') as a key, so it should append " : null"
    const texts5 = await app.getParagraphTexts();
    expect(texts.length).toBe(1);
    expect(texts[0]).toBe(' : null');

    // No runtime errors expected
    expect(pageErrors).toEqual([]);
    const consoleErrorMessages5 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrorMessages).toEqual([]);
  });

  test('Accessibility and visibility checks: buttons and input remain interactive after multiple operations', async ({ page }) => {
    const app6 = new HashMapPage(page);

    // Perform a sequence of operations
    await app.addKey('one');
    await app.addKey('two');
    await app.addKey(''); // should add an error paragraph
    await app.clickDisplay();

    // Buttons should still be visible and enabled
    await expect(app.addBtn).toBeVisible();
    await expect(app.displayBtn).toBeVisible();

    // Input should be visible and focusable
    await expect(app.input).toBeVisible();
    await app.input.focus();
    // Fill a new key to verify input remains interactive
    await app.fillKey('final');
    await app.clickAdd();

    // Verify final paragraph exists for 'final: null'
    const texts6 = await app.getParagraphTexts();
    expect(texts.some(t => t === 'final: null')).toBeTruthy();

    // No runtime page errors or console errors expected
    expect(pageErrors).toEqual([]);
    const consoleErrorMessages6 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrorMessages).toEqual([]);
  });
});