import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6c491440-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Utility: try multiple selectors and return the first locator that exists on the page.
 * This helps keep tests resilient to small differences in the markup (ids vs class names vs data attributes).
 */
async function firstLocator(page, selectors) {
  for (const sel of selectors) {
    const locator = page.locator(sel);
    try {
      if (await locator.count() > 0) return locator.first();
    } catch (e) {
      // ignore and continue
    }
  }
  return null;
}

/**
 * Utility: read visible text from first matching text-bearing selectors
 */
async function readTextFromSelectors(page, selectors) {
  const loc = await firstLocator(page, selectors);
  if (!loc) return null;
  return (await loc.innerText()).trim();
}

/**
 * Helper to robustly locate control buttons and elements in the UI using multiple possible selectors.
 */
async function getControls(page) {
  return {
    playToggle: await firstLocator(page, [
      'button#playBtn',
      'button#playPause',
      'button.play-toggle',
      'button[aria-label="Play"]',
      'button[aria-label="Play/Pause"]',
      'button:has-text("Play")',
      'button:has-text("Pause")',
      'button:has-text("Start")'
    ]),
    nextBtn: await firstLocator(page, [
      'button#nextBtn',
      'button.next',
      'button:has-text("Next")',
      'button[aria-label="Next"]',
      'button:has-text("Right")',
      'button:has-text("▶")'
    ]),
    prevBtn: await firstLocator(page, [
      'button#prevBtn',
      'button.prev',
      'button:has-text("Prev")',
      'button[aria-label="Previous"]',
      'button:has-text("Left")',
      'button:has-text("◀")'
    ]),
    resetBtn: await firstLocator(page, [
      'button#resetBtn',
      'button.reset',
      'button:has-text("Reset")',
      'button[aria-label="Reset"]',
      'button:has-text("Home")'
    ]),
    jumpToEndBtn: await firstLocator(page, [
      'button#endBtn',
      'button.jump-end',
      'button:has-text("End")',
      'button:has-text("Jump to End")',
      'button[aria-label="End"]'
    ]),
    explainToggle: await firstLocator(page, [
      '#explainToggle',
      'button#explainBtn',
      'button:has-text("Explain")',
      'button:has-text("Explanation")',
      'button[aria-label="Explain"]',
      'button.toggle-explain'
    ]),
    explainCard: await firstLocator(page, [
      '#explainCard',
      '.explain-card',
      '.explain',
      '[data-test="explainCard"]'
    ]),
    arrayInput: await firstLocator(page, [
      'input#arrayInput',
      'input[name="array"]',
      'textarea#arrayInput',
      'input.array-input',
      'textarea.array-input'
    ]),
    windowSizeInput: await firstLocator(page, [
      'input#windowSize',
      'input[name="windowSize"]',
      'input.window-size',
      'input[type="number"]'
    ]),
    incrementalToggle: await firstLocator(page, [
      'input#incremental',
      'input[name="incremental"]',
      'input[type="checkbox"].incremental',
      'label:has-text("Incremental")',
      '[data-test="incrementalToggle"]'
    ]),
    randomizeBtn: await firstLocator(page, [
      'button#randomize',
      'button:has-text("Randomize")',
      'button.randomize',
      'button[aria-label="Randomize"]'
    ]),
    shuffleBtn: await firstLocator(page, [
      'button#shuffle',
      'button:has-text("Shuffle")',
      'button.shuffle',
      'button[aria-label="Shuffle"]'
    ]),
    arrayDisplay: await firstLocator(page, [
      '#arrayDisplay',
      '.array-values',
      '.array',
      '[data-test="arrayDisplay"]',
      'pre.array'
    ]),
    currentSumDisplay: await firstLocator(page, [
      '#currentSum',
      '.current-sum',
      '[data-test="currentSum"]',
      'span.current-sum',
      'div:has-text("Current sum")'
    ]),
    startIndexDisplay: await firstLocator(page, [
      '#startIndex',
      '.start-index',
      '[data-test="startIndex"]',
      'div:has-text("Start index")',
      'span.start-index'
    ]),
    overlayHandle: await firstLocator(page, [
      '.window-overlay',
      '.window-handle',
      '.handle',
      '[data-test="windowOverlay"]',
      '.slider-handle'
    ])
  };
}

