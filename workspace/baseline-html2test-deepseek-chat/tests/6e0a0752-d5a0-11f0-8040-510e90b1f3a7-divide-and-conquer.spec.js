import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0752-d5a0-11f0-8040-510e90b1f3a7.html';

// Page Object for the Merge Sort page
class MergeSortPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        this.input = page.locator('#numbers');
        this.runButton = page.locator('button', { hasText: 'Run Merge Sort' });
        this.resultDiv = page.locator('#result');
        this.stepDivs = () => this.page.locator('.step');
        this.title = page.locator('h1');
    }

    async goto() {
        await this.page.goto(APP_URL);
    }

    async getTitleText() {
        return this.title.textContent();
    }

    async getInputValue() {
        return this.input.inputValue();
    }

    async setInputValue(value) {
        await this.input.fill(value);
    }

    async clickRun() {
        await Promise.all([
            // the operation is synchronous in the page script, but ensure stable timing
            this.page.waitForTimeout(50),
            this.runButton.click()
        ]);
    }

    async getResultHTML() {
        return this.resultDiv.innerHTML();
    }

    async getResultText() {
        return this.resultDiv.textContent();
    }

    async getStepsCount() {
        return this.stepDivs().count();
    }

    async getStepTexts() {
        const count = await this.getStepsCount();
        const arr = [];
        for (let i = 0; i < count; i++) {
            arr.push(await this.stepDivs().nth(i).textContent());
        }
        return arr;
    }
}

