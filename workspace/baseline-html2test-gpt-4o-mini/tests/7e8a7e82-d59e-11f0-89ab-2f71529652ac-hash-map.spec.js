import { test, expect } from '@playwright/test';

// Page Object representing the Hash Map page
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.key = page.locator('#key');
    this.value = page.locator('#value');
    this.addBtn = page.locator('#add');
    this.getBtn = page.locator('#get');
    this.removeBtn = page.locator('#remove');
    this.output = page.locator('#output');
    this.heading = page.locator('h1');
  }

  // Navigate to the target URL
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8a7e82-d59e-11f0-89ab-2f71529652ac.html');
  }

  // Fill key and value then click Add
  async add(key, value) {
    await this.key.fill(key);
    await this.value.fill(value);
    await this.addBtn.click();
  }

  // Fill key then click Get
  async get(key) {
    await this.key.fill(key);
    await this.getBtn.click();
  }

  // Fill key then click Remove
  async remove(key) {
    await this.key.fill(key);
    await this.removeBtn.click();
  }

  // Return the output element's innerHTML (the app sets innerHTML)
  async outputInnerHTML() {
    return await this.output.innerHTML();
  }

  // Return the output element's innerText (text as displayed)
  async outputInnerText() {
    return await this.output.innerText();
  }

  // Check if controls are visible and enabled
  async controlsState() {
    return {
      addEnabled: await this.addBtn.isEnabled(),
      getEnabled: await this.getBtn.isEnabled(),
      removeEnabled: await this.removeBtn.isEnabled(),
      keyVisible: await this.key.isVisible(),
      valueVisible: await this.value.isVisible(),
    };
  }

  // Read current values of inputs
  async inputValues() {
    return {
      key: await this.key.inputValue(),
      value: await this.value.inputValue(),
    };
  }
}

