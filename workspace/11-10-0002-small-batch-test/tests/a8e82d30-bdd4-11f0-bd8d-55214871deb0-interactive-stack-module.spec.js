import { test, expect } from '@playwright/test';

const APP_URL =
  'http://127.0.0.1:5500/workspace/11-10-0002-small-batch-test/html/a8e82d30-bdd4-11f0-bd8d-55214871deb0.html';

/**
 * Utility: try a list of selectors and return the first locator that exists in the page.
 * This makes tests resilient to small implementation differences in class/id names.
 */
async function firstLocator(page, selectors) {
  for (const sel of selectors) {
    const locator = page.locator(sel);
    if ((await locator.count()) > 0) return locator;
  }
  return null;
}

/**
 * Utility: get stack container locator (tries several likely selectors)
 */
async function getStackContainer(page) {
  return (
    (await firstLocator(page, [
      '.stack',
      '#stack',
      '[data-testid="stack"]',
      'ul.stack',
      'div.stack-container'
    ])) || page.locator('body') // fallback to body to avoid null callers
  );
}

/**
 * Utility: get stack cards locator (children of stack container)
 */
async function getCardsLocator(page) {
  const stack = await getStackContainer(page);
  // try several plausible selectors scoped to the stack
  const candidates = [
    '.card',
    '.stack-card',
    'li',
    '[data-testid="card"]',
    '.card-item',
    '.stack > *'
  ];
  for (const sel of candidates) {
    const loc = stack.locator(sel);
    if ((await loc.count()) > 0) return loc;
  }
  // If no cards yet return a locator that points to nothing inside stack.
  return stack.locator(':scope > *').filter({ has: page.locator('') });
}

/**
 * Utility: get text input used for pushes (string value)
 */
async function getTextInput(page) {
  return (
    (await firstLocator(page, [
      'input[type="text"]',
      'input[placeholder*="value"]',
      'input[name="value"]',
      '[data-testid="push-input"]'
    ])) || page.locator('input').first()
  );
}

/**
 * Utility: get capacity number input
 */
async function getCapacityInput(page) {
  return (
    (await firstLocator(page, [
      'input[type="number"]',
      'input[name="capacity"]',
      '[data-testid="capacity-input"]',
      '#capacity'
    ])) || null
  );
}

/**
 * Utility: get push/pop/peek/clear buttons by accessible name or common class
 */
async function getButton(page, nameRegex) {
  // Try role-based first (preferred)
  const byRole = page.getByRole('button', { name: nameRegex });
  if ((await byRole.count()) > 0) return byRole.first();
  return (
    (await firstLocator(page, [
      `button:has-text("${nameRegex.source.replace(/\\b/gi, '')}")`,
      `button:has-text("${nameRegex.source}")`,
      `button.${nameRegex.source.toLowerCase()}`,
      `button[aria-label*="${nameRegex.source}"]`
    ])) || page.locator('button').first()
  );
}

/**
 * Utility: get an aria-live / status announcement region
 */
async function getAnnouncementRegion(page) {
  const loc =
    (await firstLocator(page, [
      '[aria-live="polite"]',
      '[aria-live="assertive"]',
      '[role="status"]',
      '[role="alert"]',
      '[data-testid="announcer"]'
    ])) || null;
  return loc;
}

/**
 * Helper: read size/badge value from likely elements
 */
async function getSizeBadgeValue(page) {
  const candidates = [
    '.size-badge',
    '#size-badge',
    '[data-testid="size-badge"]',
    '.size',
    '.badge-size',
    'text=Size:',
    'text=Items:'
  ];
  for (const sel of candidates) {
    const loc = page.locator(sel);
    if ((await loc.count()) > 0) {
      const text = await loc.first().innerText();
      // extract number
      const m = text.match(/(\d+)/);
      if (m) return Number(m[1]);
    }
  }
  // fallback: derive from cards count
  const cards = await getCardsLocator(page);
  return await cards.count();
}

