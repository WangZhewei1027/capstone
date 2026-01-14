import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0ccbe011-d5b5-11f0-899c-75bf12e026a9.html';

// Page Object for the Bubble Sort page
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.startBtn = page.locator('#startBtn');
    this.speedRange = page.locator('#speedRange');
    this.speedValue = page.locator('#speedValue');
    this.output = page.locator('#output');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setInput(value) {
    await this.arrayInput.fill(value);
  }

  async getInputValue() {
    return await this.arrayInput.inputValue();
  }

  async setSpeed(ms) {
    // Use evaluate to set value and dispatch input so the page's handler runs
    await this.page.evaluate((val) => {
      const el = document.getElementById('speedRange');
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(ms));
  }

  async getSpeedValueText() {
    return (await this.speedValue.textContent())?.trim();
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async isStartDisabled() {
    return await this.startBtn.isDisabled();
  }

  async isInputDisabled() {
    return await this.arrayInput.isDisabled();
  }

  async isSpeedDisabled() {
    return await this.speedRange.isDisabled();
  }

  async getOutputText() {
    // Return the textual content (innerText) for easier assertion
    return await this.page.evaluate(() => {
      const out = document.getElementById('output');
      return out ? out.innerText : '';
    });
  }

  async waitForTextInOutput(text, timeout = 10000) {
    await this.page.waitForFunction(
      (t) => {
        const out = document.getElementById('output');
        return out && out.innerText.includes(t);
      },
      text,
      { timeout }
    );
  }
}

test.describe('Bubble Sort Visualization - FSM and UI validations', () => {
  // Capture console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    page.on('console', (msg) => {
      // Collect only console messages of type 'error' for assertions
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push({
        message: err.message,
        stack: err.stack,
      });
    });
  });

  test.describe('Initial Idle State (S0_Idle)', () => {
    test('should render controls and default input on load', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      // Load the page exactly as provided
      await bs.goto();

      // Validate presence of main controls (evidence for Idle state)
      await expect(bs.startBtn).toBeVisible();
      await expect(bs.arrayInput).toBeVisible();
      await expect(bs.speedRange).toBeVisible();
      await expect(bs.output).toBeVisible();

      // Default input value evidence from FSM/comps
      const inputVal = await bs.getInputValue();
      expect(inputVal).toBe('5,3,8,4,2');

      // Output should be empty initially (Idle)
      const outText = await bs.getOutputText();
      expect(outText.trim()).toBe('');

      // No console or page errors on load
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Speed control interactions (InputChange event)', () => {
    test('changing the speed range updates the displayed speed', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.goto();

      // Set to a new speed and assert speedValue updates
      await bs.setSpeed(2000);
      const speedText = await bs.getSpeedValueText();
      expect(speedText).toBe('2000');

      // Also verify that the element's value reflects the change
      const speedVal = await page.$eval('#speedRange', (el) => el.value);
      expect(speedVal).toBe('2000');

      // Ensure no runtime errors occurred while adjusting input
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('StartSorting transition and Sorting state (S0_Idle -> S1_Sorting -> S2_Sorted)', () => {
    test('clicking Start sorts the array and toggles controls appropriately', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.goto();

      // Speed down to minimize test runtime
      await bs.setSpeed(100);

      // Start sorting
      await bs.clickStart();

      // Immediately after click, controls should be disabled per transition evidence
      expect(await bs.isStartDisabled()).toBeTruthy();
      expect(await bs.isInputDisabled()).toBeTruthy();
      expect(await bs.isSpeedDisabled()).toBeTruthy();

      // Output should indicate sorting has started
      await bs.waitForTextInOutput('Starting Bubble Sort on:', 10000);
      const outAfterStart = await bs.getOutputText();
      expect(outAfterStart).toContain('Starting Bubble Sort on:');
      expect(outAfterStart).toContain('Pass 1:');

      // Wait for the algorithm to complete (look for final message)
      await bs.waitForTextInOutput('Sorting complete!', 20000);

      const finalOut = await bs.getOutputText();
      expect(finalOut).toContain('Sorting complete!');
      // Final sorted array evidence: numbers in ascending order appear in output
      expect(finalOut.replace(/\s+/g, '')).toContain('2,3,4,5,8'.replace(/\s+/g, ''));

      // After completion controls should be re-enabled (exit action enableControls)
      expect(await bs.isStartDisabled()).toBeFalsy();
      expect(await bs.isInputDisabled()).toBeFalsy();
      expect(await bs.isSpeedDisabled()).toBeFalsy();

      // Also verify that the output includes the "Final sorted array" HTML form (span classes)
      // We check that there are span elements with class sorted or similar in innerHTML
      const outputInnerHTML = await page.$eval('#output', (el) => el.innerHTML);
      expect(outputInnerHTML).toContain('Final sorted array');
      // Expect some span tags to be present as formatArray uses spans
      expect(outputInnerHTML).toMatch(/<span class=".*?">.*?<\/span>/);

      // No console or page errors during sorting flow
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    }, 30000); // give ample timeout for sorting
  });

  test.describe('Invalid input handling (S1_Sorting -> S3_InvalidInput -> S0_Idle Retry)', () => {
    test('providing invalid input shows error and re-enables controls (Retry)', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.goto();

      // Provide an invalid input (non-numeric)
      await bs.setInput('a,b,c');
      // Click start
      await bs.clickStart();

      // According to implementation, it will disable controls then show invalid message and re-enable
      // Wait shortly for the handler to run
      await page.waitForTimeout(200);

      const outText = await bs.getOutputText();
      expect(outText.trim()).toBe('Invalid input. Please enter a comma separated list of numbers.');

      // Controls should be re-enabled after invalid input (evidence of Retry transition)
      expect(await bs.isStartDisabled()).toBeFalsy();
      expect(await bs.isInputDisabled()).toBeFalsy();
      expect(await bs.isSpeedDisabled()).toBeFalsy();

      // No uncaught page errors should have happened
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Edge cases and additional validations', () => {
    test('empty input shows invalid input message', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.goto();

      await bs.setInput('');
      await bs.clickStart();
      await page.waitForTimeout(200);

      const outText = await bs.getOutputText();
      expect(outText.trim()).toBe('Invalid input. Please enter a comma separated list of numbers.');

      // Controls restored
      expect(await bs.isStartDisabled()).toBeFalsy();
      expect(await bs.isInputDisabled()).toBeFalsy();
      expect(await bs.isSpeedDisabled()).toBeFalsy();

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('input with extra commas and spaces is parsed correctly if numbers present', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.goto();

      // Mixed valid and empty entries
      await bs.setInput(' 7 , , 1, 3 , ');
      await bs.setSpeed(100);
      await bs.clickStart();

      // Wait for complete
      await bs.waitForTextInOutput('Sorting complete!', 20000);
      const finalOut = await bs.getOutputText();
      // Final sorted array should contain the numbers 1,3,7
      expect(finalOut.replace(/\s+/g, '')).toContain('1,3,7'.replace(/\s+/g, ''));

      // Controls re-enabled
      expect(await bs.isStartDisabled()).toBeFalsy();
      expect(await bs.isInputDisabled()).toBeFalsy();
      expect(await bs.isSpeedDisabled()).toBeFalsy();

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    }, 20000);
  });
});