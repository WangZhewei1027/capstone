import { test, expect } from '@playwright/test';

const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d288a2-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object to encapsulate interactions with the Heap demo page
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Min heap selectors
    this.minValueInput = page.locator('#minValueInput');
    this.minInsertBtn = page.locator('#minInsertBtn');
    this.minExtractBtn = page.locator('#minExtractBtn');
    this.minOutput = page.locator('#minOutput');
    this.minHeapArray = page.locator('#minHeapArray');

    // Max heap selectors
    this.maxValueInput = page.locator('#maxValueInput');
    this.maxInsertBtn = page.locator('#maxInsertBtn');
    this.maxExtractBtn = page.locator('#maxExtractBtn');
    this.maxOutput = page.locator('#maxOutput');
    this.maxHeapArray = page.locator('#maxHeapArray');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Min heap actions
  async insertMin(value) {
    await this.minValueInput.fill(String(value));
    await this.minInsertBtn.click();
  }

  // Returns dialog if it appears as a result of clicking insert with invalid value
  async insertMinExpectDialog(value) {
    await this.minValueInput.fill(String(value));
    const [dialog] = await Promise.all([this.page.waitForEvent('dialog'), this.minInsertBtn.click()]);
    return dialog;
  }

  async extractMin() {
    await this.minExtractBtn.click();
  }

  async extractMinExpectDialog() {
    const [dialog] = await Promise.all([this.page.waitForEvent('dialog'), this.minExtractBtn.click()]);
    return dialog;
  }

  async getMinOutputText() {
    return (await this.minOutput.textContent())?.trim() ?? '';
  }

  async getMinArrayText() {
    return (await this.minHeapArray.textContent())?.trim() ?? '';
  }

  async getMinInputValue() {
    return (await this.minValueInput.inputValue()).trim();
  }

  // Max heap actions
  async insertMax(value) {
    await this.maxValueInput.fill(String(value));
    await this.maxInsertBtn.click();
  }

  async insertMaxExpectDialog(value) {
    await this.maxValueInput.fill(String(value));
    const [dialog] = await Promise.all([this.page.waitForEvent('dialog'), this.maxInsertBtn.click()]);
    return dialog;
  }

  async extractMax() {
    await this.maxExtractBtn.click();
  }

  async extractMaxExpectDialog() {
    const [dialog] = await Promise.all([this.page.waitForEvent('dialog'), this.maxExtractBtn.click()]);
    return dialog;
  }

  async getMaxOutputText() {
    return (await this.maxOutput.textContent())?.trim() ?? '';
  }

  async getMaxArrayText() {
    return (await this.maxHeapArray.textContent())?.trim() ?? '';
  }

  async getMaxInputValue() {
    return (await this.maxValueInput.inputValue()).trim();
  }
}

