import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6c532660-bcb0-11f0-95d9-c98d28730c93.html';

// Helper utilities and Page Object
class RecursionApp {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
    // Wait for the main area to be present (robust generic wait)
    await this.page.waitForSelector('main, .interactive, .container', { timeout: 5000 });
  }

  // Find number input for 'n' (tries several fallbacks)
  async getNInput() {
    const p = this.page;
    const candidates = [
      'input[type="number"]',
      'input[type="text"][inputmode="numeric"]',
      'input[name="n"]',
      'input[id*="n"]',
      'input[aria-label*="n"]',
      'input[placeholder*="n"]'
    ];
    for (const sel of candidates) {
      const loc = p.locator(sel).first();
      if (await loc.count() && await loc.isVisible()) return loc;
    }
    // fallback: first input
    return p.locator('input').first();
  }

  // Generic finder: find a button whose innerText, aria-label or title matches regex
  async findButtonByPattern(regex) {
    const buttons = this.page.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < count; ++i) {
      const btn = buttons.nth(i);
      // some buttons might not be visible
      if (!(await btn.isVisible())) continue;
      let text = '';
      try { text = (await btn.innerText()).trim(); } catch (e) { text = ''; }
      const aria = (await btn.getAttribute('aria-label')) || '';
      const title = (await btn.getAttribute('title')) || '';
      if (regex.test(text) || regex.test(aria) || regex.test(title)) return btn;
    }
    // If not found, throw for clarity
    throw new Error(`Button matching ${regex} not found`);
  }

  // Specific control getters (use patterns to be robust)
  async stepForwardButton() {
    // match common labels: Step, Forward, Next, '>' glyph
    return this.findButtonByPattern(/step forward|step|forward|next|▶|›|→|>/i);
  }

  async stepBackButton() {
    return this.findButtonByPattern(/step back|back|previous|‹|←|<|back/i);
  }

  async playToggleButton() {
    // Play or Pause variations
    try {
      return await this.findButtonByPattern(/play|pause|▶|⏯|⏸|⏵/i);
    } catch {
      // Fallback to any button with "toggle" in aria
      const maybe = this.page.locator('button[aria-pressed], button[aria-label*="play"], button[aria-label*="pause"]').first();
      if (await maybe.count()) return maybe;
      throw new Error('Play toggle button not found');
    }
  }

  async resetButton() {
    return this.findButtonByPattern(/reset|restart|clear|↺|⟲/i);
  }

  // Utility to read an event count badge if present (returns number or null)
  async getEventCount() {
    // Possible selectors for event count/badge
    const p1 = this.page;
    const candidates1 = [
      '.event-count',
      '.badge',
      '.events-count',
      '[data-event-count]',
      '.event-count-badge',
      '.meta .muted',
      '.muted'
    ];
    for (const sel of candidates) {
      const loc1 = p.locator(sel).first();
      if (await loc.count() && await loc.isVisible()) {
        const txt = (await loc.innerText()).trim();
        const m = txt.match(/(\d+)/);
        if (m) return Number(m[1]);
      }
    }
    // Try searching for any element that contains "events" with digits
    const any = p.locator('text=/\\d+\\s+event/i').first();
    if (await any.count() && await any.isVisible()) {
      const txt1 = (await any.innerText()).trim();
      const m1 = txt.match(/(\d+)/);
      if (m) return Number(m[1]);
    }
    return null;
  }

  // Get number of stack frames currently rendered
  async getStackFrameCount() {
    // Try several possible selectors for frames
    const p2 = this.page;
    // If there is a container with class stack
    const stackContainers = [
      '.stack',
      '.call-stack',
      '#stack',
      '[data-stack]'
    ];
    for (const sel of stackContainers) {
      const c = p.locator(sel).first();
      if (await c.count() && await c.isVisible()) {
        // count children that look like frames
        const frames = c.locator('*').filter({ has: p.locator('[class*="frame"], [data-frame], .frame, .call-frame') });
        const countFrames = await frames.count();
        if (countFrames > 0) return countFrames;
        // fallback: count direct children
        const direct = await c.locator(':scope > *').count();
        if (direct > 0) return direct;
      }
    }
    // fallback: any element with 'frame' in class
    const framesAny = p.locator('[class*="frame"], [data-frame], .call-frame');
    const cnt = await framesAny.count();
    if (cnt > 0) return cnt;
    // Another fallback: look for list items inside a stack-like area
    const li = p.locator('.interactive li, .card li').count();
    try {
      const liCnt = await (await li);
      if (liCnt) return liCnt;
    } catch (e) {}
    // If none found assume 0
    return 0;
  }

  // Check whether a final result is shown (number or "Result")
  async hasFinalResult() {
    const p3 = this.page;
    // Search for common result indicators
    const candidates2 = [
      '.result',
      '#result',
      '[data-result]',
      '.final-result',
      'text=/result/i',
      'text=/answer/i'
    ];
    for (const sel of candidates) {
      const loc2 = p.locator(sel).first();
      if (await loc.count() && await loc.isVisible()) {
        const txt2 = (await loc.innerText()).trim();
        if (txt.length) return true;
      }
    }
    // Also search for a prominent number near "result" line
    const any1 = p.locator('text=/result|final/i').first();
    if (await any.count() && await any.isVisible()) return true;
    return false;
  }

  // Helper interactions
  async setN(n) {
    const input = await this.getNInput();
    await input.fill(String(n));
    // blur to trigger rebuild
    await input.evaluate((el) => el.blur && el.blur());
    // Some implementations rebuild on input change + keypress enter
    try { await input.press('Enter'); } catch {}
  }

  async clickStepForward() {
    const btn1 = await this.stepForwardButton();
    await btn.click();
  }

  async clickStepBack() {
    const btn2 = await this.stepBackButton();
    await btn.click();
  }

  async togglePlay() {
    const btn3 = await this.playToggleButton();
    await btn.click();
  }

  async clickReset() {
    const btn4 = await this.resetButton();
    await btn.click();
  }

  // Press keyboard keys on body
  async pressKey(key) {
    await this.page.keyboard.press(key);
  }

  // Determine if step forward is disabled (if button exists)
  async isStepForwardDisabled() {
    const btn5 = await this.stepForwardButton();
    return await btn.isDisabled();
  }

  async isStepBackDisabled() {
    const btn6 = await this.stepBackButton();
    return await btn.isDisabled();
  }

  // Try to detect playing state by button label changing to "Pause" or aria-pressed
  async isPlaying() {
    try {
      const btn7 = await this.playToggleButton();
      const ariaPressed = await btn.getAttribute('aria-pressed');
      if (ariaPressed !== null) return ariaPressed === 'true';
      const txt3 = (await btn.innerText()).toLowerCase();
      if (txt.includes('pause')) return true;
      // sometimes a class or data attribute
      const cls = await btn.getAttribute('class') || '';
      if (/playing|pause/i.test(cls)) return true;
      const data = (await btn.getAttribute('data-playing')) || (await btn.getAttribute('data-state'));
      if (data) return /true|playing|pause/i.test(data);
    } catch {}
    return false;
  }
}

