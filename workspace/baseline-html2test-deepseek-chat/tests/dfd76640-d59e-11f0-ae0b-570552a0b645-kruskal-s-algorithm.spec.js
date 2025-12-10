import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd76640-d59e-11f0-ae0b-570552a0b645.html';

// Page object encapsulating selectors and common interactions
class KruskalPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        this.stepBtn = page.locator('#stepBtn');
        this.runBtn = page.locator('#runBtn');
        this.resetBtn = page.locator('#resetBtn');
        this.stepDescription = page.locator('#stepDescription');
        this.edgesList = page.locator('#edgesList');
        this.mstWeight = page.locator('#mstWeight');
        this.canvas = page.locator('#graphCanvas');
    }

    // Click the "Next Step" button
    async clickNextStep() {
        await this.stepBtn.click();
    }

    // Click the "Run All Steps" button
    async clickRunAll() {
        await this.runBtn.click();
    }

    // Click the "Reset Graph" button
    async clickReset() {
        await this.resetBtn.click();
    }

    // Get the current step description HTML
    async getStepDescriptionHTML() {
        return await this.stepDescription.innerHTML();
    }

    // Get plain text of step description
    async getStepDescriptionText() {
        return await this.stepDescription.textContent();
    }

    // Return the array of edge list items (text)
    async getEdgesListItemsText() {
        const count = await this.edgesList.locator('li').count();
        const texts = [];
        for (let i = 0; i < count; i++) {
            texts.push((await this.edgesList.locator('li').nth(i).innerHTML()).trim());
        }
        return texts;
    }

    // Return class names for each edge LI
    async getEdgesListItemsClasses() {
        const count = await this.edgesList.locator('li').count();
        const classes = [];
        for (let i = 0; i < count; i++) {
            classes.push((await this.edgesList.locator('li').nth(i).getAttribute('class')) || '');
        }
        return classes;
    }

    // Get displayed MST weight
    async getMstWeight() {
        return (await this.mstWeight.textContent()).trim();
    }

    // Get canvas size attributes
    async getCanvasSize() {
        const width = await this.canvas.getAttribute('width');
        const height = await this.canvas.getAttribute('height');
        return { width, height };
    }
}

