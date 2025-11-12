import { test, expect } from '@playwright/test';

// Page Object for Linear Search Visualizer
class LinearSearchPage {
  constructor(page) {
    this.page = page;
    
    // Input controls
    this.searchValueInput = page.locator('#searchValue');
    this.arraySizeInput = page.locator('#arraySize');
    this.speedSlider = page.locator('#speedSlider');
    this.speedValue = page.locator('.speed-value');
    
    // Buttons
    this.generateArrayBtn = page.locator('#generateArray');
    this.stepSearchBtn = page.locator('#stepSearch');
    this.autoSearchBtn = page.locator('#autoSearch');
    this.stepForwardBtn = page.locator('#stepForward');
    this.resetBtn = page.locator('#reset');
    
    // Display elements
    this.statusText = page.locator('#statusText');
    this.stepsCounter = page.locator('#stepsCounter');
    this.arrayContainer = page.locator('#arrayContainer');
    this.arrayElements = page.locator('.array-element');
  }

  async navigate() {
    await this.page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/63bb84e0-bf83-11f0-a230-7b3d5f0a2067.html');
  }

  async generateNewArray(size) {
    await this.arraySizeInput.fill(size.toString());
    await this.generateArrayBtn.click();
  }

  async setSearchValue(value) {
    await this.searchValueInput.fill(value.toString());
  }

  async startStepSearch() {
    await this.stepSearchBtn.click();
  }

  async startAutoSearch() {
    await this.autoSearchBtn.click();
  }

  async stepForward() {
    await this.stepForwardBtn.click();
  }

  async reset() {
    await this.resetBtn.click();
  }

  async setSpeed(speed) {
    await this.speedSlider.fill(speed.toString());
  }

  async getArrayValues() {
    const elements = await this.arrayElements.all();
    const values = [];
    for (const element of elements) {
      const text = await element.textContent();
      values.push(parseInt(text));
    }
    return values;
  }

  async getElementState(index) {
    const element = this.arrayElements.nth(index);
    const classes = await element.getAttribute('class');
    if (classes.includes('checking')) return 'checking';
    if (classes.includes('checked')) return 'checked';
    if (classes.includes('found')) return 'found';
    return 'default';
  }

  async waitForAutoSearchToComplete() {
    // Wait for either found or not found state
    await this.page.waitForFunction(() => {
      const status = document.querySelector('#statusText').textContent;
      return status.includes('Found') || status.includes('Not found');
    }, { timeout: 10000 });
  }
}

