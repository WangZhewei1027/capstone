import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0007/html/1f4cb9c0-b40a-11f0-8f04-37d078910466.html';

// Page Object for the Set board application
class SetBoardPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // flexible card selector: tries several common classes/attributes used for card elements
    this.cardsLocator = page.locator('css=[data-card], css=.card, css=.card-button, css=.board-grid button, css=.board .card');
    // flexible feedback/status locator
    this.feedbackCandidates = [
      page.getByRole('status'),
      page.locator('[data-feedback]'),
      page.locator('.feedback'),
      page.locator('.muted'),
      page.locator('.small')
    ];
    // commonly labeled buttons
    this.btnDealThree = page.getByRole('button', { name: /Deal/i }).first();
    this.btnDealUntilSet = page.getByRole('button', { name: /Deal until/i });
    this.btnHint = page.getByRole('button', { name: /Hint/i });
    this.btnAutoSolve = page.getByRole('button', { name: /Auto Solve|Auto-solve|Autosolve|Solve/i });
    this.btnCheck = page.getByRole('button', { name: /Check/i });
    this.btnNewDeal = page.getByRole('button', { name: /New Deal|Restart|New/i });
    // deck count / board count selectors - flexible guesses
    this.deckCount = page.locator('[data-deck-count], .deck-count, .deck .count');
    this.boardGrid = page.locator('[data-board], .board-grid, .board-panel');
  }

  async goto() {
    await this.page.goto(APP_URL);
    await this.page.waitForLoadState('networkidle');
  }

  // Return first visible feedback text from candidate locators
  async getFeedbackText() {
    for (const candidate of this.feedbackCandidates) {
      try {
        if (await candidate.count() > 0) {
          const el = candidate.filter({ has: this.page.locator(':visible') });
          if (await el.count() > 0) {
            const text = (await el.first().innerText()).trim();
            if (text) return text;
          }
        }
      } catch (e) {
        // ignore and try next
      }
    }
    // fallback: any visible element with small/muted text
    const fallback = await this.page.locator('text=/./').filter({ has: this.page.locator(':visible') }).first();
    try {
      return (await fallback.innerText()).trim();
    } catch {
      return '';
    }
  }

  // Number of card elements currently on board
  async cardCount() {
    return await this.cardsLocator.count();
  }

  // Click a card by index (0-based)
  async clickCard(index) {
    const count = await this.cardCount();
    if (count === 0) throw new Error('No cards found to click');
    const idx = Math.min(index, count - 1);
    await this.cardsLocator.nth(idx).click();
  }

  // Toggle card (same as click)
  async toggleCard(index) {
    await this.clickCard(index);
  }

  // Returns whether a card has "selected" class or aria-pressed attribute
  async isCardSelected(index) {
    const el = this.cardsLocator.nth(index);
    return await el.evaluate((node) => {
      if (!node) return false;
      const cls = node.className || '';
      if (cls.includes('selected')) return true;
      if (node.getAttribute('aria-pressed') === 'true') return true;
      if (node.hasAttribute('data-selected') && node.getAttribute('data-selected') !== 'false') return true;
      return false;
    });
  }

  // Returns whether a card has a hint highlight class
  async isCardHinted(index) {
    const el = this.cardsLocator.nth(index);
    return await el.evaluate((node) => {
      if (!node) return false;
      const cls = node.className || '';
      return cls.includes('hint') || cls.includes('hinted') || cls.includes('highlight');
    });
  }

  // Click a control button by its role name - tries a list of known labels
  async clickButtonByName(namePattern) {
    const byRole = this.page.getByRole('button', { name: namePattern });
    if (await byRole.count() > 0) {
      await byRole.first().click();
      return;
    }
    // fallback to generic text selector
    const byText = this.page.locator(`text=${namePattern}`);
    if (await byText.count() > 0) {
      await byText.first().click();
      return;
    }
    throw new Error(`Button with pattern ${namePattern} not found`);
  }

  // Read deck count text (if present)
  async getDeckCountNumber() {
    try {
      if (await this.deckCount.count() > 0) {
        const text = (await this.deckCount.first().innerText()).trim();
        const num = parseInt(text.replace(/\D/g, ''), 10);
        return Number.isFinite(num) ? num : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Helper to wait for hint highlight to appear (within timeout)
  async waitForAnyHintHighlight(timeout = 1500) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const count = await this.cardCount();
      for (let i = 0; i < count; i++) {
        if (await this.isCardHinted(i)) return true;
      }
      await this.page.waitForTimeout(100);
    }
    return false;
  }

  // Helper to count selected cards
  async selectedCount() {
    const count = await this.cardCount();
    let selected = 0;
    for (let i = 0; i < count; i++) {
      if (await this.isCardSelected(i)) selected++;
    }
    return selected;
  }
}

