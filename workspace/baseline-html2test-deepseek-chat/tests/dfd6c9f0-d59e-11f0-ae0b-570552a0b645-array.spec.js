import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd6c9f0-d59e-11f0-ae0b-570552a0b645.html';

// Page Object to encapsulate interactions with the Genetic Algorithm app
class GAApp {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.startBtn = page.locator('#startBtn');
    this.pauseBtn = page.locator('#pauseBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.stepBtn = page.locator('#stepBtn');
    // Stats and containers
    this.populationContainer = page.locator('#populationContainer');
    this.generationCount = page.locator('#generationCount');
    this.bestFitness = page.locator('#bestFitness');
    this.avgFitness = page.locator('#avgFitness');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait until the app registers load listeners and initial population is rendered
    await this.page.waitForLoadState('load');
    await this.page.waitForSelector('#populationContainer .individual');
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async clickPause() {
    await this.pauseBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async clickStep() {
    await this.stepBtn.click();
  }

  async getGenerationValue() {
    const txt = await this.generationCount.textContent();
    return txt ? txt.trim() : '';
  }

  async getBestFitnessText() {
    return (await this.bestFitness.textContent())?.trim() ?? '';
  }

  async getAvgFitnessText() {
    return (await this.avgFitness.textContent())?.trim() ?? '';
  }

  async getPopulationCount() {
    return await this.populationContainer.locator('.individual').count();
  }

  // Get the HTML snapshot of the population container for comparison
  async getPopulationHTML() {
    return await this.populationContainer.innerHTML();
  }

  // Return genes as array of strings for a given individual index
  async getIndividualGenes(index) {
    const individual = this.populationContainer.locator('.individual').nth(index);
    // genes are divs with class 'gene'
    const geneLocators = individual.locator('.gene');
    const count = await geneLocators.count();
    const genes = [];
    for (let i = 0; i < count; i++) {
      genes.push((await geneLocators.nth(i).textContent())?.trim() ?? '');
    }
    return genes;
  }
}

test.describe('Genetic Algorithm Visualization - dfd6c9f0...', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Capture page errors and console messages to assert on them later
    pageErrors = [];
    consoleMessages = [];

    page.on('pageerror', (err) => {
      // Collect uncaught exceptions from the page
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // Collect console messages for later inspection (type, text)
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Auto-accept any dialogs (alerts) so they don't block tests (the app may alert when target reached)
    page.on('dialog', async (dialog) => {
      try {
        await dialog.accept();
      } catch (e) {
        // ignore accept errors, we'll assert pageErrors separately
      }
    });
  });

  test.afterEach(async () => {
    // No specific teardown required besides assertions inside tests
  });

  test('Initial load: controls present, default stats and population rendered', async ({ page }) => {
    // Purpose: Verify the page loads, controls are in expected enabled/disabled state,
    // and initial population and stats are displayed correctly.
    const app = new GAApp(page);
    await app.goto();

    // Verify controls visibility and enabled/disabled states
    await expect(app.startBtn).toBeVisible();
    await expect(app.pauseBtn).toBeVisible();
    await expect(app.resetBtn).toBeVisible();
    await expect(app.stepBtn).toBeVisible();

    await expect(app.startBtn).toBeEnabled(); // Start should be enabled initially
    await expect(app.pauseBtn).toBeDisabled(); // Pause disabled initially
    await expect(app.resetBtn).toBeEnabled(); // Reset is enabled
    await expect(app.stepBtn).toBeEnabled(); // Step should be enabled for manual generation

    // Verify generation counter initially shows 0
    const gen = await app.getGenerationValue();
    expect(gen).toBe('0');

    // Verify population count equals POPULATION_SIZE (6)
    const popCount = await app.getPopulationCount();
    expect(popCount).toBeGreaterThanOrEqual(1); // ensure something rendered
    expect(popCount).toBe(6);

    // Verify each individual has genes and gene classes correspond to 0 or 1
    for (let i = 0; i < popCount; i++) {
      const genes = await app.getIndividualGenes(i);
      // Chromosome length should be 10
      expect(genes.length).toBe(10);
      genes.forEach((g) => {
        // Genes should be '0' or '1'
        expect(['0', '1']).toContain(g);
      });
    }

    // Verify best/avg fitness display formatting includes '%' and numeric prefix
    const best = await app.getBestFitnessText();
    const avg = await app.getAvgFitnessText();
    expect(best.endsWith('%')).toBeTruthy();
    expect(avg.endsWith('%')).toBeTruthy();

    // Ensure there were no uncaught page errors during initial load
    expect(pageErrors).toEqual([]);

    // Ensure console does not contain 'error' type messages
    const consoleErrors = consoleMessages.filter((c) => c.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Step (Next Generation) increments generation and updates population', async ({ page }) => {
    // Purpose: Verify that clicking "Next Generation" when paused advances one generation,
    // updates the generation counter and modifies the population visualization.
    const app = new GAApp(page);
    await app.goto();

    const initialGen = await app.getGenerationValue();
    expect(initialGen).toBe('0');

    const initialPopulationHTML = await app.getPopulationHTML();

    // Click step - should run exactly one generation since the app is not running
    await app.clickStep();

    // Wait until generation counter changes from 0
    await page.waitForFunction(() => {
      const el = document.getElementById('generationCount');
      return el && Number(el.textContent) > 0;
    }, null, { timeout: 3000 });

    const newGen = await app.getGenerationValue();
    expect(Number(newGen)).toBeGreaterThan(0);

    const newPopulationHTML = await app.getPopulationHTML();
    // The population HTML should have changed after a generation (most likely)
    expect(newPopulationHTML).not.toBe(initialPopulationHTML);

    // Verify stats updated and formatted
    const best = await app.getBestFitnessText();
    const avg = await app.getAvgFitnessText();
    expect(best.endsWith('%')).toBeTruthy();
    expect(avg.endsWith('%')).toBeTruthy();

    // No uncaught page errors should have occurred during step
    expect(pageErrors).toEqual([]);

    // No console error messages
    const consoleErrors = consoleMessages.filter((c) => c.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Start and Pause evolution toggles controls and progresses generations over time', async ({ page }) => {
    // Purpose: Verify that Start disables Start button, enables Pause, disables Step,
    // and that generations progress automatically. Then Pause should stop the loop and re-enable Step.
    const app = new GAApp(page);
    await app.goto();

    // Click Start to begin evolution
    await app.clickStart();

    // Assert UI control states while running
    await expect(app.startBtn).toBeDisabled();
    await expect(app.pauseBtn).toBeEnabled();
    await expect(app.stepBtn).toBeDisabled();

    // Wait for at least one automated generation to occur (the loop triggers after ~1s)
    await page.waitForFunction(() => {
      const el = document.getElementById('generationCount');
      return el && Number(el.textContent) > 0;
    }, null, { timeout: 6000 });

    const genDuringRun = Number(await app.getGenerationValue());
    expect(genDuringRun).toBeGreaterThanOrEqual(1);

    // Now pause the evolution
    await app.clickPause();

    // After pausing, Start should be enabled, Pause disabled, Step enabled
    await expect(app.startBtn).toBeEnabled();
    await expect(app.pauseBtn).toBeDisabled();
    await expect(app.stepBtn).toBeEnabled();

    // Capture generation number and wait briefly to ensure it does not change (paused)
    const genAfterPause = Number(await app.getGenerationValue());
    await page.waitForTimeout(1500); // wait longer than the evolution interval if it were running
    const genAfterWait = Number(await app.getGenerationValue());
    expect(genAfterWait).toBe(genAfterPause); // generation should not have advanced while paused

    // Verify no uncaught errors occurred during start/pause cycle
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter((c) => c.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Reset returns generation to 0 and repopulates, and controls are in default states', async ({ page }) => {
    // Purpose: Make some changes (step/start->pause), then reset and verify generation is 0,
    // new population rendered, and controls are restored to default.
    const app = new GAApp(page);
    await app.goto();

    // Perform one step to change state
    await app.clickStep();
    await page.waitForFunction(() => Number(document.getElementById('generationCount').textContent) > 0, null, { timeout: 3000 });

    // Now reset
    await app.clickReset();

    // generation should be reset to 0
    await page.waitForFunction(() => Number(document.getElementById('generationCount').textContent) === 0, null, { timeout: 2000 });
    const gen = await app.getGenerationValue();
    expect(gen).toBe('0');

    // population should still have POPULATION_SIZE individuals (6)
    const popCount = await app.getPopulationCount();
    expect(popCount).toBe(6);

    // Controls should be back to initial state
    await expect(app.startBtn).toBeEnabled();
    await expect(app.pauseBtn).toBeDisabled();
    await expect(app.stepBtn).toBeEnabled();

    // No page errors produced by reset
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter((c) => c.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('DOM and visuals: gene elements have correct classes and text content', async ({ page }) => {
    // Purpose: Verify gene elements are visually represented with classes 'gene-0' or 'gene-1'
    // and their text content matches the class (sanity check for DOM updates).
    const app = new GAApp(page);
    await app.goto();

    const individuals = app.populationContainer.locator('.individual');
    const count = await individuals.count();
    for (let i = 0; i < count; i++) {
      const individual = individuals.nth(i);
      const geneLocators = individual.locator('.gene');
      const geneCount = await geneLocators.count();
      for (let g = 0; g < geneCount; g++) {
        const geneLocator = geneLocators.nth(g);
        const text = (await geneLocator.textContent())?.trim();
        // className contains gene-0 or gene-1
        const className = await geneLocator.getAttribute('class');
        expect(className).toMatch(/gene-(0|1)/);
        // text should be '0' or '1' matching the class suffix
        const match = className?.match(/gene-(0|1)/);
        if (match) {
          expect(text).toBe(match[1]);
        }
      }
    }

    // No page errors or console errors during DOM checks
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter((c) => c.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('No uncaught runtime exceptions or console error logs during user interactions', async ({ page }) => {
    // Purpose: Exercise multiple interactions and assert that no uncaught exceptions or console.error logs are generated.
    const app = new GAApp(page);
    await app.goto();

    // Simulate a sequence of user interactions
    await app.clickStep(); // step once
    await page.waitForFunction(() => Number(document.getElementById('generationCount').textContent) > 0, null, { timeout: 3000 });

    // Start and pause briefly
    await app.clickStart();
    await page.waitForTimeout(1200); // let one automated generation potentially occur
    await app.clickPause();

    // Reset
    await app.clickReset();

    // Final sanity checks
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter((c) => c.type === 'error');
    expect(consoleErrors).toEqual([]);
  });
});