test.describe('Linear Search Visualizer - FSM State Tests', () => {
  let page;
  let searchPage;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    searchPage = new LinearSearchPage(page);
    await searchPage.navigate();
  });

  test.describe('Idle State', () => {
    test('should start in idle state with proper UI setup', async () => {
      // Verify initial state
      await expect(searchPage.statusText).toHaveText('Ready to search');
      await expect(searchPage.stepsCounter).toHaveText('Steps: 0');
      await expect(searchPage.searchValueInput).toBeEnabled();
      await expect(searchPage.stepSearchBtn).toBeEnabled();
      await expect(searchPage.autoSearchBtn).toBeEnabled();
      await expect(searchPage.stepForwardBtn).toBeDisabled();
      await expect(searchPage.resetBtn).toBeDisabled();
    });

    test('should remain in idle state when generating new array', async () => {
      // Generate array multiple times
      await searchPage.generateNewArray(5);
      await expect(searchPage.statusText).toHaveText('Ready to search');
      
      await searchPage.generateNewArray(10);
      await expect(searchPage.statusText).toHaveText('Ready to search');
      await expect(searchPage.arrayElements).toHaveCount(10);
    });

    test('should transition from idle to searching on START_STEP_SEARCH', async () => {
      await searchPage.setSearchValue('5');
      await searchPage.startStepSearch();
      
      // Verify transition to searching state
      await expect(searchPage.statusText).toHaveText('Searching for 5...');
      await expect(searchPage.searchValueInput).toBeDisabled();
      await expect(searchPage.stepForwardBtn).toBeEnabled();
      await expect(searchPage.resetBtn).toBeEnabled();
    });

    test('should transition from idle to autoSearching on START_AUTO_SEARCH', async () => {
      await searchPage.setSearchValue('5');
      await searchPage.startAutoSearch();
      
      // Verify transition to auto searching state
      await expect(searchPage.statusText).toHaveText('Searching for 5...');
      await expect(searchPage.searchValueInput).toBeDisabled();
      await expect(searchPage.autoSearchBtn).toHaveText('Stop');
      await expect(searchPage.resetBtn).toBeEnabled();
    });
  });

  test.describe('Searching State', () => {
    test('should initialize search properly on entering searching state', async () => {
      await searchPage.setSearchValue('5');
      await searchPage.startStepSearch();
      
      // Verify search initialization
      await expect(searchPage.statusText).toHaveText('Searching for 5...');
      await expect(searchPage.stepsCounter).toHaveText('Steps: 0');
      await expect(searchPage.stepSearchBtn).toBeDisabled();
      await expect(searchPage.autoSearchBtn).toBeDisabled();
    });

    test('should transition to checking state on STEP_FORWARD', async () => {
      await searchPage.setSearchValue('5');
      await searchPage.startStepSearch();
      await searchPage.stepForward();
      
      // Verify first element is being checked
      const firstElementState = await searchPage.getElementState(0);
      expect(firstElementState).toBe('checking');
      await expect(searchPage.stepsCounter).toHaveText('Steps: 1');
    });

    test('should return to idle state on RESET', async () => {
      await searchPage.setSearchValue('5');
      await searchPage.startStepSearch();
      await searchPage.reset();
      
      // Verify return to idle state
      await expect(searchPage.statusText).toHaveText('Ready to search');
      await expect(searchPage.searchValueInput).toBeEnabled();
      await expect(searchPage.stepsCounter).toHaveText('Steps: 0');
    });
  });

  test.describe('Checking State', () => {
    test('should highlight current element when entering checking state', async () => {
      await searchPage.setSearchValue('5');
      await searchPage.startStepSearch();
      await searchPage.stepForward();
      
      // Verify element highlighting
      const firstElementState1 = await searchPage.getElementState(0);
      expect(firstElementState).toBe('checking');
    });

    test('should mark element as checked when exiting checking state', async () => {
      await searchPage.setSearchValue('99'); // Value not in array
      await searchPage.startStepSearch();
      await searchPage.stepForward();
      await searchPage.stepForward();
      
      // Verify first element is marked as checked
      const firstElementState2 = await searchPage.getElementState(0);
      expect(firstElementState).toBe('checked');
    });

    test('should transition to found state on ELEMENT_MATCHES', async () => {
      // Get array values to find an existing element
      const arrayValues = await searchPage.getArrayValues();
      const targetValue = arrayValues[2]; // Use third element
      
      await searchPage.setSearchValue(targetValue.toString());
      await searchPage.startStepSearch();
      
      // Step through until we find the element
      for (let i = 0; i <= 2; i++) {
        await searchPage.stepForward();
      }
      
      // Verify found state
      await expect(searchPage.statusText).toContainText(`Found ${targetValue} at index 2`);
      const foundElementState = await searchPage.getElementState(2);
      expect(foundElementState).toBe('found');
    });

    test('should transition to notFound state on ELEMENT_NOT_MATCHES_END', async () => {
      await searchPage.setSearchValue('999'); // Value definitely not in array
      await searchPage.startStepSearch();
      
      // Step through all elements
      const elementCount = await searchPage.arrayElements.count();
      for (let i = 0; i < elementCount; i++) {
        await searchPage.stepForward();
      }
      
      // Verify not found state
      await expect(searchPage.statusText).toHaveText('Not found!');
    });
  });

  test.describe('AutoSearching State', () => {
    test('should start automatic search interval on entering autoSearching', async () => {
      await searchPage.setSpeed('500'); // Set faster speed for testing
      await searchPage.setSearchValue('5');
      await searchPage.startAutoSearch();
      
      // Verify auto search is running
      await expect(searchPage.autoSearchBtn).toHaveText('Stop');
      
      // Wait a bit and verify steps are incrementing
      await page.waitForTimeout(1500);
      const steps = await searchPage.stepsCounter.textContent();
      expect(parseInt(steps.match(/\d+/)[0])).toBeGreaterThan(0);
    });

    test('should stop auto search and transition to searching on STOP_AUTO_SEARCH', async () => {
      await searchPage.setSpeed('500');
      await searchPage.setSearchValue('5');
      await searchPage.startAutoSearch();
      
      await page.waitForTimeout(1000);
      await searchPage.autoSearchBtn.click(); // Stop button
      
      // Verify transition to manual searching
      await expect(searchPage.autoSearchBtn).toHaveText('Auto Search');
      await expect(searchPage.stepForwardBtn).toBeEnabled();
    });

    test('should transition to found state when element matches during auto search', async () => {
      await searchPage.setSpeed('200'); // Fast speed
      const arrayValues1 = await searchPage.getArrayValues();
      const targetValue1 = arrayValues[3]; // Use fourth element
      
      await searchPage.setSearchValue(targetValue.toString());
      await searchPage.startAutoSearch();
      
      // Wait for auto search to find the element
      await searchPage.waitForAutoSearchToComplete();
      
      await expect(searchPage.statusText).toContainText(`Found ${targetValue}`);
      const foundElementState1 = await searchPage.getElementState(3);
      expect(foundElementState).toBe('found');
    });

    test('should transition to notFound state when reaching end without match', async () => {
      await searchPage.setSpeed('200'); // Fast speed
      await searchPage.setSearchValue('999'); // Non-existent value
      await searchPage.startAutoSearch();
      
      // Wait for auto search to complete
      await searchPage.waitForAutoSearchToComplete();
      
      await expect(searchPage.statusText).toHaveText('Not found!');
    });
  });

  test.describe('Found State', () => {
    test('should display found result with correct index and steps', async () => {
      const arrayValues2 = await searchPage.getArrayValues();
      const targetValue2 = arrayValues[1]; // Second element
      
      await searchPage.setSearchValue(targetValue.toString());
      await searchPage.startStepSearch();
      await searchPage.stepForward();
      await searchPage.stepForward();
      
      // Verify found state display
      await expect(searchPage.statusText).toContainText(`Found ${targetValue} at index 1`);
      await expect(searchPage.stepsCounter).toHaveText('Steps: 2');
      await expect(searchPage.stepForwardBtn).toBeDisabled();
      await expect(searchPage.stepSearchBtn).toBeDisabled();
      await expect(searchPage.autoSearchBtn).toBeDisabled();
    });

    test('should return to idle on RESET from found state', async () => {
      const arrayValues3 = await searchPage.getArrayValues();
      const targetValue3 = arrayValues[0];
      
      await searchPage.setSearchValue(targetValue.toString());
      await searchPage.startStepSearch();
      await searchPage.stepForward();
      
      await searchPage.reset();
      
      // Verify return to idle
      await expect(searchPage.statusText).toHaveText('Ready to search');
      await expect(searchPage.searchValueInput).toBeEnabled();
      await expect(searchPage.stepsCounter).toHaveText('Steps: 0');
    });

    test('should return to idle on GENERATE_ARRAY from found state', async () => {
      const arrayValues4 = await searchPage.getArrayValues();
      const targetValue4 = arrayValues[0];
      
      await searchPage.setSearchValue(targetValue.toString());
      await searchPage.startStepSearch();
      await searchPage.stepForward();
      
      await searchPage.generateNewArray(8);
      
      // Verify return to idle with new array
      await expect(searchPage.statusText).toHaveText('Ready to search');
      await expect(searchPage.arrayElements).toHaveCount(8);
      await expect(searchPage.stepsCounter).toHaveText('Steps: 0');
    });
  });

  test.describe('NotFound State', () => {
    test('should display not found result after checking all elements', async () => {
      await searchPage.setSearchValue('999');
      await searchPage.startStepSearch();
      
      const elementCount1 = await searchPage.arrayElements.count();
      for (let i = 0; i < elementCount; i++) {
        await searchPage.stepForward();
      }
      
      // Verify not found state
      await expect(searchPage.statusText).toHaveText('Not found!');
      await expect(searchPage.stepsCounter).toHaveText(`Steps: ${elementCount}`);
      await expect(searchPage.stepForwardBtn).toBeDisabled();
      
      // Verify all elements are marked as checked
      for (let i = 0; i < elementCount; i++) {
        const state = await searchPage.getElementState(i);
        expect(state).toBe('checked');
      }
    });

    test('should return to idle on RESET from notFound state', async () => {
      await searchPage.setSearchValue('999');
      await searchPage.startAutoSearch();
      await searchPage.waitForAutoSearchToComplete();
      
      await searchPage.reset();
      
      // Verify return to idle
      await expect(searchPage.statusText).toHaveText('Ready to search');
      await expect(searchPage.searchValueInput).toBeEnabled();
    });
  });

  test.describe('Edge Cases and Error Scenarios', () => {
    test('should handle empty search value', async () => {
      await searchPage.searchValueInput.fill('');
      await searchPage.stepSearchBtn.click();
      
      // Should not start search with empty value
      await expect(searchPage.statusText).toHaveText('Ready to search');
      await expect(searchPage.stepForwardBtn).toBeDisabled();
    });

    test('should handle array size limits', async () => {
      // Test minimum size
      await searchPage.generateNewArray(1);
      await expect(searchPage.arrayElements).toHaveCount(1);
      
      // Test maximum size
      await searchPage.generateNewArray(20);
      await expect(searchPage.arrayElements).toHaveCount(20);
      
      // Test invalid size (should clamp to limits)
      await searchPage.arraySizeInput.fill('50');
      await searchPage.generateArrayBtn.click();
      await expect(searchPage.arrayElements).toHaveCount(20);
    });

    test('should handle speed slider changes during auto search', async () => {
      await searchPage.setSpeed('1000'); // Slow speed
      await searchPage.setSearchValue('999');
      await searchPage.startAutoSearch();
      
      await page.waitForTimeout(500);
      const initialSteps = await searchPage.stepsCounter.textContent();
      
      // Change to faster speed
      await searchPage.setSpeed('200');
      await page.waitForTimeout(1000);
      
      const finalSteps = await searchPage.stepsCounter.textContent();
      expect(parseInt(finalSteps.match(/\d+/)[0])).toBeGreaterThan(parseInt(initialSteps.match(/\d+/)[0]));
    });

    test('should maintain visual consistency across state transitions', async () => {
      const arrayValues5 = await searchPage.getArrayValues();
      const targetValue5 = arrayValues[2];
      
      await searchPage.setSearchValue(targetValue.toString());
      await searchPage.startStepSearch();
      
      // Step through and verify visual states
      await searchPage.stepForward();
      expect(await searchPage.getElementState(0)).toBe('checking');
      
      await searchPage.stepForward();
      expect(await searchPage.getElementState(0)).toBe('checked');
      expect(await searchPage.getElementState(1)).toBe('checking');
      
      await searchPage.stepForward();
      expect(await searchPage.getElementState(1)).toBe('checked');
      expect(await searchPage.getElementState(2)).toBe('checking');
      
      // After finding
      await page.waitForTimeout(500);
      expect(await searchPage.getElementState(2)).toBe('found');
    });
  });
});