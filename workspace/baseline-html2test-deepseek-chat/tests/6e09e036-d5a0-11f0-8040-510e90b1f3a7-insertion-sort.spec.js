import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09e036-d5a0-11f0-8040-510e90b1f3a7.html';

// Page Object Model for the Insertion Sort app
class InsertionSortPage {
    constructor(page) {
        this.page = page;
        this.arrayContainer = page.locator('#arrayContainer');
        this.currentStep = page.locator('#currentStep');
        this.stats = page.locator('#stats');
        this.generateBtn = page.locator('#generateBtn');
        this.startBtn = page.locator('#startBtn');
        this.pauseBtn = page.locator('#pauseBtn');
        this.resetBtn = page.locator('#resetBtn');
        this.speedSlider = page.locator('#speedSlider');
        this.explanation = page.locator('#explanation');
        this.header = page.locator('h1');
    }

    // Returns locator for element at index
    elementAt(index) {
        return this.page.locator(`#element-${index}`);
    }

    // Returns array of element texts
    async readArrayValues() {
        const count = await this.arrayContainer.locator('.array-element').count();
        const values = [];
        for (let i = 0; i < count; i++) {
            const txt = await this.arrayContainer.locator('.array-element').nth(i).textContent();
            values.push(txt ? txt.trim() : '');
        }
        return values;
    }

    // Returns array of classes for each element
    async readElementClasses() {
        const count = await this.arrayContainer.locator('.array-element').count();
        const classes = [];
        for (let i = 0; i < count; i++) {
            const cls = await this.arrayContainer.locator('.array-element').nth(i).getAttribute('class');
            classes.push(cls || '');
        }
        return classes;
    }

    // Helper to start sorting
    async startSorting() {
        await this.startBtn.click();
    }

    // Helper to pause/resume sorting
    async togglePause() {
        await this.pauseBtn.click();
    }

    // Helper to generate new array
    async generateArray() {
        await this.generateBtn.click();
    }

    // Helper to reset visualization
    async resetVisualization() {
        await this.resetBtn.click();
    }

    // Set slider value (string or number)
    async setSpeed(value) {
        await this.speedSlider.fill(String(value));
        // Trigger input event by pressing ArrowRight then ArrowLeft (some browsers require)
        await this.speedSlider.press('ArrowRight').catch(() => {});
        await this.speedSlider.press('ArrowLeft').catch(() => {});
    }
}

