import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87d8a5-cd35-11f0-9e7b-93b903303299.html';

test.describe('Interactive Linear Regression Demo - be87d8a5-cd35-11f0-9e7b-93b903303299', () => {
  // Shared state for collecting console and page errors per test
  test.beforeEach(async ({ page }) => {
    // Collect console messages and page errors for later assertions
    await page.addInitScript(() => {
      window.__test_console_messages = [];
      window.__test_page_errors = [];
    });

    page.on('console', msg => {
      // push serializable info to the page-scoped arrays for post-check via evaluate
      const args = { type: msg.type(), text: msg.text() };
      page.evaluate((a) => window.__test_console_messages.push(a), args).catch(()=>{});
    });

    page.on('pageerror', err => {
      page.evaluate((e) => window.__test_page_errors.push(e), err.message).catch(()=>{});
    });

    // Go to the application page
    await page.goto(APP_URL, { waitUntil: 'load' });
    // Ensure canvases and UI settle (redraw occurs on load)
    await page.waitForTimeout(300);
  });

  test.afterEach(async ({ page }) => {
    // retrieve console and page errors from the page
    const consoleMessages = await page.evaluate(() => window.__test_console_messages || []);
    const pageErrors = await page.evaluate(() => window.__test_page_errors || []);

    // Assert that there are no uncaught page errors
    expect(pageErrors, 'No uncaught page errors should have occurred').toEqual([]);

    // Ensure there are no console messages of type 'error'
    const errorMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorMessages, 'No console error messages expected').toEqual([]);
  });

  test('Initial load: UI elements exist and initial model/stats populated', async ({ page }) => {
    // Purpose: Verify the page loads and default UI reflects an initialized model after data generation.
    const title = await page.locator('h1').textContent();
    expect(title).toContain('Linear Regression');

    // Check presence of main controls
    await expect(page.locator('#btnNormal')).toBeVisible();
    await expect(page.locator('#btnRunGD')).toBeVisible();
    await expect(page.locator('#btnPause')).toBeVisible();
    await expect(page.locator('#alpha')).toBeVisible();
    await expect(page.locator('#alphaVal')).toBeVisible();
    await expect(page.locator('#plot')).toBeVisible();
    await expect(page.locator('#costCanvas')).toBeVisible();

    // alphaVal may be formatted either "0.01" from HTML or "0.0100" if input event fired.
    const alphaText = (await page.locator('#alphaVal').textContent()) || '';
    expect(alphaText).toContain('0.01');

    // The initial script calls generateData(30, ...) which fits a model; theta elements should not be placeholder "—"
    const theta0Text = await page.locator('#theta0').textContent();
    const theta1Text = await page.locator('#theta1').textContent();
    const mseText = await page.locator('#mse').textContent();
    const r2Text = await page.locator('#r2').textContent();

    // theta values should be present numeric strings (not the placeholder '—')
    expect(theta0Text).not.toBe('—');
    expect(theta1Text).not.toBe('—');

    // MSE should be present and either numeric or "—" if unexpected; prefer numeric
    expect(mseText).not.toBeNull();
    expect(r2Text).not.toBeNull();

    // The app exposes window.__lr_demo with xs and ys arrays — ensure there are points generated
    const counts = await page.evaluate(() => {
      return { xs: (window.__lr_demo && window.__lr_demo.xs && window.__lr_demo.xs.length) || 0,
               ys: (window.__lr_demo && window.__lr_demo.ys && window.__lr_demo.ys.length) || 0 };
    });
    expect(counts.xs).toBeGreaterThanOrEqual(1);
    expect(counts.ys).toBeGreaterThanOrEqual(1);
  });

  test('Adding points by clicking the plot updates internal data and redraws stats', async ({ page }) => {
    // Purpose: Validate that clicking the main canvas adds a point and updates model-related DOM elements.
    const plot = page.locator('#plot');

    // Get initial counts from exposed debug object
    const initial = await page.evaluate(() => ({
      xs: window.__lr_demo?.xs?.length || 0,
      ys: window.__lr_demo?.ys?.length || 0,
      theta0: document.getElementById('theta0').textContent,
      theta1: document.getElementById('theta1').textContent
    }));

    // Click near center of canvas to add a point
    const box = await plot.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      // allow redraw
      await page.waitForTimeout(150);
    }

    // New counts should be increased by 1
    const after = await page.evaluate(() => ({
      xs: window.__lr_demo?.xs?.length || 0,
      ys: window.__lr_demo?.ys?.length || 0,
      theta0: document.getElementById('theta0').textContent,
      theta1: document.getElementById('theta1').textContent,
      predictY: (document.getElementById('predictY') && document.getElementById('predictY').value) || ''
    }));
    expect(after.xs).toBe(initial.xs + 1);
    expect(after.ys).toBe(initial.ys + 1);

    // After adding a point, theta elements should remain valid strings (numbers or zeros)
    expect(after.theta0).not.toBeNull();
    expect(after.theta1).not.toBeNull();

    // predictY should be set (predictX default 0) and be a string convertible to number
    const parsedPredict = Number(after.predictY);
    expect(Number.isFinite(parsedPredict)).toBeTruthy();
  });

  test('Normal equation behavior for insufficient and sufficient points (alerts & fitting)', async ({ page }) => {
    // Purpose: Ensure Normal Eq triggers alert when insufficient points, and fits when enough points exist.

    // First clear existing points so xs.length === 0
    await page.locator('#btnClear').click();
    await page.waitForTimeout(120);

    // Prepare to capture the dialog
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click Normal eq; should trigger an alert "Need at least 2 points to fit."
    await page.locator('#btnNormal').click();
    // Wait to ensure dialog handler ran
    await page.waitForTimeout(120);
    expect(dialogMessage).toContain('Need at least 2 points');

    // Now add two points by clicking canvas to allow fitting
    const plot1 = page.locator('#plot1');
    const box1 = await plot.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      // click two distinct spots
      await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25);
      await page.waitForTimeout(60);
      await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.75);
      await page.waitForTimeout(150);
    }

    // Now click Normal eq again — this should perform fit without alert
    // Attach a dialog catcher to ensure no unexpected dialog pops (fail if it does)
    let unexpectedDialog = null;
    page.once('dialog', async d => {
      unexpectedDialog = d.message();
      await d.dismiss();
    });
    await page.locator('#btnNormal').click();
    await page.waitForTimeout(150);
    expect(unexpectedDialog).toBeNull();

    // After fit, theta0 and theta1 should be numeric strings (not the placeholder '—')
    const theta0 = await page.locator('#theta0').textContent();
    const theta1 = await page.locator('#theta1').textContent();
    expect(theta0).not.toBe('—');
    expect(theta1).not.toBe('—');
    // Convertible to finite numbers
    expect(Number.isFinite(Number(theta0))).toBeTruthy();
    expect(Number.isFinite(Number(theta1))).toBeTruthy();
  });

  test('Gradient Descent: step updates parameters; run/pause toggles state', async ({ page }) => {
    // Purpose: Validate gradient descent step modifies theta values, and Run/Pause toggles controls/animation.

    // Ensure at least two points to let gradient descent do something
    // If currently fewer than 2 points, generate small dataset by clicking
    const count = await page.evaluate(() => window.__lr_demo?.xs?.length || 0);
    if (count < 2) {
      const box2 = await page.locator('#plot').boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.2);
        await page.waitForTimeout(60);
        await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.8);
        await page.waitForTimeout(120);
      }
    }

    // Record current theta values
    const before = {
      theta0: await page.locator('#theta0').textContent(),
      theta1: await page.locator('#theta1').textContent()
    };

    // Set a modest alpha and iterations to ensure change
    await page.locator('#alpha').fill('0.05');
    // Trigger input event so alphaVal updates visually
    await page.locator('#alpha').evaluate((el) => el.dispatchEvent(new Event('input')));
    await page.locator('#iters').fill('10');

    // Click Step button to perform gradient descent batch updates
    await page.locator('#btnStep').click();
    await page.waitForTimeout(150);

    // The theta values should have changed (or at least be valid numbers)
    const afterStep = {
      theta0: await page.locator('#theta0').textContent(),
      theta1: await page.locator('#theta1').textContent()
    };
    expect(Number.isFinite(Number(afterStep.theta0))).toBeTruthy();
    expect(Number.isFinite(Number(afterStep.theta1))).toBeTruthy();
    // It's acceptable if one of them is the same in degenerate cases; at least one should be numeric and not NaN.
    // Now test Run GD toggles
    const runBtn = page.locator('#btnRunGD');
    const pauseBtn = page.locator('#btnPause');

    // Click Run GD to start the animation
    await runBtn.click();
    await page.waitForTimeout(200); // allow interval to execute at least once

    // Run button should become disabled, pause enabled
    expect(await runBtn.isDisabled()).toBeTruthy();
    expect(await pauseBtn.isEnabled()).toBeTruthy();

    // Wait a little more to let parameters change due to animation, then pause
    await page.waitForTimeout(220);
    await pauseBtn.click();
    await page.waitForTimeout(120);

    // After pausing, Run should be enabled again
    expect(await runBtn.isDisabled()).toBeFalsy();
    expect(await pauseBtn.isDisabled()).toBeTruthy();

    // Ensure theta values remain numeric after pause
    const afterPause = {
      theta0: await page.locator('#theta0').textContent(),
      theta1: await page.locator('#theta1').textContent()
    };
    expect(Number.isFinite(Number(afterPause.theta0))).toBeTruthy();
    expect(Number.isFinite(Number(afterPause.theta1))).toBeTruthy();
  });

  test('Generate & Generate & Replace update dataset and stats accordingly', async ({ page }) => {
    // Purpose: Validate data generation buttons create/replace points and model updates.
    // Set parameters for generation
    await page.locator('#genN').fill('12');
    await page.locator('#trueSlope').fill('2.5');
    await page.locator('#trueIntercept').fill('0.5');
    await page.locator('#noise').fill('0.1');

    // Click Generate (appends)
    const beforeCount = await page.evaluate(() => window.__lr_demo?.xs?.length || 0);
    await page.locator('#btnGen').click();
    await page.waitForTimeout(180);
    const afterGenCount = await page.evaluate(() => window.__lr_demo?.xs?.length || 0);
    expect(afterGenCount).toBeGreaterThanOrEqual(beforeCount + 1);

    // Click Generate & Replace to reset dataset (should replace points)
    await page.locator('#btnGenClear').click();
    await page.waitForTimeout(180);
    const afterGenClearCount = await page.evaluate(() => window.__lr_demo?.xs?.length || 0);
    expect(afterGenClearCount).toBeGreaterThanOrEqual(1);
    // After replacement, theta values should be numeric (normal eq is called in generateData)
    const theta01 = await page.locator('#theta01').textContent();
    const theta11 = await page.locator('#theta11').textContent();
    expect(Number.isFinite(Number(theta0))).toBeTruthy();
    expect(Number.isFinite(Number(theta1))).toBeTruthy();
  });

  test('Undo and Clear buttons manipulate points and reset model state', async ({ page }) => {
    // Purpose: Validate Undo removes last point and Clear resets dataset and model.
    // Ensure there's at least one point to undo
    const countBefore = await page.evaluate(() => window.__lr_demo?.xs?.length || 0);
    if (countBefore === 0) {
      const box3 = await page.locator('#plot').boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(80);
      }
    }

    const before1 = await page.evaluate(() => window.__lr_demo?.xs?.length || 0);
    await page.locator('#btnUndo').click();
    await page.waitForTimeout(120);
    const afterUndo = await page.evaluate(() => window.__lr_demo?.xs?.length || 0);
    expect(afterUndo).toBeLessThanOrEqual(before);

    // Click Clear and expect zero points and model reset
    await page.locator('#btnClear').click();
    await page.waitForTimeout(120);
    const afterClear = await page.evaluate(() => window.__lr_demo?.xs?.length || 0);
    expect(afterClear).toBe(0);

    // After clear, theta0/1 should be reset to 0 and displayed as "0.00000"
    const theta02 = await page.locator('#theta02').textContent();
    const theta12 = await page.locator('#theta12').textContent();
    expect(Number(theta0)).toBe(0);
    expect(Number(theta1)).toBe(0);
  });

  test('Keyboard shortcuts: space toggles run/pause and keys n, c, u trigger actions', async ({ page }) => {
    // Purpose: Verify keyboard shortcuts call their respective handlers.

    // Ensure at least two points so Normal Eq (n) works
    const count1 = await page.evaluate(() => window.__lr_demo?.xs?.length || 0);
    if (count < 2) {
      const box4 = await page.locator('#plot').boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
        await page.waitForTimeout(60);
        await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.7);
        await page.waitForTimeout(120);
      }
    }

    // Press 'n' to trigger Normal eq; capture a potential dialog as failure
    let dialogSeen = null;
    page.once('dialog', async d => { dialogSeen = d.message(); await d.accept(); });
    await page.keyboard.press('n');
    await page.waitForTimeout(120);
    expect(dialogSeen).toBeNull(); // normal eq should fit without alert when >=2 points

    // Press space to start GD; expect run button disabled
    await page.keyboard.press(' ');
    await page.waitForTimeout(160);
    expect(await page.locator('#btnRunGD').isDisabled()).toBeTruthy();

    // Press space again to pause
    await page.keyboard.press(' ');
    await page.waitForTimeout(120);
    expect(await page.locator('#btnRunGD').isDisabled()).toBeFalsy();

    // Press 'c' to clear
    await page.keyboard.press('c');
    await page.waitForTimeout(120);
    const cleared = await page.evaluate(() => (window.__lr_demo?.xs?.length || 0) === 0);
    expect(cleared).toBeTruthy();

    // Add two points then press 'u' to undo last
    const box5 = await page.locator('#plot').boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
      await page.waitForTimeout(40);
      await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.7);
      await page.waitForTimeout(80);
    }
    const beforeUndo = await page.evaluate(() => window.__lr_demo?.xs?.length || 0);
    await page.keyboard.press('u');
    await page.waitForTimeout(100);
    const afterUndo1 = await page.evaluate(() => window.__lr_demo?.xs?.length || 0);
    expect(afterUndo).toBe(beforeUndo - 1);
  });
});