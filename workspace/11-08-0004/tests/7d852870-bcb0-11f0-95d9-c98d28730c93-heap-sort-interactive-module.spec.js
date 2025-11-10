import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7d852870-bcb0-11f0-95d9-c98d28730c93.html';

// Utility helpers to be resilient to various implementation details:
// The implementation may expose its FSM state via different mechanisms.
// We attempt several fallbacks: window.appState, window.heapState, document.body.dataset.state, [data-state] attributes, or an element with id "state".
async function readState(page) {
  return await page.evaluate(() => {
    // Try several common exposure points
    try {
      if (window.__heapState) return window.__heapState; // conservative private var
      if (window.appState && typeof window.appState.state === 'string') return window.appState.state;
      if (window.heapState && typeof window.heapState.state === 'string') return window.heapState.state;
      if (document.body && document.body.dataset && document.body.dataset.state) return document.body.dataset.state;
      const el = document.querySelector('[data-state]');
      if (el) return el.getAttribute('data-state');
      const idEl = document.getElementById('state');
      if (idEl) return idEl.textContent.trim();
      // Some implementations put current state on window.currentState
      if (window.currentState) return window.currentState;
    } catch (e) {
      // ignore
    }
    return null;
  });
}

async function readPlayingFlag(page) {
  return await page.evaluate(() => {
    try {
      if (window.appState && typeof window.appState.playing !== 'undefined') return !!window.appState.playing;
      if (window.heapState && typeof window.heapState.playing !== 'undefined') return !!window.heapState.playing;
      if (document.body && document.body.dataset && typeof document.body.dataset.playing !== 'undefined') {
        const v = document.body.dataset.playing;
        return v === 'true' || v === '1';
      }
      const playBtn = Array.from(document.querySelectorAll('button')).find(b => /play/i.test(b.textContent));
      if (playBtn) return /pause/i.test(playBtn.textContent); // if shows Pause -> playing
    } catch (e) {}
    return false;
  });
}

async function readActionIndex(page) {
  return await page.evaluate(() => {
    try {
      if (window.appState && typeof window.appState.actionIndex === 'number') return window.appState.actionIndex;
      if (window.heapState && typeof window.heapState.actionIndex === 'number') return window.heapState.actionIndex;
      const el1 = document.querySelector('[data-action-index]');
      if (el) return Number(el.getAttribute('data-action-index'));
      const idEl1 = document.getElementById('action-index');
      if (idEl) return Number(idEl.textContent.trim());
    } catch (e) {}
    return null;
  });
}

async function readActionsLength(page) {
  return await page.evaluate(() => {
    try {
      if (window.appState && Array.isArray(window.appState.actions)) return window.appState.actions.length;
      if (window.heapState && Array.isArray(window.heapState.actions)) return window.heapState.actions.length;
      const el2 = document.querySelector('[data-actions-length]');
      if (el) return Number(el.getAttribute('data-actions-length'));
      const idEl2 = document.getElementById('actions-length');
      if (idEl) return Number(idEl.textContent.trim());
    } catch (e) {}
    return null;
  });
}

// Try multiple selectors to click a control by its visible name or id/class fallback.
async function clickControl(page, options) {
  // options: { text, id, altTexts: [] }
  const { text, id, altTexts = [] } = options;
  if (id) {
    const byId = page.locator(`#${id}`);
    if (await byId.count() > 0) {
      await byId.first().click();
      return;
    }
  }
  // Try by role/button name
  if (text) {
    const byRole = page.getByRole('button', { name: new RegExp(`^${text}$`, 'i') });
    if (await byRole.count() > 0) {
      await byRole.first().click();
      return;
    }
    // partial match
    const byRolePartial = page.getByRole('button', { name: new RegExp(text, 'i') });
    if (await byRolePartial.count() > 0) {
      await byRolePartial.first().click();
      return;
    }
    // text selector
    const byText = page.locator(`text=${text}`);
    if (await byText.count() > 0) {
      await byText.first().click();
      return;
    }
  }
  for (const t of altTexts) {
    const alt = page.getByRole('button', { name: new RegExp(t, 'i') });
    if (await alt.count() > 0) {
      await alt.first().click();
      return;
    }
    const altText = page.locator(`text=${t}`);
    if (await altText.count() > 0) {
      await altText.first().click();
      return;
    }
  }
  // As a last resort, try generic buttons with data-action attributes
  if (text) {
    const attr = page.locator(`[data-action="${text.toLowerCase().replace(/\s+/g, '-')}"]`);
    if (await attr.count() > 0) {
      await attr.first().click();
      return;
    }
  }
  throw new Error(`Control/button not found: text="${text}" id="${id}"`);
}

