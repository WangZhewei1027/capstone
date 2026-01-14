import { test, expect } from '@playwright/test';

// Test file: f7689391-d5b8-11f0-9ee1-ef07bdc6053d.spec.js
// URL served by the test harness
const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7689391-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page object to encapsulate interactions with the Huffman page
class HuffmanPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.textarea = page.locator('#inputText');
    this.button = page.locator('button[onclick="huffmanCode()"]');
    this.output = page.locator('#output');
    this.treeNodes = () => page.locator('#output .tree-node');
    this.heading = () => page.locator('#output h2');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setInput(text) {
    await this.textarea.fill(text);
  }

  async clickGenerate() {
    await this.button.click();
  }

  async getOutputHTML() {
    return this.output.innerHTML();
  }

  async getNodesCount() {
    return this.treeNodes().count();
  }

  async getNodeTexts() {
    const count = await this.getNodesCount();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.treeNodes().nth(i).innerText());
    }
    return texts;
  }

  async getHeadingText() {
    return this.heading().innerText();
  }
}

// Group tests related to FSM states and transitions
test.describe('Huffman Coding Visualization - FSM tests', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  // Setup before each test: navigate to the page and attach listeners
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console events
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture unhandled page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  // Test initial Idle state renders correctly
  test('Idle state renders expected UI elements (textarea, button, empty output)', async ({ page }) => {
    // Arrange
    const hPage = new HuffmanPage(page);

    // Act
    await hPage.goto();

    // Assert - initial UI elements exist and show expected initial evidence
    await expect(hPage.textarea).toBeVisible();
    await expect(hPage.textarea).toHaveAttribute('placeholder', 'Enter text to encode using Huffman coding...');
    await expect(hPage.button).toBeVisible();
    await expect(hPage.button).toHaveText('Generate Huffman Code');
    await expect(hPage.output).toBeVisible();

    // The output div should initially be empty (no heading or nodes)
    const outputHTML = await hPage.getOutputHTML();
    expect(outputHTML.trim()).toBe('');

    // Assert that no runtime page errors or console error messages occurred on initial render
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test the main transition: clicking Generate Huffman Code produces codes in output
  test('Generate Huffman Code transition produces Huffman Codes for sample input', async ({ page }) => {
    // This test validates the transition S0_Idle -> S1_CodeGenerated triggered by the button click.
    const hPage = new HuffmanPage(page);
    await hPage.goto();

    // Use a sample input with multiple distinct characters
    const sample = 'aaabcc';
    await hPage.setInput(sample);

    // Click the button to trigger huffmanCode()
    await hPage.clickGenerate();

    // The output should have heading and tree-node entries for each unique character: a, b, c
    await expect(hPage.heading()).toHaveText('Huffman Codes:');

    // There should be 3 tree-node elements (a, b, c)
    const nodeCount = await hPage.getNodesCount();
    // Unique characters in sample:
    const uniqueChars = new Set(sample.split(''));
    expect(nodeCount).toBe(uniqueChars.size);

    // Each node text should be of the form "char: code", code composed only of 0/1 (code may be empty for single-node trees)
    const nodeTexts = await hPage.getNodeTexts();
    for (const text of nodeTexts) {
      // Validate has "char: code" structure
      expect(text).toMatch(/^[\s\S]:[\s\S]*$/); // basic shape: something colon something (allow multi-char keys like whitespace)
      // Extract the part after ":" and trim
      const parts = text.split(':');
      // guard in case split yields more than 2 parts
      const codePart = parts.slice(1).join(':').trim();
      // code should consist only of 0/1 characters (or be empty)
      expect(codePart).toMatch(/^[01]*$/);
    }

    // Validate that the number of distinct codes equals number of unique chars
    const codes = nodeTexts.map(t => t.split(':').slice(1).join(':').trim());
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(nodeCount);

    // Check that there were no console errors or page errors during generation
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Edge case: empty input -> output should only show heading and no nodes
  test('Edge case: empty input produces only heading (no codes) and no runtime errors', async ({ page }) => {
    const hPage = new HuffmanPage(page);
    await hPage.goto();

    // Ensure textarea is empty
    await hPage.setInput('');

    // Click to generate codes
    await hPage.clickGenerate();

    // displayOutput should have been called but produced only the heading
    await expect(hPage.heading()).toHaveText('Huffman Codes:');
    const nodeCount = await hPage.getNodesCount();
    expect(nodeCount).toBe(0);

    // The output HTML should equal exactly the heading markup as implemented
    const html = (await hPage.getOutputHTML()).trim();
    expect(html).toBe('<h2>Huffman Codes:</h2>');

    // No runtime errors expected
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Edge case: single-character input -> single node with possibly empty code string
  test('Edge case: single distinct character input yields one node with an empty or valid binary code', async ({ page }) => {
    const hPage = new HuffmanPage(page);
    await hPage.goto();

    // Single distinct character repeated
    await hPage.setInput('aaaa');

    await hPage.clickGenerate();

    // One node only
    const nodeCount = await hPage.getNodesCount();
    expect(nodeCount).toBe(1);

    const nodeTexts = await hPage.getNodeTexts();
    expect(nodeTexts.length).toBe(1);

    const text = nodeTexts[0];
    // Should be like "a: " or "a: <code>"
    expect(text).toMatch(/^.{1,}:\s.*$/);

    // Extract code part and assert it's binary or empty
    const codePart = text.split(':').slice(1).join(':').trim();
    expect(codePart).toMatch(/^[01]*$/);

    // No console or page errors
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Consolidated test that monitors console and page errors while performing several interactions
  test('Console and pageerror monitoring across multiple interactions', async ({ page }) => {
    const hPage = new HuffmanPage(page);
    await hPage.goto();

    // Perform multiple interactions to exercise the code paths
    await hPage.setInput('abcabcabc');
    await hPage.clickGenerate();
    await hPage.setInput('zzzz');
    await hPage.clickGenerate();
    await hPage.setInput('');
    await hPage.clickGenerate();

    // After those interactions, assert no uncaught page errors were emitted
    // and no console errors/warnings were printed
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(errorConsoleMsgs.length).toBe(0, `Console error/warning messages found: ${JSON.stringify(errorConsoleMsgs)}`);
    expect(pageErrors.length).toBe(0, `Page errors found: ${pageErrors.map(e => String(e)).join('\n')}`);

    // Finally, ensure output DOM still consistent: heading present
    await expect(hPage.heading()).toHaveText('Huffman Codes:');
  });
});