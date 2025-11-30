import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d23a80-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object Model for the Array demo page
class ArrayPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.btnCreate = page.locator('#btnCreate');
    this.btnAccess = page.locator('#btnAccess');
    this.btnAdd = page.locator('#btnAdd');
    this.btnRemove = page.locator('#btnRemove');
    this.btnLoop = page.locator('#btnLoop');
    this.btnFind = page.locator('#btnFind');
    this.btnMap = page.locator('#btnMap');
    this.btnFilter = page.locator('#btnFilter');
    this.btnReduce = page.locator('#btnReduce');
    this.output = page.locator('#output');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async clickCreate() {
    await this.btnCreate.click();
  }
  async clickAccess() {
    await this.btnAccess.click();
  }
  async clickAdd() {
    await this.btnAdd.click();
  }
  async clickRemove() {
    await this.btnRemove.click();
  }
  async clickLoop() {
    await this.btnLoop.click();
  }
  async clickFind() {
    await this.btnFind.click();
  }
  async clickMap() {
    await this.btnMap.click();
  }
  async clickFilter() {
    await this.btnFilter.click();
  }
  async clickReduce() {
    await this.btnReduce.click();
  }

  async getOutputText() {
    const txt = await this.output.textContent();
    return txt === null ? '' : txt.trim();
  }
}

