import { test, expect } from '@playwright/test';

// Page Object Model for Radix Sort Visualization
class RadixSortPage {
  constructor(page) {
    this.page = page;
    
    // Controls
    this.customArrayInput = page.locator('#customArray');
    this.setArrayButton = page.locator('#setArrayBtn');
    this.generateRandomButton = page.locator('#generateBtn');
    this.nextStepButton = page.locator('#nextStepBtn');
    this.resetButton = page.locator('#resetBtn');
    this.autoplayButton = page.locator('#autoplayBtn');
    this.speedSlider = page.locator('#speedSlider');
    
    // Display elements
    this.statusText = page.locator('#statusText');
    this.currentDigitText = page.locator('#currentDigit');
    this.arrayContainer = page.locator('#arrayContainer');
    this.bucketsContainer = page.locator('#bucketsContainer');
    
    // Array elements
    this.arrayElements = page.locator('.array-element');
    this.buckets = page.locator('.bucket');
  }

  async navigate() {
    await this.page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/653c7f90-bf83-11f0-a230-7b3d5f0a2067.html');
  }

  async setCustomArray(arrayString) {
    await this.customArrayInput.fill(arrayString);
    await this.setArrayButton.click();
  }

  async generateRandomArray() {
    await this.generateRandomButton.click();
  }

  async clickNextStep() {
    await this.nextStepButton.click();
  }

  async clickReset() {
    await this.resetButton.click();
  }

  async toggleAutoplay() {
    await this.autoplayButton.click();
  }

  async setSpeed(value) {
    await this.speedSlider.fill(value.toString());
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

  async getBucketCount(bucketIndex) {
    const bucket = this.buckets.nth(bucketIndex);
    const items = bucket.locator('.bucket-item');
    return await items.count();
  }

  async waitForAnimationComplete() {
    // Wait for any active animations to complete
    await this.page.waitForTimeout(1000);
  }

  async getStatus() {
    return await this.statusText.textContent();
  }

  async getCurrentDigit() {
    return await this.currentDigitText.textContent();
  }

  async isButtonEnabled(buttonName) {
    const buttons = {
      'nextStep': this.nextStepButton,
      'reset': this.resetButton,
      'setArray': this.setArrayButton,
      'generateRandom': this.generateRandomButton,
      'autoplay': this.autoplayButton
    };
    return await buttons[buttonName].isEnabled();
  }

  async getHighlightedElements() {
    const highlighted = await this.arrayElements.filter({ hasClass: 'highlight' }).all();
    return highlighted.length;
  }
}

test.describe('Radix Sort Interactive Visualization', () => {
  let page;
  let radixSort;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    radixSort = new RadixSortPage(page);
    await radixSort.navigate();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Initial State (Ready)', () => {
    test('should load with correct initial state', async () => {
      // Verify initial status
      const status = await radixSort.getStatus();
      expect(status).toContain('Ready to sort');

      // Verify initial array is displayed
      const arrayValues = await radixSort.getArrayValues();
      expect(arrayValues.length).toBeGreaterThan(0);

      // Verify controls are in correct state
      expect(await radixSort.isButtonEnabled('nextStep')).toBe(true);
      expect(await radixSort.isButtonEnabled('reset')).toBe(true);
      expect(await radixSort.isButtonEnabled('setArray')).toBe(true);
      expect(await radixSort.isButtonEnabled('generateRandom')).toBe(true);
      expect(await radixSort.isButtonEnabled('autoplay')).toBe(true);
    });

    test('should handle SET_CUSTOM_ARRAY event', async () => {
      const customArray = '170, 45, 75, 90, 2, 802, 24, 66';
      await radixSort.setCustomArray(customArray);

      // Verify array was updated
      const arrayValues1 = await radixSort.getArrayValues();
      expect(arrayValues).toEqual([170, 45, 75, 90, 2, 802, 24, 66]);

      // Should remain in ready state
      const status1 = await radixSort.getStatus();
      expect(status).toContain('Ready to sort');
    });

    test('should handle GENERATE_RANDOM event', async () => {
      const initialArray = await radixSort.getArrayValues();
      await radixSort.generateRandomArray();
      
      const newArray = await radixSort.getArrayValues();
      
      // Array should change
      expect(newArray).not.toEqual(initialArray);
      
      // Should remain in ready state
      const status2 = await radixSort.getStatus();
      expect(status).toContain('Ready to sort');
    });

    test('should validate custom array input', async () => {
      // Test invalid input
      await radixSort.setCustomArray('abc, def, 123');
      
      // Should show error or remain with valid array
      const arrayValues2 = await radixSort.getArrayValues();
      arrayValues.forEach(value => {
        expect(typeof value).toBe('number');
        expect(isNaN(value)).toBe(false);
      });
    });
  });

