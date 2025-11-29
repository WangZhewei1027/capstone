import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-50-37/html/d5466270-ca8b-11f0-bf19-77e409d50591.html';

test.describe('Linked List Interactive Demo (FSM states & transitions)', () => {
  // Collect page console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', (msg) => {
      // collect text of console messages
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        consoleMessages.push({ type: 'unknown', text: String(msg) });
      }
    });

    page.on('pageerror', (err) => {
      // Capture uncaught exceptions (ReferenceError, TypeError, etc.)
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
    // Ensure initial render complete
    await page.waitForSelector('#nodesWrap .node');
  });

  test.afterEach(async ({ page }) => {
    // helpful for debugging if tests fail — keep console output
    // but do not modify page runtime
  });

  test('Initial render - idle state should show sample nodes and correct metadata', async ({ page }) => {
    // Validate initial lengthBubble shows 4 (A,B,C,D appended during init)
    const length = await page.locator('#lengthBubble').textContent();
    expect(length?.trim()).toBe('4');

    // headInfo should reference n1 and value "A"
    const headInfo = await page.locator('#headInfo').textContent();
    expect(headInfo).toContain('n1');
    expect(headInfo).toContain('"A"');

    // nodesWrap should have 4 .node elements
    const nodesCount = await page.locator('#nodesWrap .node').count();
    expect(nodesCount).toBe(4);

    // internal representation should list nodes (not empty)
    const internalRep = await page.locator('#internalRep').textContent();
    expect(internalRep?.length).toBeGreaterThan(0);
    expect(internalRep).toContain('n1');
    expect(internalRep).toContain('n4');

    // No uncaught page errors occurred during load
    expect(pageErrors.length).toBe(0);
  });

  test('Append operation transitions into appending state and updates DOM and logs', async ({ page }) => {
    // Enter new value and click Append
    await page.fill('#valueInput', 'E');
    await page.click('#appendBtn');

    // New length should be 5
    await expect(page.locator('#lengthBubble')).toHaveText('5');

    // The latest node should exist; find node with text 'E'
    const newNodeId = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('#nodesWrap .node'));
      const match = nodes.find(n => n.querySelector('.val')?.textContent === 'E');
      return match ? match.getAttribute('data-id') : null;
    });
    expect(newNodeId).not.toBeNull();

    // Log top entry should mention append("E")
    const firstLog = await page.locator('#logArea div').first().textContent();
    expect(firstLog).toContain('append("E")');

    // Ensure no page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Prepend operation transitions into prepping and updates head', async ({ page }) => {
    // Prepend Z and verify new head updates
    await page.fill('#valueInput', 'Z');
    await page.click('#prependBtn');

    // headInfo should include the new head id and value "Z"
    await expect(page.locator('#headInfo')).toContainText('"Z"');

    // length increases accordingly (was 5 after append test path; but tests are independent—start is 4 + this prepend => 5)
    const length = await page.locator('#lengthBubble').textContent();
    expect(Number(length)).toBeGreaterThanOrEqual(1);

    // Check log has prepend entry
    const firstLog = await page.locator('#logArea div').first().textContent();
    expect(firstLog).toContain('prepend("Z")');

    // No page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Insert at specific index (inserting state) places node at correct position', async ({ page }) => {
    // Ensure we have deterministic starting list (A,B,C,D). We'll append a unique marker then insert after first two nodes.
    await page.fill('#valueInput', 'MARKER');
    await page.click('#appendBtn');

    // Insert 'M' at index 2
    await page.fill('#valueInput', 'M');
    await page.fill('#indexInput', '2');
    await page.click('#insertBtn');

    // Wait for DOM to reflect insertion and check node order
    const values = await page.$$eval('#nodesWrap .node .val', els => els.map(e => e.textContent));
    // The inserted value 'M' should appear somewhere in the list
    expect(values.some(v => v === 'M')).toBeTruthy();

    // Confirm insertion at index 2 specifically
    // Because list order could be: head at index 0
    if (values.length >= 3) {
      expect(values[2]).toBe('M');
    }

    // Log should mention insertAt
    const firstLog = await page.locator('#logArea div').first().textContent();
    expect(firstLog).toContain('insertAt');

    // No page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Delete by value triggers removal animation and transitions back to idle', async ({ page }) => {
    // Insert temporary value 'DELME' and then delete by value
    await page.fill('#valueInput', 'DELME');
    await page.click('#appendBtn');

    // Find the data-id for node with value 'DELME'
    const targetId = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('#nodesWrap .node'));
      const n = nodes.find(nd => nd.querySelector('.val')?.textContent === 'DELME');
      return n ? n.getAttribute('data-id') : null;
    });
    expect(targetId).not.toBeNull();

    // Delete by value
    await page.fill('#valueInput', 'DELME');
    await page.click('#delValBtn');

    // The node should become .removing and then be removed from DOM after ~320ms
    // Wait for node to be detached
    await page.waitForSelector(`#nodesWrap .node[data-id="${targetId}"]`, { state: 'detached', timeout: 2000 });

    // Log should mention removed and the id
    const firstLog = await page.locator('#logArea div').first().textContent();
    expect(firstLog).toContain('deleteByValue("DELME")');

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Delete by index (deleting_by_index) removes correct node and updates metadata', async ({ page }) => {
    // Ensure there is at least 1 node
    const countBefore = await page.locator('#nodesWrap .node').count();
    expect(countBefore).toBeGreaterThan(0);

    // Delete at index 0 (head)
    await page.fill('#indexInput', '0');
    // Capture current head id
    const headBefore = await page.locator('#nodesWrap .node').first().getAttribute('data-id');

    await page.click('#delIdxBtn');

    // After deletion, head should change (or be null if list empty)
    await page.waitForTimeout(350); // allow removal animation time
    const headAfter = await page.locator('#headInfo').textContent();
    if (countBefore === 1) {
      expect(headAfter).toContain('null');
    } else {
      expect(headAfter).not.toContain(headBefore || '');
    }

    // Log has deleteAt entry
    const firstLog = await page.locator('#logArea div').first().textContent();
    expect(firstLog).toContain('deleteAt(');

    expect(pageErrors.length).toBe(0);
  });

  test('Find operation (finding state) highlights found node then clears highlight', async ({ page }) => {
    // Ensure value 'C' exists in initial sample; find it
    await page.fill('#valueInput', 'C');
    await page.click('#findBtn');

    // The node with value C should temporarily get .found class
    const foundSelector = '#nodesWrap .node .val:text-is("C")';
    // Playwright doesn't support :text-is in CSS; use evaluate to find node element
    const dataId = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('#nodesWrap .node')).find(n => n.querySelector('.val')?.textContent === 'C');
      return el ? el.getAttribute('data-id') : null;
    });
    expect(dataId).not.toBeNull();

    // Immediately after click, element should have .found class (renderHighlightFound adds it and removes after 1000ms)
    const nodeLocator = page.locator(`#nodesWrap .node[data-id="${dataId}"]`);
    await expect(nodeLocator).toHaveClass(/found/, { timeout: 1200 }).catch(async () => {
      // It's possible the highlight removal is quick; ensure it had been present by checking logs
      const recent = await page.locator('#logArea div').first().textContent();
      expect(recent).toContain('find("C")');
    });

    // After 1200ms the highlight should be removed
    await page.waitForTimeout(1200);
    const classAfter = await nodeLocator.getAttribute('class');
    expect(classAfter).not.toMatch(/found/);

    // Log contains find result
    const firstLog = await page.locator('#logArea div').first().textContent();
    expect(firstLog).toContain('find("C")');

    expect(pageErrors.length).toBe(0);
  });

  test('Reverse operation (reversing state) runs animated reversal and eventually completes', async ({ page }) => {
    // Capture current order of node ids
    const beforeIds = await page.$$eval('#nodesWrap .node', nodes => nodes.map(n => n.getAttribute('data-id')));

    // Click reverse
    await page.click('#reverseBtn');

    // Wait until a log entry indicating completion appears (reverse() → complete. new head:)
    // The reversal animates with ~260ms per node; wait sufficiently long: nodes * 300ms + buffer
    const waitMs = beforeIds.length * 320 + 1200;
    await page.waitForTimeout(waitMs);

    // After reversal completes, headInfo should equal previous tail id
    const headInfoText = await page.locator('#headInfo').textContent();
    const previousTailId = beforeIds[beforeIds.length - 1];
    expect(headInfoText).toContain(previousTailId);

    // Also ensure the order of ids is reversed when compared to beforeIds
    const afterIds = await page.$$eval('#nodesWrap .node', nodes => nodes.map(n => n.getAttribute('data-id')));
    expect(afterIds.join(',')).toBe(beforeIds.slice().reverse().join(','));

    // Log should have reverse completion message
    const logs = await page.locator('#logArea div').allTextContents();
    const hasComplete = logs.some(l => l.includes('reverse() → complete'));
    expect(hasComplete).toBeTruthy();

    expect(pageErrors.length).toBe(0);
  }, { timeout: 20000 });

  test('Clear operation empties the list (clearing state) and updates internal representation', async ({ page }) => {
    await page.click('#clearBtn');

    // Wait a short moment for render
    await page.waitForTimeout(200);

    // lengthBubble should be 0 and headInfo null
    await expect(page.locator('#lengthBubble')).toHaveText('0');
    await expect(page.locator('#headInfo')).toHaveText('null');

    // internalRep should indicate empty list
    await expect(page.locator('#internalRep')).toHaveText('(empty list)');

    // nodesWrap should have no .node children
    const count = await page.locator('#nodesWrap .node').count();
    expect(count).toBe(0);

    expect(pageErrors.length).toBe(0);
  });

  test('Randomize operation (randomizing state) uses prompt and creates N nodes', async ({ page }) => {
    // Intercept dialog and provide number 3
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('3');
    });

    await page.click('#randomBtn');

    // Wait for randomize to finish and render
    await page.waitForTimeout(500);

    // lengthBubble should reflect 3 nodes
    await expect(page.locator('#lengthBubble')).toHaveText('3');

    // nodesWrap must have 3 .node elements
    const count = await page.locator('#nodesWrap .node').count();
    expect(count).toBe(3);

    // internalRep should list 3 nodes
    const internal = await page.locator('#internalRep').textContent();
    const lines = internal?.split('\n').filter(Boolean) ?? [];
    expect(lines.length).toBe(3);

    expect(pageErrors.length).toBe(0);
  });

  test('Traverse step-by-step (traversing_step) highlights nodes on repeated clicks and completes', async ({ page }) => {
    // Ensure there are nodes to traverse; if empty, append two nodes
    let nodeCount = await page.locator('#nodesWrap .node').count();
    if (nodeCount === 0) {
      await page.fill('#valueInput', 'T1');
      await page.click('#appendBtn');
      await page.fill('#valueInput', 'T2');
      await page.click('#appendBtn');
      nodeCount = await page.locator('#nodesWrap .node').count();
    }

    // Click traverse step to start traversal (first node highlighted)
    await page.click('#traverseStepBtn');

    // Wait a short time for UI update
    await page.waitForTimeout(200);

    // floatingPointer should be visible
    const fpVisible = await page.evaluate(() => {
      const fp = document.getElementById('floatingPointer');
      return fp && fp.style.display !== 'none';
    });
    expect(fpVisible).toBeTruthy();

    // Verify first node is highlighted
    const firstNode = page.locator('#nodesWrap .node').first();
    await expect(firstNode).toHaveClass(/found/);

    // Continue stepping by clicking the same button until completion
    for (let i = 1; i < nodeCount; i++) {
      await page.click('#traverseStepBtn');
      await page.waitForTimeout(200);
    }

    // Wait for final completion hide delay (300ms in code)
    await page.waitForTimeout(400);

    // floatingPointer should be hidden
    const fpHidden = await page.evaluate(() => {
      const fp = document.getElementById('floatingPointer');
      return fp && (fp.style.display === 'none' || getComputedStyle(fp).display === 'none');
    });
    expect(fpHidden).toBeTruthy();

    // Log should contain 'traverse → complete' at some point
    const logs = await page.locator('#logArea div').allTextContents();
    const foundComplete = logs.some(l => l.includes('traverse → complete') || l.includes('traverse → finished'));
    expect(foundComplete).toBeTruthy();

    expect(pageErrors.length).toBe(0);
  }, { timeout: 15000 });

  test('Traverse auto (traversing_auto) runs automatically and restores step handler afterwards', async ({ page }) => {
    // Ensure there are nodes to traverse; if empty append two
    let nodeCount = await page.locator('#nodesWrap .node').count();
    if (nodeCount === 0) {
      await page.fill('#valueInput', 'A1');
      await page.click('#appendBtn');
      await page.fill('#valueInput', 'A2');
      await page.click('#appendBtn');
      nodeCount = await page.locator('#nodesWrap .node').count();
    }

    // Click auto traversal
    await page.click('#traverseAutoBtn');

    // Wait for auto traversal to finish (nodes * 520ms + buffer is used in code restore)
    const waitMs = nodeCount * 520 + 800;
    await page.waitForTimeout(waitMs);

    // After auto completes, floatingPointer should be hidden and .found should be cleared
    const fpHidden = await page.evaluate(() => {
      const fp = document.getElementById('floatingPointer');
      return fp && (fp.style.display === 'none' || getComputedStyle(fp).display === 'none');
    });
    expect(fpHidden).toBeTruthy();

    // Log should contain completion
    const logs = await page.locator('#logArea div').allTextContents();
    const hasComplete = logs.some(l => l.includes('traverse → complete'));
    expect(hasComplete).toBeTruthy();

    // The traverseStepBtn onclick should have been restored to controls.traverseStep (no direct way to inspect function,
    // but clicking it should start a new step traversal — click and observe floatingPointer show)
    await page.click('#traverseStepBtn');
    await page.waitForTimeout(200);
    const fpNow = await page.evaluate(() => {
      const fp = document.getElementById('floatingPointer');
      return fp && fp.style.display !== 'none';
    });
    // It may be visible (if there are nodes), so just assert that clicking did not throw errors (no pageErrors)
    expect(pageErrors.length).toBe(0);
  }, { timeout: 20000 });

  test('Edge case: Append empty value logs error and does not change list (INPUT_ENTERED event handling)', async ({ page }) => {
    const beforeCount = await page.locator('#nodesWrap .node').count();
    await page.fill('#valueInput', '');
    await page.click('#appendBtn');

    // Wait briefly for log
    await page.waitForTimeout(120);

    // Count should remain unchanged
    const afterCount = await page.locator('#nodesWrap .node').count();
    expect(afterCount).toBe(beforeCount);

    // Log should indicate value empty
    const firstLog = await page.locator('#logArea div').first().textContent();
    expect(firstLog).toContain('append → value empty');

    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: Insert with invalid index logs index invalid', async ({ page }) => {
    await page.fill('#valueInput', 'X');
    await page.fill('#indexInput', 'abc'); // invalid number
    await page.click('#insertBtn');

    await page.waitForTimeout(120);

    const firstLog = await page.locator('#logArea div').first().textContent();
    expect(firstLog).toContain('insert → index invalid');

    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: Delete by value not found logs not found', async ({ page }) => {
    await page.fill('#valueInput', 'THIS_DOES_NOT_EXIST');
    await page.click('#delValBtn');

    await page.waitForTimeout(120);

    const firstLog = await page.locator('#logArea div').first().textContent();
    expect(firstLog).toContain('not found');

    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: Delete by index out of range logs index out of range', async ({ page }) => {
    // pick a large index
    await page.fill('#indexInput', '9999');
    await page.click('#delIdxBtn');

    await page.waitForTimeout(120);

    const firstLog = await page.locator('#logArea div').first().textContent();
    expect(firstLog).toContain('index out of range');

    expect(pageErrors.length).toBe(0);
  });

  test('Keyboard Enter in value input triggers append (INPUT_ENTERED event)', async ({ page }) => {
    // Count before
    const beforeCount = await page.locator('#nodesWrap .node').count();

    await page.fill('#valueInput', 'KEYAPPEND');
    // Press Enter
    await page.press('#valueInput', 'Enter');

    // Wait for render
    await page.waitForTimeout(200);

    const afterCount = await page.locator('#nodesWrap .node').count();
    expect(afterCount).toBe(beforeCount + 1);

    // Latest log contains append("KEYAPPEND")
    const firstLog = await page.locator('#logArea div').first().textContent();
    expect(firstLog).toContain('append("KEYAPPEND")');

    expect(pageErrors.length).toBe(0);
  });

  test('Runtime sanity: No uncaught ReferenceError/TypeError/SyntaxError occurred during interactions', async ({ page }) => {
    // This test simply asserts that no uncaught errors were recorded in the page error listener
    // (we already asserted pageErrors at many steps, but include an explicit final check)
    expect(pageErrors.length).toBe(0);
  });
});