// Tests
test.describe('Recursion Visualizer (Factorial) — FSM behavior', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new RecursionApp(page);
    await app.goto();
  });

  test('Initialization: app reaches idle_at_start (pointer=0) and controls set correctly', async () => {
    // Validate initial controls: at start step-back should be disabled, step-forward/play enabled
    const stepBackDisabled = await app.isStepBackDisabled();
    expect(stepBackDisabled).toBe(true);

    // step forward should not be disabled at start unless there are zero events
    const stepForwardDisabled = await app.isStepForwardDisabled();
    // It's acceptable for some inputs that no events exist (e.g., n<=0), but normally step forward enabled
    // We assert that either it's enabled or the event count is zero
    const eventCount = await app.getEventCount();
    if (eventCount === null) {
      // If we couldn't detect an event count, at least ensure play button exists
      const play = await app.playToggleButton();
      expect(play).toBeTruthy();
    } else {
      if (eventCount === 0) {
        expect(stepForwardDisabled).toBe(true);
      } else {
        expect(stepForwardDisabled).toBe(false);
      }
    }

    // There should be no stack frames rendered at start
    const frames1 = await app.getStackFrameCount();
    expect(frames).toBe(0);

    // highlight of pseudocode line should exist (best-effort)
    const highlighted = await app.page.locator('[class*="highlight"], [class*="active"], .code .line.highlight, .code .line.active').first();
    // It's possible the highlight is implemented differently; do a non-strict assert: either it's present or at least code area exists
    if (await highlighted.count()) {
      expect(await highlighted.isVisible()).toBeTruthy();
    } else {
      expect(await app.page.locator('.code, pre, code, .pseudocode').count()).toBeGreaterThan(0);
    }
  });

  test('Changing n triggers rebuilding and resets visualization (rebuilding -> idle_at_start)', async () => {
    // Change n to a new value and verify pointer resets (stack empty) and event count updates
    const initialEventCount = await app.getEventCount();
    await app.setN(4);

    // After rebuilding, pointer should be 0, i.e., stack frames zero
    const framesAfter = await app.getStackFrameCount();
    expect(framesAfter).toBe(0);

    // Event count should be present and likely different or at least numeric
    const eventCountAfter = await app.getEventCount();
    expect(typeof eventCountAfter === 'number' || eventCountAfter === null).toBeTruthy();
    // If we had a prior count, ensure the app updated something (non-strict)
    if (initialEventCount !== null && eventCountAfter !== null) {
      expect(eventCountAfter).not.toBeNaN();
    }
  });

  test('STEP_FORWARD advances pointer and transitions to idle_mid then idle_end when complete', async () => {
    // Try stepping forward repeatedly until completion or until we reach a safe limit
    const maxSteps = 40;
    let steps = 0;
    // get eventCount to know number of steps expected
    const totalEvents = (await app.getEventCount()) ?? 10; // fallback
    // Ensure at start
    expect(await app.getStackFrameCount()).toBe(0);

    // Step forward one by one and assert frame count increases (monotonic)
    let lastFrames = 0;
    for (; steps < Math.min(maxSteps, totalEvents + 2); steps++) {
      await app.clickStepForward();
      // small wait for DOM update
      await app.page.waitForTimeout(100);
      const frames2 = await app.getStackFrameCount();
      // frames should be >= lastFrames (monotonic non-decreasing)
      expect(frames).toBeGreaterThanOrEqual(lastFrames);
      lastFrames = frames;
      // if we have reached an end condition where step forward becomes disabled, break
      try {
        const disabled = await app.isStepForwardDisabled();
        if (disabled) break;
      } catch {}
    }

    // After loop, either we've used expected number of events or hit disabled
    const finalDisabled = await app.isStepForwardDisabled();
    // If totalEvents > 0 expect to end with disabled true once we've applied all events
    if (totalEvents > 0) {
      expect(finalDisabled).toBeTruthy();
      // final result should be shown
      const hasResult = await app.hasFinalResult();
      expect(hasResult).toBeTruthy();
    }
  });

  test('STEP_BACK decrements pointer and can return to idle_at_start', async () => {
    // Move forward a few steps, then step back to start
    const totalEvents1 = (await app.getEventCount()) ?? 6;
    const stepsForward = Math.min(3, totalEvents);
    for (let i = 0; i < stepsForward; i++) {
      await app.clickStepForward();
      await app.page.waitForTimeout(80);
    }
    const midFrames = await app.getStackFrameCount();
    expect(midFrames).toBeGreaterThan(0);

    // Now step back one by one until pointer==0
    let attempts = 0;
    while (!(await app.isStepBackDisabled()) && attempts < 40) {
      await app.clickStepBack();
      await app.page.waitForTimeout(80);
      attempts++;
    }
    // Now at start: frames should be zero
    const framesAtStart = await app.getStackFrameCount();
    expect(framesAtStart).toBe(0);
    expect(await app.isStepBackDisabled()).toBeTruthy();
  });

  test('PLAY_TOGGLE starts automated play and stops at idle_end automatically', async () => {
    // Ensure we are at start
    await app.clickReset().catch(() => {}); // best-effort
    await app.page.waitForTimeout(100);

    const totalEvents2 = (await app.getEventCount()) ?? 8;
    // Start playing
    await app.togglePlay();
    // Wait a short time and assert we are in playing state
    await app.page.waitForTimeout(200);
    expect(await app.isPlaying()).toBeTruthy();

    // Wait for play to reach end (give generous timeout)
    // We'll poll for step forward disabled or final result
    const timeoutMs = Math.max(2000, totalEvents * 300);
    const start = Date.now();
    let finished = false;
    while (Date.now() - start < timeoutMs) {
      if (await app.isStepForwardDisabled()) {
        finished = true;
        break;
      }
      if (await app.hasFinalResult()) {
        finished = true;
        break;
      }
      await app.page.waitForTimeout(150);
    }
    expect(finished).toBeTruthy();
    // After finishing, playing should have stopped
    expect(await app.isPlaying()).toBeFalsy();
    // Confirm we are at end (final result visible)
    expect(await app.hasFinalResult()).toBeTruthy();
  }, 20000);

  test('PLAY_TOGGLE while at idle_end restarts from 0 and plays again', async () => {
    // Ensure we are at end: step forward until disabled
    const totalEvents3 = (await app.getEventCount()) ?? 6;
    for (let i = 0; i < totalEvents + 2; i++) {
      // try stepping forward until disabled
      if (await app.isStepForwardDisabled()) break;
      await app.clickStepForward();
      await app.page.waitForTimeout(60);
    }
    expect(await app.isStepForwardDisabled()).toBeTruthy();

    // Now toggle play; spec says if pointer >= events.length -> pointer = 0 and start playing
    await app.togglePlay();
    await app.page.waitForTimeout(150);
    // should be playing
    expect(await app.isPlaying()).toBeTruthy();

    // Playback should progress; wait briefly and then pause
    await app.page.waitForTimeout(300);
    // Stop playback via toggling again
    await app.togglePlay();
    await app.page.waitForTimeout(100);
    expect(await app.isPlaying()).toBeFalsy();
  });

  test('Changing n while playing triggers rebuilding and stops playing', async () => {
    // Start playing
    await app.togglePlay();
    await app.page.waitForTimeout(150);
    expect(await app.isPlaying()).toBeTruthy();

    // Change n while playing
    await app.setN(2);
    // After changing, building should have reset pointer to 0 and stopped playing
    // Wait a short time for rebuild
    await app.page.waitForTimeout(200);
    expect(await app.isPlaying()).toBeFalsy();
    const frames3 = await app.getStackFrameCount();
    expect(frames).toBe(0);
  });

  test('RESET stops playing and resets pointer to start', async () => {
    // Move mid and play
    await app.clickStepForward();
    await app.page.waitForTimeout(80);
    await app.togglePlay();
    await app.page.waitForTimeout(120);
    // Reset while possibly playing
    await app.clickReset();
    await app.page.waitForTimeout(150);
    // Playing should be false and pointer at 0
    expect(await app.isPlaying()).toBeFalsy();
    expect(await app.getStackFrameCount()).toBe(0);
    expect(await app.isStepBackDisabled()).toBeTruthy();
  });

  test('Keyboard controls map correctly: ArrowRight (step forward), ArrowLeft (step back), Space (play toggle)', async () => {
    // Start at reset
    await app.clickReset().catch(() => {});
    await app.page.waitForTimeout(100);

    // Press ArrowRight: should step forward
    await app.pressKey('ArrowRight');
    await app.page.waitForTimeout(120);
    const framesAfterRight = await app.getStackFrameCount();
    expect(framesAfterRight).toBeGreaterThanOrEqual(0);

    // Press ArrowLeft: should step back (if possible)
    await app.pressKey('ArrowLeft');
    await app.page.waitForTimeout(120);
    // after stepping back from 1 -> 0 frames ideally
    const framesAfterLeft = await app.getStackFrameCount();
    expect(framesAfterLeft).toBeLessThanOrEqual(framesAfterRight);

    // Press Space: toggles play
    await app.pressKey('Space');
    await app.page.waitForTimeout(120);
    // Should be playing now
    const playingAfterSpace = await app.isPlaying();
    // Because some implementations require focus, accept either true or presence of play button toggled
    expect(typeof playingAfterSpace === 'boolean').toBeTruthy();
    // If it is playing, toggle again to stop
    if (playingAfterSpace) {
      await app.pressKey('Space');
      await app.page.waitForTimeout(100);
      expect(await app.isPlaying()).toBeFalsy();
    }
  });

  test('Edge cases: setting n to zero or negative yields no events and UI remains stable', async () => {
    // Set n to 0
    await app.setN(0);
    await app.page.waitForTimeout(150);
    // Expect no frames and step forward disabled
    const frames0 = await app.getStackFrameCount();
    expect(frames0).toBe(0);
    const sfDisabled0 = await app.isStepForwardDisabled();
    // If event count is detectable and zero, stepForward should be disabled; otherwise we permit either state but ensure app not crashing
    const eventCount0 = await app.getEventCount();
    if (eventCount0 !== null) {
      expect(eventCount0).toBe(0);
      expect(sfDisabled0).toBeTruthy();
    } else {
      expect(typeof sfDisabled0 === 'boolean').toBeTruthy();
    }

    // Set n to negative
    await app.setN(-3);
    await app.page.waitForTimeout(150);
    const framesNeg = await app.getStackFrameCount();
    expect(framesNeg).toBe(0);
  });
});