test.describe('Hash Map Example - UI and behavior tests', () => {
  // Arrays to collect console errors and page errors for each test
  let consoleErrors;
  let pageErrors;
  let hashmap;

  // Set up before each test: navigate to page and attach listeners to collect console/page errors.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console errors emitted by the page
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect uncaught exceptions / page errors
    page.on('pageerror', (err) => {
      // err is an Error object; store its message for assertions
      pageErrors.push(err.message);
    });

    hashmap = new HashMapPage(page);
    await hashmap.goto();
  });

  // After each test, assert that no console errors or uncaught page errors happened during the interaction.
  test.afterEach(async () => {
    // Assert no uncaught page errors occurred
    expect(pageErrors, `Expected no uncaught page errors, but got: ${JSON.stringify(pageErrors)}`).toEqual([]);
    // Assert no console error messages were logged
    expect(consoleErrors, `Expected no console.error messages, but got: ${JSON.stringify(consoleErrors)}`).toEqual([]);
  });

  test('Initial load: title, heading, controls visible and default output state', async ({ page }) => {
    // Verify heading text and presence of controls
    await expect(hashmap.heading).toHaveText('Hash Map Example');

    const state = await hashmap.controlsState();
    // All interactive controls should be visible and enabled
    expect(state.addEnabled).toBeTruthy();
    expect(state.getEnabled).toBeTruthy();
    expect(state.removeEnabled).toBeTruthy();
    expect(state.keyVisible).toBeTruthy();
    expect(state.valueVisible).toBeTruthy();

    // Output should show the default message for an empty map
    const outputHTML = await hashmap.outputInnerHTML();
    expect(outputHTML).toBe('HashMap is empty');

    // Inputs should be empty on initial load
    const inputs = await hashmap.inputValues();
    expect(inputs.key).toBe('');
    expect(inputs.value).toBe('');
  });

  test('Add a key-value pair: display updates and inputs are cleared', async ({ page }) => {
    // Add a key-value pair and assert the display contains the new entry
    await hashmap.add('foo', 'bar');

    const outputHTML1 = await hashmap.outputInnerHTML();
    // The display method uses `${key}: ${value}<br>`
    expect(outputHTML).toContain('foo: bar');
    expect(outputHTML).toContain('<br>');

    // After adding, inputs should be cleared
    const inputs1 = await hashmap.inputValues();
    expect(inputs.key).toBe('');
    expect(inputs.value).toBe('');
  });

  test('Get value by key: shows only the value when using Get button', async ({ page }) => {
    // Add an entry first
    await hashmap.add('alpha', '1');

    // Now get the value for 'alpha'
    await hashmap.get('alpha');

    // The Get button sets output.innerHTML to the returned value (no <br>)
    const outputText = await hashmap.outputInnerHTML();
    expect(outputText).toBe('1');

    // Input cleared after get
    const inputs2 = await hashmap.inputValues();
    expect(inputs.key).toBe('');
  });

  test('Get non-existing key: returns "Key not found"', async ({ page }) => {
    // Ensure requesting a key that doesn't exist yields the expected message
    await hashmap.get('doesNotExist');

    const outputText1 = await hashmap.outputInnerHTML();
    expect(outputText).toBe('Key not found');
  });

  test('Remove a key: returns "Key removed" and updates display', async ({ page }) => {
    // Add two entries
    await hashmap.add('one', '1');
    await hashmap.add('two', '2');

    // Remove 'one'
    await hashmap.remove('one');

    // The remove handler sets output to result + '<br>' + hashMap.display()
    const outputHTML2 = await hashmap.outputInnerHTML();
    // Should indicate removal and still show remaining key 'two'
    expect(outputHTML).toContain('Key removed');
    expect(outputHTML).toContain('two: 2');

    // Ensure removed key is not displayed
    expect(outputHTML).not.toContain('one: 1');
  });

  test('Removing non-existing key: returns "Key not found" and display remains unchanged', async ({ page }) => {
    // Add a single entry
    await hashmap.add('keep', 'ok');

    // Remove a non-existing key
    await hashmap.remove('missing');

    const outputHTML3 = await hashmap.outputInnerHTML();
    // For missing key, remove() returns 'Key not found' and then '<br>' + display
    expect(outputHTML).toContain('Key not found');
    // Original entry should still be present in the display portion
    expect(outputHTML).toContain('keep: ok');
  });

  test('Duplicate key insertion overwrites existing value', async ({ page }) => {
    // Add a key
    await hashmap.add('dup', 'first');

    // Add same key with new value
    await hashmap.add('dup', 'second');

    // Display should show the updated value
    const outputHTML4 = await hashmap.outputInnerHTML();
    expect(outputHTML).toContain('dup: second');
    expect(outputHTML).not.toContain('dup: first');
  });

  test('Empty key behavior: adding and removing an empty key', async ({ page }) => {
    // Add an empty key with some value
    await hashmap.add('', 'emptyVal');

    const outputHTMLAfterAdd = await hashmap.outputInnerHTML();
    // The display will include ": emptyVal" because key is an empty string
    expect(outputHTMLAfterAdd).toContain(': emptyVal');

    // Now remove the empty key - because the code uses the provided key which can be empty
    await hashmap.remove('');

    const outputHTMLAfterRemove = await hashmap.outputInnerHTML();
    // Should indicate 'Key removed' and display updated map (likely empty)
    expect(outputHTMLAfterRemove).toContain('Key removed');
  });

  test('Visual and accessibility checks: buttons have accessible names and are enabled', async ({ page }) => {
    // Buttons should have the expected visible text and be enabled
    await expect(hashmap.addBtn).toHaveText('Add to Hash Map');
    await expect(hashmap.getBtn).toHaveText('Get Value');
    await expect(hashmap.removeBtn).toHaveText('Remove from Hash Map');

    const state1 = await hashmap.controlsState();
    expect(state.addEnabled).toBeTruthy();
    expect(state.getEnabled).toBeTruthy();
    expect(state.removeEnabled).toBeTruthy();
  });

  test('Multiple operations flow: add, get, add another, remove one - final display consistent', async ({ page }) => {
    // Add several entries
    await hashmap.add('a', 'A');
    await hashmap.add('b', 'B');

    // Get 'a' to ensure reading doesn't mutate the underlying map
    await hashmap.get('a');
    expect(await hashmap.outputInnerHTML()).toBe('A');

    // Add another and remove 'b'
    await hashmap.add('c', 'C');
    await hashmap.remove('b');

    const finalOutput = await hashmap.outputInnerHTML();
    // Should indicate Key removed and show remaining keys 'a' and 'c'
    expect(finalOutput).toContain('Key removed');
    expect(finalOutput).toContain('a: A');
    expect(finalOutput).toContain('c: C');
    // Ensure 'b' is no longer present
    expect(finalOutput).not.toContain('b: B');
  });
});