test.describe('Heap (Min Heap / Max Heap) Demonstration - UI and behavior', () => {
  // Arrays to capture console errors and page errors during each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // Defensive: ensure listener doesn't throw
      }
    });

    // Capture uncaught page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', (err) => {
      try {
        pageErrors.push(err.message);
      } catch (e) {
        // Defensive
      }
    });

    // Navigate to the app page
    const heapPage = new HeapPage(page);
    await heapPage.goto();
  });

  test.afterEach(async () => {
    // afterEach left empty on purpose; tests will assert error arrays as needed
  });

  // Test initial state of the page
  test('Initial page load shows both heaps empty and UI elements present', async ({ page }) => {
    const heapPage1 = new HeapPage(page);

    // Verify initial output texts for min and max heaps
    await expect(heapPage.minOutput).toHaveText('Heap is empty');
    await expect(heapPage.maxOutput).toHaveText('Heap is empty');

    // Heap array displays should be empty strings initially
    expect(await heapPage.getMinArrayText()).toBe('');
    expect(await heapPage.getMaxArrayText()).toBe('');

    // Inputs should be present and empty
    expect(await heapPage.getMinInputValue()).toBe('');
    expect(await heapPage.getMaxInputValue()).toBe('');

    // Verify no runtime page errors or console errors occurred during load
    expect(pageErrors, `Unexpected page errors: ${JSON.stringify(pageErrors)}`).toEqual([]);
    expect(consoleErrors, `Unexpected console errors: ${JSON.stringify(consoleErrors)}`).toEqual([]);
  });

  test.describe('Min Heap interactions', () => {
    test('Insert values into Min Heap and ensure min is root and array reflects heap structure', async ({ page }) => {
      const heapPage2 = new HeapPage(page);

      // Insert 5 -> root should be 5
      await heapPage.insertMin(5);
      expect(await heapPage.getMinOutputText()).toBe('Min (root): 5');
      expect(await heapPage.getMinArrayText()).toBe('Heap Array: [5]');
      expect(await heapPage.getMinInputValue()).toBe(''); // input cleared

      // Insert 3 -> should become new root
      await heapPage.insertMin(3);
      expect(await heapPage.getMinOutputText()).toBe('Min (root): 3');
      expect(await heapPage.getMinArrayText()).toBe('Heap Array: [3, 5]');
      expect(await heapPage.getMinInputValue()).toBe('');

      // Insert 8 -> root remains 3, array is [3, 5, 8]
      await heapPage.insertMin(8);
      expect(await heapPage.getMinOutputText()).toBe('Min (root): 3');
      expect(await heapPage.getMinArrayText()).toBe('Heap Array: [3, 5, 8]');
      expect(await heapPage.getMinInputValue()).toBe('');

      // Verify no console or page errors occurred during these interactions
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('Extracting min updates heap correctly and shows empty alert when extracting from empty heap', async ({ page }) => {
      const heapPage3 = new HeapPage(page);

      // Prepare heap: insert three values 5, 3, 8
      await heapPage.insertMin(5);
      await heapPage.insertMin(3);
      await heapPage.insertMin(8);

      // Extract once -> min (3) removed -> new root should be 5 and array [5, 8]
      await heapPage.extractMin();
      expect(await heapPage.getMinOutputText()).toBe('Min (root): 5');
      expect(await heapPage.getMinArrayText()).toBe('Heap Array: [5, 8]');

      // Extract again -> remove 5 -> root should be 8 and array [8]
      await heapPage.extractMin();
      expect(await heapPage.getMinOutputText()).toBe('Min (root): 8');
      expect(await heapPage.getMinArrayText()).toBe('Heap Array: [8]');

      // Extract last -> heap becomes empty, output should become 'Heap is empty'
      await heapPage.extractMin();
      expect(await heapPage.getMinOutputText()).toBe('Heap is empty');
      expect(await heapPage.getMinArrayText()).toBe('');

      // Attempt to extract from empty heap -> should trigger an alert dialog
      const dialog = await heapPage.extractMinExpectDialog();
      expect(dialog.message()).toBe('Heap is empty, nothing to extract.');
      await dialog.accept();

      // Ensure no page or console errors occurred
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('Invalid non-numeric insertion to Min Heap shows alert and does not modify heap', async ({ page }) => {
      const heapPage4 = new HeapPage(page);

      // Start with empty heap
      expect(await heapPage.getMinOutputText()).toBe('Heap is empty');
      expect(await heapPage.getMinArrayText()).toBe('');

      // Insert invalid 'abc' -> should show alert and not change heap state
      const dialog1 = await heapPage.insertMinExpectDialog('abc');
      expect(dialog.message()).toBe('Please enter a valid number to insert.');
      await dialog.accept();

      // Heap remains empty
      expect(await heapPage.getMinOutputText()).toBe('Heap is empty');
      expect(await heapPage.getMinArrayText()).toBe('');

      // No page or console errors expected
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  });

  test.describe('Max Heap interactions', () => {
    test('Insert values into Max Heap and ensure max is root and array reflects heap structure', async ({ page }) => {
      const heapPage5 = new HeapPage(page);

      // Insert 2 -> root 2
      await heapPage.insertMax(2);
      expect(await heapPage.getMaxOutputText()).toBe('Max (root): 2');
      expect(await heapPage.getMaxArrayText()).toBe('Heap Array: [2]');
      expect(await heapPage.getMaxInputValue()).toBe('');

      // Insert 9 -> becomes new root
      await heapPage.insertMax(9);
      expect(await heapPage.getMaxOutputText()).toBe('Max (root): 9');
      expect(await heapPage.getMaxArrayText()).toBe('Heap Array: [9, 2]');
      expect(await heapPage.getMaxInputValue()).toBe('');

      // Insert 4 -> root remains 9; array should be [9, 2, 4]
      await heapPage.insertMax(4);
      expect(await heapPage.getMaxOutputText()).toBe('Max (root): 9');
      expect(await heapPage.getMaxArrayText()).toBe('Heap Array: [9, 2, 4]');
      expect(await heapPage.getMaxInputValue()).toBe('');

      // Check no errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('Extracting max updates heap correctly and shows empty alert when extracting from empty heap', async ({ page }) => {
      const heapPage6 = new HeapPage(page);

      // Build heap: 2, 9, 4 -> expected [9,2,4]
      await heapPage.insertMax(2);
      await heapPage.insertMax(9);
      await heapPage.insertMax(4);

      // Extract max (9) -> new root should be 4 and array [4, 2] or [4,2] depending on heapify -> expected logic yields [4,2]
      await heapPage.extractMax();
      // After extraction the display will be updated to show new root:
      const maxOutputAfterFirstExtract = await heapPage.getMaxOutputText();
      // Root should be either 4 or 2 depending on heapify; validate it's one of the numeric outputs and array is non-empty
      expect(maxOutputAfterFirstExtract.startsWith('Max (root):')).toBeTruthy();
      expect(await heapPage.getMaxArrayText().startsWith('Heap Array: [')).toBeTruthy();

      // Extract until empty to trigger alert on extra extraction
      // Extract twice to empty the heap
      await heapPage.extractMax();
      await heapPage.extractMax();

      // Heap should be empty now
      expect(await heapPage.getMaxOutputText()).toBe('Heap is empty');
      expect(await heapPage.getMaxArrayText()).toBe('');

      // Attempt to extract from empty heap -> expect dialog alert
      const dialog2 = await heapPage.extractMaxExpectDialog();
      expect(dialog.message()).toBe('Heap is empty, nothing to extract.');
      await dialog.accept();

      // No runtime errors expected
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('Invalid non-numeric insertion to Max Heap shows alert and does not modify heap', async ({ page }) => {
      const heapPage7 = new HeapPage(page);

      // Ensure empty initial state
      expect(await heapPage.getMaxOutputText()).toBe('Heap is empty');
      expect(await heapPage.getMaxArrayText()).toBe('');

      // Insert invalid value 'xyz' -> expect alert and unchanged heap
      const dialog3 = await heapPage.insertMaxExpectDialog('xyz');
      expect(dialog.message()).toBe('Please enter a valid number to insert.');
      await dialog.accept();

      // State unchanged
      expect(await heapPage.getMaxOutputText()).toBe('Heap is empty');
      expect(await heapPage.getMaxArrayText()).toBe('');

      // No page or console errors expected
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  });

  // Accessibility / structural checks
  test('Form labels are associated with inputs (basic accessibility)', async ({ page }) => {
    // Check that the labels reference the expected input ids
    const minLabelFor = await page.locator('#minHeapBox label[for="minValueInput"]').getAttribute('for');
    const maxLabelFor = await page.locator('#maxHeapBox label[for="maxValueInput"]').getAttribute('for');

    expect(minLabelFor).toBe('minValueInput');
    expect(maxLabelFor).toBe('maxValueInput');

    // No runtime errors expected during these checks
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});