  test.describe('Distributing State', () => {
    test('should transition to distributing state on NEXT_STEP', async () => {
      await radixSort.clickNextStep();
      
      // Wait for state transition
      await radixSort.waitForAnimationComplete();
      
      // Verify status indicates distributing
      const status3 = await radixSort.getStatus();
      expect(status).toContain('Distributing');
      
      // Verify current digit is shown
      const currentDigit = await radixSort.getCurrentDigit();
      expect(currentDigit).toMatch(/Digit position: \d+/);
    });

    test('should show distribution animation', async () => {
      await radixSort.clickNextStep();
      
      // During distribution, elements should be highlighted
      await page.waitForTimeout(500); // Mid-animation
      const highlightedCount = await radixSort.getHighlightedElements();
      expect(highlightedCount).toBeGreaterThan(0);
    });

    test('should disable controls during distribution', async () => {
      await radixSort.clickNextStep();
      
      // Controls should be disabled during animation
      expect(await radixSort.isButtonEnabled('nextStep')).toBe(false);
      expect(await radixSort.isButtonEnabled('setArray')).toBe(false);
      expect(await radixSort.isButtonEnabled('generateRandom')).toBe(false);
    });

    test('should handle RESET during distribution', async () => {
      await radixSort.clickNextStep();
      await page.waitForTimeout(500); // Mid-animation
      
      await radixSort.clickReset();
      await radixSort.waitForAnimationComplete();
      
      // Should return to ready state
      const status4 = await radixSort.getStatus();
      expect(status).toContain('Ready to sort');
    });
  });

  test.describe('Collecting State', () => {
    test('should transition from distributing to collecting', async () => {
      await radixSort.clickNextStep();
      
      // Wait for distribution to complete
      await page.waitForFunction(() => {
        const status5 = document.querySelector('#statusText').textContent;
        return status.includes('Collecting');
      }, { timeout: 5000 });
      
      const status6 = await radixSort.getStatus();
      expect(status).toContain('Collecting');
    });

    test('should show collection animation', async () => {
      await radixSort.clickNextStep();
      
      // Wait for collecting state
      await page.waitForFunction(() => {
        const status7 = document.querySelector('#statusText').textContent;
        return status.includes('Collecting');
      }, { timeout: 5000 });
      
      // Buckets should have items during collection
      let totalBucketItems = 0;
      for (let i = 0; i < 10; i++) {
        const count = await radixSort.getBucketCount(i);
        totalBucketItems += count;
      }
      expect(totalBucketItems).toBeGreaterThan(0);
    });

    test('should continue to next digit if more digits exist', async () => {
      // Set array with multi-digit numbers
      await radixSort.setCustomArray('100, 200, 300, 10, 20, 30');
      
      // First pass
      await radixSort.clickNextStep();
      await page.waitForFunction(() => {
        const status8 = document.querySelector('#statusText').textContent;
        return status.includes('Ready') || status.includes('Distributing');
      }, { timeout: 10000 });
      
      // Should not be complete after first digit
      const status9 = await radixSort.getStatus();
      expect(status).not.toContain('Sorting complete');
    });
  });

