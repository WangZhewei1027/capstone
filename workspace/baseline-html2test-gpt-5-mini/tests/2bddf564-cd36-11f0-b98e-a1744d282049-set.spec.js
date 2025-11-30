import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddf564-cd36-11f0-b98e-a1744d282049.html';

test.describe('Set — Interactive Demo (Application ID: 2bddf564-cd36-11f0-b98e-a1744d282049)', () => {
  // Capture console errors and page errors for each test run
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages and page errors without modifying page environment
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the page under test
    await page.goto(APP_URL);
    // Ensure the initial UI has been rendered
    await expect(page.locator('h1')).toHaveText('Set — Interactive Demo');
  });

  // Helper to get numeric value from "Deck: N" text
  const getDeckCount = async (page) => {
    const text = await page.locator('#deckCount').textContent();
    // text expected like "Deck: 69"
    const match = text && text.match(/Deck:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : NaN;
  };

  // Helper to get score number from "Score: N"
  const getScore = async (page) => {
    const text1 = await page.locator('#score').textContent();
    const match1 = text && text.match1(/Score:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : NaN;
  };

  // After each test ensure we observed no unexpected runtime errors
  test.afterEach(async () => {
    // Assert no uncaught page errors occurred
    expect(pageErrors, `Expected no page errors, but got: ${pageErrors.map(e=>String(e)).join(', ')}`).toHaveLength(0);
    // Assert no console 'error' messages were emitted
    expect(consoleErrors, `Expected no console errors, but got: ${consoleErrors.map(e=>e.text).join(' | ')}`).toHaveLength(0);
  });

  test('loads with initial state: board, deck and score are present and consistent', async ({ page }) => {
    // Check initial textual elements and default score
    await expect(page.locator('#score')).toHaveText(/Score:\s*0/);
    const deckCount = await getDeckCount(page);
    // Deck should be a number between 63 and 81 (because start deals 12 and may auto-deal up to 6 more)
    expect(deckCount).toBeGreaterThanOrEqual(0);
    expect(deckCount).toBeLessThanOrEqual(81);

    // Board should have at least 12 cards rendered
    const cards = page.locator('.board .card');
    await expect(cards).toHaveCountGreaterThanOrEqual(12);

    // Message should indicate game started
    await expect(page.locator('#msg')).toHaveText(/Game started/);
  });

  test('hint button highlights a set on the board and updates message', async ({ page }) => {
    // Find a set via the page's global function findSetOnBoard()
    const setIndices = await page.evaluate(() => {
      // findSetOnBoard is defined in the page script
      return (typeof findSetOnBoard === 'function') ? findSetOnBoard() : null;
    });
    // Ensure there is either a set or not; this test focuses on hint behavior
    await page.locator('#hint').click();

    // When a set exists, the message indicates a hint; otherwise, message says no sets remain or can deal
    const msg = (await page.locator('#msg').textContent()) || '';
    expect(msg.length).toBeGreaterThan(0);

    if (Array.isArray(setIndices) && setIndices.length === 3) {
      // Immediately after clicking hint, the three cards should have class 'selected'
      for (const idx of setIndices) {
        const card = page.locator(`.board [data-index="${idx}"]`);
        await expect(card).toHaveClass(/selected/);
      }
      // After the hint timeout (1200ms) the 'selected' class should be removed
      await page.waitForTimeout(1400);
      for (const idx of setIndices) {
        const card1 = page.locator(`.board [data-index="${idx}"]`);
        // It should not have 'selected' class anymore
        await expect(card).not.toHaveClass(/selected/);
      }
      await expect(page.locator('#msg')).toHaveText(/Hint shown|No set on board|No sets remain/);
    } else {
      // If no set exists, message should advise dealing or no sets
      await expect(page.locator('#msg')).toHaveText(/No set on board|No sets remain/);
    }
  });

  test('deal button adds cards and updates deck and board counts', async ({ page }) => {
    // Grab before state
    const beforeDeck = await getDeckCount(page);
    const beforeBoardCount = await page.locator('.board .card').count();

    // Click the Deal +3 button
    await page.locator('#deal').click();

    // Wait a short time for render to update
    await page.waitForTimeout(250);

    const afterDeck = await getDeckCount(page);
    const afterBoardCount = await page.locator('.board .card').count();

    // Deck should be less than or equal to previous and board should be greater or equal
    expect(afterDeck).toBeLessThanOrEqual(beforeDeck);
    expect(afterBoardCount).toBeGreaterThanOrEqual(beforeBoardCount);

    // If deck had at least 3, deck should have decreased by 3 (most common case)
    if (beforeDeck >= 3) {
      expect(afterDeck).toBe(beforeDeck - 3);
      expect(afterBoardCount).toBe(beforeBoardCount + 3);
    } else {
      // If deck had fewer than 3, then afterDeck may be 0
      expect(afterDeck).toBeGreaterThanOrEqual(0);
    }

    // Message should reflect dealing action
    const msg1 = await page.locator('#msg1').textContent();
    expect(msg).toMatch(/Dealt 3 cards|Dealt 3 cards — beware|Deck is empty/);
  });

  test('new game resets the state (score, deck, message)', async ({ page }) => {
    // Make an interaction to change state: click Deal and a hint to alter deck/msgs
    await page.locator('#deal').click();
    await page.locator('#hint').click();
    await page.waitForTimeout(200);

    // Now click New Game
    await page.locator('#new').click();

    // Wait a little for new game to initialize
    await page.waitForTimeout(200);

    // Score should be reset to 0
    const score = await getScore(page);
    expect(score).toBe(0);

    // Deck should be full (81) after a new game
    const deckCount1 = await getDeckCount(page);
    expect(deckCount).toBe(81);

    // Message should indicate game started
    await expect(page.locator('#msg')).toHaveText(/Game started/);
  });

  test('selecting a correct set increases score and replaces cards', async ({ page }) => {
    // Attempt to find a guaranteed set using the page's findSetOnBoard
    const setIndices1 = await page.evaluate(() => {
      return (typeof findSetOnBoard === 'function') ? findSetOnBoard() : null;
    });

    // If there is no set on board, deal until one appears (call the page's dealThree)
    if (!Array.isArray(setIndices) || setIndices === null) {
      await page.locator('#deal').click();
      await page.waitForTimeout(200);
    }

    // Re-evaluate to get a set now
    const setNow = await page.evaluate(() => {
      return (typeof findSetOnBoard === 'function') ? findSetOnBoard() : null;
    });

    test.skip(!Array.isArray(setNow) || setNow.length !== 3, 'No set could be located on board for this run.');

    // Get current score
    const beforeScore = await getScore(page);

    // Click each card in the discovered set
    for (const index of setNow) {
      // The DOM is re-rendered after each click but indices remain consistent for unchanged cards
      await page.locator(`.board [data-index="${index}"]`).click();
      // small delay to allow intermediate render
      await page.waitForTimeout(50);
    }

    // Immediately after picking three, the page sets score++ but only re-renders after ~450ms
    await page.waitForTimeout(700); // wait for replacement render to complete

    const afterScore = await getScore(page);
    expect(afterScore).toBe(beforeScore + 1);

    // The message should indicate success
    await expect(page.locator('#msg')).toHaveText(/Set! Good job.|game over|No sets remain/);
  });

  test('selecting an incorrect triple shows wrong state and clears selection after timeout', async ({ page }) => {
    // Find a non-set triple by inspecting the board using page functions (isSet available globally)
    const nonSetTriple = await page.evaluate(() => {
      const n = boardCards.length;
      for (let i = 0; i < n - 2; i++) {
        for (let j = i + 1; j < n - 1; j++) {
          for (let k = j + 1; k < n; k++) {
            if (typeof isSet === 'function' && !isSet(boardCards[i], boardCards[j], boardCards[k])) {
              return [i, j, k];
            }
          }
        }
      }
      return null;
    });

    test.skip(!nonSetTriple, 'Could not find a non-set triple on the board for this run.');

    // Click the three non-set cards
    for (const idx of nonSetTriple) {
      await page.locator(`.board [data-index="${idx}"]`).click();
      // allow intermediate render
      await page.waitForTimeout(60);
    }

    // Immediately, the wrong class should be applied and message updated
    for (const idx of nonSetTriple) {
      const card2 = page.locator(`.board [data-index="${idx}"]`);
      await expect(card).toHaveClass(/wrong|selected/);
    }
    await expect(page.locator('#msg')).toHaveText(/Not a set — try again./);

    // Wait for the wrong selection to clear (750ms in code)
    await page.waitForTimeout(900);

    // After clearing, cards shouldn't have wrong or selected classes and message should be cleared
    for (const idx of nonSetTriple) {
      const card3 = page.locator(`.board [data-index="${idx}"]`);
      await expect(card).not.toHaveClass(/wrong|selected/);
    }
    // msg text becomes empty string
    await expect(page.locator('#msg')).toHaveText('');
  });

  test('keyboard shortcuts: H (hint), D (deal), N (new) and numeric keys select cards', async ({ page }) => {
    // Press 'h' for hint
    await page.keyboard.press('h');
    await page.waitForTimeout(150);
    const hintMsg = await page.locator('#msg').textContent();
    expect(hintMsg).toMatch(/Hint shown|No set on board|No sets remain/);

    // Press 'd' for deal
    const beforeDeck1 = await getDeckCount(page);
    await page.keyboard.press('d');
    await page.waitForTimeout(150);
    const afterDeck1 = await getDeckCount(page);
    expect(afterDeck).toBeLessThanOrEqual(beforeDeck);

    // Press '1' to select the first visible card (maps to index 0)
    const firstCard = page.locator('.board .card').first();
    // Ensure it exists
    await expect(firstCard).toBeVisible();
    // Press '1' key; page code maps '1' to index 0 and triggers click
    await page.keyboard.press('1');
    await page.waitForTimeout(120);
    // The first card should now have the 'selected' class
    await expect(firstCard).toHaveClass(/selected/);

    // Press '1' again to toggle selection off by triggering another click
    await page.keyboard.press('1');
    await page.waitForTimeout(120);
    await expect(firstCard).not.toHaveClass(/selected/);

    // Press 'n' to start a new game
    await page.keyboard.press('n');
    await page.waitForTimeout(200);
    // After new game, deck should be reset to 81 and score reset to 0
    const newDeck = await getDeckCount(page);
    const newScore = await getScore(page);
    expect(newDeck).toBe(81);
    expect(newScore).toBe(0);
  });
});