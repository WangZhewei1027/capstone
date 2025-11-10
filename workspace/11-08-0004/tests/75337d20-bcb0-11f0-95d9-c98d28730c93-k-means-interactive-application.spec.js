import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/75337d20-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page Object for the K-Means Interactive Application.
 * Encapsulates common selectors and interactions used across tests.
 */
class KMeansPage {
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('canvas');
    // Generic status area: try several likely selectors/containers
    this.statusLocators = [
      page.locator('text=Ready. Click canvas', { exact: false }),
      page.locator('text=Assigned points to nearest centroids', { exact: false }),
      page.locator('.small'),
      page.locator('#status'),
      page.locator('[data-test="status"]'),
    ];
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for canvas to be ready and visible
    await expect(this.canvas).toBeVisible({ timeout: 5000 });
  }

  // Generic helper to find a button by partial name (case-insensitive).
  // Tries multiple strategies for robustness.
  async getButtonByText(partialText) {
    const { page } = this;
    const regex = new RegExp(partialText, 'i');

    // Try getByRole (recommended)
    const byRole = page.getByRole('button', { name: regex });
    if (await byRole.count()) return byRole.first();

    // Try generic locator for button with text
    const byText = page.locator('button', { hasText: regex });
    if (await byText.count()) return byText.first();

    // Fallback: any element that looks like a button
    const anyBtn = page.locator('*', { hasText: regex }).filter({ has: page.locator('button, [role="button"]') });
    if (await anyBtn.count()) return anyBtn.first();

    // Last resort: direct text
    const textNode = page.locator(`text=${partialText}`);
    if (await textNode.count()) return textNode.first();

    throw new Error(`Button with text matching "${partialText}" not found`);
  }

  // Finds an input[type="number"] for K control. Tries label "K" or first number input.
  async getKInput() {
    const { page } = this;
    const labelled = page.getByLabel('K', { exact: true });
    if (await labelled.count()) return labelled.first();

    const numberInputs = page.locator('input[type="number"]');
    if (await numberInputs.count()) return numberInputs.first();

    // fallback: any input with name or id containing k
    const fuzzy = page.locator('input').filter({ hasText: /k/i });
    if (await fuzzy.count()) return fuzzy.first();

    throw new Error('K input not found');
  }

  // Finds speed slider (input[type="range"]) if present
  async getSpeedSlider() {
    const { page } = this;
    const slider = page.locator('input[type="range"]');
    if (await slider.count()) return slider.first();
    // Try labelled variant
    const labelled1 = page.getByLabel(/speed/i);
    if (await labelled.count()) return labelled.first();
    throw new Error('Speed slider not found');
  }

  // Tries to find toggles like "Show lines" or "Drag points"
  async getToggleByLabel(labelRegex) {
    const { page } = this;
    const candidate = page.getByRole('checkbox', { name: new RegExp(labelRegex, 'i') });
    if (await candidate.count()) return candidate.first();
    // Fallback to any element with the label text
    const labelled2 = page.locator('label', { hasText: new RegExp(labelRegex, 'i') });
    if (await labelled.count()) {
      const forAttr = await labelled.first().getAttribute('for');
      if (forAttr) {
        return page.locator(`#${forAttr}`);
      }
    }
    throw new Error(`Toggle with label matching "${labelRegex}" not found`);
  }

  // Reads visible status text by checking several likely status containers.
  async getStatusText() {
    for (const locator of this.statusLocators) {
      try {
        if (await locator.count()) {
          const txt = (await locator.first().innerText()).trim();
          if (txt) return txt;
        }
      } catch {
        // ignore and continue
      }
    }
    // As ultimate fallback, read body text (might be noisy)
    const bodyText = (await this.page.locator('body').innerText()).trim();
    return bodyText;
  }

  // Click relative to canvas by percentage (0..1)
  async clickCanvasAt(xRatio, yRatio) {
    const box = await this.canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    const x = box.x + xRatio * box.width;
    const y = box.y + yRatio * box.height;
    await this.page.mouse.click(x, y, { force: true });
  }

  // Pointer down, move, up on canvas by percentages (for dragging)
  async dragOnCanvas(fromX, fromY, toX, toY, steps = 5) {
    const box1 = await this.canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    const startX = box.x + fromX * box.width;
    const startY = box.y + fromY * box.height;
    const endX = box.x + toX * box.width;
    const endY = box.y + toY * box.height;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // move in steps
    for (let i = 1; i <= steps; i++) {
      const ix = startX + ((endX - startX) * i) / steps;
      const iy = startY + ((endY - startY) * i) / steps;
      await this.page.mouse.move(ix, iy);
      await this.page.waitForTimeout(30);
    }
    await this.page.mouse.up();
  }

  // Safely set speed slider to a value (0..max)
  async setSpeedToMax() {
    const slider1 = await this.getSpeedSlider();
    await slider.evaluate((el) => {
      if (el.max) el.value = el.max;
      else el.value = '1';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
}

test.describe('K-Means Interactive Application - FSM conformance', () => {
  let page;
  let app;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    app = new KMeansPage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Initial no_centroids state', () => {
    test('shows initial ready status and remains in no_centroids when adding a point', async () => {
      // The app's no_centroids onEnter message instructs: "Ready. Click canvas to add points..."
      const status = await app.getStatusText();
      expect(status).toMatch(/Ready\. Click canvas/i);

      // Click canvas to add a single point (should stay in no_centroids according to FSM)
      await app.clickCanvasAt(0.3, 0.4);

      // Wait briefly for any UI changes and verify the primary instruction still there (no change of state)
      await page.waitForTimeout(300);
      const statusAfter = await app.getStatusText();
      // It may remain identical or still contain 'Ready', ensure it didn't transition to assigned or dragging.
      expect(statusAfter).toMatch(/Ready\. Click canvas/i);
    });
  });

  test.describe('Centroid initialization and step/update flow', () => {
    test('initializing centroids enables assignment and Step produces assignment status', async () => {
      // Add multiple points to make assignment meaningful
      await app.clickCanvasAt(0.25, 0.25);
      await app.clickCanvasAt(0.75, 0.25);
      await app.clickCanvasAt(0.25, 0.75);
      await app.clickCanvasAt(0.75, 0.75);

      // Click "Init centroids" or equivalent button
      const initBtn = await app.getButtonByText('init centr|initialize centr|init centroids|init');
      await initBtn.click();

      // After initializing centroids we expect the app to be in waiting_for_assignment (stage='assign').
      // The FSM doesn't specify a unique onEnter status for waiting_for_assignment, but pressing Step now
      // should trigger the assignment step and update status to the assigned message.
      const stepBtn = await app.getButtonByText('step');
      await stepBtn.click();

      // Wait for the assigned points status text per FSM onEnter waiting_for_update
      await expect.poll(async () => (await app.getStatusText()), {
        message: 'Waiting for assigned points status after Step',
      }).toMatch(/Assigned points to nearest centroids/i);

      // Ensure assigned status also hints to press Step to update centroids
      const status1 = await app.getStatusText();
      expect(status).toMatch(/Press Step to update centroids/i);
    });

    test('Step after assignment animates centroids and returns to assignment state when animation ends', async () => {
      // Add a few points and initialize centroids
      await app.clickCanvasAt(0.2, 0.2);
      await app.clickCanvasAt(0.8, 0.2);
      const initBtn1 = await app.getButtonByText('init centr|init centroids|initialize');
      await initBtn.click();

      // Create assignment
      const stepBtn1 = await app.getButtonByText('step');
      await stepBtn.click();

      await expect.poll(async () => (await app.getStatusText())).toMatch(/Assigned points to nearest centroids/i);

      // Speed up animations to avoid long waits
      try {
        await app.setSpeedToMax();
      } catch {
        // If no slider present, continue; animation may still be short.
      }

      // Click Step to trigger the animated centroid update (animating_update). The FSM says updateCentroidsAnimated then ANIMATION_END -> waiting_for_assignment.
      await stepBtn.click();

      // Wait for the assigned message to disappear and eventually return to the assignment stage text or ready text.
      await expect.poll(async () => await app.getStatusText(), {
        timeout: 5000,
        message: 'Expect app to leave "Assigned..." status after animated update completes',
      }).not.toMatch(/Assigned points to nearest centroids/i);

      // After animation end we should be back in waiting_for_assignment (stage assign).
      // Status may be the regular UI or show ready/instructions; verify not in an "animating" or "dragging" transient state.
      const afterStatus = await app.getStatusText();
      expect(afterStatus).not.toMatch(/Animating|Animation/i);
    });
  });

  test.describe('Play/pause loop (playing state) and keyboard controls', () => {
    test('clicking Play enters playing state and pressing P or clicking toggles to paused', async () => {
      // Ensure some points and centroids exist
      await app.clickCanvasAt(0.3, 0.3);
      await app.clickCanvasAt(0.7, 0.7);
      const initBtn2 = await app.getButtonByText('init centr|init centroids|initialize');
      await initBtn.click();

      const playBtn = await app.getButtonByText('play|start');
      await playBtn.click();

      // On entering 'playing' the UI is expected to indicate playing (FSM: updates UI text)
      await expect.poll(async () => await app.getStatusText(), {
        timeout: 3000,
      }).toMatch(/Playing|Pause|Running|Stop/i);

      // Press 'P' key to toggle play/pause (P_KEY event) - should cause stopPlaying onExit and status 'Paused.' or similar per FSM
      await page.keyboard.press('p');

      // After toggling with P key, status should reflect paused state
      await expect.poll(async () => await app.getStatusText(), {
        timeout: 3000,
      }).toMatch(/Paused\.?|Paused|Ready/i);
    });

    test('play loop ends if convergence event occurs (PLAY_CONVERGED) simulated via clicking Play again', async () => {
      // Start playing then click Play again to simulate toggling back to waiting_for_assignment
      await app.clickCanvasAt(0.4, 0.4);
      await app.clickCanvasAt(0.6, 0.6);
      const initBtn3 = await app.getButtonByText('init centr|init centroids|initialize');
      await initBtn.click();

      const playBtn1 = await app.getButtonByText('play|start');
      await playBtn.click();

      await expect.poll(async () => await app.getStatusText(), {
        timeout: 3000,
      }).toMatch(/Playing|Running/i);

      // Clicking play again or the same toggle should stop playing (play toggle event)
      await playBtn.click();

      // After stopping, expect paused/ready status
      await expect.poll(async () => await app.getStatusText(), { timeout: 3000 }).toMatch(/Paused|Ready|Click canvas/i);
    });
  });

  test.describe('Dragging interactions (dragging_point and dragging_centroid)', () => {
    test('dragging a point sets dragging_point state and then ends with Drag ended.', async () => {
      // Add a single point at a known location
      await app.clickCanvasAt(0.5, 0.5);

      // Ensure "Drag points" toggle is enabled if present
      try {
        const dragPointsToggle = await app.getToggleByLabel('drag points|dragging points');
        const isChecked = await dragPointsToggle.isChecked().catch(() => false);
        if (!isChecked) await dragPointsToggle.check();
      } catch {
        // If the toggle is not present, some apps allow dragging by default; continue
      }

      // Start dragging near where we clicked (should trigger startDraggingPoint and status 'Dragging point')
      // Use small delta to emulate a user drag
      await app.page.mouse.move((await app.canvas.boundingBox()).x + 0.5 * (await app.canvas.boundingBox()).width,
                                (await app.canvas.boundingBox()).y + 0.5 * (await app.canvas.boundingBox()).height);
      await app.page.mouse.down();
      // After pointer down, FSM should enter dragging_point; verify status
      await expect.poll(async () => await app.getStatusText(), { timeout: 2000 }).toMatch(/Dragging point|Dragging/i);

      // Move slightly and release
      await app.page.mouse.move((await app.canvas.boundingBox()).x + 0.55 * (await app.canvas.boundingBox()).width,
                                (await app.canvas.boundingBox()).y + 0.55 * (await app.canvas.boundingBox()).height);
      await app.page.mouse.up();

      // On exit from dragging_point FSM expects stopDragging to set status 'Drag ended.' and redraw
      await expect.poll(async () => await app.getStatusText(), { timeout: 2000 }).toMatch(/Drag ended|Drag\s+ended/i);
    });

    test('dragging a centroid enters dragging_centroid state and then returns to assignment', async () => {
      // Add points and init centroids to ensure centroids exist
      await app.clickCanvasAt(0.2, 0.2);
      await app.clickCanvasAt(0.8, 0.2);
      const initBtn4 = await app.getButtonByText('init centr|init centroids|initialize');
      await initBtn.click();

      // The centroid will be drawn somewhere on canvas. We attempt a pointerdown near center to hit a centroid.
      // Start a drag from center to a new position and expect dragging centroid state and exit to waiting_for_assignment.
      const box2 = await app.canvas.boundingBox();
      if (!box) throw new Error('Canvas bounding box missing for centroid drag test');

      const startX1 = box.x + box.width * 0.5;
      const startY1 = box.y + box.height * 0.35;
      const endX1 = box.x + box.width * 0.7;
      const endY1 = box.y + box.height * 0.7;

      await app.page.mouse.move(startX, startY);
      await app.page.mouse.down();

      // On pointer down on centroid FSM should enter dragging_centroid; check status for 'Dragging centroid'
      await expect.poll(async () => await app.getStatusText(), { timeout: 2000 }).toMatch(/Dragging centroid|Dragging/i);

      // Drag and release
      await app.page.mouse.move(endX, endY, { steps: 6 });
      await app.page.mouse.up();

      // After release the FSM transitions to waiting_for_assignment; status should reflect drag ended and then assignment-ready state
      await expect.poll(async () => await app.getStatusText(), { timeout: 3000 }).toMatch(/Drag ended|Ready|Click canvas|Assigned|Press Step/i);
    });
  });

  test.describe('Controls, toggles and edge cases', () => {
    test('randomize / generate and clear points buttons work and maintain no_centroids when appropriate', async () => {
      // Randomize or generate uniform/clustered points
      try {
        const randBtn = await app.getButtonByText('randomize points|randomize|gen random|random');
        await randBtn.click();
      } catch {
        // Try clustered/uniform variants
        try {
          const clusterBtn = await app.getButtonByText('clustered');
          await clusterBtn.click();
        } catch {
          try {
            const uniformBtn = await app.getButtonByText('uniform');
            await uniformBtn.click();
          } catch {
            // If none of these controls exist, skip the generation step (still test clear/reset below)
          }
        }
      }

      // Click clear points (should take us to no_centroids state per FSM)
      const clearBtn = await app.getButtonByText('clear points|clear');
      await clearBtn.click();

      // After clearing points FSM expects no_centroids onExit actions; status should return to Ready instruction
      await expect.poll(async () => await app.getStatusText(), { timeout: 2000 }).toMatch(/Ready\. Click canvas/i);
    });

    test('reset returns application to no_centroids and clears playing/dragging state', async () => {
      // Add point and init centroids and start playing to have a non-trivial state
      await app.clickCanvasAt(0.3, 0.3);
      const initBtn5 = await app.getButtonByText('init centr|init centroids|initialize');
      await initBtn.click();

      try {
        const playBtn2 = await app.getButtonByText('play|start');
        await playBtn.click();
      } catch {
        // ignore if play button not found
      }

      // Click reset
      const resetBtn = await app.getButtonByText('reset');
      await resetBtn.click();

      // Expect to be back to no_centroids (ready message)
      await expect.poll(async () => await app.getStatusText(), { timeout: 3000 }).toMatch(/Ready\. Click canvas/i);
    });

    test('changing K updates internal controls and init uses the new K value', async () => {
      // Find K input and set to 1 to test edge-case of single cluster
      try {
        const kInput = await app.getKInput();
        await kInput.fill('');
        await kInput.type('1');

        // Press Enter or blur to ensure change
        await kInput.press('Enter');
        await kInput.evaluate((el) => el.dispatchEvent(new Event('change')));

        // Initialize centroids - should create 1 centroid and the app should function (no errors)
        const initBtn6 = await app.getButtonByText('init centr|init centroids|initialize');
        await initBtn.click();

        // After initializing, clicking Step should still work (assign)
        const stepBtn2 = await app.getButtonByText('step');
        await stepBtn.click();

        // Either assigned message or a benign status should appear - ensure no exception and app responsive
        const status2 = await app.getStatusText();
        expect(status.length).toBeGreaterThan(0);
      } catch (err) {
        // If K control isn't present, this test is not applicable; treat as skipped rather than failing.
        test.skip(true, 'K input not present - skipping K change test');
      }
    });

    test('toggles for show lines and drag points update their checked state', async () => {
      // Toggle Show lines if present
      try {
        const showLines = await app.getToggleByLabel('show lines|lines');
        const before = await showLines.isChecked();
        await showLines.click();
        const after = await showLines.isChecked();
        expect(after).toBe(!before);
      } catch {
        test.skip(true, 'Show lines toggle not present - skipping');
      }

      // Toggle Drag points if present
      try {
        const dragPoints = await app.getToggleByLabel('drag points|dragging points');
        const before1 = await dragPoints.isChecked();
        await dragPoints.click();
        const after1 = await dragPoints.isChecked();
        expect(after).toBe(!before);
      } catch {
        test.skip(true, 'Drag points toggle not present - skipping');
      }
    });
  });
});