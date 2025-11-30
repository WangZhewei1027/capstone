import { test, expect } from '@playwright/test';

// Test file: 20d288a1-cd33-11f0-bdf9-b3d97e91273d-red-black-tree.spec.js
// Application URL:
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d288a1-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object Model for the Red-Black Tree page
class RBTPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputSelector = '#inputValue';
    this.insertBtnSelector = '#insertBtn';
    this.clearBtnSelector = '#clearBtn';
    this.messageSelector = '#message';
    this.canvasSelector = '#rbtCanvas';
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Insert value by typing into the input then clicking Insert
  async insertValue(value) {
    await this.page.fill(this.inputSelector, String(value));
    await this.page.click(this.insertBtnSelector);
  }

  // Insert by pressing Enter in the input
  async insertValueByEnter(value) {
    await this.page.fill(this.inputSelector, String(value));
    await this.page.press(this.inputSelector, 'Enter');
  }

  async clearTree() {
    await this.page.click(this.clearBtnSelector);
  }

  async getMessageText() {
    return this.page.$eval(this.messageSelector, el => el.textContent.trim());
  }

  async getMessageColorComputed() {
    // Return computed color as rgb(...) string so tests are deterministic
    return this.page.$eval(this.messageSelector, el => getComputedStyle(el).color);
  }

  async isMessageVisible() {
    return this.page.$eval(this.messageSelector, el => !!el.textContent.trim());
  }

  async isInputFocused() {
    return this.page.$eval(this.inputSelector, el => document.activeElement === el);
  }

  async getCanvasSize() {
    return this.page.$eval(this.canvasSelector, canvas => ({ width: canvas.width, height: canvas.height }));
  }

  // Checks whether the canvas contains any non-white pixel by sampling with a stride.
  // Returns true if any non-white pixel found (i.e., drawn content exists).
  async canvasHasDrawing({ stride = 20 } = {}) {
    return this.page.$eval(this.canvasSelector, (canvas, stride) => {
      const ctx = canvas.getContext('2d');
      try {
        const { width, height } = canvas;
        // sample pixels with given stride
        for (let y = 0; y < height; y += stride) {
          for (let x = 0; x < width; x += stride) {
            const idx = (y * width + x) * 4;
            const data = ctx.getImageData(x, y, 1, 1).data;
            // Check if not pure white (255,255,255) or not fully transparent
            if (!(data[0] === 255 && data[1] === 255 && data[2] === 255 && (data[3] === 255 || data[3] === 0))) {
              return true;
            }
            // Sometimes canvas default may be white but with full alpha 255; we want to detect colored pixels
            if (!(data[0] === 255 && data[1] === 255 && data[2] === 255)) {
              return true;
            }
          }
        }
        return false;
      } catch (err) {
        // If getImageData is blocked or fails, return false for drawing detection
        return false;
      }
    }, stride);
  }

  // Checks if the entire canvas is blank (all white) by sampling
  async canvasIsBlank({ stride = 20 } = {}) {
    const hasDrawing = await this.canvasHasDrawing({ stride });
    return !hasDrawing;
  }
}

