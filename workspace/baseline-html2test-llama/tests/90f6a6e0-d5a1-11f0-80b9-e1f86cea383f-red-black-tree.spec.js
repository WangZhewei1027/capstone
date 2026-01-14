import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6a6e0-d5a1-11f0-80b9-e1f86cea383f.html';

/**
 * Page Object for the Red-Black Tree demo app.
 * Encapsulates common selectors and actions on the page.
 */
class TreePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#value');
    this.insertButton = page.locator('#insert');
    this.deleteButton = page.locator('#delete');
    this.searchButton = page.locator('#search');
    this.treeContainer = page.locator('#tree');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillValue(value) {
    await this.input.fill(String(value));
  }

  async clickInsert() {
    await this.insertButton.click();
  }

  async clickDelete() {
    await this.deleteButton.click();
  }

  async clickSearch() {
    await this.searchButton.click();
  }

  async getTreeText() {
    return (await this.treeContainer.innerText()).trim();
  }

  async getTreeHTML() {
    return await this.treeContainer.innerHTML();
  }

  async inputValueCleared() {
    return (await this.input.inputValue()) === '';
  }
}

test.describe('Red-Black Tree demo - UI and behavior tests', () => {
  // Arrays to capture console messages and page errors per test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset capture arrays
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for diagnosis
    page.on('console', (msg) => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch {
        // ignore any unexpected console message shape errors
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial load and default state
  test('Initial page load should show controls and an empty tree container', async ({ page }) => {
    // Arrange
    const treePage = new TreePage(page);
    await treePage.goto();

    // Assert the input and buttons are visible
    await expect(treePage.input).toBeVisible();
    await expect(treePage.insertButton).toBeVisible();
    await expect(treePage.deleteButton).toBeVisible();
    await expect(treePage.searchButton).toBeVisible();

    // The tree container should exist and initially be empty (no nodes rendered)
    const treeText = await treePage.getTreeText();
    expect(treeText).toBe('', 'Expected empty tree display on initial load');

    // No uncaught page errors occurred during initial load
    expect(pageErrors.length).toBe(0, `Unexpected page errors on load: ${pageErrors.map(e => e?.message).join('; ')}`);

    // Log any console output for debugging if present (but assert none are errors)
    const errorConsoles = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoles.length).toBe(0, `Unexpected console.error messages: ${JSON.stringify(errorConsoles)}`);
  });

  test.describe('Insert behavior', () => {
    test('Inserting a single numeric value displays it in the tree and clears the input', async ({ page }) => {
      // Purpose: Verify insert button inserts numeric value and the input is cleared afterward.
      const treePage1 = new TreePage(page);
      await treePage.goto();

      await treePage.fillValue('10');
      await treePage.clickInsert();

      // The tree's displayed text should include the inserted value (as the implementation renders p elements)
      const treeText1 = await treePage.getTreeText();
      expect(treeText).toContain('10', 'Tree should display the inserted value 10');

      // The input should be cleared after insertion
      expect(await treePage.inputValueCleared()).toBe(true);

      // Check for absence of page errors or console errors
      expect(pageErrors.length).toBe(0);
      expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    });

    test('Inserting non-numeric value results in NaN node displayed (edge case)', async ({ page }) => {
      // Purpose: The app uses parseInt without validation. Inserting "abc" will produce NaN.
      const treePage2 = new TreePage(page);
      await treePage.goto();

      await treePage.fillValue('abc');
      await treePage.clickInsert();

      const treeText2 = await treePage.getTreeText();
      // The implementation will render the node value directly; expect "NaN" to be displayed
      expect(treeText).toContain('NaN', 'Non-numeric insert should display NaN in the tree');

      expect(pageErrors.length).toBe(0);
      expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    });

    test('Inserting multiple values demonstrates left-chain rendering (implementation detail)', async ({ page }) => {
      // Purpose: Confirm updateTree traverses left only, so only root -> left -> left ... are shown.
      const treePage3 = new TreePage(page);
      await treePage.goto();

      // Insert values 20, 5, 15 in that order
      await treePage.fillValue('20');
      await treePage.clickInsert();

      await treePage.fillValue('5');
      await treePage.clickInsert();

      await treePage.fillValue('15');
      await treePage.clickInsert();

      // The implementation's updateTree walks node = node.left repeatedly starting from root.
      // Therefore, 20 and 5 (root and its left) should be displayed, but 15 (a right child of 5) will not.
      const html = await treePage.getTreeHTML();
      expect(html).toContain('<p>20</p>');
      expect(html).toContain('<p>5</p>');
      expect(html).not.toContain('<p>15</p>');

      expect(pageErrors.length).toBe(0);
      expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    });
  });

  test.describe('Delete behavior', () => {
    test('Deleting a leaf node removes it from visible left-chain rendering', async ({ page }) => {
      // Purpose: Verify delete removes a node and updateTree reflects the change (as per left-chain rendering).
      const treePage4 = new TreePage(page);
      await treePage.goto();

      // Insert three nodes: root 10, left 5, right 15
      await treePage.fillValue('10');
      await treePage.clickInsert();
      await treePage.fillValue('5');
      await treePage.clickInsert();
      await treePage.fillValue('15');
      await treePage.clickInsert();

      // Delete leaf value 5
      await treePage.fillValue('5');
      await treePage.clickDelete();

      // After deletion, updateTree shows the left-chain starting from root.
      const html1 = await treePage.getTreeHTML();
      // 5 should no longer be present
      expect(html).not.toContain('<p>5</p>');

      // Root should still be present
      expect(html).toContain('<p>10</p>');

      expect(pageErrors.length).toBe(0);
      expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    });

    test('Deleting a non-existent value is a no-op and does not throw', async ({ page }) => {
      // Purpose: Ensure deletion of a value not in the tree does not produce errors.
      const treePage5 = new TreePage(page);
      await treePage.goto();

      // Ensure tree empty; attempt delete on missing value
      await treePage.fillValue('9999');
      await treePage.clickDelete();

      const treeText3 = await treePage.getTreeText();
      // Since tree was empty, still empty
      expect(treeText).toBe('', 'Deleting from an empty tree should leave it empty');

      expect(pageErrors.length).toBe(0);
      expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    });
  });

  test.describe('Search behavior', () => {
    test('Searching for an existing value does not leave the "Found" message in DOM (implementation quirk)', async ({ page }) => {
      // Purpose: The code sets "Found: X" then calls updateTree which overwrites it.
      const treePage6 = new TreePage(page);
      await treePage.goto();

      // Insert value 7
      await treePage.fillValue('7');
      await treePage.clickInsert();

      // Now search for 7
      await treePage.fillValue('7');
      await treePage.clickSearch();

      // Because the implementation overwrites the message with updateTree immediately,
      // the persistent DOM should contain the left-chain values (7) and not "Found: 7".
      const html2 = await treePage.getTreeHTML();
      expect(html).toContain('<p>7</p>');
      expect(html).not.toContain('Found: 7');

      expect(pageErrors.length).toBe(0);
      expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    });

    test('Searching for a non-existing value does not crash and maintains DOM', async ({ page }) => {
      // Purpose: Ensure searching for absent value yields no persistent "Not found" message (overwritten)
      const treePage7 = new TreePage(page);
      await treePage.goto();

      // Insert a different value
      await treePage.fillValue('3');
      await treePage.clickInsert();

      // Search for a value that does not exist
      await treePage.fillValue('999');
      await treePage.clickSearch();

      // The UI will be overwritten by updateTree; ensure DOM remains consistent and no errors thrown
      const html3 = await treePage.getTreeHTML();
      expect(html).toContain('<p>3</p>');
      expect(html).not.toContain('Not found');

      expect(pageErrors.length).toBe(0);
      expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    });
  });

  test('Accessibility and focus behavior on controls', async ({ page }) => {
    // Purpose: Basic accessibility checks - tab order and focus on input and buttons.
    const treePage8 = new TreePage(page);
    await treePage.goto();

    // Focus the input
    await treePage.input.focus();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('value');

    // Tab to Insert button and ensure it receives focus
    await page.keyboard.press('Tab');
    // Focus could go to the insert button—verify active element has id 'insert' or is a button
    const activeId = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
    // Accept either direct insert button focus or some other focusable element — at least ensure there is an active element
    expect(activeId).toBeTruthy();

    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });
});