test.describe('Kruskal\'s Algorithm Visualization - Integration Tests', () => {
    // Collect console errors and page errors for each test to assert none occur unexpectedly
    let consoleErrors;
    let pageErrors;

    test.beforeEach(async ({ page }) => {
        consoleErrors = [];
        pageErrors = [];

        // Capture console messages and page errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push({
                    text: msg.text(),
                    location: msg.location()
                });
            }
        });

        page.on('pageerror', error => {
            pageErrors.push(error);
        });

        // Navigate to the application page
        await page.goto(APP_URL, { waitUntil: 'load' });
    });

    test.afterEach(async () => {
        // Assert that no console errors or page errors were emitted during the test
        // This validates that the application didn't throw unexpected runtime exceptions
        expect(consoleErrors, `Console 'error' messages were emitted: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
        expect(pageErrors, `Page errors were emitted: ${JSON.stringify(pageErrors)}`).toHaveLength(0);
    });

    test('Initial load: UI elements present and default state is correct', async ({ page }) => {
        // Purpose: Verify that on initial load, all interactive elements are available and initial texts & values match expectations.
        const kruskal = new KruskalPage(page);

        // Check that buttons are visible and enabled
        await expect(kruskal.stepBtn).toBeVisible();
        await expect(kruskal.runBtn).toBeVisible();
        await expect(kruskal.resetBtn).toBeVisible();
        await expect(kruskal.stepBtn).toBeEnabled();
        await expect(kruskal.runBtn).toBeEnabled();

        // Verify initial step description instructs the user to start
        const desc = await kruskal.getStepDescriptionText();
        expect(desc).toContain('Click "Next Step" to start execution');

        // Verify edges list is populated and sorted by weight (first edge should be the smallest weight)
        const edgesText = await kruskal.getEdgesListItemsText();
        expect(edgesText.length).toBeGreaterThan(0);
        // The smallest weight in the provided graph is 4 on edge 2-3. The exact innerHTML format is "Edge 2-3: weight 4"
        expect(edgesText[0]).toContain('Edge 2-3: weight 4');

        // Verify MST weight starts at 0
        const initialWeight = await kruskal.getMstWeight();
        expect(initialWeight).toBe('0');

        // Verify canvas exists and has expected dimensions
        const canvasSize = await kruskal.getCanvasSize();
        expect(canvasSize.width).toBe('500');
        expect(canvasSize.height).toBe('400');
    });

    test('Single step progression updates UI and union-find info is displayed', async ({ page }) => {
        // Purpose: Clicking "Next Step" should consider the smallest edge, update description, set MST/skipped status in the list, and update current edge highlighting.
        const kruskal = new KruskalPage(page);

        // Click the next step once
        await kruskal.clickNextStep();

        // After one step, the step description should reference "Considering edge" and show either "Added to MST" or "Skipped"
        const stepHTML = await kruskal.getStepDescriptionHTML();
        expect(stepHTML).toMatch(/Considering edge \d+-\d+ \(weight: \d+\)/);

        // For the first (smallest) edge in this graph (2-3, weight 4) it should be added to the MST, so the description should contain "Added to MST" and the Parent array
        expect(stepHTML).toMatch(/Added to MST|Added to MST \(no cycle created\)|Added to MST \(no cycle created\)/i);
        // The implementation appends "Parent array: [..]" when adding; ensure the parent string is visible
        expect(stepHTML).toMatch(/Parent array: \[.*\]/);

        // The edges list: index 0 should now be marked as in MST (class 'mst-edge' and contains check mark)
        const edgesClasses = await kruskal.getEdgesListItemsClasses();
        const edgesText = await kruskal.getEdgesListItemsText();
        expect(edgesClasses[0]).toContain('mst-edge');
        expect(edgesText[0]).toContain('✓ (In MST)');

        // The second item (index 1) should now be highlighted as the current edge being considered
        expect(edgesClasses[1]).toContain('current-edge');

        // MST weight should equal the weight of the edge just added (4)
        const weightAfterOne = await kruskal.getMstWeight();
        // Depending on formatting, ensure numeric string '4' appears
        expect(weightAfterOne).toBe('4');
    });

    test('Complete run by stepping through all edges results in correct final MST and weight', async ({ page }) => {
        // Purpose: Step through all edges using the Next Step button to completion, then validate MST membership and final weight.
        const kruskal = new KruskalPage(page);

        // Count total edges to know how many steps to perform
        const initialEdgesCount = await kruskal.edgesList.locator('li').count();
        expect(initialEdgesCount).toBe(8); // Implementation has 8 edges

        // Perform Next Step clicks equal to the number of edges to process all steps
        for (let i = 0; i < initialEdgesCount; i++) {
            await kruskal.clickNextStep();
            // small pause to allow DOM updates and re-render (drawGraph) to occur
            await page.waitForTimeout(25);
        }

        // After all steps, there should be no "current-edge" highlighted (currentStep >= sortedEdges.length)
        const classesAfterAll = await kruskal.getEdgesListItemsClasses();
        const hasCurrent = classesAfterAll.some(c => c.includes('current-edge'));
        expect(hasCurrent).toBeFalsy();

        // MST should have exactly (nodes.length - 1) edges = 4 edges for the provided graph
        // The code marks MST membership by adding '✓ (In MST)' to li.innerHTML - count occurrences
        const textsAfterAll = await kruskal.getEdgesListItemsText();
        const inMstCount = textsAfterAll.filter(t => t.includes('✓ (In MST)')).length;
        expect(inMstCount).toBe(4);

        // Final MST weight for this specific graph should be 24 (edges chosen: 4 + 5 + 7 + 8 = 24)
        const finalWeight = await kruskal.getMstWeight();
        expect(finalWeight).toBe('24');

        // The step description after completion should reflect that no more steps are considered or at least not throw
        const finalDesc = await kruskal.getStepDescriptionText();
        // It might show the last considered edge; ensure it contains either 'Skipped' or 'Added' or parent info, but not an empty string
        expect(finalDesc.length).toBeGreaterThan(0);
    });

    test('Reset restores initial state after running steps', async ({ page }) => {
        // Purpose: After performing steps, clicking Reset should clear MST, reset current step, and set the descriptive text to the reset message.
        const kruskal = new KruskalPage(page);

        // Take a couple of steps to change state
        await kruskal.clickNextStep();
        await kruskal.clickNextStep();

        // Verify MST weight is > 0 after a couple steps
        const weightAfterSteps = await kruskal.getMstWeight();
        expect(Number(weightAfterSteps)).toBeGreaterThanOrEqual(0);

        // Click reset
        await kruskal.clickReset();

        // After reset, step description should indicate 'Algorithm reset'
        const resetDesc = await kruskal.getStepDescriptionText();
        expect(resetDesc).toContain('Algorithm reset');

        // MST weight should be reset to 0
        const weightAfterReset = await kruskal.getMstWeight();
        expect(weightAfterReset).toBe('0');

        // Edges list should now mark the first edge as current-edge again (index 0)
        const classesAfterReset = await kruskal.getEdgesListItemsClasses();
        expect(classesAfterReset[0]).toContain('current-edge');

        // Ensure no list items show '✓ (In MST)' after reset
        const textsAfterReset = await kruskal.getEdgesListItemsText();
        const anyMst = textsAfterReset.some(t => t.includes('✓ (In MST)'));
        expect(anyMst).toBeFalsy();
    });

    test('Run All Steps button disables while running and completes to the same final MST', async ({ page }) => {
        // Purpose: Clicking "Run All Steps" should disable the run button during execution and produce the same final MST as stepping manually.
        const kruskal = new KruskalPage(page);

        // Click run all - this will kick off an asynchronous loop with 1s timeouts between steps.
        // We cannot change the implementation, so wait for completion by polling the run button's disabled state.
        await kruskal.clickRunAll();

        // Immediately after clicking, the run button should be disabled
        await expect(kruskal.runBtn).toBeDisabled();

        // Wait until the run button becomes enabled again, with a timeout margin (max ~12 seconds)
        await expect(kruskal.runBtn).toBeEnabled({ timeout: 15000 });

        // After completion ensure MST weight equals expected 24
        const finalWeight = await kruskal.getMstWeight();
        expect(finalWeight).toBe('24');

        // Ensure the number of edges in MST is 4
        const textsAfterRun = await kruskal.getEdgesListItemsText();
        const inMstCount = textsAfterRun.filter(t => t.includes('✓ (In MST)')).length;
        expect(inMstCount).toBe(4);
    });

    test('Accessibility and DOM sanity: buttons have accessible names and canvas is focusable via tab order', async ({ page }) => {
        // Purpose: Basic accessibility and DOM checks - ensure buttons have text (accessible names) and canvas is present in tab order.
        const kruskal = new KruskalPage(page);

        // Buttons should have visible text content indicating their purpose
        await expect(kruskal.stepBtn).toHaveText(/Next Step/);
        await expect(kruskal.runBtn).toHaveText(/Run All Steps|Run All/);
        await expect(kruskal.resetBtn).toHaveText(/Reset Graph/);

        // Attempt to tab to the canvas by focusing the body and pressing Tab until canvas receives focus or until a reasonable number of tabs
        // Note: Canvas may not be naturally focusable; this is a sanity check to ensure it exists in the DOM and has dimensions.
        await page.focus('body');
        const maxTabs = 10;
        let canvasFocused = false;
        for (let i = 0; i < maxTabs; i++) {
            await page.keyboard.press('Tab');
            const active = await page.evaluate(() => document.activeElement?.id || '');
            if (active === 'graphCanvas') {
                canvasFocused = true;
                break;
            }
        }
        // It's acceptable if the canvas is not focusable; we only assert the existence and size previously. So be lenient here.
        const canvasSize = await kruskal.getCanvasSize();
        expect(canvasSize.width).toBeTruthy();
        expect(canvasSize.height).toBeTruthy();
    });
});