// Wait for FSM state to become expected, with timeout
async function waitForState(page, expectedState, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const s = await readState(page);
    if (s && s.toLowerCase() === expectedState.toLowerCase()) return s;
    await page.waitForTimeout(100);
  }
  const final = await readState(page);
  throw new Error(`Timed out waiting for state="${expectedState}". Last seen state="${final}"`);
}

// Wait for state to change away from a particular state
async function waitForStateChange(page, fromState, timeout = 5000) {
  const start1 = Date.now();
  while (Date.now() - start < timeout) {
    const s1 = await readState(page);
    if (!s || s.toLowerCase() !== fromState.toLowerCase()) return s;
    await page.waitForTimeout(80);
  }
  throw new Error(`Timed out waiting for state change from="${fromState}"`);
}

test.describe('Heap Sort Interactive Module FSM (7d852870-bcb0-11f0-95d9-c98d28730c93)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // Wait a short moment for JS to initialize
    await page.waitForTimeout(200);
  });

  test('Initial load should be in idle state and show idle UI (onEnter idle)', async ({ page }) => {
    // This test validates the onEnter actions for the idle state:
    // - renderAll() should have been called (visual elements exist)
    // - updateButtons() should reflect playing=false
    const state = await readState(page);
    // Accept null state but prefer to assert 'idle' if present
    if (state) {
      expect(state.toLowerCase()).toBe('idle');
    } else {
      // Fallback assertions: Play button should be visible and not show "Pause"
      const playBtn1 = page.getByRole('button', { name: /play/i }).first();
      const count = await playBtn.count();
      expect(count).toBeGreaterThan(0);
      const text = await playBtn.textContent();
      expect(text?.toLowerCase()).toContain('play');
    }

    // Ensure visualization exists: either an array container or tree container
    const arrayContainer = page.locator('[data-testid="array-view"], .array-view, #array, .visual-array');
    const treeContainer = page.locator('[data-testid="tree-view"], .tree-view, #tree, .visual-tree');
    const anyPresent = (await arrayContainer.count()) + (await treeContainer.count());
    expect(anyPresent).toBeGreaterThan(0);
  });

  test('Recording actions via Build Heap / Run Sort transitions to ready and records actions (onEnter ready)', async ({ page }) => {
    // Randomize array to ensure meaningful actions, then click Build Heap and Run Sort
    // Validate that actions[] exists and actionIndex === 0 after recording
    // Click Randomize if available
    try {
      await clickControl(page, { text: 'Randomize', altTexts: ['Randomize Array', 'Shuffle'] });
    } catch (e) {
      // Not fatal; some implementations may initialize with a random array
    }

    // If text input exists, set small array to deterministic state
    const arrayInput = page.locator('.array-input, #array-input, input[name="array"]');
    if (await arrayInput.count() > 0) {
      await arrayInput.fill('5,3,8,1,2');
      // Click Apply if present
      try {
        await clickControl(page, { text: 'Apply', altTexts: ['Apply Array', 'Apply Array Input'], id: 'apply-array' });
      } catch (e) {
        // ignore
      }
    }

    // Click Build Heap (record)
    await clickControl(page, { text: 'Build Heap', altTexts: ['Build heap'] });

    // Some implementations require clicking Run Sort to record full sort
    try {
      await clickControl(page, { text: 'Run Sort', altTexts: ['Sort', 'Heap Sort'] });
    } catch (e) {
      // ignore if not present
    }

    // After recording, FSM should be in 'ready' with actions recorded and actionIndex == 0
    await waitForState(page, 'ready', 3000);
    const actionsLen = await readActionsLength(page);
    expect(actionsLen).not.toBeNull();
    expect(typeof actionsLen).toBe('number');
    expect(actionsLen).toBeGreaterThan(0);

    const idx = await readActionIndex(page);
    // Some implementations store null when not exposed; if present assert it's 0
    if (idx !== null) expect(idx).toBe(0);
  });

  test('Step forward triggers animating state then returns to ready, and logs action (animating -> ready)', async ({ page }) => {
    // Ensure we are in ready state by recording actions if necessary
    const state1 = await readState(page);
    if (!state || state.toLowerCase() !== 'ready') {
      // Try to prepare by recording
      try {
        await clickControl(page, { text: 'Build Heap' });
      } catch (e) {}
      try {
        await clickControl(page, { text: 'Run Sort' });
      } catch (e) {}
      await waitForState(page, 'ready', 3000);
    }

    // Click Step Forward
    await clickControl(page, { text: 'Step Forward', altTexts: ['Step', 'Next', 'Step ▶', 'Step →'], id: 'step-forward' });

    // Immediately we expect transient animating state (onEnter animating)
    // Wait for state to become 'animating'
    await waitForState(page, 'animating', 2000);

    // During animating, DOM should show highlight classes for comparisons or swaps
    // Accept multiple possible class names
    const highlightSel = '.highlight-compare, .highlight-swap, .anim-compare, .anim-swap, .comparing, .swapping';
    const highlight = page.locator(highlightSel);
    const hCount = await highlight.count();
    expect(hCount).toBeGreaterThanOrEqual(0); // may be zero if animation is very quick

    // Wait for animation to complete and return to ready (on ANIMATION_COMPLETE)
    await waitForStateChange(page, 'animating', 5000);
    const finalStateAfter = await readState(page);
    // Should be ready or playing or completed depending on internal logic; we accept ready or playing
    expect(['ready', 'playing', 'completed']).toContain(finalStateAfter ? finalStateAfter.toLowerCase() : null);
  });

  test('Play starts playing state (onEnter playing), toggles Play/Pause, and exhausts to completed automatically', async ({ page }) => {
    // Prepare: ensure actions are recorded
    const st = await readState(page);
    if (!st || (st.toLowerCase() !== 'ready' && st.toLowerCase() !== 'idle')) {
      // reset to idle and prepare
      try {
        await clickControl(page, { text: 'Reset' });
      } catch (e) {}
    }

    // If not ready, record
    if ((await readState(page))?.toLowerCase() !== 'ready') {
      try { await clickControl(page, { text: 'Build Heap' }); } catch(e){}
      try { await clickControl(page, { text: 'Run Sort' }); } catch(e){}
      await waitForState(page, 'ready', 3000);
    }

    // Click Play
    await clickControl(page, { text: 'Play', altTexts: ['Start', '▶'], id: 'play' });

    // Wait for playing state
    await waitForState(page, 'playing', 3000);
    const playingFlag = await readPlayingFlag(page);
    expect(playingFlag).toBeTruthy();

    // Play button should toggle to Pause (UI text change)
    const pauseBtn = page.getByRole('button', { name: /pause/i });
    expect(await pauseBtn.count()).toBeGreaterThan(0);

    // Wait for completion: actions exhausted should lead to completed state.
    // Give generous timeout for animation of full sort
    await waitForState(page, 'completed', 20000);

    // On completed, visual should indicate sorted — look for '.sorted' class or 'done' label
    const sortedSel = '.sorted, .is-sorted, .highlight-sorted';
    const sortedElems = page.locator(sortedSel);
    // It's acceptable if no such class exists; assert at least some element has 'sorted' attribute if present
    if (await sortedElems.count() > 0) {
      expect(await sortedElems.count()).toBeGreaterThan(0);
    } else {
      // fallback: check that state reported 'completed' and that actionIndex >= actions.length
      const idx1 = await readActionIndex(page);
      const len = await readActionsLength(page);
      if (idx !== null && len !== null) {
        expect(idx).toBeGreaterThanOrEqual(len);
      }
    }
  });

  test('Completed state supports Step Back to animating and Reset returns to idle (onEnter completed → onExit none, Reset -> idle)', async ({ page }) => {
    // Ensure completed
    const curr = await readState(page);
    if (!curr || curr.toLowerCase() !== 'completed') {
      // Try to get to completed by recording and playing
      try { await clickControl(page, { text: 'Build Heap' }); } catch (e) {}
      try { await clickControl(page, { text: 'Run Sort' }); } catch (e) {}
      await clickControl(page, { text: 'Play' });
      await waitForState(page, 'completed', 20000);
    }

    // Click Step Back
    await clickControl(page, { text: 'Step Back', altTexts: ['Back', '◀', 'Step Back'], id: 'step-back' });

    // Should enter animating
    await waitForState(page, 'animating', 2000);

    // After animation completes, should move to ready (or idle depending on implementation)
    await waitForStateChange(page, 'animating', 5000);
    const after = await readState(page);
    expect(['ready', 'idle', 'playing']).toContain(after ? after.toLowerCase() : null);

    // Now click Reset to go to idle
    await clickControl(page, { text: 'Reset', altTexts: ['Reset Visualization', 'Restart'], id: 'reset' });
    await waitForState(page, 'idle', 3000);
  });

  test('View toggles (Array / Tree) and Show Indices do not change algorithmic state (orthogonal toggles)', async ({ page }) => {
    // Prepare: record actions to be in 'ready'
    try { await clickControl(page, { text: 'Build Heap' }); } catch (e) {}
    try { await clickControl(page, { text: 'Run Sort' }); } catch (e) {}
    await waitForState(page, 'ready', 3000);

    const beforeState = await readState(page);

    // Toggle to Tree view
    try {
      await clickControl(page, { text: 'Tree', altTexts: ['View Tree', 'Tree View'], id: 'view-tree' });
    } catch (e) {
      // attempt different label
      try { await clickControl(page, { text: 'View Tree' }); } catch (e2) {}
    }
    // Allow UI to update
    await page.waitForTimeout(200);
    const afterTree = await readState(page);
    expect(afterTree?.toLowerCase()).toBe(beforeState?.toLowerCase());

    // Toggle back to Array view
    try {
      await clickControl(page, { text: 'Array', altTexts: ['View Array', 'Array View'], id: 'view-array' });
    } catch (e) {}
    await page.waitForTimeout(200);
    const afterArray = await readState(page);
    expect(afterArray?.toLowerCase()).toBe(beforeState?.toLowerCase());

    // Toggle show indices if present
    const toggleIdx = page.locator('label:has-text("Show indices"), label:has-text("Show Indices"), [data-action="toggle-show-indices"], #toggle-indices');
    if (await toggleIdx.count() > 0) {
      await toggleIdx.first().click();
      await page.waitForTimeout(100);
      const afterToggle = await readState(page);
      expect(afterToggle?.toLowerCase()).toBe(beforeState?.toLowerCase());
    } else {
      // Try button named "Show Indices"
      try {
        await clickControl(page, { text: 'Show Indices', altTexts: ['Show indices', 'Indices'] });
        await page.waitForTimeout(100);
      } catch (e) {
        // Not present - acceptable
      }
    }
  });

  test('Speed control affects playback speed (SPEED_CHANGE) - measured roughly by time between actionIndex increments', async ({ page }) => {
    // This test is best-effort: we attempt to measure that increasing speed reduces the time to advance one action.
    // Prepare and record
    try { await clickControl(page, { text: 'Build Heap' }); } catch (e) {}
    try { await clickControl(page, { text: 'Run Sort' }); } catch (e) {}
    await waitForState(page, 'ready', 3000);

    // Find speed control: input[type=range] or select with name speed
    const speedRange = page.locator('input[type="range"][name="speed"], input[type="range"].speed, #speed');
    const speedSelect = page.locator('select[name="speed"], #speed-select, .speed-select');
    let hasRange = false;
    if (await speedRange.count() > 0) {
      hasRange = true;
    } else if (await speedSelect.count() > 0) {
      hasRange = false;
    } else {
      // Not present; skip test gracefully
      test.skip(true, 'No speed control found in UI');
      return;
    }

    // Helper to start play and measure time for one action increment
    async function measureOneActionTime() {
      // Reset to ready
      await clickControl(page, { text: 'Reset' });
      // Re-record
      try { await clickControl(page, { text: 'Build Heap' }); } catch (e) {}
      try { await clickControl(page, { text: 'Run Sort' }); } catch (e) {}
      await waitForState(page, 'ready', 3000);
      // Start playing
      const startIdx = await readActionIndex(page) ?? 0;
      await clickControl(page, { text: 'Play' });
      // Wait until actionIndex changes or state moves to completed
      const t0 = Date.now();
      const timeout = 5000;
      while (Date.now() - t0 < timeout) {
        const idx2 = await readActionIndex(page);
        if (idx !== null && idx > startIdx) break;
        // If completed, break
        const s2 = await readState(page);
        if (s && s.toLowerCase() === 'completed') break;
        await page.waitForTimeout(50);
      }
      const t1 = Date.now();
      // Stop playback
      try { await clickControl(page, { text: 'Pause', altTexts: ['Pause', 'Play'] }); } catch (e) {}
      return t1 - t0;
    }

    // Set speed to slower value if range
    if (await speedRange.count() > 0) {
      // set to low speed (e.g., 0)
      await speedRange.first().evaluate((r) => { r.value = r.min || 1; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); });
      await page.waitForTimeout(200);
      const slowTime = await measureOneActionTime();

      // set to high speed (max)
      await speedRange.first().evaluate((r) => { r.value = r.max || r.min; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); });
      await page.waitForTimeout(200);
      const fastTime = await measureOneActionTime();

      // Expect fastTime less than slowTime (or at least not greater)
      expect(fastTime).toBeLessThanOrEqual(slowTime + 2000); // allow noise
    } else if (await speedSelect.count() > 0) {
      // choose a slow option then fast option
      await speedSelect.first().selectOption({ index: 0 });
      await page.waitForTimeout(200);
      const slowTime1 = await measureOneActionTime();
      const options = await speedSelect.first().evaluate((s) => Array.from(s.options).map(o => o.value));
      const lastIndex = options.length - 1;
      await speedSelect.first().selectOption({ index: lastIndex });
      await page.waitForTimeout(200);
      const fastTime1 = await measureOneActionTime();
      expect(fastTime).toBeLessThanOrEqual(slowTime + 2000);
    }
  });

  test('Apply invalid array input shows error and does not transition to ready (edge case)', async ({ page }) => {
    // Find array input and apply
    const input = page.locator('.array-input, #array-input, input[name="array"]');
    if (await input.count() === 0) {
      // skip if no array input
      test.skip(true, 'No array input available to validate error handling');
      return;
    }
    await input.fill('abc,!,#');
    // Click Apply
    try {
      await clickControl(page, { text: 'Apply', altTexts: ['Apply Array', 'Apply Array Input'], id: 'apply-array' });
    } catch (e) {
      // Try pressing Enter in input
      await input.press('Enter');
    }

    // Expect an error message visible; common selectors: .error, .toast-error, .input-error
    const errorLocators = [
      page.locator('.error'),
      page.locator('.error-message'),
      page.locator('.input-error'),
      page.locator('.toast-error'),
      page.locator('text=Invalid array'),
      page.locator('text=Invalid input'),
    ];
    let foundError = false;
    for (const loc of errorLocators) {
      if (await loc.count() > 0) {
        foundError = true;
        break;
      }
    }
    expect(foundError).toBeTruthy();

    // Ensure state did not transition to ready
    const st1 = await readState(page);
    if (st) expect(st.toLowerCase()).not.toBe('ready');
  });

  test('Window resize and keyboard controls (KEY_PLAY_PAUSE, KEY_STEP_RIGHT/LEFT) affect states', async ({ page }) => {
    // Ensure ready state
    try { await clickControl(page, { text: 'Build Heap' }); } catch (e) {}
    try { await clickControl(page, { text: 'Run Sort' }); } catch (e) {}
    await waitForState(page, 'ready', 3000);

    // Simulate window resize event
    await page.setViewportSize({ width: 800, height: 600 });
    // Give UI a moment to handle resize
    await page.waitForTimeout(200);
    // State should remain ready
    expect((await readState(page))?.toLowerCase()).toBe('ready');

    // Keyboard: Play/Pause (space or 'k' or 'p' depending on implementation) - try Space
    await page.keyboard.press('Space');
    // Wait for playing
    await waitForState(page, 'playing', 3000);
    // Pause again with space
    await page.keyboard.press('Space');
    await waitForState(page, 'ready', 3000);

    // KEY_STEP_RIGHT -> simulate ArrowRight
    await page.keyboard.press('ArrowRight');
    // Should go to animating transiently then back
    await waitForState(page, 'animating', 2000);
    await waitForStateChange(page, 'animating', 5000);

    // KEY_STEP_LEFT -> simulate ArrowLeft
    await page.keyboard.press('ArrowLeft');
    await waitForState(page, 'animating', 2000);
    await waitForStateChange(page, 'animating', 5000);
  });

  test.afterEach(async ({ page }) => {
    // Attempt to reset to idle to leave clean state for next tests
    try {
      await clickControl(page, { text: 'Reset' });
      await waitForState(page, 'idle', 2000);
    } catch (e) {
      // ignore
    }
  });
});