  test.describe('Complete State', () => {
    test('should reach complete state when all digits processed', async () => {
      // Use small numbers for faster test
      await radixSort.setCustomArray('5, 2, 8, 1, 9');
      
      // Keep clicking next until complete
      let isComplete = false;
      let attempts = 0;
      
      while (!isComplete && attempts < 10) {
        const status10 = await radixSort.getStatus();
        
        if (status.includes('Sorting complete')) {
          isComplete = true;
          break;
        }
        
        if (await radixSort.isButtonEnabled('nextStep')) {
          await radixSort.clickNextStep();
          await radixSort.waitForAnimationComplete();
        }
        
        attempts++;
      }
      
      expect(isComplete).toBe(true);
      
      // Verify array is sorted
      const finalArray = await radixSort.getArrayValues();
      const sortedArray = [...finalArray].sort((a, b) => a - b);
      expect(finalArray).toEqual(sortedArray);
    });

    test('should enable appropriate controls in complete state', async () => {
      // Get to complete state
      await radixSort.setCustomArray('5, 2, 8, 1, 9');
      
      while (true) {
        const status11 = await radixSort.getStatus();
        if (status.includes('Sorting complete')) break;
        
        if (await radixSort.isButtonEnabled('nextStep')) {
          await radixSort.clickNextStep();
          await radixSort.waitForAnimationComplete();
        }
      }
      
      // Verify controls
      expect(await radixSort.isButtonEnabled('nextStep')).toBe(false);
      expect(await radixSort.isButtonEnabled('reset')).toBe(true);
      expect(await radixSort.isButtonEnabled('setArray')).toBe(true);
      expect(await radixSort.isButtonEnabled('generateRandom')).toBe(true);
    });

    test('should handle SET_CUSTOM_ARRAY from complete state', async () => {
      // Get to complete state
      await radixSort.setCustomArray('5, 2, 8');
      
      while (true) {
        const status12 = await radixSort.getStatus();
        if (status.includes('Sorting complete')) break;
        
        if (await radixSort.isButtonEnabled('nextStep')) {
          await radixSort.clickNextStep();
          await radixSort.waitForAnimationComplete();
        }
      }
      
      // Set new array
      await radixSort.setCustomArray('99, 11, 44');
      
      // Should return to ready state
      const status13 = await radixSort.getStatus();
      expect(status).toContain('Ready to sort');
      expect(await radixSort.isButtonEnabled('nextStep')).toBe(true);
    });
  });

  test.describe('Autoplay Feature', () => {
    test('should toggle autoplay mode', async () => {
      await radixSort.toggleAutoplay();
      
      // Autoplay button should show active state
      const autoplayText = await radixSort.autoplayButton.textContent();
      expect(autoplayText).toContain('Stop');
      
      // Should automatically progress through states
      await page.waitForFunction(() => {
        const status14 = document.querySelector('#statusText').textContent;
        return !status.includes('Ready to sort');
      }, { timeout: 5000 });
      
      // Stop autoplay
      await radixSort.toggleAutoplay();
      const updatedText = await radixSort.autoplayButton.textContent();
      expect(updatedText).toContain('Auto-play');
    });

    test('should respect speed setting during autoplay', async () => {
      // Set slower speed
      await radixSort.setSpeed(200);
      
      const startTime = Date.now();
      await radixSort.toggleAutoplay();
      
      // Wait for first transition
      await page.waitForFunction(() => {
        const status15 = document.querySelector('#statusText').textContent;
        return !status.includes('Ready to sort');
      }, { timeout: 5000 });
      
      const elapsedTime = Date.now() - startTime;
      
      // Should take longer with slower speed
      expect(elapsedTime).toBeGreaterThan(150);
      
      await radixSort.toggleAutoplay(); // Stop autoplay
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle empty array input', async () => {
      await radixSort.setCustomArray('');
      
      // Should either show error or keep previous array
      const arrayValues3 = await radixSort.getArrayValues();
      expect(arrayValues.length).toBeGreaterThan(0);
    });

    test('should handle very large numbers', async () => {
      await radixSort.setCustomArray('999999, 100000, 555555');
      
      // Should be able to sort without errors
      while (true) {
        const status16 = await radixSort.getStatus();
        if (status.includes('Sorting complete')) break;
        
        if (await radixSort.isButtonEnabled('nextStep')) {
          await radixSort.clickNextStep();
          await radixSort.waitForAnimationComplete();
        }
      }
      
      const finalArray1 = await radixSort.getArrayValues();
      expect(finalArray).toEqual([100000, 555555, 999999]);
    });

    test('should handle single element array', async () => {
      await radixSort.setCustomArray('42');
      
      // Should complete immediately or after one pass
      await radixSort.clickNextStep();
      await radixSort.waitForAnimationComplete();
      
      const status17 = await radixSort.getStatus();
      expect(status).toContain('complete');
    });

    test('should handle already sorted array', async () => {
      await radixSort.setCustomArray('1, 2, 3, 4, 5');
      
      // Should still go through all steps
      let stepCount = 0;
      while (true) {
        const status18 = await radixSort.getStatus();
        if (status.includes('Sorting complete')) break;
        
        if (await radixSort.isButtonEnabled('nextStep')) {
          await radixSort.clickNextStep();
          await radixSort.waitForAnimationComplete();
          stepCount++;
        }
        
        if (stepCount > 20) break; // Prevent infinite loop
      }
      
      expect(stepCount).toBeGreaterThan(0);
      
      const finalArray2 = await radixSort.getArrayValues();
      expect(finalArray).toEqual([1, 2, 3, 4, 5]);
    });

    test('should handle rapid clicking', async () => {
      // Try to click multiple times rapidly
      const clickPromises = [];
      for (let i = 0; i < 5; i++) {
        clickPromises.push(radixSort.clickNextStep());
      }
      
      await Promise.all(clickPromises);
      await radixSort.waitForAnimationComplete();
      
      // Should not break the visualization
      const status19 = await radixSort.getStatus();
      expect(status).toBeTruthy();
      expect(status).not.toContain('Error');
    });
  });