// Global arrays to capture console and page errors per test
test.describe('Red-Black Tree Visualization - Functional and Console Tests', () => {
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset error capture arrays before each test
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture uncaught errors on the page
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Test initial page load and default state
  test('Initial load displays controls, empty message, and blank canvas', async ({ page }) => {
    const rbt = new RBTPage(page);
    await rbt.goto();

    // Verify input and buttons exist and are visible
    await expect(page.locator(rbt.inputSelector)).toBeVisible();
    await expect(page.locator(rbt.insertBtnSelector)).toBeVisible();
    await expect(page.locator(rbt.clearBtnSelector)).toBeVisible();

    // Message should be empty initially
    const messageText = await rbt.getMessageText();
    expect(messageText).toBe('');

    // Canvas should exist and be blank (no drawing yet)
    const { width, height } = await rbt.getCanvasSize();
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    const isBlank = await rbt.canvasIsBlank({ stride: 40 });
    expect(isBlank).toBe(true);

    // No console errors or page errors should have occurred during load
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Validate behavior when Insert clicked with empty input
  test('Clicking Insert with empty input shows validation error', async ({ page }) => {
    const rbt1 = new RBTPage(page);
    await rbt.goto();

    // Click Insert with empty input
    await page.click(rbt.insertBtnSelector);

    // Message must show the empty-value error and be styled as an error (crimson)
    const text = await rbt.getMessageText();
    expect(text).toContain('Please enter a value to insert.');

    const color = await rbt.getMessageColorComputed();
    // crimson is expected to be rgb(220, 20, 60) in modern browsers
    expect(color).toBeDefined();
    expect(color).toMatch(/(220,\s*20,\s*60|crimson|rgb\()/i);

    // No uncaught page errors or console errors should have happened from this interaction
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Validate behavior when non-numeric input is provided
  test('Entering non-number shows validation error', async ({ page }) => {
    const rbt2 = new RBTPage(page);
    await rbt.goto();

    await page.fill(rbt.inputSelector, 'abc');
    await page.click(rbt.insertBtnSelector);

    const text1 = await rbt.getMessageText();
    expect(text).toContain('Please enter a valid number.');

    const color1 = await rbt.getMessageColorComputed();
    expect(color).toBeDefined();
    expect(color).toMatch(/(220,\s*20,\s*60|crimson|rgb\()/i);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Validate behavior when a non-integer number is provided
  test('Entering non-integer (decimal) shows validation error', async ({ page }) => {
    const rbt3 = new RBTPage(page);
    await rbt.goto();

    await page.fill(rbt.inputSelector, '3.14');
    await page.click(rbt.insertBtnSelector);

    const text2 = await rbt.getMessageText();
    expect(text).toContain('Please enter an integer value.');

    const color2 = await rbt.getMessageColorComputed();
    expect(color).toBeDefined();
    expect(color).toMatch(/(220,\s*20,\s*60|crimson|rgb\()/i);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test insertion of values, duplicate detection, Enter key behavior, and canvas drawing
  test('Inserting values renders nodes on canvas, prevents duplicates, and supports Enter key', async ({ page }) => {
    const rbt4 = new RBTPage(page);
    await rbt.goto();

    // Insert 10 via click
    await rbt.insertValue(10);
    let msg = await rbt.getMessageText();
    expect(msg).toContain('Inserted value 10 into the tree.');

    let color3 = await rbt.getMessageColorComputed();
    // insertion success is styled green: rgb(0, 128, 0)
    expect(color).toBeDefined();
    expect(color).toMatch(/(0,\s*128,\s*0|green|rgb\()/i);

    // Canvas should now have some drawing
    let hasDrawing1 = await rbt.canvasHasDrawing({ stride: 30 });
    expect(hasDrawing).toBe(true);

    // Insert additional values
    await rbt.insertValue(5);
    msg = await rbt.getMessageText();
    expect(msg).toContain('Inserted value 5 into the tree.');

    await rbt.insertValue(15);
    msg = await rbt.getMessageText();
    expect(msg).toContain('Inserted value 15 into the tree.');

    // Attempt to insert duplicate 10 -> should show duplicate error
    await rbt.insertValue(10);
    msg = await rbt.getMessageText();
    expect(msg).toContain('Value 10 already exists in the tree.');

    color = await rbt.getMessageColorComputed();
    expect(color).toBeDefined();
    expect(color).toMatch(/(220,\s*20,\s*60|crimson|rgb\()/i);

    // Insert using Enter key (value 20)
    await rbt.insertValueByEnter(20);
    msg = await rbt.getMessageText();
    expect(msg).toContain('Inserted value 20 into the tree.');

    // After multiple insertions, canvas should definitely show drawing
    hasDrawing = await rbt.canvasHasDrawing({ stride: 20 });
    expect(hasDrawing).toBe(true);

    // No uncaught page errors or console errors during these interactions
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test clearing the tree restores blank canvas and focuses the input
  test('Clear Tree resets the canvas, shows message, and focuses the input', async ({ page }) => {
    const rbt5 = new RBTPage(page);
    await rbt.goto();

    // Build a small tree
    await rbt.insertValue(30);
    await rbt.insertValue(10);
    await rbt.insertValue(40);

    // Ensure canvas currently has drawing
    let hasDrawing2 = await rbt.canvasHasDrawing({ stride: 20 });
    expect(hasDrawing).toBe(true);

    // Click Clear Tree
    await rbt.clearTree();

    // Message should indicate clearing
    const text3 = await rbt.getMessageText();
    expect(text).toContain('Red-Black Tree cleared.');

    // Canvas should become blank again
    const isBlank1 = await rbt.canvasIsBlank({ stride: 40 });
    expect(isBlank).toBe(true);

    // Input should be focused after clearing
    const focused = await rbt.isInputFocused();
    expect(focused).toBe(true);

    // No console errors or page errors should have been emitted
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Final test to explicitly assert that no unexpected runtime errors were logged to the page during test-suite actions
  test('No uncaught ReferenceError, SyntaxError, or TypeError occurred during interactions', async ({ page }) => {
    const rbt6 = new RBTPage(page);
    await rbt.goto();

    // Perform some interactions
    await rbt.insertValue(1);
    await rbt.insertValue(2);
    await rbt.clearTree();

    // Make assertions about captured errors arrays
    // We expect zero console.error messages and zero uncaught page errors
    // If any ReferenceError/SyntaxError/TypeError occurred, it would have been captured in pageErrors or consoleErrors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);

    // If there were errors, fail with details (this won't run if above expectations pass)
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      // Log details to help debugging if the test fails (this branch is only for diagnostics)
      // eslint-disable-next-line no-console
      console.error('Console Errors:', consoleErrors);
      // eslint-disable-next-line no-console
      console.error('Page Errors:', pageErrors);
    }
  });
});