test.describe('Divide and Conquer - Merge Sort Visualization (App ID: 6e0a0752-d5a0-11f0-8040-510e90b1f3a7)', () => {
    // Collect console messages and page errors for each test to observe runtime problems
    let consoleMessages = [];
    let pageErrors = [];

    test.beforeEach(async ({ page }) => {
        consoleMessages = [];
        pageErrors = [];

        // Collect console messages
        page.on('console', msg => {
            consoleMessages.push({ type: msg.type(), text: msg.text() });
        });

        // Collect page errors (uncaught exceptions)
        page.on('pageerror', err => {
            // err is an Error with message and name
            pageErrors.push(err);
        });

        // Navigate to the application page
        await page.goto(APP_URL);
    });

    test.afterEach(async () => {
        // No-op here; individual tests will assert on collected logs/errors as needed
    });

    test('Initial load: page shows title and default input, result area is empty', async ({ page }) => {
        // Purpose: Verify the initial UI state before any interaction
        const app = new MergeSortPage(page);

        // Title present and correct
        await expect(app.title).toBeVisible();
        const titleText = await app.getTitleText();
        expect(titleText).toContain('Divide and Conquer: Merge Sort');

        // Default input value is set
        const inputVal = await app.getInputValue();
        expect(inputVal).toBe('5,2,8,1,9,3,7');

        // The result container should be empty at initial load (no final result displayed)
        await expect(app.resultDiv).toBeVisible();
        // innerHTML might be empty string
        const resultHTML = await app.getResultHTML();
        expect(resultHTML.trim()).toBe('', 'Expected empty result area before running algorithm');

        // Assert there were no runtime ReferenceError/SyntaxError/TypeError on load
        const severeErrors = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
        expect(severeErrors.length).toBe(0);
    });

    test('Run merge sort with default numbers: displays final sorted array and steps', async ({ page }) => {
        // Purpose: Validate full data flow: input -> run -> final output + step visualization
        const app = new MergeSortPage(page);

        // Ensure starting input is default
        expect(await app.getInputValue()).toBe('5,2,8,1,9,3,7');

        // Click run and wait for result content to update
        await app.clickRun();

        // The result div should now contain "Final Result:" header and the sorted array content
        await expect(app.resultDiv).toContainText('Final Result:');
        await expect(app.resultDiv).toContainText('Original array:');
        await expect(app.resultDiv).toContainText('Sorted array:');

        // Verify the sorted array is correct
        const resultText = await app.getResultText();
        // Look for the sorted array substring between "Sorted array:" and the following closing tag
        expect(resultText).toContain('Sorted array:');
        // The expected sorted array for [5,2,8,1,9,3,7] is [1,2,3,5,7,8,9]
        expect(resultText).toContain('[1, 2, 3, 5, 7, 8, 9]');

        // Verify that steps are displayed and include DIVIDE, MERGE and BASE CASE entries
        const stepCount = await app.getStepsCount();
        expect(stepCount).toBeGreaterThan(0);

        const stepTexts = await app.getStepTexts();
        // At least one DIVIDE, one MERGE and one BASE CASE should be present in the step outputs
        const hasDivide = stepTexts.some(t => t && t.includes('DIVIDE'));
        const hasMerge = stepTexts.some(t => t && t.includes('MERGE'));
        const hasBase = stepTexts.some(t => t && t.includes('BASE CASE'));

        expect(hasDivide).toBeTruthy();
        expect(hasMerge).toBeTruthy();
        expect(hasBase).toBeTruthy();

        // Ensure no severe runtime errors occurred during the execution
        const severeErrors = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
        expect(severeErrors.length).toBe(0);
    });

    test('Custom input with spaces, negatives and duplicates sorts correctly and updates DOM', async ({ page }) => {
        // Purpose: Test input parsing robustness and correctness on non-trivial input
        const app = new MergeSortPage(page);

        // Provide a custom input string with spaces, a negative number, and duplicates
        const custom = ' 3, -1, 3 , 0,2 ';
        await app.setInputValue(custom);

        // Run the algorithm
        await app.clickRun();

        // Confirm output shows the expected sorted result for [3, -1, 3, 0, 2] => [-1,0,2,3,3]
        await expect(app.resultDiv).toContainText('Sorted array:');
        const resultText = await app.getResultText();
        expect(resultText).toContain('[-1, 0, 2, 3, 3]');

        // Ensure the steps reflect the elements (some step should mention BASE CASE entries for singletons)
        const stepTexts = await app.getStepTexts();
        const hasBase = stepTexts.some(t => t && t.includes('BASE CASE'));
        expect(hasBase).toBeTruthy();

        // Ensure no severe runtime errors occurred
        const severeErrors = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
        expect(severeErrors.length).toBe(0);
    });

    test('Edge case: empty input produces NaN in parsed array (observe behavior) and updates result DOM', async ({ page }) => {
        // Purpose: Verify how the app behaves with empty input. We do not fix any behavior; we only observe and assert.
        const app = new MergeSortPage(page);

        // Clear the input to be empty
        await app.setInputValue('');

        // Run the algorithm with empty input
        await app.clickRun();

        // The code splits '' into [''] and parseInt('') => NaN. We assert that the resulting sorted array contains NaN.
        // The resultDiv's text will include "Sorted array:" and likely show "NaN". We check for presence of "NaN".
        await expect(app.resultDiv).toContainText('Sorted array:');

        const resultText = await app.getResultText();
        // It's acceptable that the UI shows NaN; assert that at least one 'NaN' token appears in the result text
        const containsNaN = resultText.includes('NaN') || resultText.includes('nan');
        expect(containsNaN).toBeTruthy();

        // Also ensure steps are rendered (could be BASE CASE for [NaN] etc)
        const stepCount = await app.getStepsCount();
        expect(stepCount).toBeGreaterThanOrEqual(1);

        // Capture any severe runtime errors (we expect none even for odd data)
        const severeErrors = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
        expect(severeErrors.length).toBe(0);
    });

    test('Observes console and page error streams: report any errors (must be none of ReferenceError/SyntaxError/TypeError)', async ({ page }) => {
        // Purpose: Explicitly verify there are no uncaught ReferenceError, SyntaxError, or TypeError during typical usage.
        const app = new MergeSortPage(page);

        // Trigger a normal run to exercise code paths
        await app.clickRun();

        // Allow any console/pageerror events to be collected
        await page.waitForTimeout(100);

        // Inspect collected page errors
        const severityList = pageErrors.map(e => ({ name: e.name, message: e.message }));
        // Fail the test if any page error is ReferenceError, SyntaxError, or TypeError and provide details
        const bad = severityList.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
        if (bad.length > 0) {
            // Attach the error details in expectations for clearer output
            const messages = bad.map(b => `${b.name}: ${b.message}`).join('; ');
            expect(bad.length, `Unexpected severe runtime errors: ${messages}`).toBe(0);
        } else {
            // No severe errors found
            expect(bad.length).toBe(0);
        }

        // Additionally assert that console.error was not called with a severe message
        const consoleErrors = consoleMessages.filter(m => m.type === 'error');
        // If there are console.error messages, fail to indicate potential issues
        expect(consoleErrors.length, `console.error messages were emitted: ${consoleErrors.map(c => c.text).join(' | ')}`).toBe(0);
    });
});