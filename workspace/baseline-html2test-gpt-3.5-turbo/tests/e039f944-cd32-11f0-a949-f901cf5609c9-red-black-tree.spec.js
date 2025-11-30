import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e039f944-cd32-11f0-a949-f901cf5609c9.html';

// Page Object representing the Red-Black Tree page
class TreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#valueInput');
    this.insertBtn = page.locator('#insertBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.canvas = page.locator('#treeCanvas');
    this.logDiv = page.locator('#log');
    this.legend = page.locator('#legend');
    this.canvasContainer = page.locator('#canvasContainer');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Insert a numeric value using the input and click insert
  async insertValue(value) {
    await this.input.fill(String(value));
    await this.insertBtn.click();
  }

  // Insert using Enter key in the input
  async insertValueWithEnter(value) {
    await this.input.fill(String(value));
    await this.input.press('Enter');
  }

  // Clear the tree with the clear button
  async clearTree() {
    await this.clearBtn.click();
  }

  // Get text content of the log area
  async getLogText() {
    return (await this.logDiv.textContent()) || '';
  }

  // Get number of lines in the log area
  async getLogLines() {
    const text = await this.getLogText();
    if (!text) return [];
    return text.split(/\r?\n/).filter(Boolean);
  }

  // Check whether the input has focus
  async inputHasFocus() {
    return await this.page.evaluate(() => document.activeElement === document.getElementById('valueInput'));
  }

  // Get canvas data URL from browser context
  async getCanvasDataUrl() {
    return await this.page.evaluate(() => {
      const canvas = document.getElementById('treeCanvas');
      try {
        return canvas.toDataURL();
      } catch (e) {
        // If toDataURL fails (rare), return empty string
        return '';
      }
    });
  }

  // Wait for log to contain substring (with timeout)
  async waitForLogContains(substring, options = { timeout: 2000 }) {
    await this.page.waitForFunction(
      (sel, text) => {
        const el = document.querySelector(sel);
        return el && el.textContent && el.textContent.includes(text);
      },
      '#log',
      substring,
      options
    );
  }
}

