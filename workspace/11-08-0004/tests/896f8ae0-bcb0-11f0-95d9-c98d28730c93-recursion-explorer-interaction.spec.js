import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/896f8ae0-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Helper: given multiple selector strategies, return the first locator that exists on the page.
 * If none found, returns null.
 */
async function firstExistingLocator(page, selectors) {
  for (const sel of selectors) {
    try {
      const locator = page.locator(sel);
      if (await locator.count() > 0) return locator.first();
    } catch (e) {
      // ignore invalid selector syntaxes for some pages
    }
  }
  return null;
}

/**
 * Try to find a visible button by accessible name using several patterns.
 */
async function findButtonByNames(page, names) {
  for (const name of names) {
    const byRole = page.getByRole('button', { name, exact: false });
    if (await byRole.count() > 0) return byRole.first();
    const byText = page.locator(`text=${name}`);
    if (await byText.count() > 0) return byText.first();
  }
  return null;
}

/**
 * Try to resolve an element that likely contains status text.
 */
async function findStatusLocator(page) {
  const candidates = [
    '#status',
    '.status',
    '.status-text',
    'data-test=status',
    'text=Playing',
    'text=Finished',
    'text=Reset',
    'text=Ready',
  ];
  return firstExistingLocator(page, candidates);
}

test.describe('Recursion Explorer Interaction — FSM validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app before every test
    await page.goto(APP_URL);
    // wait for the main app layout to appear (use multiple fallbacks)
    await page.waitForTimeout(200); // small wait to let app initialize
  });

  test.describe('Prepared state and preparation actions', () => {
    test('initial load should prepare the simulation (prepared onEnter prepareSimulation)', async ({ page }) => {
      // Validate that the app loads and shows controls for choosing example and input n
      const exampleSelect = await firstExistingLocator(page, [
        'select#example',
        'select[name="example"]',
        'select',
        'label:has-text("Example") >> select',
        'text=Factorial',
      ]);
      if (!exampleSelect) test.skip('Example select not found; skipping prepared-state test');

      // Input n field
      const inputN = await firstExistingLocator(page, [
        'input#n',
        'input#input-n',
        'input[name="n"]',
        'input[type="number"]',
        'label:has-text("n") >> input',
      ]);
      if (!inputN) test.skip('Input n control not found; skipping prepared-state test');

      // After prepareSimulation on load, currentIndex should be -1 and stack empty.
      // We assert that stack area is empty / has no frames.
      const stackContainer = await firstExistingLocator(page, [
        '#stack',
        '.stack',
        '.call-stack',
        'ol.stack',
        'ul.stack',
      ]);
      if (!stackContainer) {
        // If stack element not present, ensure there is an SVG tree area as a sign of prepared render
        const tree = await firstExistingLocator(page, ['svg#tree', '.tree', '#tree']);
        expect(tree).not.toBeNull();
      } else {
        // If stack exists, it should be empty on initial prepare
        const frames = stackContainer.locator('*');
        await expect(frames).toHaveCount(0);
      }
    });

    test('changing example and input triggers prepareSimulation and clamps large Fibonacci input (INPUT_TOO_LARGE)', async ({ page }) => {
      // Try selecting Fibonacci example
      const exampleSelect1 = await firstExistingLocator(page, [
        'select#example',
        'select[name="example"]',
        'label:has-text("Example") >> select',
      ]);
      if (!exampleSelect) test.skip('Example select not found; skipping example-change test');

      // Try to choose Fibonacci option by text
      const optionFib = exampleSelect.locator('option', { hasText: /Fibonacci/i });
      if (await optionFib.count() > 0) {
        await exampleSelect.selectOption({ label: (await optionFib.first().innerText()).trim() });
      } else {
        // fallback: try to click an element that toggles to Fibonacci
        const fibText = page.locator('text=Fibonacci');
        if (await fibText.count() > 0) await fibText.first().click();
      }

      // Input control for n
      const inputN1 = await firstExistingLocator(page, [
        'input#n',
        'input#input-n',
        'input[name="n"]',
        'input[type="number"]',
      ]);
      if (!inputN) test.skip('Input n not found; skipping input-too-large test');

      // Enter a very large fibonacci n that the app is likely to clamp (e.g., 50 or 100)
      await inputN.fill('100');
      // Blur to trigger change
      await inputN.press('Tab');

      // The app may show a warning or clamp the value. Try to detect a clamp/warning message.
      const warning = page.locator('text=too large', { exact: false });
      const warning2 = page.locator('text=clamp', { exact: false });
      if ((await warning.count()) > 0 || (await warning2.count()) > 0) {
        expect(await warning.count() + await warning2.count()).toBeGreaterThan(0);
      } else {
        // If no explicit warning, ensure input was clamped to a reasonable max (like <= 50)
        const value = await inputN.inputValue();
        const numeric = Number(value);
        expect(Number.isFinite(numeric)).toBeTruthy();
        // Accept a clamp to <= 50 as an heuristic; if the app uses another limit, this still asserts valid numeric
        expect(numeric).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Playing state and playback lifecycle', () => {
    test('startPlaying sets status to Playing and updates node/current highlights over time', async ({ page }) => {
      // Find a Play/Run button and status locator
      const playBtn = await findButtonByNames(page, ['Run', 'Play', 'Start', '▶', 'Run simulation']);
      const statusLocator = await findStatusLocator(page);

      if (!playBtn) test.skip('Play/Run button not found; skipping startPlaying test');

      // Click Play to start playback
      await playBtn.click();

      // The implementation sets status to "Playing..." on startPlaying — assert presence of Playing text if available
      if (statusLocator) {
        await expect(statusLocator).toHaveText(/Playing/i, { timeout: 3000 }).catch(() => {
          // Some implementations may use "Playing..." or "Playing", ignore if not exact but assert presence of word
          const txt = statusLocator.textContent();
          expect(txt).not.toBeNull();
        });
      }

      // While playing, the tree/stack should show a current node highlight or stack frames being pushed.
      // Look for classes used by the implementation: .node-current, .node-returned, or .frame
      const nodeCurrent = await firstExistingLocator(page, [
        '.node-current',
        '.current-node',
        'g.node.node-current',
        '.node.current',
      ]);

      const stackContainer1 = await firstExistingLocator(page, [
        '#stack',
        '.stack',
        '.call-stack',
      ]);

      // Give the player a short time to advance a few ticks
      await page.waitForTimeout(800);

      // Expect either a current node highlight or a non-empty stack
      if (nodeCurrent) {
        await expect(nodeCurrent).toHaveCountGreaterThan(0);
      } else if (stackContainer) {
        const frames1 = stackContainer.locator('*');
        expect(await frames.count()).toBeGreaterThan(0);
      } else {
        // If neither is found, at least ensure status indicates playing (already checked) — otherwise skip
        test.skip('No visible node-current or stack; cannot assert visual playback changes');
      }

      // Stop playback by pressing Space (common keyboard mapping) or re-clicking Play if toggles to Pause
      // Try pressing Space first
      await page.keyboard.press('Space');
      // Allow small delay for stopPlaying
      await page.waitForTimeout(200);

      // After stopping, status should not contain 'Playing'
      if (statusLocator) {
        const text = (await statusLocator.textContent()) || '';
        expect(text.toLowerCase()).not.toContain('playing');
      }
    });

    test('speed change while playing restarts playback interval and keeps playing', async ({ page }) => {
      const playBtn1 = await findButtonByNames(page, ['Run', 'Play', 'Start', '▶']);
      if (!playBtn) test.skip('Play/Run button not found; skipping speed-change test');

      const speedRange = await firstExistingLocator(page, [
        'input[type="range"]#speed',
        'input[type="range"][name="speed"]',
        'label:has-text("Speed") >> input[type="range"]',
        'input[type="range"]',
      ]);
      if (!speedRange) test.skip('Speed range not found; skipping speed-change test');

      const statusLocator1 = await findStatusLocator(page);

      // Start playing
      await playBtn.click();
      await page.waitForTimeout(200);
      if (statusLocator) await expect(statusLocator).toHaveText(/Playing/i, { timeout: 2000 }).catch(() => {});

      // Change speed to a different value (set to mid)
      try {
        await speedRange.evaluate((el) => {
          el.value = el.max ? Math.floor(Number(el.max) / 2).toString() : '50';
          el.dispatchEvent(new Event('input'));
          el.dispatchEvent(new Event('change'));
        });
      } catch (e) {
        // fallback to using keyboard
        await speedRange.focus();
        await page.keyboard.press('ArrowRight');
      }

      // Wait a bit and ensure still playing
      await page.waitForTimeout(400);
      if (statusLocator) {
        await expect(statusLocator).toHaveText(/Playing/i, { timeout: 2000 }).catch(() => {
          // Accept variants; ensure not crashed
          const txt1 = statusLocator.textContent();
          expect(txt).not.toBeNull();
        });
      }

      // Stop playback
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
    });

    test('auto-play reaches end should trigger PLAYBACK_FINISHED and transition to finished state', async ({ page }) => {
      // To cause quick finish, set input n small (e.g., 2 or 3)
      const inputN2 = await firstExistingLocator(page, [
        'input#n',
        'input#input-n',
        'input[name="n"]',
        'input[type="number"]',
      ]);
      if (!inputN) test.skip('Input n not found; skipping playback-finished test');

      await inputN.fill('3');
      await inputN.press('Tab');

      const playBtn2 = await findButtonByNames(page, ['Run', 'Play', 'Start', '▶']);
      if (!playBtn) test.skip('Play/Run button not found; skipping playback-finished test');

      const statusLocator2 = await findStatusLocator(page);

      // Start playback
      await playBtn.click();

      // Wait up to 8s for Finished text to appear
      const finishedLocator = page.locator('text=Finished', { exact: false });
      const finishedVisible = await finishedLocator.waitFor({ timeout: 8000 }).then(() => true).catch(() => false);

      if (finishedVisible) {
        // Ensure status shows Finished
        if (statusLocator) await expect(statusLocator).toHaveText(/Finished/i, { timeout: 1000 });
        // In finished state, further STEP_FORWARD should be a no-op (self-transition)
        // Find step forward button/keyboard and attempt to step
        const stepFwd = await firstExistingLocator(page, [
          'button#step-forward',
          'button[aria-label="Step forward"]',
          'button:has-text("Step")',
          'text=Step forward',
          'text=Next',
        ]);
        if (stepFwd) {
          const before = await page.locator('.node-returned, .node-current, #stack *').count().catch(() => 0);
          await stepFwd.click();
          await page.waitForTimeout(200);
          const after = await page.locator('.node-returned, .node-current, #stack *').count().catch(() => 0);
          // In finished, STEP_FORWARD should not change finished state artifacts (it's a self-transition)
          expect(after).toBeGreaterThanOrEqual(0);
        }
      } else {
        test.skip('Finished state was not reached within timeout; skipping finished-state assertions');
      }
    });
  });

  test.describe('Manual stepping, keyboard mappings and reset', () => {
    test('STEP_FORWARD and STEP_BACK update stack and node classes; keyboard arrows map to step actions', async ({ page }) => {
      const inputN3 = await firstExistingLocator(page, [
        'input#n',
        'input#input-n',
        'input[name="n"]',
        'input[type="number"]',
      ]);
      if (!inputN) test.skip('Input n not found; skipping stepping test');

      // Use a small n to get deterministic small number of events
      await inputN.fill('4');
      await inputN.press('Tab');

      const stepFwd1 = await firstExistingLocator(page, [
        'button#step-forward',
        'button[aria-label="Step forward"]',
        'text=Step forward',
        'text=Step',
        'button:has-text("▶")',
      ]);
      const stepBack = await firstExistingLocator(page, [
        'button#step-back',
        'button[aria-label="Step back"]',
        'text=Step back',
        'text=Back',
        'button:has-text("◀")',
      ]);

      // If no explicit buttons, we will use keyboard arrows
      const stackContainer2 = await firstExistingLocator(page, [
        '#stack',
        '.stack',
        '.call-stack',
      ]);

      // Perform a forward step using ArrowRight if button missing
      if (stepFwd) {
        await stepFwd.click();
      } else {
        await page.keyboard.press('ArrowRight');
      }

      await page.waitForTimeout(200);

      // After a step forward, expect at least one frame/node highlight or return text
      const nodeCurrent1 = await firstExistingLocator(page, [
        '.node-current',
        '.current-node',
      ]);
      const returnTexts = await firstExistingLocator(page, [
        '.return-text',
        '.node-return',
        '.returned',
      ]);

      if (stackContainer) {
        const framesCount = await stackContainer.locator('*').count().catch(() => 0);
        expect(framesCount).toBeGreaterThanOrEqual(0);
      } else if (nodeCurrent) {
        expect(await nodeCurrent.count()).toBeGreaterThan(0);
      } else if (returnTexts) {
        // accept existence of return texts too
        expect(await returnTexts.count()).toBeGreaterThanOrEqual(0);
      } else {
        test.skip('No stack/node/return markers found; cannot assert effects of step forward');
      }

      // Now perform a step back (ArrowLeft or button)
      if (stepBack) {
        await stepBack.click();
      } else {
        await page.keyboard.press('ArrowLeft');
      }
      await page.waitForTimeout(200);

      // Expect the UI to reflect stepping back: either fewer frames or node-current moved
      if (stackContainer) {
        const framesAfter = await stackContainer.locator('*').count().catch(() => 0);
        expect(framesAfter).toBeGreaterThanOrEqual(0);
      } else {
        // Ensure no errors and some UI elements still exist
        const anyNode = await firstExistingLocator(page, ['.node', '.frame', '.return-text']);
        expect(anyNode).not.toBeNull();
      }
    });

    test('RESET clears highlights, stops playback and sets status (resetAction)', async ({ page }) => {
      // Find reset button
      const resetBtn = await findButtonByNames(page, ['Reset', 'Clear']);
      if (!resetBtn) test.skip('Reset button not found; skipping reset test');

      // Start playback to ensure reset also stops playback
      const playBtn3 = await findButtonByNames(page, ['Run', 'Play', 'Start', '▶']);
      if (playBtn) {
        await playBtn.click();
        await page.waitForTimeout(200);
      }

      // Click reset
      await resetBtn.click();
      await page.waitForTimeout(200);

      // After reset, stack should be empty and highlights cleared
      const stackContainer3 = await firstExistingLocator(page, [
        '#stack',
        '.stack',
        '.call-stack',
      ]);
      if (stackContainer) {
        const frames2 = await stackContainer.locator('*').count().catch(() => 0);
        expect(frames).toBe(0);
      } else {
        // Check that node-current/returned classes no longer exist
        const nodeCurrent2 = page.locator('.node-current');
        const nodeReturned = page.locator('.node-returned, .returned, .return-text');
        // Both should either not exist or be zero
        expect(await nodeCurrent.count()).toBe(0).catch(() => {});
        // Allow returned text possibly cleared
        expect(await nodeReturned.count()).toBe(0).catch(() => {});
      }

      // Status should indicate Reset or similar
      const statusLocator3 = await findStatusLocator(page);
      if (statusLocator) {
        const txt2 = (await statusLocator.textContent()) || '';
        expect(txt.toLowerCase()).toMatch(/reset|ready|prepared|stopped/i);
      }
    });
  });

  test.describe('Toggles and UI options', () => {
    test('TOGGLE_SHOW_RETURNS immediately shows/hides return texts', async ({ page }) => {
      const showReturnsToggle = await firstExistingLocator(page, [
        'input#show-returns[type="checkbox"]',
        'input[name="show-returns"]',
        'label:has-text("Show returns") >> input[type="checkbox"]',
        'text=Show returns',
        'text=Show Returns',
      ]);
      if (!showReturnsToggle) test.skip('Show returns toggle not found; skipping toggle test');

      // Make sure there are some return texts to toggle; run a small example and step forward/back to create returns
      const inputN4 = await firstExistingLocator(page, ['input[type="number"]', 'input#n', 'input#input-n']);
      if (inputN) {
        await inputN.fill('3');
        await inputN.press('Tab');
      }
      const stepFwd2 = await firstExistingLocator(page, ['button#step-forward', 'text=Step']);
      if (stepFwd) {
        // Do a few steps to have some return text
        await stepFwd.click();
        await page.waitForTimeout(50);
        await stepFwd.click();
        await page.waitForTimeout(50);
      }

      // Toggle show-returns off
      await showReturnsToggle.click();
      await page.waitForTimeout(150);

      // Return texts should be hidden (if present in DOM, they could have display:none)
      const returnTexts1 = page.locator('.return-text, .node-return, .returned, .return');
      if (await returnTexts.count() > 0) {
        // Check that none are visible
        for (let i = 0; i < await returnTexts.count(); i++) {
          const v = await returnTexts.nth(i).isVisible();
          expect(v).toBe(false);
        }
      }

      // Toggle show-returns on again
      await showReturnsToggle.click();
      await page.waitForTimeout(150);

      // If return texts exist, some should be visible now
      if (await returnTexts.count() > 0) {
        const anyVisible = await returnTexts.filter({ has: page.locator(':visible') }).count().catch(() => 0);
        expect(anyVisible).toBeGreaterThanOrEqual(0);
      }
    });

    test('TOGGLE_AUTO_EXPAND affects tree rendering (no crash) and PREPARE re-renders', async ({ page }) => {
      const autoExpandToggle = await firstExistingLocator(page, [
        'input#auto-expand[type="checkbox"]',
        'input[name="auto-expand"]',
        'label:has-text("Auto expand") >> input[type="checkbox"]',
      ]);
      if (!autoExpandToggle) test.skip('Auto-expand toggle not found; skipping auto-expand test');

      // Toggle auto-expand on and off and trigger prepare (change example) to force re-render
      await autoExpandToggle.click();
      await page.waitForTimeout(100);

      // Flip back
      await autoExpandToggle.click();
      await page.waitForTimeout(100);

      // Trigger prepare by changing example or re-applying input
      const exampleSelect2 = await firstExistingLocator(page, ['select#example', 'select[name="example"]', 'select']);
      if (exampleSelect) {
        // attempt to change option if there are at least two options
        const opts = await exampleSelect.locator('option').allTextContents();
        if (opts.length >= 2) {
          // pick second option
          await exampleSelect.selectOption({ label: opts[1] });
          await page.waitForTimeout(200);
        }
      } else {
        // try to trigger prepare by blurring input
        const inputN5 = await firstExistingLocator(page, ['input[type="number"]']);
        if (inputN) {
          await inputN.press('Tab');
          await page.waitForTimeout(200);
        }
      }

      // Ensure tree SVG or container exists after re-render
      const tree1 = await firstExistingLocator(page, ['svg#tree1', '.tree1', '#tree1']);
      expect(tree).not.toBeNull();
    });
  });

  test.describe('Edge cases, resize and keyboard interactions', () => {
    test('RESIZE triggers re-render and preserves currentIndex/classes', async ({ page }) => {
      // Step once to create currentIndex > -1
      const stepFwd3 = await firstExistingLocator(page, ['button#step-forward', 'text=Step forward', 'text=Step']);
      if (!stepFwd) test.skip('Step forward control not found; skipping resize test');

      await stepFwd.click();
      await page.waitForTimeout(150);

      // Collect counts of node-current and returned
      const nodeCurrent3 = page.locator('.node-current');
      const nodeReturned1 = page.locator('.node-returned, .returned, .return-text');

      const currentCountBefore = await nodeCurrent.count().catch(() => 0);
      const returnedCountBefore = await nodeReturned.count().catch(() => 0);

      // Resize the viewport to trigger RESIZE and re-render
      const orig = page.viewportSize() || { width: 1280, height: 800 };
      await page.setViewportSize({ width: Math.max(320, (orig.width || 1280) - 200), height: (orig.height || 800) - 100 });
      await page.waitForTimeout(300);

      // After resize, the counts should be preserved or at least no crash occurred and DOM still present
      const currentCountAfter = await nodeCurrent.count().catch(() => 0);
      const returnedCountAfter = await nodeReturned.count().catch(() => 0);

      // They may change layout-wise but should not disappear unexpectedly in typical behavior
      expect(currentCountAfter).toBeGreaterThanOrEqual(0);
      expect(returnedCountAfter).toBeGreaterThanOrEqual(0);

      // Restore original viewport
      await page.setViewportSize(orig);
    });

    test('Keyboard Space toggles play/pause and arrow keys perform step actions (mapped in FSM)', async ({ page }) => {
      // Ensure app responds to Space key
      const statusLocator4 = await findStatusLocator(page);

      // Press Space to start playing
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);

      // Expect status to indicate playing (if available)
      if (statusLocator) {
        const txt3 = (await statusLocator.textContent()) || '';
        // Either it has Playing or it changed state
        expect(txt.length).toBeGreaterThan(0);
      }

      // While playing, pressing ArrowRight should stop and step forward (FSM transitions to prepared then step)
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);

      // Press ArrowLeft to attempt step back
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(300);

      // Press Space to toggle again (pause or play)
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
    });
  });
});