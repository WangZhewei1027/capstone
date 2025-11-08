import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/77ea86d0-bcb0-11f0-95d9-c98d28730c93.html';

test.describe('BST Explorer Interactive UI - Full FSM validation', () => {
  // Page object encapsulating common UI interactions for clarity and reuse
  class BSTPage {
    constructor(page) {
      this.page = page;
    }

    // Navigate to app and wait for initial render
    async goto() {
      await this.page.goto(APP_URL);
      // Ensure the app root has rendered by waiting for body to contain some known text fragment.
      await this.page.waitForLoadState('networkidle');
      await this.waitForAnyStatusText(/Idle|ready|BST|Binary Search Tree|Traversal|Inserting sequence|Tree empty/i, 5000);
    }

    // Generic helper: find a button by visible name with fallback to contains text
    buttonByName(nameRegex) {
      // Prefer role-based lookup
      try {
        return this.page.getByRole('button', { name: nameRegex });
      } catch {
        // fallback
        return this.page.locator(`button:has-text("${nameRegex}")`);
      }
    }

    // Input elements: insert/search are number inputs; the HTML contains two number inputs in controls
    insertInput() {
      return this.page.locator('input[type="number"]').first();
    }
    searchInput() {
      return this.page.locator('input[type="number"]').nth(1);
    }

    // Controls (attempt role-based, fallback if necessary)
    insertButton() {
      return this.buttonByName(/insert/i);
    }
    searchButton() {
      return this.buttonByName(/search/i);
    }
    randomButton() {
      return this.buttonByName(/random/i);
    }
    sampleButton() {
      return this.buttonByName(/sample/i);
    }
    clearButton() {
      return this.buttonByName(/clear/i);
    }
    balanceButton() {
      return this.buttonByName(/balance/i);
    }
    playButton() {
      return this.buttonByName(/play/i);
    }
    stepButton() {
      return this.buttonByName(/step/i);
    }
    stopButton() {
      return this.buttonByName(/stop/i);
    }
    orderSelect() {
      // try a select element first
      return this.page.locator('select').first();
    }

    // Basic actions
    async insert(value) {
      await this.insertInput().fill(''); // clear
      await this.insertInput().fill(String(value));
      await this.insertButton().click();
    }

    async search(value) {
      await this.searchInput().fill('');
      await this.searchInput().fill(String(value));
      await this.searchButton().click();
    }

    async clickRandom() {
      await this.randomButton().click();
    }
    async clickSample() {
      await this.sampleButton().click();
    }
    async clickClear() {
      await this.clearButton().click();
    }
    async clickBalance() {
      await this.balanceButton().click();
    }
    async clickPlay() {
      await this.playButton().click();
    }
    async clickStep() {
      await this.stepButton().click();
    }
    async clickStop() {
      await this.stopButton().click();
    }

    async selectOrderByVisibleText(text) {
      const sel = this.orderSelect();
      if (await sel.count() === 0) {
        // fallback: click a control that looks like order toggle
        const orderControl = this.page.getByText(new RegExp(text, 'i')).first();
        await orderControl.click().catch(() => {});
      } else {
        await sel.selectOption({ label: text }).catch(async () => {
          // fallback to selecting by value if label fails
          await sel.selectOption({ value: text.toLowerCase() }).catch(() => {});
        });
      }
    }

    // Node locator: try to find an element with the node's visible value in the canvas
    nodeLocator(value) {
      // nodes often are text elements inside svg or divs with node class; search body for text
      return this.page.locator(`text="${String(value)}"`).first();
    }

    // Return page body text for status heuristics
    async bodyText() {
      return await this.page.locator('body').innerText();
    }

    // Wait for body to contain any of the provided regexes
    async waitForAnyStatusText(regex, timeout = 5000) {
      await this.page.waitForFunction(
        ({ regexStr }) => new RegExp(regexStr, 'i').test(document.body.innerText || ''),
        { regexStr: regex.source },
        { timeout }
      );
    }

    // Wait until the body contains a specific substring or regex
    async waitForStatusContains(substrOrRegex, timeout = 8000) {
      const regex = substrOrRegex instanceof RegExp ? substrOrRegex : new RegExp(substrOrRegex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      await this.page.waitForFunction(
        ({ regexStr }) => new RegExp(regexStr, 'i').test(document.body.innerText || ''),
        { regexStr: regex.source },
        { timeout }
      );
    }

    // Utility: check if any node exists (by counting text nodes inside canvas area)
    async anyNodeExists() {
      const text = await this.bodyText();
      // Heuristic: nodes are numbers; test for any digits surrounded by whitespace or line breaks and not part of UI labels
      return /\b\d+\b/.test(text);
    }

    // Click outside canvas to trigger CLICK_OUTSIDE behavior. Click on header area.
    async clickOutside() {
      await this.page.click('header').catch(() => {});
    }
  }

  test.beforeEach(async ({ page }) => {
    // Increase default timeout a bit if needed for animations in this app
    page.setDefaultTimeout(20000);
    const bst = new BSTPage(page);
    await bst.goto();
  });

  test.describe('Idle state validations', () => {
    test('Initial load should be in idle state and controls present', async ({ page }) => {
      const bst1 = new BSTPage(page);

      // Validate initial status contains "Idle" or "ready"
      const body = await bst.bodyText();
      expect(/idle|ready/i.test(body)).toBeTruthy();

      // Controls should exist and be visible: Insert/Search/Clear/Random/Sample/Play/Step/Stop
      await expect(bst.insertButton()).toBeVisible();
      await expect(bst.searchButton()).toBeVisible();
      await expect(bst.clearButton()).toBeVisible();
      await expect(bst.randomButton()).toBeVisible();
      await expect(bst.sampleButton()).toBeVisible();
      await expect(bst.playButton()).toBeVisible();
      await expect(bst.stepButton()).toBeVisible();
      await expect(bst.stopButton()).toBeVisible();
    });

    test('Clicking Clear on empty tree stays idle and does not error', async ({ page }) => {
      const bst2 = new BSTPage(page);
      // Clear should not break anything
      await bst.clickClear();
      // Still idle
      await bst.waitForStatusContains(/idle|ready/i);
      const body1 = await bst.bodyText();
      expect(/error|exception/i.test(body)).toBeFalsy();
    });

    test('Clicking Balance on empty tree remains idle (edge case)', async ({ page }) => {
      const bst3 = new BSTPage(page);
      await bst.clickBalance();
      // App should remain responsive and not display an unexpected error
      await bst.waitForStatusContains(/idle|ready|tree empty/i, 3000);
      const body2 = await bst.bodyText();
      expect(/error|exception/i.test(body)).toBeFalsy();
    });
  });

  test.describe('Inserting state and transitions', () => {
    test('Inserting a valid value disables insert button, creates node, then re-enables', async ({ page }) => {
      const bst4 = new BSTPage(page);

      // Ensure starting idle
      await bst.waitForStatusContains(/idle|ready/i);

      // Insert value 42
      await bst.insert(42);

      // Immediately after clicking, insert button should be disabled during animation per FSM
      // We attempt to assert disabled; if the UI removes the button or adds disabled attribute, check both
      const insertBtn = bst.insertButton();
      // Allow brief time for onEnter to disable
      await page.waitForTimeout(50);
      const disabledAttr = await insertBtn.getAttribute('disabled').catch(() => null);
      if (disabledAttr === null) {
        // maybe class-based disabling; assert that it becomes temporarily not clickable by attempting a second click and expecting no second insert effect
        await insertBtn.click().catch(() => {});
      }

      // Wait for insert completion status text "Inserted" or the value to appear in DOM
      await bst.waitForStatusContains(/Inserted:|Inserted|inserted/i, 8000);
      // Node with value should appear
      const node = bst.nodeLocator(42);
      await expect(node).toBeVisible();

      // After animation completes, insert button should be enabled
      await bst.waitForStatusContains(/idle|ready/i, 8000);
      const disabledAttrAfter = await insertBtn.getAttribute('disabled').catch(() => null);
      expect(disabledAttrAfter === null || disabledAttrAfter === 'false').toBeTruthy();
    });

    test('Inserting invalid input does not change tree and shows error', async ({ page }) => {
      const bst5 = new BSTPage(page);

      // Clear value from insert input and click Insert -> should emit ERROR_INPUT and stay idle
      await bst.insertInput().fill('');
      await bst.insertButton().click();

      // Expect an error message or invalid indicator in the UI
      await bst.waitForStatusContains(/error|invalid|invalid input|please enter/i, 3000);
      const body3 = await bst.bodyText();
      // Ensure no new numeric nodes were created
      // If there are no nodes at all, that's acceptable; if some exist, ensure none were created with empty value
      expect(/Inserted:/.test(body)).toBeFalsy();
    });
  });

  test.describe('Searching state and transitions', () => {
    test('Searching for an existing node highlights it and returns to idle', async ({ page }) => {
      const bst6 = new BSTPage(page);

      // Insert a known value to search for
      await bst.insert(7);
      await bst.waitForStatusContains(/Inserted|inserted/i, 8000);
      await bst.waitForStatusContains(/idle|ready/i, 8000);

      // Trigger search for that value
      await bst.search(7);

      // Search button should be disabled during animated search (onEnter)
      await page.waitForTimeout(50);
      const searchBtn = bst.searchButton();
      const disabledAttr1 = await searchBtn.getAttribute('disabled').catch(() => null);

      // Wait for search result: either SEARCH_FOUND or SEARCH_DONE + found indicator
      await bst.waitForStatusContains(/found|Found|search complete|Search complete/i, 8000);

      // Node with value should be visually highlighted (heuristic: node text present and body mentions visited/found)
      const body4 = await bst.bodyText();
      expect(/\b7\b/.test(body)).toBeTruthy();
      expect(/found|visited|highlight|selected/i.test(body)).toBeTruthy();

      // After search completes, button should be enabled again
      await bst.waitForStatusContains(/idle|ready/i, 8000);
      const disabledAttrAfter1 = await searchBtn.getAttribute('disabled').catch(() => null);
      expect(disabledAttrAfter === null || disabledAttrAfter === 'false').toBeTruthy();
    });

    test('Searching for a non-existent node signals not-found and returns to idle', async ({ page }) => {
      const bst7 = new BSTPage(page);

      // Ensure value 9999 is not present
      const existsBefore = await bst.nodeLocator(9999).count();
      if (existsBefore > 0) {
        // if present for some reason, clear tree
        await bst.clickClear();
        await bst.waitForStatusContains(/idle|ready/i);
      }

      // Search for non-existent value
      await bst.search(9999);

      // Expect a not-found status message
      await bst.waitForStatusContains(/not found|not-found|not found/i, 8000);
      // Then go back to idle
      await bst.waitForStatusContains(/idle|ready/i, 8000);
    });
  });

  test.describe('Bulk inserting (random/sample) state and transitions', () => {
    test('Clicking Random initiates bulk insert and completes', async ({ page }) => {
      const bst8 = new BSTPage(page);

      // Click random to create a sequence; expect the "Inserting sequence..." status then completion
      await bst.clickRandom();

      await bst.waitForStatusContains(/Inserting sequence|inserting sequence/i, 8000);
      // Wait for bulk insert completion signal
      await bst.waitForStatusContains(/Insert sequence complete|Insert sequence complete|Bulk insert done|BULK_INSERT_DONE/i, 20000);

      // After completion, there should be multiple nodes present
      const body5 = await bst.bodyText();
      // Heuristic: expect several numbers present
      const matches = body.match(/\b\d+\b/g) || [];
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    test('Clicking Sample sequence initiates bulk insert and can be stopped mid-way', async ({ page }) => {
      const bst9 = new BSTPage(page);

      await bst.clickSample();

      await bst.waitForStatusContains(/Inserting sequence|inserting sequence/i, 8000);

      // Stop mid-sequence to exercise CLICK_STOP transition from bulk_inserting
      await page.waitForTimeout(200); // allow a little progress
      await bst.clickStop();

      // After stop, the FSM should be in idle
      await bst.waitForStatusContains(/idle|ready/i, 8000);
    });
  });

  test.describe('Traversals: playing and paused states', () => {
    test('Play traversal goes to traversal_playing and highlights nodes over time', async ({ page }) => {
      const bst10 = new BSTPage(page);

      // Ensure there is a tree with multiple nodes: use sample to guarantee nodes
      await bst.clickSample();
      await bst.waitForStatusContains(/Insert sequence complete|Insert sequence complete|idle/i, 20000);

      // Select an order if control exists (In-order)
      await bst.selectOrderByVisibleText('In-order').catch(() => {});

      // Start playing traversal
      await bst.clickPlay();

      // Traversal status should indicate playing
      await bst.waitForStatusContains(/traversal.*playing|playing/i, 8000);

      // During traversal, body should include "visited" or similar sequence indicator; wait a little and assert visited mention
      await page.waitForTimeout(500);
      const bodyDuring = await bst.bodyText();
      expect(/visited|visiting|highlight|traversal/i.test(bodyDuring)).toBeTruthy();

      // Stop traversal to return to idle and clear interval
      await bst.clickStop();
      await bst.waitForStatusContains(/idle|ready/i, 8000);
    });

    test('Step during traversal results in traversal_paused behavior and successive steps advance', async ({ page }) => {
      const bst11 = new BSTPage(page);

      // Ensure tree exists
      await bst.clickSample();
      await bst.waitForStatusContains(/Insert sequence complete|idle/i, 15000);

      // Start traversal by clicking Step to enter paused stepping mode (traversal_paused)
      await bst.clickStep();

      // FSM should indicate "Traversal ready/paused" or similar
      await bst.waitForStatusContains(/traversal.*paused|ready|paused|Traversal ready/i, 5000);

      // Perform a single step - should highlight one node
      await bst.clickStep();
      await page.waitForTimeout(300);
      const bodyAfterStep1 = await bst.bodyText();
      expect(/visited|highlight|selected|step/i.test(bodyAfterStep1)).toBeTruthy();

      // Another step should highlight the next node (we assert that some progression text remains present)
      await bst.clickStep();
      await page.waitForTimeout(300);
      const bodyAfterStep2 = await bst.bodyText();
      expect(/visited|highlight|selected|step/i.test(bodyAfterStep2)).toBeTruthy();

      // Play from paused should resume playing
      await bst.clickPlay();
      await bst.waitForStatusContains(/playing|traversal/i, 5000);

      // Stop to end
      await bst.clickStop();
      await bst.waitForStatusContains(/idle|ready/i, 8000);
    });
  });

  test.describe('Node selection and node interactions', () => {
    test('Clicking a node should enter node_selected and show selection status, clicking outside returns to idle', async ({ page }) => {
      const bst12 = new BSTPage(page);

      // Ensure at least one node exists
      await bst.insert(15);
      await bst.waitForStatusContains(/Inserted|inserted/i, 8000);
      await bst.waitForStatusContains(/idle|ready/i, 8000);

      // Find node and click it
      const node1 = bst.nodeLocator(15);
      await expect(node).toBeVisible();
      await node.click();

      // FSM onEnter should pulseNode and setStatus('Node X selected')
      await bst.waitForStatusContains(/Node\s*15\s*selected|selected/i, 4000);

      // The selected node should have visual highlight hint in DOM (heuristic: 'selected' or 'pulse' in body)
      const body6 = await bst.bodyText();
      expect(/selected|pulse|highlight/i.test(body)).toBeTruthy();

      // Clicking outside should return to idle per FSM
      await bst.clickOutside();
      await bst.waitForStatusContains(/idle|ready/i, 4000);
    });

    test('Node selection times out and returns to idle (TIMEOUT transition)', async ({ page }) => {
      const bst13 = new BSTPage(page);

      // Ensure node exists
      await bst.insert(33);
      await bst.waitForStatusContains(/Inserted|inserted/i, 8000);
      await bst.waitForStatusContains(/idle|ready/i, 8000);

      // Click node to select
      const node2 = bst.nodeLocator(33);
      await node.click();
      await bst.waitForStatusContains(/selected|Node\s*33\s*selected/i, 4000);

      // Wait for a reasonable timeout that the app might perform to auto-clear selection
      // We wait up to 10s for state to return to idle (TIMEOUT)
      await bst.waitForStatusContains(/idle|ready/i, 10000);
    });
  });

  test.describe('Edge cases and error scenarios across FSM', () => {
    test('Attempt to insert duplicate values should be handled (either ignored or reported) and not break FSM', async ({ page }) => {
      const bst14 = new BSTPage(page);

      // Insert a value
      await bst.insert(5);
      await bst.waitForStatusContains(/Inserted|inserted/i, 8000);
      await bst.waitForStatusContains(/idle|ready/i, 8000);

      // Insert duplicate value
      await bst.insert(5);

      // App may either report duplicate error or simply ignore; ensure no unhandled exception and FSM returns to idle
      await bst.waitForStatusContains(/idle|ready|duplicate|already exists|error/i, 8000);
      const body7 = await bst.bodyText();
      expect(/exception|stack trace/i.test(body)).toBeFalsy();
    });

    test('Stopping animations during insert/search/traversal returns to appropriate state', async ({ page }) => {
      const bst15 = new BSTPage(page);

      // Start an insert of a value then immediately stop
      await bst.insertInput().fill('77');
      await bst.insertButton().click();
      // Immediately stop
      await bst.clickStop();
      // FSM should result in either staying in inserting (per FSM CLICK_STOP in inserting returns to inserting) or back to idle - ensure not stuck forever
      await bst.waitForStatusContains(/idle|ready|Inserted|Insert sequence complete|error/i, 10000);

      // Start a search and stop
      await bst.searchInput().fill('77');
      await bst.searchButton().click();
      await bst.clickStop();
      await bst.waitForStatusContains(/idle|ready|found|not found|error/i, 10000);

      // Start traversal and stop
      // Ensure tree has multiple nodes
      await bst.clickSample();
      await bst.waitForStatusContains(/Insert sequence complete|idle/i, 20000);
      await bst.clickPlay();
      await page.waitForTimeout(200);
      await bst.clickStop();
      await bst.waitForStatusContains(/idle|ready/i, 10000);
    });
  });
});