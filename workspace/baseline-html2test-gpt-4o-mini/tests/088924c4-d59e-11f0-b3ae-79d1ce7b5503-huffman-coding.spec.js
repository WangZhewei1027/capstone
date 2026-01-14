import { test, expect } from '@playwright/test';

// URL of the page under test
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/088924c4-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object Model for the Huffman Coding page
class HuffmanPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputSelector = '#inputString';
    this.generateButtonSelector = 'button.btn';
    this.codesPreSelector = '#huffmanCodes';
    this.encodedPreSelector = '#encodedString';
    this.resultAreaSelector = '#resultArea';
  }

  // Navigate to the application URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the input string
  async fillInput(text) {
    await this.page.fill(this.inputSelector, text);
  }

  // Click the "Generate Huffman Codes" button
  async clickGenerate() {
    await this.page.click(this.generateButtonSelector);
  }

  // Return the raw text content of the codes pre element
  async getCodesText() {
    return (await this.page.textContent(this.codesPreSelector)) ?? '';
  }

  // Parse the codes pre's JSON into an object. If empty, return {}
  async getCodesObject() {
    const txt = (await this.getCodesText()).trim();
    if (!txt) return {};
    // The app uses JSON.stringify(huffmanCodes, null, 2) to render codes,
    // so we can safely parse it back to an object when non-empty.
    try {
      return JSON.parse(txt);
    } catch (e) {
      // If parsing fails, return null so tests can assert failures intentionally
      return null;
    }
  }

  // Return the encoded string displayed on the page
  async getEncodedText() {
    // textContent returns empty string if nothing inside; coerce to ''
    return (await this.page.textContent(this.encodedPreSelector)) ?? '';
  }

  // Wait for the result area to be visible (simple visibility check)
  async waitForResultVisible() {
    await this.page.waitForSelector(this.resultAreaSelector, { state: 'visible' });
  }
}