test.describe('Insertion Sort Visualization - App (6e09e036-d5a0-11f0-8040-510e90b1f3a7)', () => {
    let consoleMessages;
    let pageErrors;

    test.beforeEach(async ({ page }) => {
        // Capture console messages and page errors for each test
        consoleMessages = [];
        pageErrors = [];

        page.on('console', msg => {
            const type = msg.type(); // log, error, warning, etc.
            consoleMessages.push({ type, text: msg.text() });
        });

        page.on('pageerror', error => {
            // Collect runtime errors (ReferenceError, TypeError, etc.)
            pageErrors.push(error);
        });

        // Navigate to the app
        await page.goto(APP_URL);
    });

    test.afterEach(async ({}, testInfo) => {
        // Attach debug info to test output when available
        if (pageErrors.length > 0) {
            const errors = pageErrors.map(e => e.stack || e.message).join('\n---\n');
            testInfo.attach('page-errors', { body: errors, contentType: 'text/plain' });
        }
        if (consoleMessages.length > 0) {
            const logs = consoleMessages.map(m => `[${m.type}] ${m.text}`).join('\n');
            testInfo.attach('console-messages', { body: logs, contentType: 'text/plain' });
        }
    });

    test('Initial load: header, controls and default state are correct', async ({ page }) => {
        // Purpose: Validate initial UI and default values after page load
        const app = new InsertionSortPage(page);

        // Header and explanation visible
        await expect(app.header).toHaveText('Insertion Sort Visualization');
        await expect(app.explanation).toBeVisible();

        // Array should be initialized with 10 elements
        const elements = app.arrayContainer.locator('.array-element');
        await expect(elements).toHaveCount(10);

        // All elements should have numeric text content
        const values = await app.readArrayValues();
        expect(values.length).toBe(10);
        for (const v of values) {
            // Ensure it's a number string (non-empty and numeric)
            expect(v).toMatch(/^\d+$/);
        }

        // Stats should show zero comparisons and swaps at start
        await expect(app.stats).toHaveText('Comparisons: 0 | Swaps: 0');

        // Controls initial states: start enabled, pause disabled, generate enabled
        await expect(app.startBtn).toBeEnabled();
        await expect(app.pauseBtn).toBeDisabled();
        await expect(app.generateBtn).toBeEnabled();
        await expect(app.resetBtn).toBeEnabled();

        // Current step explanation shows the start prompt
        const currentStepText = await app.currentStep.textContent();
        expect(currentStepText).toContain('Click "Start Sorting" to begin the visualization.');

        // Ensure no runtime errors happened during initial load
        expect(pageErrors.length).toBe(0);
    });

    test('Generate New Array resets stats and produces 10 elements', async ({ page }) => {
        // Purpose: Verify the Generate button reinitializes the array and resets stats
        const app = new InsertionSortPage(page);

        const initialValues = await app.readArrayValues();
        // Click generate
        await app.generateArray();

        // After generating, there should still be 10 elements
        const afterValues = await app.readArrayValues();
        expect(afterValues.length).toBe(10);

        // Stats reset to zero
        await expect(app.stats).toHaveText('Comparisons: 0 | Swaps: 0');

        // It's possible (rare) that random array equals previous; ensure values are numeric
        for (const v of afterValues) {
            expect(v).toMatch(/^\d+$/);
        }

        // Ensure no runtime page errors occurred during generate
        expect(pageErrors.length).toBe(0);
    });

    test('Start Sorting updates UI: buttons disabled/enabled, current step changes and stats update', async ({ page }) => {
        // Purpose: Start the sorting process and verify UI reflects sorting state
        const app = new InsertionSortPage(page);

        // Record the initial current step text
        const initialCurrent = (await app.currentStep.textContent()) || '';

        // Start sorting
        await app.startSorting();

        // Start button should now be disabled, pause enabled, generate disabled
        await expect(app.startBtn).toBeDisabled();
        await expect(app.pauseBtn).toBeEnabled();
        await expect(app.generateBtn).toBeDisabled();

        // The currentStep text should change from the initial message to a step description
        await expect.poll(async () => (await app.currentStep.textContent()) || '', {
            timeout: 3000,
        }).not.toBe(initialCurrent);

        const newStep = (await app.currentStep.textContent()) || '';
        // The text should mention starting or considering or inserted
        expect(
            /Starting with the first element|Considering element|Inserted|Sorting complete/i.test(
                newStep
            )
        ).toBeTruthy();

        // Stats should be in the form "Comparisons: X | Swaps: Y" with numbers
        const statsText = (await app.stats.textContent()) || '';
        expect(statsText).toMatch(/^Comparisons:\s*\d+\s*\|\s*Swaps:\s*\d+/);

        // Some elements should have classes that indicate progress (sorted/current/comparing)
        const classes = await app.readElementClasses();
        const hasSorted = classes.some(c => c.includes('sorted'));
        const hasCurrentOrComparing = classes.some(c => c.includes('current') || c.includes('comparing'));
        expect(hasSorted).toBeTruthy();
        expect(hasCurrentOrComparing).toBeTruthy();

        // Pause the sorting to keep deterministic state for subsequent tests
        await app.pauseBtn.click();
        // After pausing, the pause button text should change to 'Resume'
        await expect(app.pauseBtn).toHaveText('Resume');

        // Ensure no runtime page errors occurred during start
        expect(pageErrors.length).toBe(0);
    });

    test('Pause and Resume toggles pause state and preserves progress', async ({ page }) => {
        // Purpose: Validate pause/resume behavior toggles and does not reset the sort
        const app = new InsertionSortPage(page);

        // Start sorting then pause after a short delay to allow some steps
        await app.startSorting();
        await page.waitForTimeout(400); // allow at least one interval execution (default speed ~500ms)
        await app.togglePause();

        // Pause button should display 'Resume' now
        await expect(app.pauseBtn).toHaveText('Resume');

        // Capture current step and stats while paused
        const pausedStep = await app.currentStep.textContent();
        const pausedStats = await app.stats.textContent();

        // Wait a moment to ensure no additional progress occurs while paused
        await page.waitForTimeout(700);
        const pausedStepAfter = await app.currentStep.textContent();
        const pausedStatsAfter = await app.stats.textContent();

        expect(pausedStepAfter).toBe(pausedStep);
        expect(pausedStatsAfter).toBe(pausedStats);

        // Resume sorting
        await app.togglePause();
        // Button text should revert to 'Pause'
        await expect(app.pauseBtn).toHaveText('Pause');

        // After resuming, we should eventually see changes in currentStep (resume progress)
        await expect.poll(async () => (await app.currentStep.textContent()) || '', {
            timeout: 3000,
        }).not.toBe(pausedStep);

        // Finally, pause to stop further actions in this test
        await app.togglePause();
        await expect(app.pauseBtn).toHaveText('Resume');

        // Ensure no runtime page errors occurred during pause/resume
        expect(pageErrors.length).toBe(0);
    });

    test('Reset stops sorting and re-initializes array and stats', async ({ page }) => {
        // Purpose: Verify Reset halts sorting and brings UI back to initial state
        const app = new InsertionSortPage(page);

        // Start sorting to change state
        await app.startSorting();
        await page.waitForTimeout(400);

        // Now click Reset
        await app.resetVisualization();

        // Start button should be enabled again, pause disabled, generate enabled
        await expect(app.startBtn).toBeEnabled();
        await expect(app.pauseBtn).toBeDisabled();
        await expect(app.generateBtn).toBeEnabled();

        // Stats should be reset to zero
        await expect(app.stats).toHaveText('Comparisons: 0 | Swaps: 0');

        // Current step text must contain the initial prompt
        await expect(app.currentStep).toContainText('Click "Start Sorting" to begin the visualization.');

        // Array should still have 10 elements of numeric values
        const afterResetValues = await app.readArrayValues();
        expect(afterResetValues.length).toBe(10);
        for (const v of afterResetValues) {
            expect(v).toMatch(/^\d+$/);
        }

        // Ensure no runtime page errors occurred during reset
        expect(pageErrors.length).toBe(0);
    });

    test('Speed slider interaction does not produce errors and is reflected in control value', async ({ page }) => {
        // Purpose: Changing the speed slider should be accepted by the app and not cause errors
        const app = new InsertionSortPage(page);

        // Set speed slider to max and min and ensure value updates accordingly
        await app.setSpeed(10);
        await expect(app.speedSlider).toHaveValue('10');

        await app.setSpeed(1);
        await expect(app.speedSlider).toHaveValue('1');

        // Start sorting to ensure slider's input handler does not throw when sorting
        await app.setSpeed(10);
        await app.startSorting();

        // Change slider while sorting is active
        await app.setSpeed(5);

        // Pause to stabilize
        await app.pauseBtn.click();

        // Check that no page errors have been recorded as a result of speed changes
        expect(pageErrors.length).toBe(0);

        // And check console did not capture severe errors (console type 'error')
        const consoleErrors = consoleMessages.filter(m => m.type === 'error');
        expect(consoleErrors.length).toBe(0);

        // Cleanup: reset to stop background intervals
        await app.resetVisualization();
    });

    test('Accessibility and DOM sanity checks: ARIA-free sanity checks', async ({ page }) => {
        // Purpose: Basic accessibility and DOM sanity checks (presence of controls and labels)
        const app = new InsertionSortPage(page);

        // Ensure the speed control exists and is an input of type range
        const speedInput = page.locator('input#speedSlider');
        await expect(speedInput).toHaveAttribute('type', 'range');

        // Buttons are focusable and have accessible names
        await expect(app.generateBtn).toBeVisible();
        await expect(app.startBtn).toBeVisible();
        await expect(app.pauseBtn).toBeVisible();
        await expect(app.resetBtn).toBeVisible();

        // Tab through the controls to ensure they can receive focus in order
        await page.keyboard.press('Tab');
        await expect(page.locator(':focus')).toBeVisible();
        // We won't assert exact focus order since browsers may differ, but assert that focus can be moved
        await expect(page.locator(':focus')).not.toBeNull();

        // Final assertion: no runtime page errors occurred during accessibility checks
        expect(pageErrors.length).toBe(0);
    });

    test('Console and runtime error monitoring: assert there are no uncaught runtime errors', async ({ page }) => {
        // Purpose: Explicitly validate that no ReferenceError/SyntaxError/TypeError occurred during page interaction
        const app = new InsertionSortPage(page);

        // Interact a bit with the app to potentially trigger errors
        await app.generateArray();
        await app.startSorting();
        await page.waitForTimeout(300);
        await app.togglePause();
        await app.resetVisualization();

        // Collect types of runtime errors if any
        const errorTypes = pageErrors.map(e => e.name || e.constructor.name || e.message);

        // Assert that there were no runtime errors (ReferenceError, TypeError, etc.)
        // If errors exist, the test will fail and the afterEach will attach diagnostics to the test output
        expect(pageErrors.length).toBe(0, `Runtime page errors found: ${JSON.stringify(errorTypes)}`);

        // Also assert console did not emit any 'error' messages
        const consoleErrorCount = consoleMessages.filter(m => m.type === 'error').length;
        expect(consoleErrorCount).toBe(0);
    });
});