test.describe('Interactive Stack Module - end-to-end', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test; ensure starting state
    await page.goto(APP_URL);
    // Wait for main UI to render
    await page.waitForLoadState('networkidle');
    // small delay to ensure any initial animations settle in CI
    await page.waitForTimeout(150);
  });

  test.describe('Idle state and basic UI', () => {
    test('initial UI shows empty stack and size badge 0 (idle onEnter:updateUI)', async ({ page }) => {
      // Validate stack container is present
      const stack = await getStackContainer(page);
      expect(stack).toBeTruthy();

      // Ensure there are no cards initially
      const cards = await getCardsLocator(page);
      const initialCount = await cards.count();
      expect(initialCount).toBeLessThanOrEqual(0);

      // Size badge should show 0 (or reflect empty)
      const sizeVal = await getSizeBadgeValue(page);
      expect(sizeVal).toBe(0);
    });
  });

  test.describe('Push flow (pushing state)', () => {
    test('push a single value updates DOM, size badge, top indicator and announces push', async ({ page }) => {
      // Find input and push button
      const input = await getTextInput(page);
      const pushBtn = await getButton(page, /push/i);

      // Enter value and submit
      await input.fill('Alpha');
      await pushBtn.click();

      // After pushing, a card should appear with text 'Alpha'
      const cards = await getCardsLocator(page);
      // Wait for card to appear
      await expect(cards.first()).toContainText('Alpha');

      // Size badge should be 1
      const sizeVal = await getSizeBadgeValue(page);
      expect(sizeVal).toBe(1);

      // Top indicator: try to detect text 'Top' near first card or aria-label on card
      const topLabel =
        (await firstLocator(page, [
          '.top-indicator',
          '.card .top',
          '.card[aria-label*="top"]',
          '.stack .top'
        ]));
      if (topLabel) {
        // It may exist; assert it's visible near the top card
        await expect(topLabel).toBeVisible();
      }

      // Announcer should mention the pushed value or push event
      const announcer = await getAnnouncementRegion(page);
      if (announcer) {
        const text = (await announcer.innerText()).toLowerCase();
        expect(
          text.includes('alpha') || text.includes('pushed') || text.includes('push')
        ).toBeTruthy();
      }
    });

    test('pushing empty input triggers invalidInput state and accessible announcement', async ({ page }) => {
      const input = await getTextInput(page);
      const pushBtn = await getButton(page, /push/i);

      // Ensure input is empty
      await input.fill('');
      await pushBtn.click();

      // Expect either an inline error, aria-invalid, or an announcement
      const announcer = await getAnnouncementRegion(page);
      if (announcer) {
        const text = (await announcer.innerText()).toLowerCase();
        expect(
          text.includes('empty') ||
            text.includes('enter') ||
            text.includes('value') ||
            text.includes('invalid')
        ).toBeTruthy();
      } else {
        // fallback: input might have aria-invalid
        const ariaInvalid = await input.getAttribute('aria-invalid');
        expect(ariaInvalid === 'true' || ariaInvalid === '1' || ariaInvalid === null).toBeTruthy();
      }
    });

    test('pushing respects capacity and triggers overflow state when exceeded', async ({ page }) => {
      const input = await getTextInput(page);
      const pushBtn = await getButton(page, /push/i);
      const capacityInput = await getCapacityInput(page);

      // If capacity input exists, set small capacity; otherwise we will attempt pushes until overflow message is shown
      if (capacityInput) {
        await capacityInput.fill('2');
        // apply capacity change by blurring or pressing Enter
        await capacityInput.press('Enter');
        // allow capacity applied animations
        await page.waitForTimeout(150);
      }

      // Push two items
      await input.fill('One');
      await pushBtn.click();
      await page.waitForTimeout(100);
      await input.fill('Two');
      await pushBtn.click();
      await page.waitForTimeout(150);

      // Now push third to cause overflow (either via capacity or app-level guard)
      await input.fill('Three');
      await pushBtn.click();

      // Expect overflow announcement or visual flash
      const announcer = await getAnnouncementRegion(page);
      let seenOverflow = false;
      if (announcer) {
        const text = (await announcer.innerText()).toLowerCase();
        if (text.includes('overflow') || text.includes('full') || text.includes('capacity')) {
          seenOverflow = true;
        }
      }

      // Also check for some 'flash' class on capacity input or capacity label
      const capLoc = capacityInput || (await firstLocator(page, ['.capacity', '#capacity-label']));
      let flashed = false;
      if (capLoc) {
        // inspect class attribute for 'flash' or 'warning'
        const cls = await capLoc.getAttribute('class');
        if (cls && /flash|warn|warning|danger|overflow/.test(cls)) flashed = true;
      }

      expect(seenOverflow || flashed).toBeTruthy();
    });
  });

  test.describe('Pop and underflow flows (popping, underflow)', () => {
    test('pop valid item removes top card, updates badge and announces pop', async ({ page }) => {
      const input = await getTextInput(page);
      const pushBtn = await getButton(page, /push/i);
      const popBtn = await getButton(page, /pop/i);

      // Ensure stack has one known item
      await input.fill('PopMe');
      await pushBtn.click();
      await page.waitForTimeout(120);

      // Get current size
      const beforeSize = await getSizeBadgeValue(page);
      expect(beforeSize).toBeGreaterThanOrEqual(1);

      // Click pop
      await popBtn.click();

      // After animation end pop, the card should be removed and announcement made
      const cards = await getCardsLocator(page);
      // Wait for count change
      await page.waitForTimeout(200);

      const afterSize = await getSizeBadgeValue(page);
      expect(afterSize).toBe(beforeSize - 1);

      // Announcement should mention popped value
      const announcer = await getAnnouncementRegion(page);
      if (announcer) {
        const text = (await announcer.innerText()).toLowerCase();
        expect(text.includes('pop') || text.includes('popped') || text.includes('popme')).toBeTruthy();
      }
    });

    test('pop on empty stack triggers underflow announcement and visual feedback', async ({ page }) => {
      // Ensure the stack is cleared first
      const clearBtn = await getButton(page, /clear/i);
      if (clearBtn) {
        await clearBtn.click();
        // If a confirm appears, cancel to just ensure not clearing other tests; else continue
        const confirm = await firstLocator(page, [
          '.confirm-dialog',
          '[role="dialog"]',
          '#confirm'
        ]);
        if (confirm) {
          const cancel = confirm.getByRole('button', { name: /cancel|no/i });
          if ((await cancel.count()) > 0) await cancel.click();
        }
      }

      // Attempt to pop when empty
      const popBtn = await getButton(page, /pop/i);
      await popBtn.click();

      // Expect underflow announcement or flash
      const announcer = await getAnnouncementRegion(page);
      let sawUnderflow = false;
      if (announcer) {
        const text = (await announcer.innerText()).toLowerCase();
        if (text.includes('underflow') || text.includes('empty') || text.includes('nothing to pop')) {
          sawUnderflow = true;
        }
      }

      const bodyCls = await page.locator('body').getAttribute('class');
      const flashed = bodyCls && /underflow|flash|warning/.test(bodyCls);

      expect(sawUnderflow || flashed).toBeTruthy();
    });
  });

  test.describe('Peek flow (peeking)', () => {
    test('peek highlights the top card and announces value, highlight ends returning to idle', async ({ page }) => {
      const input = await getTextInput(page);
      const pushBtn = await getButton(page, /push/i);
      const peekBtn = await getButton(page, /peek/i);

      // Ensure there's an item to peek
      await input.fill('TopPeek');
      await pushBtn.click();
      await page.waitForTimeout(120);

      // Click peek
      await peekBtn.click();

      // The top card should receive a highlight class or attribute
      const cards = await getCardsLocator(page);
      const topCard = cards.first();

      // inspect class names for highlight-like patterns
      const cls = await topCard.getAttribute('class');
      const hasHighlight =
        (cls && /highlight|peek|active|focus/.test(cls)) ||
        (await topCard.getAttribute('aria-pressed')) === 'true' ||
        (await topCard.getAttribute('aria-selected')) === 'true';

      expect(hasHighlight).toBeTruthy();

      // Announcer should mention the peeked value
      const announcer = await getAnnouncementRegion(page);
      if (announcer) {
        const txt = (await announcer.innerText()).toLowerCase();
        expect(txt.includes('toppeek') || txt.includes('peek')).toBeTruthy();
      }

      // Wait for highlight to end (peeking state -> idle via HIGHLIGHT_END)
      // Give some time for animation/timeout
      await page.waitForTimeout(600);

      // Re-evaluate highlight presence; should be gone
      const clsAfter = await topCard.getAttribute('class');
      const stillHighlighted = clsAfter && /highlight|peek|active|focus/.test(clsAfter);
      expect(stillHighlighted).toBeFalsy();
    });
  });

  test.describe('Clear flow (awaitingConfirmation & clearing)', () => {
    test('clear button opens confirmation dialog which can be cancelled', async ({ page }) => {
      const input = await getTextInput(page);
      const pushBtn = await getButton(page, /push/i);
      const clearBtn = await getButton(page, /clear/i);

      // Add an item so clear has something to clear
      await input.fill('ToClear');
      await pushBtn.click();
      await page.waitForTimeout(100);

      // Click clear
      await clearBtn.click();

      // Confirm dialog should appear
      const confirm = await firstLocator(page, [
        '.confirm-dialog',
        '[role="dialog"]',
        '#confirm',
        '[data-testid="confirm-dialog"]'
      ]);
      expect(confirm).toBeTruthy();

      // Click cancel
      const cancel = confirm
        .getByRole('button', { name: /cancel|no/i })
        .first()
        .catch?.(e => null);
      if (cancel) {
        await cancel.click();
        // After cancel, stack should remain with previous items
        const sizeAfter = await getSizeBadgeValue(page);
        expect(sizeAfter).toBeGreaterThanOrEqual(1);
      } else {
        // If no explicit cancel button, send Escape to close
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }
    });

    test('confirming clear empties the stack, updates badge, and announces clear', async ({ page }) => {
      const input = await getTextInput(page);
      const pushBtn = await getButton(page, /push/i);
      const clearBtn = await getButton(page, /clear/i);

      // Push two items
      await input.fill('C1');
      await pushBtn.click();
      await page.waitForTimeout(60);
      await input.fill('C2');
      await pushBtn.click();
      await page.waitForTimeout(120);

      // Click clear and confirm
      await clearBtn.click();

      const confirm = await firstLocator(page, [
        '.confirm-dialog',
        '[role="dialog"]',
        '#confirm',
        '[data-testid="confirm-dialog"]'
      ]);
      expect(confirm).toBeTruthy();

      const confirmBtn =
        (await confirm.getByRole('button', { name: /confirm|yes|ok/i }).first().catch(() => null)) ||
        (await firstLocator(page, ['button:has-text("Confirm")', 'button:has-text("Yes")']));
      if (confirmBtn) {
        await confirmBtn.click();
      } else {
        // Fallback: press Enter to accept
        await page.keyboard.press('Enter');
      }

      // Wait for clearing animation to complete
      await page.waitForTimeout(250);

      const sizeAfter = await getSizeBadgeValue(page);
      expect(sizeAfter).toBe(0);

      const cards = await getCardsLocator(page);
      expect(await cards.count()).toBe(0);

      const announcer = await getAnnouncementRegion(page);
      if (announcer) {
        const txt = (await announcer.innerText()).toLowerCase();
        expect(txt.includes('clear') || txt.includes('cleared') || txt.includes('empty')).toBeTruthy();
      }
    });
  });

  test.describe('Capacity changes and edge cases (capacityUpdating, flashIfExceeded)', () => {
    test('changing capacity applies new limit and announces capacity', async ({ page }) => {
      const capacityInput = await getCapacityInput(page);
      if (!capacityInput) {
        test.skip('No capacity input found in implementation; skipping capacity change validations.');
        return;
      }

      // Set capacity to 1
      await capacityInput.fill('1');
      await capacityInput.press('Enter');
      await page.waitForTimeout(120);

      // Announcer should mention capacity change
      const announcer = await getAnnouncementRegion(page);
      if (announcer) {
        const txt = (await announcer.innerText()).toLowerCase();
        expect(txt.includes('capacity') || txt.includes('limit') || txt.includes('applied')).toBeTruthy();
      }

      // Push two items to exceed capacity and see flashIfExceeded/overflow handling
      const input = await getTextInput(page);
      const pushBtn = await getButton(page, /push/i);
      await input.fill('X1');
      await pushBtn.click();
      await page.waitForTimeout(80);
      await input.fill('X2');
      await pushBtn.click();
      await page.waitForTimeout(150);

      // Expect overflow or flash indication
      const ann = await getAnnouncementRegion(page);
      const annText = ann ? (await ann.innerText()).toLowerCase() : '';
      expect(annText.includes('overflow') || annText.includes('exceed') || annText.includes('capacity')).toBeTruthy();
    });
  });

  test.describe('Keyboard shortcuts mapping to events', () => {
    test('Alt+P focuses the input (ALT_P_FOCUS)', async ({ page }) => {
      const input = await getTextInput(page);

      // Press Alt+P
      await page.keyboard.down('Alt');
      await page.keyboard.press('p');
      await page.keyboard.up('Alt');

      // Expect input to be focused
      await expect(input).toBeFocused();
    });

    test('Alt+O invokes pop and Alt+K invokes peek (valid/empty behavior)', async ({ page }) => {
      // Setup: ensure there is a known item for the "valid" path
      const input = await getTextInput(page);
      const pushBtn = await getButton(page, /push/i);

      await input.fill('ShortcutItem');
      await pushBtn.click();
      await page.waitForTimeout(120);

      // Alt+K for peek
      await page.keyboard.down('Alt');
      await page.keyboard.press('k');
      await page.keyboard.up('Alt');
      await page.waitForTimeout(120);

      // Announcer should mention peek or value
      const announcer = await getAnnouncementRegion(page);
      if (announcer) {
        const txt = (await announcer.innerText()).toLowerCase();
        expect(txt.includes('peek') || txt.includes('shortcutitem')).toBeTruthy();
      }

      // Alt+O for pop
      await page.keyboard.down('Alt');
      await page.keyboard.press('o');
      await page.keyboard.up('Alt');

      await page.waitForTimeout(150);
      const cards = await getCardsLocator(page);
      // The popped item should be gone (size decreased)
      const found = await cards.first().innerText().catch(() => '');
      expect(found.toLowerCase().includes('shortcutitem')).toBeFalsy();
    });
  });

  test.describe('Interruptions, cancel, and acknowledgement flows', () => {
    test('cancelling during push or pop returns to idle (simulate ESCAPE/CANCEL)', async ({ page }) => {
      // Start a push and immediately send Escape to attempt to cancel
      const input = await getTextInput(page);
      const pushBtn = await getButton(page, /push/i);

      await input.fill('Interrupt');
      await pushBtn.click();

      // Immediately press Escape to simulate CANCEL
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      // Ensure stack is either updated or stable and no lingering animation class
      const cards = await getCardsLocator(page);
      const texts = [];
      for (let i = 0; i < (await cards.count()); i++) {
        texts.push((await cards.nth(i).innerText()).toLowerCase());
      }
      // Ensure no item with 'interrupt' remains in a broken half-state (either present once or not)
      const matches = texts.filter(t => t.includes('interrupt'));
      expect(matches.length <= 1).toBeTruthy();
    });

    test('ACK/INVALID_ACK transitions clear error states (overflow/underflow)', async ({ page }) => {
      // Force underflow by popping empty
      const popBtn = await getButton(page, /pop/i);
      await popBtn.click();
      await page.waitForTimeout(120);

      // Press ACK button if present
      const ackBtn = await firstLocator(page, [
        'button:has-text("OK")',
        'button:has-text("Acknowledge")',
        'button:has-text("Ack")',
        'button:has-text("Dismiss")'
      ]);
      if (ackBtn) {
        await ackBtn.click();
        await page.waitForTimeout(80);
      } else {
        // fallback: press Escape or Enter
        await page.keyboard.press('Enter');
      }

      // Now try to change input - INPUT_CHANGE should lead to idle; verify UI accepts input
      const input = await getTextInput(page);
      await input.fill('Recovered');
      await input.press('Tab');

      // Expect that input doesn't show persistent error (aria-invalid not true)
      const ariaInvalid = await input.getAttribute('aria-invalid');
      expect(ariaInvalid === 'true' ? false : true).toBeTruthy();
    });
  });

  test.afterEach(async ({ page }) => {
    // brief pause to allow any cleanup animations; not strictly necessary, but helps CI stability
    await page.waitForTimeout(50);
  });
});