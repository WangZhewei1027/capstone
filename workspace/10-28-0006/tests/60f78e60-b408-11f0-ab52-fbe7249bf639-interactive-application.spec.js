import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0006/html/60f78e60-b408-11f0-ab52-fbe7249bf639.html';

class HashMapPage {
  /**
   * Page Object encapsulating interactions with the Interactive Hash Map Explorer.
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#key');
    this.valueInput = page.locator('#value');
    this.addButton = page.locator('#add-button');
    this.removeButton = page.locator('#remove-button');
    this.output = page.locator('#output');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
    // Ensure the main elements are visible.
    await expect(this.keyInput).toBeVisible();
    await expect(this.valueInput).toBeVisible();
    await expect(this.addButton).toBeVisible();
    await expect(this.removeButton).toBeVisible();
    await expect(this.output).toBeVisible();
  }

  async setKey(value) {
    await this.keyInput.fill(value);
  }

  async setValue(value) {
    await this.valueInput.fill(value);
  }

  async clickAdd() {
    await this.addButton.click();
  }

  async clickRemove() {
    await this.removeButton.click();
  }

  async addEntry(key, value) {
    await this.setKey(key);
    await this.setValue(value);
    await this.clickAdd();
  }

  async removeEntry(key) {
    await this.setKey(key);
    await this.clickRemove();
  }

  async getOutputHTML() {
    return await this.output.evaluate(el => el.innerHTML);
  }

  async getOutputText() {
    return await this.output.textContent();
  }

  async getInlineOpacity() {
    return await this.output.evaluate(el => el.style.opacity || '');
  }

  async getComputedOpacity() {
    return await this.output.evaluate(el => getComputedStyle(el).opacity);
  }

  async waitForFadeCycle() {
    // Wait for fade to start (opacity 0), then complete (opacity 1).
    // The fade function sets opacity to 0, and after 300ms sets it to 1.
    await this.page.waitForFunction(() => {
      const el = document.getElementById('output');
      return el && el.style.opacity === '0';
    }, { timeout: 1500 });
    await this.page.waitForFunction(() => {
      const el = document.getElementById('output');
      return el && el.style.opacity === '1';
    }, { timeout: 1500 });
  }

  async ensureNoFadeHappened() {
    // After 500ms, opacity should not be 0 (no fade effect for invalid flows).
    await this.page.waitForTimeout(500);
    const inlineOpacity = await this.getInlineOpacity();
    const computedOpacity = await this.getComputedOpacity();
    // Inline opacity should be empty or 1, and computed should be 1.
    expect(inlineOpacity === '' || inlineOpacity === '1').toBeTruthy();
    expect(computedOpacity).toBe('1');
  }

  async expectOutputContainsText(regexOrString) {
    await expect(this.output).toContainText(regexOrString);
  }

  async expectOutputNotContainsText(text) {
    const outputText = await this.getOutputText();
    expect(outputText || '').not.toContain(text);
  }

  async expectInputsCleared() {
    await expect(this.keyInput).toHaveValue('');
    await expect(this.valueInput).toHaveValue('');
  }

  async captureNextDialogAndAccept(expectedMessageSubstring) {
    return new Promise(resolve => {
      this.page.once('dialog', async dialog => {
        const msg = dialog.message();
        expect(msg).toContain(expectedMessageSubstring);
        await dialog.accept();
        resolve(msg);
      });
    });
  }
}

test.describe('Interactive Hash Map Explorer - FSM Transitions and UI Feedback', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to the application and ensure UI is ready
    const app = new HashMapPage(page);
    await app.goto();
  });

  test.afterEach(async ({ page }) => {
    // Teardown: No persistent state expected between tests. Ensure no lingering dialogs.
    page.removeAllListeners('dialog');
  });

  test('Initial idle state: output is empty and UI ready', async ({ page }) => {
    // Validates 'idle' state at load: no operations performed yet.
    const app = new HashMapPage(page);

    const text = await app.getOutputText();
    // Output should be initially empty
    expect((text || '').trim()).toBe('');

    // Computed opacity should be 1 (visible)
    const computedOpacity = await app.getComputedOpacity();
    expect(computedOpacity).toBe('1');

    // Buttons and inputs should be enabled
    await expect(app.addButton).toBeEnabled();
    await expect(app.removeButton).toBeEnabled();
    await expect(app.keyInput).toBeEnabled();
    await expect(app.valueInput).toBeEnabled();
  });

  test('Successful add: validating_add -> adding -> updating_output_after_add -> clearing_inputs -> fading -> idle', async ({ page }) => {
    // Validates the full successful add flow and visual feedback
    const app = new HashMapPage(page);

    // Use trimmed inputs with extra whitespace to verify trim behavior
    await app.addEntry('   user   ', '  Alice  ');

    // OUTPUT_UPDATED: verify output shows "Entry Added" and contains key/value (trimmed)
    await app.expectOutputContainsText(/Entry\s+Added/i);
    await app.expectOutputContainsText(/user/i);
    await app.expectOutputContainsText(/Alice/i);

    // INPUTS_CLEARED: inputs are cleared automatically after updating output
    await app.expectInputsCleared();

    // Fading: verify fade effect transitions opacity 0 -> 1
    await app.waitForFadeCycle();

    // Back to idle: no further transitions; UI ready for next interaction
    await expect(app.addButton).toBeEnabled();
    await expect(app.removeButton).toBeEnabled();
  });

  test('Invalid add: validating_add -> alert_invalid_inputs -> idle (missing value)', async ({ page }) => {
    // Validates INPUTS_INVALID and alert flow when value is missing/whitespace
    const app = new HashMapPage(page);

    // Prepare inputs with missing/whitespace value
    await app.setKey('user');
    await app.setValue('   ');

    // Capture alert and accept it (ALERT_OK)
    const alertPromise = app.captureNextDialogAndAccept('Please specify both key and value.');
    await app.clickAdd();
    await alertPromise;

    // State returns to idle; output remains unchanged (no update)
    const html = await app.getOutputHTML();
    expect((html || '').trim()).toBe('');

    // Inputs should remain as typed (no clear_inputs for invalid path)
    await expect(app.keyInput).toHaveValue('user');
    await expect(app.valueInput).toHaveValue('   ');

    // Ensure no fade effect occurred
    await app.ensureNoFadeHappened();
  });

  test('Invalid add: validating_add -> alert_invalid_inputs -> idle (missing key)', async ({ page }) => {
    // Validates INPUTS_INVALID when key is missing
    const app = new HashMapPage(page);

    await app.setKey('   ');
    await app.setValue('value');
    const alertPromise = app.captureNextDialogAndAccept('Please specify both key and value.');
    await app.clickAdd();
    await alertPromise;

    const html = await app.getOutputHTML();
    expect((html || '').trim()).toBe('');
    await expect(app.keyInput).toHaveValue('   ');
    await expect(app.valueInput).toHaveValue('value');
    await app.ensureNoFadeHappened();
  });

  test('Remove non-existent key: validating_remove -> alert_key_not_found -> idle', async ({ page }) => {
    // Validates KEY_NOT_FOUND path and alert flow
    const app = new HashMapPage(page);

    await app.setKey('ghost');
    const alertPromise = app.captureNextDialogAndAccept('Key not found');
    await app.clickRemove();
    await alertPromise;

    // Output remains unchanged
    const html = await app.getOutputHTML();
    expect((html || '').trim()).toBe('');

    // No fade in error path
    await app.ensureNoFadeHappened();
  });

  test('Successful remove: validating_remove -> removing -> updating_output_after_remove -> clearing_inputs -> fading -> idle', async ({ page }) => {
    // Validates the full successful remove flow and UI feedback
    const app = new HashMapPage(page);

    // Add an entry first to ensure key exists
    await app.addEntry('user', 'Alice');
    await app.waitForFadeCycle();

    // Now remove the existing key
    await app.removeEntry('user');

    // OUTPUT_UPDATED: verify "Entry Removed" and that value "Alice" no longer appears in the map display
    await app.expectOutputContainsText(/Entry\s+Removed/i);
    await app.expectOutputNotContainsText('Alice');

    // INPUTS_CLEARED: inputs should be cleared after removal
    await app.expectInputsCleared();

    // Fading effect occurs
    await app.waitForFadeCycle();
  });

  test('Trimming during removal: spaces around key are trimmed (KEY_FOUND)', async ({ page }) => {
    // Validates read_and_trim_key and successful removal with whitespace in input
    const app = new HashMapPage(page);

    await app.addEntry('spaced', 'X');
    await app.waitForFadeCycle();

    // Remove with leading/trailing spaces; should find and remove
    await app.removeEntry('   spaced   ');
    await app.expectOutputContainsText(/Entry\s+Removed/i);
    await app.waitForFadeCycle();
  });

  test('Trimming during add: spaces around key/value are trimmed (INPUTS_VALID)', async ({ page }) => {
    // Validates read_and_trim_inputs and successful add with spaces
    const app = new HashMapPage(page);

    await app.addEntry('   k   ', '   v   ');
    await app.expectOutputContainsText(/Entry\s+Added/i);

    // The displayed output should include trimmed key/value; we check presence of "k" and "v".
    await app.expectOutputContainsText('k');
    await app.expectOutputContainsText('v');

    await app.waitForFadeCycle();
  });

  test('Duplicate key updates existing value (ENTRY_ADDED -> OUTPUT_UPDATED)', async ({ page }) => {
    // Validates that adding the same key updates the value (hashMap replacement)
    const app = new HashMapPage(page);

    await app.addEntry('dup', 'one');
    await app.waitForFadeCycle();

    await app.addEntry('dup', 'two');

    // Output should reflect the updated value
    await app.expectOutputContainsText(/Entry\s+Added/i);
    await app.expectOutputContainsText('dup');
    await app.expectOutputContainsText('two');

    // The previous value "one" should not be present in the current map display
    await app.expectOutputNotContainsText('dup: one');
    await app.waitForFadeCycle();
  });

  test('Clear inputs occurs after both add and remove (INPUTS_CLEARED)', async ({ page }) => {
    // Validates clear_inputs action on both flows
    const app = new HashMapPage(page);

    await app.addEntry('a', '1');
    await app.expectInputsCleared();
    await app.waitForFadeCycle();

    await app.removeEntry('a');
    await app.expectInputsCleared();
    await app.waitForFadeCycle();
  });

  test('Fade effect cycles opacity to 0 then back to 1 after OUTPUT_UPDATED (FADE_COMPLETE) - add flow', async ({ page }) => {
    // Explicitly validates fade behavior on add flow
    const app = new HashMapPage(page);

    const initialComputed = await app.getComputedOpacity();
    expect(initialComputed).toBe('1');

    await app.addEntry('fadeKey', 'fadeValue');

    // Wait for fade cycle and confirm final state
    await app.waitForFadeCycle();

    const inlineOpacityAfter = await app.getInlineOpacity();
    const computedOpacityAfter = await app.getComputedOpacity();
    expect(inlineOpacityAfter).toBe('1');
    expect(computedOpacityAfter).toBe('1');
  });

  test('Fade effect cycles opacity to 0 then back to 1 after OUTPUT_UPDATED (FADE_COMPLETE) - remove flow', async ({ page }) => {
    // Explicitly validates fade behavior on remove flow
    const app = new HashMapPage(page);

    await app.addEntry('fadeKeyR', 'fadeValueR');
    await app.waitForFadeCycle();

    await app.removeEntry('fadeKeyR');

    // Wait for fade cycle and confirm final state
    await app.waitForFadeCycle();

    const inlineOpacityAfter = await app.getInlineOpacity();
    const computedOpacityAfter = await app.getComputedOpacity();
    expect(inlineOpacityAfter).toBe('1');
    expect(computedOpacityAfter).toBe('1');
  });

  test('Remove with empty key triggers KEY_NOT_FOUND and alert', async ({ page }) => {
    // Edge case: Removing with empty key should alert "Key not found"
    const app = new HashMapPage(page);

    await app.setKey('   ');
    const alertPromise = app.captureNextDialogAndAccept('Key not found');
    await app.clickRemove();
    await alertPromise;

    const html = await app.getOutputHTML();
    expect((html || '').trim()).toBe('');
    await app.ensureNoFadeHappened();
  });

  test('Add with both inputs empty triggers INPUTS_INVALID and alert', async ({ page }) => {
    // Edge case: Both inputs empty should alert invalid inputs
    const app = new HashMapPage(page);

    await app.setKey('   ');
    await app.setValue('   ');

    const alertPromise = app.captureNextDialogAndAccept('Please specify both key and value.');
    await app.clickAdd();
    await alertPromise;

    const html = await app.getOutputHTML();
    expect((html || '').trim()).toBe('');
    await app.ensureNoFadeHappened();
  });
});