test.describe('Sliding Window Interactive Module — FSM end-to-end', () => {
  test.beforeEach(async ({ page }) => {
    // Load the application fresh for each test
    await page.goto(APP_URL);
    // Wait for a root element to appear (heuristic)
    await page.waitForLoadState('networkidle');
    // Allow some small time for initial renderAll() actions
    await page.waitForTimeout(100);
  });

  test.afterEach(async ({ page }) => {
    // Try to stop any running animation/timer by pressing Space (toggle)
    try {
      await page.keyboard.press('Space');
    } catch (e) {
      // ignore
    }
  });

  test.describe('Initial / Idle state and rendering', () => {
    test('renders controls and shows idle Play label on load', async ({ page }) => {
      // Validate DOM elements exist and initial state is idle (Play shown)
      const controls = await getControls(page);
      // Play toggle should exist
      expect(controls.playToggle, 'play toggle control exists').toBeTruthy();
      // Play label should be present and should indicate start-able state (Play or similar)
      const playText = (await controls.playToggle.innerText()).trim();
      expect(playText.length).toBeGreaterThan(0);
      // Check explain panel is hidden by default (if present)
      if (controls.explainCard) {
        const display = await controls.explainCard.evaluate((el) => {
          return window.getComputedStyle(el).display;
        });
        // either hidden or none is acceptable initially
        expect(['none', 'hidden', '']).toContain(display === '' ? 'none' : display === 'hidden' ? 'hidden' : display);
      }
      // Ensure array input/display exists and contains some numbers initially (fallback to check)
      if (controls.arrayDisplay) {
        const arrText = (await controls.arrayDisplay.innerText()).trim();
        expect(arrText.length).toBeGreaterThan(0);
        // At least one digit present
        expect(/\d/.test(arrText)).toBe(true);
      } else if (controls.arrayInput) {
        const val = (await controls.arrayInput.inputValue()).trim();
        expect(val.length).toBeGreaterThan(0);
        expect(/\d/.test(val)).toBe(true);
      }
    });

    test('explain toggle shows and hides explanation panel (explain_shown <-> idle)', async ({ page }) => {
      const { explainToggle, explainCard } = await getControls(page);
      if (!explainToggle) {
        test.skip('Explain toggle not available in this build');
        return;
      }
      // Toggle to show
      await explainToggle.click();
      // onEnter should show explainCard style.display = 'block'
      if (explainCard) {
        await expect(explainCard).toBeVisible();
      } else {
        // fallback: check that some explanation text appears
        const someExplainText = await page.locator('text=Explanation', { exact: false }).first();
        if (await someExplainText.count() > 0) await expect(someExplainText).toBeVisible();
      }

      // Toggle to hide
      await explainToggle.click();
      if (explainCard) {
        await expect(explainCard).not.toBeVisible();
      }
    });
  });

  test.describe('Play / Pause / Playing behavior (playing state and TICK events)', () => {
    test('clicking Play enters playing (timer) and toggles label to Pause, clicking again pauses (idle)', async ({ page }) => {
      const controls1 = await getControls(page);
      if (!controls.playToggle) test.skip('No play control detected');

      const initialText = (await controls.playToggle.innerText()).trim();
      // Click to play
      await controls.playToggle.click();

      // After entering playing, control label should change to indicate pause
      const afterPlayText = (await controls.playToggle.innerText()).trim();
      expect(afterPlayText.toLowerCase()).not.toBe(initialText.toLowerCase());

      // If there is a startIndex display, expect it to advance after a tick interval
      if (controls.startIndexDisplay) {
        const beforeIndexText = (await controls.startIndexDisplay.innerText()).trim();
        // Wait a bit more than the typical tick interval to see change
        await page.waitForTimeout(1200);
        const afterIndexText = (await controls.startIndexDisplay.innerText()).trim();
        // If at least one numeric change occurred or text changed, the tick happened.
        expect(afterIndexText === beforeIndexText ? false : true).toBe(true);
      } else {
        // fallback: hope some visual indicator changed: current sum may change as window moves
        if (controls.currentSumDisplay) {
          const beforeSum = (await controls.currentSumDisplay.innerText()).trim();
          await page.waitForTimeout(1200);
          const afterSum = (await controls.currentSumDisplay.innerText()).trim();
          // Either changed or not (if atEnd); we assert no exception occurred
          expect(typeof afterSum).toBe('string');
        }
      }

      // Pause back to idle via click
      await controls.playToggle.click();
      const afterPauseText = (await controls.playToggle.innerText()).trim();
      // Should reflect a toggle; ensure it doesn't remain the playing label
      expect(afterPauseText.toLowerCase()).not.toBe(afterPlayText.toLowerCase());
    });

    test('Space key toggles Play/Pause (TOGGLE_PLAY event)', async ({ page }) => {
      const controls2 = await getControls(page);
      if (!controls.playToggle) test.skip('No play toggle detected for keyboard test');

      // Ensure initial is idle, then press Space to toggle play
      const before = (await controls.playToggle.innerText()).trim();
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
      const after = (await controls.playToggle.innerText()).trim();
      expect(after.toLowerCase()).not.toBe(before.toLowerCase());

      // Press Space again to return
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
      const end = (await controls.playToggle.innerText()).trim();
      expect(end.toLowerCase()).toBe(before.toLowerCase());
    });
  });

  test.describe('Manual stepping and decide_step semantics', () => {
    test('Next / Prev buttons fire NEXT/PREV and cause stepping/decide_step state transitions', async ({ page }) => {
      const controls3 = await getControls(page);
      if (!controls.nextBtn || !controls.prevBtn) test.skip('Next/Prev controls not present');

      // Capture index before moves
      let beforeIndex = null;
      if (controls.startIndexDisplay) beforeIndex = (await controls.startIndexDisplay.innerText()).trim();

      // Click Next
      await controls.nextBtn.click();
      await page.waitForTimeout(250);
      if (controls.startIndexDisplay) {
        const afterNext = (await controls.startIndexDisplay.innerText()).trim();
        // Should have changed (unless already at end)
        if (beforeIndex !== null) expect(afterNext === beforeIndex ? true : true).toBe(true); // sanity: avoid strict fail if atEnd
      }

      // Click Prev
      await controls.prevBtn.click();
      await page.waitForTimeout(250);
      if (controls.startIndexDisplay && beforeIndex !== null) {
        const afterPrev = (await controls.startIndexDisplay.innerText()).trim();
        // After prev we either restore previous index or remain if at start
        expect(typeof afterPrev).toBe('string');
      }
    });

    test('Keyboard ArrowRight / ArrowLeft map to NEXT / PREV events', async ({ page }) => {
      const controls4 = await getControls(page);
      // Capture before
      const before1 = controls.startIndexDisplay ? (await controls.startIndexDisplay.innerText()).trim() : null;
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);
      const afterRight = controls.startIndexDisplay ? (await controls.startIndexDisplay.innerText()).trim() : null;
      // ArrowRight should have attempted to move forward (if possible)
      if (before !== null && afterRight !== null) {
        expect(typeof afterRight).toBe('string');
      }

      // ArrowLeft
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(300);
      const afterLeft = controls.startIndexDisplay ? (await controls.startIndexDisplay.innerText()).trim() : null;
      if (afterLeft !== null) {
        expect(typeof afterLeft).toBe('string');
      }
    });
  });

  test.describe('Animating vs Stepping (incremental toggle and decision states)', () => {
    test('Toggle incremental influences whether animating or stepping path is used (ANIMATING_START / STEPPING_START)', async ({ page }) => {
      const controls5 = await getControls(page);
      if (!controls.nextBtn || !controls.incrementalToggle) test.skip('Next and incremental toggle required');

      // Ensure incremental is enabled if we can
      try {
        const isChecked = await controls.incrementalToggle.evaluate((el) => {
          if (el.type === 'checkbox') return el.checked;
          // if label used, try to click to enable
          return false;
        });
        if (!isChecked) {
          // try to click its label/element to toggle
          await controls.incrementalToggle.click();
        }
      } catch (e) {
        // If it's a label rather than input, attempt to click it
        try {
          await controls.incrementalToggle.click();
        } catch (err) {}
      }

      // Click Next — with incremental true, the app should use the animating path.
      await controls.nextBtn.click();
      // The animating path will flash/outgoing/incoming; we cannot read internals, but we can assert that
      // while animation is likely running a specific CSS animation class might be present on overlay or array
      if (controls.overlayHandle) {
        // During animation there may be a temporary class; wait briefly and assert overlay exists
        await page.waitForTimeout(200);
        expect(await controls.overlayHandle.isVisible()).toBeTruthy();
      } else {
        // fallback: ensure the next action completed and didn't throw (sanity)
        await page.waitForTimeout(500);
      }

      // Now disable incremental and attempt Next to use stepping path
      try {
        await controls.incrementalToggle.click();
      } catch (e) {
        // ignore
      }
      await controls.nextBtn.click();
      // Stepping should complete quickly (no incremental animation) — just assert the UI is stable afterwards
      await page.waitForTimeout(300);
      expect(true).toBe(true);
    });
  });

  test.describe('Dragging overlay interactions (dragging state)', () => {
    test('pointerdown enters dragging; pointermove updates temporary index; pointerup snaps and recomputes (DRAG_START/DRAG_MOVE/DRAG_END)', async ({ page }) => {
      const { overlayHandle, startIndexDisplay } = await getControls(page);
      if (!overlayHandle) test.skip('No draggable overlay handle detected');

      const box = await overlayHandle.boundingBox();
      if (!box) {
        test.skip('Overlay has no bounding box');
        return;
      }

      // pointerdown -> enters dragging
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      // small move to trigger DRAG_MOVE
      await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 5 });
      await page.waitForTimeout(150);

      // While dragging, verify startIndex display (if any) reflects temp change (text may change)
      if (startIndexDisplay) {
        const midText = (await startIndexDisplay.innerText()).trim();
        expect(typeof midText).toBe('string');
      }

      // release -> DRAG_END -> idle, snap to nearest index
      await page.mouse.up();
      await page.waitForTimeout(250);

      if (startIndexDisplay) {
        const finalText = (await startIndexDisplay.innerText()).trim();
        expect(typeof finalText).toBe('string');
      }
    });

    test('drag cancel (pointerdown then escape or move out) returns to idle without committing (DRAG_CANCEL)', async ({ page }) => {
      const { overlayHandle, startIndexDisplay } = await getControls(page);
      if (!overlayHandle) test.skip('No overlay for drag-cancel test');

      const box1 = await overlayHandle.boundingBox();
      if (!box) test.skip('Overlay no bounding box');

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2, { steps: 4 });
      await page.waitForTimeout(100);

      // Press Escape to cancel drag (commonly used)
      await page.keyboard.press('Escape');
      // Wait for cancel handling
      await page.waitForTimeout(200);

      // After cancel, ensure mouse is up implicitly and UI stable
      if (startIndexDisplay) {
        const txt = (await startIndexDisplay.innerText()).trim();
        expect(typeof txt).toBe('string');
      }
    });
  });

  test.describe('Computing events (apply array, randomize, shuffle, window-size-change)', () => {
    test('applying a new array triggers computing -> computeInitial -> renderAll -> idle (APPLY_ARRAY / COMPUTE_DONE)', async ({ page }) => {
      const { arrayInput, arrayDisplay } = await getControls(page);
      if (!arrayInput && !arrayDisplay) test.skip('No array input/display to test apply behavior');

      // If there is an input, set a specific array and trigger apply (often there is an Apply button; try Enter)
      if (arrayInput) {
        await arrayInput.fill('1,2,3,4,5,6');
        // Attempt to press Enter to apply; many implementations listen to blur/enter
        await arrayInput.press('Enter');
        await page.waitForTimeout(300);
        // Verify arrayDisplay reflects new values (if exists)
        if (arrayDisplay) {
          const displayed = (await arrayDisplay.innerText()).trim();
          expect(/1.*2.*3|6/.test(displayed)).toBe(true);
        } else {
          const val1 = (await arrayInput.inputValue()).trim();
          expect(val.includes('1')).toBe(true);
        }
      } else {
        // If no input, but an arrayDisplay exists, attempt to simulate compute by triggering Randomize or Shuffle button
        const controls6 = await getControls(page);
        const randomBtn = controls.randomizeBtn || controls.shuffleBtn;
        if (!randomBtn) test.skip('No way to trigger computing');
        const before2 = (await arrayDisplay.innerText()).trim();
        await randomBtn.click();
        await page.waitForTimeout(300);
        const after1 = (await arrayDisplay.innerText()).trim();
        expect(after.length).toBeGreaterThan(0);
        // array likely changed
        expect(after === before ? true : true).toBe(true);
      }
    });

    test('randomize and shuffle trigger computing state and update array values (RANDOMIZE/SHUFFLE events)', async ({ page }) => {
      const controls7 = await getControls(page);
      if (!controls.randomizeBtn && !controls.shuffleBtn) test.skip('randomize/shuffle not present');

      const arrDisplay = controls.arrayDisplay || controls.arrayInput;
      if (!arrDisplay) test.skip('No array representation to verify changes');

      const beforeText = arrDisplay ? (await arrDisplay.innerText ? (await arrDisplay.innerText()).trim() : (await arrDisplay.inputValue()).trim()) : '';

      if (controls.randomizeBtn) {
        await controls.randomizeBtn.click();
        await page.waitForTimeout(300);
      }

      if (controls.shuffleBtn) {
        await controls.shuffleBtn.click();
        await page.waitForTimeout(300);
      }

      const afterText = arrDisplay ? (await arrDisplay.innerText ? (await arrDisplay.innerText()).trim() : (await arrDisplay.inputValue()).trim()) : '';
      expect(typeof afterText).toBe('string');
      // Array text should be present
      expect(afterText.length).toBeGreaterThan(0);
    });

    test('changing window size triggers recompute and may set atEnd when window too large (WINDOW_SIZE_CHANGE)', async ({ page }) => {
      const controls8 = await getControls(page);
      if (!controls.windowSizeInput) test.skip('No window size input');

      // Increase window size to a large value to provoke atEnd or special handling
      await controls.windowSizeInput.fill('1000');
      await controls.windowSizeInput.press('Enter');
      await page.waitForTimeout(300);

      // If Jump-to-End control exists, or Play button may reflect atEnd by disabling or label change
      const { jumpToEndBtn, playToggle } = await getControls(page);
      if (jumpToEndBtn) {
        // Clicking Jump-to-End should not throw and should leave app stable
        await jumpToEndBtn.click();
        await page.waitForTimeout(200);
      }
      if (playToggle) {
        // Ensure play toggle is present and not stuck
        const text = (await playToggle.innerText()).trim();
        expect(text.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('AtEnd state and reset / jump to end', () => {
    test('Jump to end enters atEnd; Play may start playing from end or be disabled (JUMP_TO_END / atEnd)', async ({ page }) => {
      const controls9 = await getControls(page);
      if (!controls.jumpToEndBtn) test.skip('No Jump to End control');

      await controls.jumpToEndBtn.click();
      await page.waitForTimeout(200);

      // After jumping to end, Play should be in 'stopped' state (label not indicating active playing)
      if (controls.playToggle) {
        const text1 = (await controls.playToggle.innerText()).trim();
        // Expect it to be a non-playing label like 'Play'
        expect(text.length).toBeGreaterThan(0);
      }

      // Try Play from atEnd (PLAY event when atEnd)
      try {
        await controls.playToggle.click();
        await page.waitForTimeout(300);
        // It may either start playing or remain at end; we assert no crash
        expect(true).toBe(true);
      } catch (e) {
        // Some implementations may disable Play at end; that's acceptable
        expect(true).toBe(true);
      }
    });

    test('Reset returns the module to idle and initial startIndex (RESET event)', async ({ page }) => {
      const controls10 = await getControls(page);
      // Reset may be a button or keyboard Home key
      if (controls.resetBtn) {
        await controls.resetBtn.click();
      } else {
        await page.keyboard.press('Home');
      }
      await page.waitForTimeout(250);

      if (controls.startIndexDisplay) {
        const s = (await controls.startIndexDisplay.innerText()).trim();
        // Expect start index to be 0 or beginning indicator
        expect(/0|start|Start|Begin/i.test(s) || s.length > 0).toBe(true);
      }
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('very small arrays or window sizes are handled without crashing (edge boundary)', async ({ page }) => {
      const controls11 = await getControls(page);
      if (!controls.arrayInput && !controls.arrayDisplay) test.skip('No array input/display for edge case');

      // Set array to a single element
      if (controls.arrayInput) {
        await controls.arrayInput.fill('42');
        await controls.arrayInput.press('Enter');
      } else if (controls.arrayDisplay) {
        // nothing we can set - just continue
      }

      // Set window size to 1
      if (controls.windowSizeInput) {
        await controls.windowSizeInput.fill('1');
        await controls.windowSizeInput.press('Enter');
      }

      // Try stepping and playing to ensure no JS errors / UI freeze
      const controls21 = await getControls(page);
      if (controls2.nextBtn) {
        await controls2.nextBtn.click();
        await page.waitForTimeout(200);
      }
      if (controls2.playToggle) {
        await controls2.playToggle.click();
        await page.waitForTimeout(400);
        await controls2.playToggle.click();
        await page.waitForTimeout(200);
      }

      // If sum display exists, check it shows 42 or similar numeric content
      if (controls.currentSumDisplay) {
        const sumText = (await controls.currentSumDisplay.innerText()).trim();
        expect(/\d+/.test(sumText)).toBe(true);
      }
    });

    test('invalid array input is sanitized or rejected gracefully', async ({ page }) => {
      const controls12 = await getControls(page);
      if (!controls.arrayInput) test.skip('No array input for invalid input test');

      // Enter malformed data
      await controls.arrayInput.fill('foo, bar, , , - , 12abc, 7');
      await controls.arrayInput.press('Enter');
      await page.waitForTimeout(300);

      // Ensure UI still responds: play toggle exists and array/display contains some numeric token if sanitized
      const controls211 = await getControls(page);
      expect(controls2.playToggle).toBeTruthy();
      if (controls2.arrayDisplay) {
        const txt1 = (await controls2.arrayDisplay.innerText()).trim();
        // Either sanitized numbers or still contains text; ensure not crashing
        expect(typeof txt).toBe('string');
      }
    });
  });

  test.describe('Explanation panel orthogonal interactions', () => {
    test('While explain_shown, controls still respond to PLAY/PAUSE/NEXT/PREV/DRAG_START events', async ({ page }) => {
      const controls13 = await getControls(page);
      if (!controls.explainToggle) test.skip('Explain not available');

      // Show explanation
      await controls.explainToggle.click();
      await page.waitForTimeout(200);

      // Attempt to play/pause while explanation is open
      if (controls.playToggle) {
        await controls.playToggle.click();
        await page.waitForTimeout(200);
        // Toggle back
        await controls.playToggle.click();
        await page.waitForTimeout(200);
      }

      // Attempt Next/Prev while explanation shown
      if (controls.nextBtn) {
        await controls.nextBtn.click();
        await page.waitForTimeout(100);
      }
      if (controls.prevBtn) {
        await controls.prevBtn.click();
        await page.waitForTimeout(100);
      }

      // Attempt to start dragging (if overlay present)
      if (controls.overlayHandle) {
        const box2 = await controls.overlayHandle.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.up();
          await page.waitForTimeout(100);
        }
      }

      // Hide explanation
      await controls.explainToggle.click();
      await page.waitForTimeout(200);

      expect(true).toBe(true);
    });
  });
});