test.describe('Huffman Coding Visualization - E2E', () => {
  let consoleErrors = [];
  let pageErrors = [];

  // Attach listeners before each test to collect console and page errors.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Collect unhandled page errors (exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app
    const huff = new HuffmanPage(page);
    await huff.goto();
  });

  // Test: Initial page load and default state
  test('initial page load shows expected structure and no console/page errors', async ({ page }) => {
    const huff1 = new HuffmanPage(page);

    // Ensure the result area and inputs are present and visible
    await huff.waitForResultVisible();
    await expect(page.locator(huff.inputSelector)).toBeVisible();
    await expect(page.locator(huff.generateButtonSelector)).toBeVisible();
    await expect(page.locator(huff.codesPreSelector)).toBeVisible();
    await expect(page.locator(huff.encodedPreSelector)).toBeVisible();

    // On initial load the pre elements should be empty
    const codesText = await huff.getCodesText();
    const encodedText = await huff.getEncodedText();
    expect(codesText.trim()).toBe('', 'Expected huffman codes area to be empty on initial load');
    expect(encodedText).toBe('', 'Expected encoded string area to be empty on initial load');

    // Assert there were no console errors or uncaught page exceptions during load
    expect(consoleErrors.length, `Console errors were found: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `Page errors were found: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  // Test: Generating with empty input should show empty codes and encoded string
  test('generating with empty input updates results to empty object and empty encoded string', async ({ page }) => {
    const huff2 = new HuffmanPage(page);

    // Ensure input is empty then click generate
    await huff.fillInput('');
    await huff.clickGenerate();

    // Wait a short moment for DOM updates
    await page.waitForTimeout(50);

    // The app displays the codes using JSON.stringify(..., null, 2)
    const codesText1 = await huff.getCodesText();
    const encodedText1 = await huff.getEncodedText();

    // For an empty codes object JSON.stringify({}, null, 2) returns '{}'
    expect(codesText.trim()).toBe('{}', 'Expected codes JSON to be "{}" for empty input');
    expect(encodedText).toBe('', 'Expected encoded string to be empty for empty input');

    // No console or page errors should have occurred
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test: Single-character input behavior (edge-case)
  test('single-character input produces a single code (possibly empty) and encoded string is concatenation of codes', async ({ page }) => {
    const huff3 = new HuffmanPage(page);
    const input = 'aaaa';

    // Fill and generate
    await huff.fillInput(input);
    await huff.clickGenerate();

    // Allow DOM to update
    await page.waitForTimeout(50);

    // Parse codes object and encoded string
    const codesObj = await huff.getCodesObject();
    const encodedText2 = await huff.getEncodedText();

    // There should be a single key for 'a'
    expect(codesObj).not.toBeNull();
    const keys = Object.keys(codesObj);
    expect(keys.length).toBe(1);
    expect(keys[0]).toBe('a');

    // For a tree with only one symbol the implementation stores an empty string as the code
    // So encoded string should be an empty string (since each 'a' maps to '')
    expect(codesObj['a']).toBeDefined();
    expect(encodedText).toBe(input.split('').map(() => codesObj['a']).join(''));

    // Confirm there were no runtime errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test: Typical multi-character input - validate codes encode the input correctly
  test('multi-character input generates codes object and encoded string that decodes to the original via mapping', async ({ page }) => {
    const huff4 = new HuffmanPage(page);
    const input1 = 'abbccc'; // varying frequencies to produce a non-trivial tree

    // Fill and click generate
    await huff.fillInput(input);
    await huff.clickGenerate();

    // Wait for DOM update
    await page.waitForTimeout(50);

    // Extract the codes and encoded result
    const codesObj1 = await huff.getCodesObject();
    const encodedText3 = await huff.getEncodedText();

    // Basic sanity checks
    expect(codesObj).not.toBeNull();
    // Codes object should contain exactly the unique characters from input
    const uniqueChars = Array.from(new Set(input.split('')));
    expect(Object.keys(codesObj).sort()).toEqual(uniqueChars.sort());

    // Every code should be a string (possibly empty only if single-symbol - not the case here)
    for (const k of Object.keys(codesObj)) {
      expect(typeof codesObj[k]).toBe('string');
    }

    // Reconstruct expected encoded string by mapping each input character through the codes object
    const expectedEncoded = input.split('').map(ch => codesObj[ch]).join('');
    expect(encodedText).toBe(expectedEncoded);

    // No console or page errors should have been emitted
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test: Re-generating after changing input updates DOM accordingly
  test('updating the input and regenerating updates codes and encoded string accordingly', async ({ page }) => {
    const huff5 = new HuffmanPage(page);

    const firstInput = 'abc';
    await huff.fillInput(firstInput);
    await huff.clickGenerate();
    await page.waitForTimeout(50);
    const firstCodes = await huff.getCodesObject();
    const firstEncoded = await huff.getEncodedText();

    // Now change input to a different string and regenerate
    const secondInput = 'aab';
    await huff.fillInput(secondInput);
    await huff.clickGenerate();
    await page.waitForTimeout(50);
    const secondCodes = await huff.getCodesObject();
    const secondEncoded = await huff.getEncodedText();

    // The codes and encoded outputs should change in response to the new input
    expect(JSON.stringify(firstCodes)).not.toBe(JSON.stringify(secondCodes), 'Expected codes to change after input change');
    expect(firstEncoded).not.toBe(secondEncoded, 'Expected encoded string to change after input change');

    // The second encoded string should equal mapping of second input through secondCodes
    const expectedSecondEncoded = secondInput.split('').map(ch => secondCodes[ch]).join('');
    expect(secondEncoded).toBe(expectedSecondEncoded);

    // No console or page errors should have been emitted
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test: When input contains whitespace and special characters, the app should handle them
  test('input with spaces and special characters are coded and displayed correctly', async ({ page }) => {
    const huff6 = new HuffmanPage(page);
    const input2 = 'a a!b b';

    await huff.fillInput(input);
    await huff.clickGenerate();
    await page.waitForTimeout(50);

    const codesObj2 = await huff.getCodesObject();
    const encodedText4 = await huff.getEncodedText();

    // Ensure all unique characters present in codes
    const uniqueChars1 = Array.from(new Set(input.split('')));
    expect(Object.keys(codesObj).sort()).toEqual(uniqueChars.sort());

    // Reconstruct expected encoded string and assert equality
    const expectedEncoded1 = input.split('').map(ch => codesObj[ch]).join('');
    expect(encodedText).toBe(expectedEncoded);

    // No runtime errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});