test.describe('Array Demo Application - End-to-end tests', () => {
  let arrayPage;
  let consoleMessages;
  let pageErrors;

  // Setup: navigate to the page and attach listeners for console messages and page errors
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages emitted by the page
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture runtime page errors (uncaught exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    arrayPage = new ArrayPage(page);
    await arrayPage.goto();
  });

  // Teardown: ensure we haven't suppressed any errors; assert there were no unexpected page errors
  test.afterEach(async () => {
    // Assert there were no uncaught runtime errors during the test
    expect(pageErrors, 'No uncaught page errors should occur').toEqual([]);

    // Assert there were no console.error messages emitted by the page
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors, 'No console.error messages should be present').toEqual([]);
  });

  test('Initial page load shows expected title and default output', async ({ page }) => {
    // Verify the title contains "JavaScript Array Demonstration"
    await expect(page.locator('h1')).toHaveText('JavaScript Array Demonstration');

    // Verify the default output placeholder is visible and contains expected text
    await expect(arrayPage.output).toBeVisible();
    const initialText = await arrayPage.getOutputText();
    expect(initialText).toBe('(Output will appear here)');
  });

  test.describe('Edge case interactions when array is empty', () => {
    test('Clicking Add when array is empty shows an instructional message', async () => {
      // Before creation, clicking Add should prompt the user to create the array
      await arrayPage.clickAdd();
      const out = await arrayPage.getOutputText();
      expect(out).toBe('Array is empty. Please create the array first.');
    });

    test('Clicking Access when array is empty shows an instructional message', async () => {
      await arrayPage.clickAccess();
      const out1 = await arrayPage.getOutputText();
      expect(out).toBe('Array is empty. Please create the array first.');
    });

    test('Clicking Remove when array is empty shows an instructional message', async () => {
      await arrayPage.clickRemove();
      const out2 = await arrayPage.getOutputText();
      expect(out).toBe('Array is empty. Please create the array first.');
    });

    test('Clicking Loop when array is empty shows an instructional message', async () => {
      await arrayPage.clickLoop();
      const out3 = await arrayPage.getOutputText();
      expect(out).toBe('Array is empty. Please create the array first.');
    });

    test('Clicking Find when array is empty shows an instructional message', async () => {
      await arrayPage.clickFind();
      const out4 = await arrayPage.getOutputText();
      expect(out).toBe('Array is empty. Please create the array first.');
    });

    test('Clicking Map when array is empty shows an instructional message', async () => {
      await arrayPage.clickMap();
      const out5 = await arrayPage.getOutputText();
      expect(out).toBe('Array is empty. Please create the array first.');
    });

    test('Clicking Filter when array is empty shows an instructional message', async () => {
      await arrayPage.clickFilter();
      const out6 = await arrayPage.getOutputText();
      expect(out).toBe('Array is empty. Please create the array first.');
    });

    test('Clicking Reduce when array is empty shows an instructional message', async () => {
      await arrayPage.clickReduce();
      const out7 = await arrayPage.getOutputText();
      expect(out).toBe('Array is empty. Please create the array first.');
    });
  });

  test.describe('Primary array operations sequence and validations', () => {
    test('Create array populates default fruits and displays them', async () => {
      // Create the initial array
      await arrayPage.clickCreate();

      const out8 = await arrayPage.getOutputText();
      // Expect the created array text and the current array representation
      expect(out).toContain('Created an array:');
      expect(out).toContain('arr = ["apple", "banana", "cherry"]');
      expect(out).toContain('Current array:');
      expect(out).toContain('[apple, banana, cherry]');
    });

    test('Access elements after creation shows indexes and length', async () => {
      // Create then access
      await arrayPage.clickCreate();
      await arrayPage.clickAccess();

      const out9 = await arrayPage.getOutputText();
      expect(out).toContain('Access elements by index:');
      expect(out).toContain('arr[0] = "apple"');
      expect(out).toContain('arr[1] = "banana"');
      expect(out).toContain('arr[arr.length - 1] = "cherry"');
      expect(out).toContain('Length of array: 3');
    });

    test('Add then Remove operations update the array as expected', async () => {
      // Create -> Add -> Verify -> Remove -> Verify
      await arrayPage.clickCreate();

      // Add elements (apricot front, date end)
      await arrayPage.clickAdd();
      const afterAdd = await arrayPage.getOutputText();
      expect(afterAdd).toContain('Added elements "date" (end) and "apricot" (front):');
      // Updated array should show apricot at front and date at end
      expect(afterAdd).toContain('[apricot, apple, banana, cherry, date]');

      // Remove elements (removes apricot and date)
      await arrayPage.clickRemove();
      const afterRemove = await arrayPage.getOutputText();
      expect(afterRemove).toContain('Removed elements from front and end:');
      expect(afterRemove).toContain('arr.pop() => "date"');
      expect(afterRemove).toContain('arr.shift() => "apricot"');
      // After removal the array should be back to the original
      expect(afterRemove).toContain('[apple, banana, cherry]');
    });

    test('Loop (forEach) produces indexed lines for each element', async () => {
      await arrayPage.clickCreate();
      await arrayPage.clickLoop();

      const out10 = await arrayPage.getOutputText();
      expect(out).toContain('Looping through array with forEach:');
      expect(out).toContain('Index 0: apple');
      expect(out).toContain('Index 1: banana');
      expect(out).toContain('Index 2: cherry');
    });

    test('Find returns the first fruit containing letter "e"', async () => {
      // After create, the first containing 'e' is "apple" (apple includes 'e')
      await arrayPage.clickCreate();
      await arrayPage.clickFind();

      const out11 = await arrayPage.getOutputText();
      expect(out).toContain("Find first fruit containing letter 'e':");
      expect(out).toContain('arr.find(fruit => fruit.includes(\'e\')) => "apple"');
    });

    test('Map transforms the array to uppercase', async () => {
      await arrayPage.clickCreate();
      await arrayPage.clickMap();

      const out12 = await arrayPage.getOutputText();
      expect(out).toContain('Map array to uppercase:');
      // Uppercased values should be present
      expect(out).toContain('[APPLE, BANANA, CHERRY]');
    });

    test('Filter returns fruits with length greater than 5', async () => {
      await arrayPage.clickCreate();
      await arrayPage.clickFilter();

      const out13 = await arrayPage.getOutputText();
      expect(out).toContain('Filter fruits with length > 5:');
      // banana and cherry both length 6 > 5
      expect(out).toContain('[banana, cherry]');
    });

    test('Reduce concatenates the array to a comma-separated string', async () => {
      await arrayPage.clickCreate();
      await arrayPage.clickReduce();

      const out14 = await arrayPage.getOutputText();
      expect(out).toContain('Reduce array to single string separated by commas:');
      expect(out).toContain('arr.reduce((acc, cur) => acc + \', \' + cur) =>');
      expect(out).toContain('"apple, banana, cherry"');
    });
  });

  test.describe('Accessibility and visibility checks', () => {
    test('All buttons are visible and enabled', async ({ page }) => {
      // Ensure each interactive control is visible and enabled
      const buttons = [
        '#btnCreate', '#btnAccess', '#btnAdd', '#btnRemove',
        '#btnLoop', '#btnFind', '#btnMap', '#btnFilter', '#btnReduce'
      ];
      for (const sel of buttons) {
        const locator = page.locator(sel);
        await expect(locator).toBeVisible();
        await expect(locator).toBeEnabled();
      }
    });

    test('Output area has proper role and is visible', async ({ page }) => {
      const output = page.locator('#output');
      await expect(output).toBeVisible();

      // The demo uses a div for output - ensure it contains text and is not empty after an action
      await arrayPage.clickCreate();
      const out15 = await arrayPage.getOutputText();
      expect(out.length).toBeGreaterThan(0);
    });
  });
});