  test.describe('Visual Feedback', () => {
    test('should highlight current digit position', async () => {
      await radixSort.clickNextStep();
      
      // Current digit indicator should be visible
      const digitText = await radixSort.getCurrentDigit();
      expect(digitText).toMatch(/Digit position: \d+/);
    });

    test('should show bucket organization', async () => {
      await radixSort.clickNextStep();
      
      // Wait for distribution
      await page.waitForTimeout(1500);
      
      // Buckets should be visible and labeled
      const bucketLabels = await page.locator('.bucket-label').allTextContents();
      expect(bucketLabels).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    });

    test('should animate element movement', async () => {
      const initialPositions = await page.evaluate(() => {
        const elements1 = document.querySelectorAll('.array-element');
        return Array.from(elements).map(el => ({
          text: el.textContent,
          rect: el.getBoundingClientRect()
        }));
      });
      
      await radixSort.clickNextStep();
      await page.waitForTimeout(500); // Mid-animation
      
      const midPositions = await page.evaluate(() => {
        const elements2 = document.querySelectorAll('.array-element');
        return Array.from(elements).map(el => ({
          text: el.textContent,
          rect: el.getBoundingClientRect()
        }));
      });
      
      // At least some elements should have moved
      const moved = initialPositions.some((initial, i) => {
        const mid = midPositions.find(m => m.text === initial.text);
        return mid && (Math.abs(mid.rect.top - initial.rect.top) > 10 || 
                      Math.abs(mid.rect.left - initial.rect.left) > 10);
      });
      
      expect(moved).toBe(true);
    });
  });

  test.describe('State Persistence', () => {
    test('should maintain array through reset', async () => {
      const customArray1 = '33, 22, 11';
      await radixSort.setCustomArray(customArray);
      
      // Start sorting
      await radixSort.clickNextStep();
      await radixSort.waitForAnimationComplete();
      
      // Reset
      await radixSort.clickReset();
      
      // Array should be back to original unsorted state
      const arrayValues4 = await radixSort.getArrayValues();
      expect(arrayValues).toEqual([33, 22, 11]);
    });

    test('should clear buckets on reset', async () => {
      await radixSort.clickNextStep();
      await page.waitForTimeout(1500);
      
      // Verify buckets have items
      let hasItems = false;
      for (let i = 0; i < 10; i++) {
        const count1 = await radixSort.getBucketCount(i);
        if (count > 0) {
          hasItems = true;
          break;
        }
      }
      expect(hasItems).toBe(true);
      
      // Reset
      await radixSort.clickReset();
      await radixSort.waitForAnimationComplete();
      
      // All buckets should be empty
      for (let i = 0; i < 10; i++) {
        const count2 = await radixSort.getBucketCount(i);
        expect(count).toBe(0);
      }
    });
  });
});