test.describe('Red-Black Tree Visualization - e039f944-cd32-11f0-a949-f901cf5609c9', () => {
  // Collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for observation
    page.on('console', msg => {
      // Collect text and type for debugging / assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (unhandled exceptions) for assertion
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  test.afterEach(async () => {
    // After each test we assert no unexpected page errors occurred.
    // The application is expected to run without runtime exceptions.
    expect(pageErrors.length).toBe(0);
  });

  test('Initial load: controls, canvas and welcome messages are present and input is focused', async ({ page }) => {
    // Purpose: Verify initial UI elements and default state on page load
    const tp = new TreePage(page);
    await tp.goto();

    // Basic DOM presence checks
    await expect(tp.input).toBeVisible();
    await expect(tp.insertBtn).toBeVisible();
    await expect(tp.clearBtn).toBeVisible();
    await expect(tp.legend).toBeVisible();
    await expect(tp.canvas).toBeVisible();
    await expect(tp.canvasContainer).toBeVisible();
    await expect(tp.logDiv).toBeVisible();

    // The log should contain initial welcome messages
    await tp.waitForLogContains('Welcome! Enter integer keys', { timeout: 2000 });
    await tp.waitForLogContains('Duplicates are not allowed', { timeout: 2000 });

    const logText = await tp.getLogText();
    expect(logText).toMatch(/Welcome! Enter integer keys/);
    expect(logText).toMatch(/Duplicates are not allowed/);

    // The input should have initial focus as per the script
    const focused = await tp.inputHasFocus();
    expect(focused).toBe(true);

    // Verify accessibility: log has aria-live attribute for polite announcements
    const ariaLive = await page.getAttribute('#log', 'aria-live');
    expect(ariaLive).toBe('polite');
  });

  test('Insert a single node: log updates and canvas contains drawing', async ({ page }) => {
    // Purpose: Ensure insertion updates the log and draws on canvas
    const tp1 = new TreePage(page);
    await tp.goto();

    // Insert value 10
    await tp.insertValue(10);

    // Wait for expected log entries produced by the insertion/fixup
    await tp.waitForLogContains('Inserted node 10', { timeout: 2000 });
    await tp.waitForLogContains('Root set to BLACK', { timeout: 2000 });

    const lines = await tp.getLogLines();
    // Expect at least the two lines plus initial welcome lines -> ensure inserted message exists
    expect(lines.some(l => l.includes('Inserted node 10'))).toBeTruthy();
    expect(lines.some(l => l.includes('Root set to BLACK'))).toBeTruthy();

    // Canvas should now contain drawn content; ensure toDataURL returns an image data URL
    const dataUrl = await tp.getCanvasDataUrl();
    expect(typeof dataUrl).toBe('string');
    expect(dataUrl.startsWith('data:image')).toBe(true);
    // Ensure dataUrl is not trivially tiny (indicates drawing occurred)
    expect(dataUrl.length).toBeGreaterThan(1000);
  });

  test('Duplicate insert: inserting same key again logs duplicate warning and does not modify canvas state', async ({ page }) => {
    // Purpose: Validate duplicate prevention path and corresponding log message
    const tp2 = new TreePage(page);
    await tp.goto();

    // Insert a value, then attempt to insert duplicate
    await tp.insertValue(42);
    await tp.waitForLogContains('Inserted node 42');

    // Capture canvas state after first insert
    const dataUrlBefore = await tp.getCanvasDataUrl();

    // Attempt duplicate insertion
    await tp.insertValue(42);
    // The code logs a duplicate message; wait for it
    await tp.waitForLogContains('already present. Duplicates not allowed.', { timeout: 2000 });

    const logText1 = await tp.getLogText();
    expect(logText).toMatch(/Key 42 already present\. Duplicates not allowed\./);

    // Canvas should not have drastically changed (no new drawing for duplicate)
    const dataUrlAfter = await tp.getCanvasDataUrl();
    expect(dataUrlAfter).toBe(dataUrlBefore);
  });

  test('Insertion via Enter key works and creates log entries', async ({ page }) => {
    // Purpose: Ensure keyboard submission (Enter) triggers insertion like clicking the button
    const tp3 = new TreePage(page);
    await tp.goto();

    // Use Enter to insert
    await tp.insertValueWithEnter(7);

    // Expect insertion log
    await tp.waitForLogContains('Inserted node 7', { timeout: 2000 });
    const lines1 = await tp.getLogLines();
    expect(lines.some(l => l.includes('Inserted node 7'))).toBeTruthy();
  });

  test('Insert sequence triggers rotations/case handling (logs include rotation messages)', async ({ page }) => {
    // Purpose: Insert multiple nodes to exercise fixup logic; assert that rotation logs appear
    const tp4 = new TreePage(page);
    await tp.goto();

    // Insert a sequence that is likely to require rotations/fixups
    const seq = [30, 20, 10]; // This typical sequence will cause rebalancing operations
    for (const v of seq) {
      await tp.insertValue(v);
      await tp.waitForLogContains(`Inserted node ${v}`, { timeout: 2000 });
    }

    // After multiple inserts, the implementation logs rotations when they occur
    // Assert that at least one rotation or case log appears in the log
    const logText2 = await tp.getLogText();
    const rotationOrCaseSeen = /Left rotate on node|Right rotate on node|Case 1|Case 2|Case 3|mirror/i.test(logText);
    expect(rotationOrCaseSeen).toBe(true);
  });

  test('Invalid input (empty or non-number) triggers alert and does not insert', async ({ page }) => {
    // Purpose: Validate error handling when user tries to insert invalid input
    const tp5 = new TreePage(page);
    await tp.goto();

    // Listen for dialog that should be triggered on invalid input
    let dialogMessage = null;
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Ensure input is empty then click Insert
    await tp.input.fill('');
    await tp.insertBtn.click();

    // Wait a short while for dialog to be handled
    await page.waitForTimeout(200);

    // The alert should mention entering a valid integer
    expect(dialogMessage).toContain('Please enter a valid integer');

    // The log should not include "Inserted node" for invalid input
    const logText3 = await tp.getLogText();
    expect(logText).not.toMatch(/Inserted node/);
  });

  test('Clear Tree resets canvas and clears log content', async ({ page }) => {
    // Purpose: Ensure clear functionality resets the visual and log state
    const tp6 = new TreePage(page);
    await tp.goto();

    // Insert a couple of values
    await tp.insertValue(3);
    await tp.waitForLogContains('Inserted node 3');
    await tp.insertValue(1);
    await tp.waitForLogContains('Inserted node 1');

    const dataUrlBeforeClear = await tp.getCanvasDataUrl();
    expect(dataUrlBeforeClear.length).toBeGreaterThan(1000);

    // Click clear
    await tp.clearTree();

    // After clearing, the log should be empty
    const logTextAfter = await tp.getLogText();
    expect(logTextAfter.trim()).toBe('');

    // Canvas should be cleared - dataURL might still be an image but content should be much smaller or same background.
    // We assert that the log is cleared and that a subsequent insert still works after clearing.
    await tp.insertValue(50);
    await tp.waitForLogContains('Inserted node 50');
    const logAfterInsert = await tp.getLogText();
    expect(logAfterInsert).toMatch(/Inserted node 50/);
  });

  test('Observe console messages and page did not raise runtime exceptions', async ({ page }) => {
    // Purpose: Collect console messages and verify the page did not produce runtime errors
    const tp7 = new TreePage(page);
    await tp.goto();

    // The application writes to the on-page log rather than console; nevertheless capture console messages
    // Ensure we have captured at least zero or more console messages and there were no page errors
    // pageErrors are asserted to be empty in afterEach hook
    // This test explicitly asserts that console messages are an array and contain no "error" type entries
    // Wait a little to allow any late console messages to arrive
    await page.waitForTimeout(200);

    expect(Array.isArray(consoleMessages)).toBe(true);

    // Ensure none of the captured console messages are of type 'error'
    const hasConsoleError = consoleMessages.some(m => m.type === 'error');
    expect(hasConsoleError).toBe(false);
  });
});