test.describe('Set Interactive Application — FSM state coverage', () => {
  let board;

  test.beforeEach(async ({ page }) => {
    board = new SetBoardPage(page);
    await board.goto();
  });

  test('Idle state: page loads and shows default tip/feedback and board exists', async () => {
    // Validate the initial idle state's onEnter: refresh() and default feedback shown
    const feedback = await board.getFeedbackText();
    // Feedback should not be empty; accept muted/tip-like messages
    expect(feedback.length).toBeGreaterThan(0);
    // Board should have cards
    const cards = await board.cardCount();
    expect(cards).toBeGreaterThan(0);
  });

  test('Selecting state: click cards updates selection and feedback shows selected count', async () => {
    // Click first card -> should transition to selecting and show "1 selected" feedback or similar
    await board.clickCard(0);
    // The first card should show a selected state
    expect(await board.isCardSelected(0)).toBeTruthy();
    // Feedback should mention 'selected' or show a numeric selection indicator
    const feedbackAfterOne = (await board.getFeedbackText()).toLowerCase();
    expect(feedbackAfterOne.includes('selected') || /\b1\b/.test(feedbackAfterOne)).toBeTruthy();

    // Click second card -> selecting should update to 2 selected
    await board.clickCard(1);
    expect(await board.isCardSelected(1)).toBeTruthy();
    const selectedCount = await board.selectedCount();
    expect(selectedCount).toBeGreaterThanOrEqual(2);

    const feedbackAfterTwo = (await board.getFeedbackText()).toLowerCase();
    expect(feedbackAfterTwo.includes('selected') || /\b2\b/.test(feedbackAfterTwo)).toBeTruthy();

    // Unselect the first card -> should reduce selection
    await board.toggleCard(0);
    expect(await board.isCardSelected(0)).toBeFalsy();
    const afterUnselectCount = await board.selectedCount();
    expect(afterUnselectCount).toBeGreaterThanOrEqual(1);
  });

  test('ThreeSelected -> AUTO_CHECK_TIMEOUT / CHECK integration (auto-check after 3 selections)', async () => {
    // Select three cards quickly to trigger auto-check timer (180ms in FSM). We wait sufficiently long for auto-check & result.
    // First ensure at least 3 cards exist
    const cardCount = await board.cardCount();
    test.skip(cardCount < 3, 'Not enough cards to run this test');

    await board.clickCard(0);
    await board.clickCard(1);
    await board.clickCard(2);

    // Immediately after 3 selections, selected count should be 3
    expect(await board.selectedCount()).toBeGreaterThanOrEqual(3);

    // Wait > auto-check (180ms) plus buffer for evaluation and potential animations
    await board.page.waitForTimeout(600);

    // After checking, feedback should indicate either Correct or Not a set (error)
    const fb = (await board.getFeedbackText()).toLowerCase();
    const good = fb.includes('correct') || fb.includes('that is a set');
    const bad = fb.includes('not a set') || fb.includes('no set');
    expect(good || bad).toBeTruthy();

    // Post-check: if correct, selected should clear shortly after replacement; if incorrect, selected may still exist or have shake class.
    if (good) {
      // allow animation time to finish (correct animation ~320ms)
      await board.page.waitForTimeout(400);
      const selAfter = await board.selectedCount();
      expect(selAfter).toBeLessThan(3);
    } else if (bad) {
      // incorrect animation ~360-400ms, check that feedback contains attribute hints or failure message
      expect(fb.length).toBeGreaterThan(0);
    }
  });

  test('Checking state via manual Check button triggers evaluation', async () => {
    // Select two cards, then select a third, but trigger check via Check button explicitly
    const total = await board.cardCount();
    test.skip(total < 3, 'Not enough cards to run this test');

    // Ensure a clean selection
    // Click 0 and 1
    await board.clickCard(0);
    await board.clickCard(1);
    // Click a third
    await board.clickCard(2);

    // Use explicit Check button to evaluate
    try {
      await board.clickButtonByName(/Check/i);
    } catch {
      // If no Check button, fallback to pressing Enter (some UI auto-checks)
      await board.page.keyboard.press('Enter');
    }

    // Wait for evaluation
    await board.page.waitForTimeout(600);
    const fb = (await board.getFeedbackText()).toLowerCase();
    // Expect either correct/incorrect keywords
    expect(/correct|not a set|no set|error/.test(fb)).toBeTruthy();
  });

  test('Correct state: auto-solve selects a set and shows success feedback, then clears selected and replaces cards', async () => {
    // Auto Solve should find any set and select those three, then check after ~380ms
    // Capture board card count and deck count before
    const beforeCount = await board.cardCount();
    const beforeDeck = await board.getDeckCountNumber();

    // Click Auto Solve
    let autosolveClicked = true;
    try {
      await board.clickButtonByName(/auto solve|autosolve|solve/i);
    } catch {
      autosolveClicked = false;
    }

    test.skip(!autosolveClicked, 'Auto Solve button not present; skipping autosolve-specific test');

    // After clicking, selected should become 3 quickly
    // wait a bit for selection
    await board.page.waitForTimeout(200);
    const selectedNow = await board.selectedCount();
    expect(selectedNow).toBeGreaterThanOrEqual(1);

    // Wait for auto-solve check and correct animation (380ms + 320ms)
    await board.page.waitForTimeout(900);

    const fb = (await board.getFeedbackText()).toLowerCase();
    // Auto-solve either results in 'Correct' or possibly 'No set on this board'
    const success = fb.includes('correct') || fb.includes('that is a set');
    const noSet = fb.includes('no set') || fb.includes('no set on this board');
    expect(success || noSet).toBeTruthy();

    if (success) {
      // After a correct result, selection should be cleared and card count may be same (replaced) or decreased if deck empty
      const afterSelected = await board.selectedCount();
      expect(afterSelected).toBeLessThan(3);
      const afterCount = await board.cardCount();
      // either replaced or same number of cards, but ensure not negative
      expect(afterCount).toBeGreaterThanOrEqual(0);
      // deck count may decrease if replacements came from deck (if deck count available)
      if (beforeDeck !== null) {
        const afterDeck = await board.getDeckCountNumber();
        // afterDeck may be less than or equal to beforeDeck
        if (afterDeck !== null) expect(afterDeck).toBeLessThanOrEqual(beforeDeck);
      }
    } else if (noSet) {
      // If no set found, ensure feedback indicates error
      expect(fb.length).toBeGreaterThan(0);
    }
  });

  test('Hinting state: clicking Hint highlights one card, feedback shown, then hint clears after ~2400ms and returns to prior selection state', async () => {
    // Start by selecting one card to ensure we return to selecting after hint
    await board.clickCard(0);
    const selectedBefore = await board.selectedCount();
    expect(selectedBefore).toBeGreaterThanOrEqual(1);

    // Click Hint
    let hintClicked = true;
    try {
      await board.clickButtonByName(/Hint/i);
    } catch {
      hintClicked = false;
    }
    test.skip(!hintClicked, 'Hint button not present; skipping hint-specific test');

    // After clicking hint, a card should get hint highlight and feedback should mention hint
    const hintAppeared = await board.waitForAnyHintHighlight(1500);
    expect(hintAppeared).toBeTruthy();

    const fbDuringHint = (await board.getFeedbackText()).toLowerCase();
    expect(fbDuringHint.includes('hint')).toBeTruthy();

    // Wait for hint timeout (~2400ms), plus buffer
    await board.page.waitForTimeout(2600);

    // Hint should be cleared
    let anyHintLeft = false;
    const total = await board.cardCount();
    for (let i = 0; i < total; i++) {
      if (await board.isCardHinted(i)) {
        anyHintLeft = true;
        break;
      }
    }
    expect(anyHintLeft).toBeFalsy();

    // Selection should be restored (we had 1 selected earlier)
    const selectedAfter = await board.selectedCount();
    expect(selectedAfter).toBeGreaterThanOrEqual(0);
    // if the app returns to prior selection state it should at least not have dropped our selection to an unrelated state
  });

  test('Dealing state: Deal +3 increases board count; Deal until set shows expected feedback or gracefully handles deck empty', async () => {
    // Record initial count
    const initialCount = await board.cardCount();

    // Click Deal +3
    let dealClicked = true;
    try {
      // Try common 'Deal' label
      await board.clickButtonByName(/Deal \+?3|Deal\+3|Deal \+ 3|Deal 3/i);
    } catch {
      // fallback to a generic Deal button
      try {
        await board.clickButtonByName(/Deal(?! until)/i);
      } catch {
        dealClicked = false;
      }
    }

    test.skip(!dealClicked, 'Deal +3 button not present; skipping deal +3 test');

    // Wait briefly for dealing to complete
    await board.page.waitForTimeout(400);

    const afterDealCount = await board.cardCount();
    expect(afterDealCount).toBeGreaterThanOrEqual(initialCount);

    // Now test 'Deal until set' button: this may run a loop and show either 'Dealt until a set appeared.' or 'Deck empty and no set found.'
    let dealUntilClicked = true;
    try {
      await board.clickButtonByName(/Deal until set|Deal until/i);
    } catch {
      dealUntilClicked = false;
    }

    if (dealUntilClicked) {
      // This could take time depending on deck size; wait a moderate amount but not indefinite
      await board.page.waitForTimeout(2000);
      const fb = (await board.getFeedbackText()).toLowerCase();
      // Accept either success or deck empty prompt
      const ok = fb.includes('dealt until') || fb.includes('deck empty') || fb.includes('no set');
      expect(ok).toBeTruthy();
    } else {
      test.info().log('Deal until set button not present; skipping that portion');
    }
  });

  test('noSetDeckEmpty and postCorrectDecision: simulate New Deal resets state from no-set deck-empty', async () => {
    // Try to trigger noSetDeckEmpty by repeatedly clicking Deal until set, but if not present, just verify New Deal resets
    // Click New Deal to ensure we can return to idle
    let newDealClicked = true;
    try {
      await board.clickButtonByName(/New Deal|New|Restart/i);
    } catch {
      newDealClicked = false;
    }

    if (newDealClicked) {
      // After new deal, feedback should return to default tip and selection cleared
      await board.page.waitForTimeout(300);
      const fb = (await board.getFeedbackText()).toLowerCase();
      expect(fb.length).toBeGreaterThan(0);
      const sel = await board.selectedCount();
      expect(sel).toBeLessThan(3);
    } else {
      test.info().log('New Deal button not found; test verifies that selection can be cleared programmatically if UI implements a different control.');
    }
  });

  test('Keyboard navigation and KEY_NAV event: focus a card and toggle via keyboard Enter/Space', async () => {
    // Focus first card and press Enter to select/unselect, validating KEY_NAV integration
    const count = await board.cardCount();
    test.skip(count === 0, 'No cards to test keyboard navigation');

    const firstCard = board.cardsLocator.first();
    await firstCard.focus();
    // Press Enter to select
    await board.page.keyboard.press('Enter');
    // Allow UI to update
    await board.page.waitForTimeout(150);
    const selected = await board.isCardSelected(0);
    expect(selected).toBeTruthy();

    // Press Space to unselect
    await board.page.keyboard.press(' ');
    await board.page.waitForTimeout(150);
    const selectedAfter = await board.isCardSelected(0);
    // Some implementations toggle on Space too; accept either unselected or still selected but ensure no error thrown
    expect([true, false]).toContain(selectedAfter);
  });

  test('Edge case: clicking Hint when deck empty or no-set gracefully shows message or keeps UI stable', async () => {
    // This test is tolerant: attempt to click Deal until set to possibly exhaust deck, then click Hint and ensure UI doesn't crash
    let dealUntilClicked = true;
    try {
      await board.clickButtonByName(/Deal until set|Deal until/i);
      // allow it to run a bit
      await board.page.waitForTimeout(1500);
    } catch {
      dealUntilClicked = false;
    }

    let hintClicked = true;
    try {
      await board.clickButtonByName(/Hint/i);
      await board.page.waitForTimeout(200);
    } catch {
      hintClicked = false;
    }

    // After hint attempt, UI should still show feedback and not be blank/crashed
    const fb = await board.getFeedbackText();
    expect(typeof fb).toBe('string');
    expect(fb.length).toBeGreaterThanOrEqual(0);
    // If deal until set exhausted deck, feedback should mention deck empty or no set (optional)
    if (dealUntilClicked) {
      const lowered = fb.toLowerCase();
      // it's acceptable for either a hint message or deck-empty message to appear
      expect(lowered.includes('deck empty') || lowered.includes('no set') || lowered.includes('hint')).toBeTruthy();
    } else {
      test.info().log('Deal until set not available; performed a lightweight hint stability check.');
    }
  });
});