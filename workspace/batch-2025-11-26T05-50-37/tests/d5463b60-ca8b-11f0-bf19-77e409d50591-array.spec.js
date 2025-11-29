import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-50-37/html/d5463b60-ca8b-11f0-bf19-77e409d50591.html';

test.describe('Array Playground (FSM-driven interactions)', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // reset trackers
    pageErrors = [];
    consoleMessages = [];

    // capture page errors and console messages for assertions
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the app and wait for initial rendering
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Wait for the array visualization to be rendered (init script calls renderArray on load)
    await expect(page.locator('#arrayVis .cell').first()).toBeVisible();
    // Ensure output has the ready message
    await expect(page.locator('#output')).toContainText('Ready');
  });

  test.afterEach(async () => {
    // simple sanity: no unexpected navigation errors accumulated (some tests intentionally cause errors)
    // This hook intentionally left minimal; tests assert pageErrors when they expect them.
  });

  test.describe('Initialization, setting and presets', () => {
    test('initial render shows default array and meta info', async ({ page }) => {
      // Validate initial array length and meta info (default textarea contains 5 numbers)
      await expect(page.locator('#lenInfo')).toHaveText('5');
      await expect(page.locator('#firstInfo')).toHaveText('1');
      await expect(page.locator('#lastInfo')).toHaveText('5');
      await expect(page.locator('#metaInfo')).toContainText('length: 5');
      // codeView should contain the serialized array on render
      await expect(page.locator('#codeView')).toContainText('[\n  1,');
    });

    test('set array to a valid JSON array updates visualization and shows Array set', async ({ page }) => {
      // Put a new JSON array into textarea and click Set Array
      await page.fill('#initInput', '["a","b"]');
      await page.click('#setArrayBtn');
      // Expect visualization updated to length 2 and output message
      await expect(page.locator('#lenInfo')).toHaveText('2');
      await expect(page.locator('#firstInfo')).toHaveText('"a"');
      await expect(page.locator('#output')).toContainText('Array set.');
    });

    test('set array to a non-array JSON reports an error', async ({ page }) => {
      // Provide a JSON object (not an array)
      await page.fill('#initInput', '{"a":1}');
      await page.click('#setArrayBtn');
      // The UI should show an error about not being an array
      await expect(page.locator('#output')).toContainText('Provided JSON is not an array.');
      // The output element's inline background should be set to the error color
      const bg = await page.locator('#output').evaluate((el) => el.style.background);
      expect(bg).toBe('#3b082a');
    });

    test('set array with invalid JSON shows parse error', async ({ page }) => {
      await page.fill('#initInput', '[1,2');
      await page.click('#setArrayBtn');
      await expect(page.locator('#output')).toContainText('Error parsing JSON:');
      const bg = await page.locator('#output').evaluate((el) => el.style.background);
      expect(bg).toBe('#3b082a');
    });

    test('selecting a preset fills the init input (preset_selected)', async ({ page }) => {
      // Choose the "Strings" preset value (value attribute as in markup)
      const presetValue = '["apple","banana","cherry"]';
      await page.selectOption('#presetSelect', { value: presetValue });
      // The init input should be updated with that preset value
      await expect(page.locator('#initInput')).toHaveValue(presetValue);
    });

    test('resetting restores defaultInit and shows Reset to default', async ({ page }) => {
      // Change the init input and then hit reset
      await page.fill('#initInput', '[9,9,9]');
      await page.click('#resetBtn');
      // Default in markup is [1, 2, 3, 4, 5]
      await expect(page.locator('#initInput')).toHaveValue('[1, 2, 3, 4, 5]');
      await expect(page.locator('#output')).toContainText('Reset to default.');
      await expect(page.locator('#lenInfo')).toHaveText('5');
    });
  });

  test.describe('Mutating operations (push, pop, unshift, shift, splice)', () => {
    test('push and pop update array and show messages', async ({ page }) => {
      // ensure known state by resetting
      await page.click('#resetBtn');
      // push 6
      await page.fill('#pushVal', '6');
      await page.click('#pushBtn');
      await expect(page.locator('#lastInfo')).toHaveText('6');
      await expect(page.locator('#output')).toContainText('push -> 6');

      // pop
      await page.click('#popBtn');
      await expect(page.locator('#lastInfo')).toHaveText('5'); // back to default last element
      await expect(page.locator('#output')).toContainText('pop -> 6');
    });

    test('unshift and shift update array', async ({ page }) => {
      await page.click('#resetBtn');
      await page.fill('#unshiftVal', '0');
      await page.click('#unshiftBtn');
      await expect(page.locator('#firstInfo')).toHaveText('0');
      await expect(page.locator('#output')).toContainText('unshift -> 0');

      await page.click('#shiftBtn');
      await expect(page.locator('#firstInfo')).toHaveText('1'); // back to original first
      await expect(page.locator('#output')).toContainText('shift -> 0');
    });

    test('splice removes items and shows removed array', async ({ page }) => {
      await page.click('#resetBtn');
      // remove two items starting at index 1 and insert 9,"x"
      await page.fill('#spliceStart', '1');
      await page.fill('#spliceDel', '2');
      await page.fill('#spliceItems', '9,"x"');
      await page.click('#spliceBtn');
      // The output should mention removed items (the removed portion from original default)
      await expect(page.locator('#output')).toContainText('splice removed:');
      // Now lenInfo should reflect the new length: default 5 - 2 removed + 2 inserted = 5 (same)
      await expect(page.locator('#lenInfo')).toHaveText('5');
    });
  });

  test.describe('Non-destructive ops: slice, concat, reverse, sort, flat', () => {
    test('slice returns a non-destructive subset (slicing)', async ({ page }) => {
      await page.click('#resetBtn');
      await page.fill('#sliceStart', '1');
      await page.fill('#sliceEnd', '3');
      await page.click('#sliceBtn');
      // output should include the slice result [2,3]
      await expect(page.locator('#output')).toContainText('slice result: [2,3]');
      // Ensure the underlying array was not changed (len remains 5)
      await expect(page.locator('#lenInfo')).toHaveText('5');
    });

    test('concat can append arrays and strings (concatenating)', async ({ page }) => {
      await page.click('#resetBtn');
      await page.fill('#concatVal', '[7,8]');
      await page.click('#concatBtn');
      await expect(page.locator('#output')).toContainText('concat applied.');
      // expect new length 7
      await expect(page.locator('#lenInfo')).toHaveText('7');
      // the codeView should include the appended values
      await expect(page.locator('#codeView')).toContainText('7');
      await expect(page.locator('#codeView')).toContainText('8');
    });

    test('reverse mutates array (reversing)', async ({ page }) => {
      await page.click('#resetBtn');
      const beforeFirst = await page.locator('#firstInfo').innerText();
      const beforeLast = await page.locator('#lastInfo').innerText();
      await page.click('#reverseBtn');
      // After reverse, first and last should have swapped
      await expect(page.locator('#firstInfo')).toHaveText(beforeLast);
      await expect(page.locator('#lastInfo')).toHaveText(beforeFirst);
      await expect(page.locator('#output')).toContainText('reverse applied.');
    });

    test('sort with numeric comparator sorts correctly (sorting)', async ({ page }) => {
      // prepare a small unsorted array
      await page.fill('#initInput', '[3,1,2]');
      await page.click('#setArrayBtn');
      await page.fill('#sortExpr', 'a-b');
      await page.click('#sortBtn');
      // After numeric sort, first should be 1 and last 3
      await expect(page.locator('#firstInfo')).toHaveText('1');
      await expect(page.locator('#lastInfo')).toHaveText('3');
      await expect(page.locator('#output')).toContainText('sort applied.');
    });

    test('flat flattens nested arrays (flattening)', async ({ page }) => {
      await page.fill('#initInput', '[[1,2],[3,[4]]]');
      await page.click('#setArrayBtn');
      await page.fill('#flatDepth', '1');
      await page.click('#flatBtn');
      // One-level flattening should produce [1,2,3,[4]] so lastInfo will be '[4]'
      await expect(page.locator('#output')).toContainText('flat(1) applied.');
      await expect(page.locator('#lastInfo')).toContain('[4]');
    });
  });

  test.describe('Functional operations (map, filter, reduce, find, findIndex, includes, indexOf)', () => {
    test('map shows result and can replace the array (mapping)', async ({ page }) => {
      await page.click('#resetBtn');
      // show map result without replace
      await page.fill('#mapExpr', 'x => x * 2');
      await page.uncheck('#mapReplace');
      await page.click('#mapBtn');
      await expect(page.locator('#output')).toContainText('map result:');
      // Array should remain unchanged
      await expect(page.locator('#lenInfo')).toHaveText('5');

      // now map with replace
      await page.check('#mapReplace');
      await page.click('#mapBtn');
      await expect(page.locator('#output')).toContainText('map replaced array.');
      // array first element should be 2 now
      await expect(page.locator('#firstInfo')).toHaveText('2');
      // restore to default for other tests
      await page.click('#resetBtn');
    });

    test('filter shows result and can replace the array (filtering)', async ({ page }) => {
      await page.click('#resetBtn');
      await page.fill('#filterExpr', 'x => x % 2 === 0');
      await page.uncheck('#filterReplace');
      await page.click('#filterBtn');
      await expect(page.locator('#output')).toContainText('filter result:');
      // Now try with replace
      await page.check('#filterReplace');
      await page.click('#filterBtn');
      await expect(page.locator('#output')).toContainText('filter replaced array.');
      // resulting array should have even numbers at first position (2)
      await expect(page.locator('#firstInfo')).toHaveText('2');
      await page.click('#resetBtn');
    });

    test('reduce computes aggregate value (reducing)', async ({ page }) => {
      await page.click('#resetBtn');
      await page.fill('#reduceExpr', '(acc,x) => acc + x');
      await page.fill('#reduceInit', '0');
      await page.click('#reduceBtn');
      // For default [1,2,3,4,5] sum is 15
      await expect(page.locator('#output')).toContainText('reduce result: 15');
    });

    test('find and findIndex work for value and function (finding, finding_index)', async ({ page }) => {
      await page.click('#resetBtn');
      // find by value
      await page.fill('#findExpr', '3');
      await page.click('#findBtn');
      await expect(page.locator('#output')).toContainText('find (value) -> 3');

      // findIndex by function
      await page.fill('#findExpr', 'x => x > 3');
      await page.click('#findIndexBtn');
      // index of first > 3 is 3 (0-based)
      await expect(page.locator('#output')).toContainText('findIndex -> 3');
    });

    test('includes and indexOf (deep) checks', async ({ page }) => {
      await page.click('#resetBtn');
      await page.fill('#findExpr', '4');
      await page.click('#includesBtn');
      await expect(page.locator('#output')).toContainText('includes -> true');

      await page.fill('#findExpr', '2');
      await page.click('#indexOfBtn');
      await expect(page.locator('#output')).toContainText('indexOf (deep) -> 1');
    });
  });

  test.describe('Custom code execution and replacement', () => {
    test('running custom code shows result but does not replace (custom_running)', async ({ page }) => {
      await page.click('#resetBtn');
      await page.fill('#customCode', 'arr.map(x => x * 10)');
      await page.click('#runCustom');
      await expect(page.locator('#output')).toContainText('result:');
      // original array should remain unchanged (len 5)
      await expect(page.locator('#lenInfo')).toHaveText('5');
    });

    test('runReplace with non-array result aborts with error (custom_replacing)', async ({ page }) => {
      await page.click('#resetBtn');
      // this code returns a number, not an array
      await page.fill('#customCode', '42');
      await page.click('#runReplace');
      // It should first show the result and then an error "Replace aborted: result is not an array"
      await expect(page.locator('#output')).toContainText('Replace aborted: result is not an array');
      // The output style should be the error color
      const bg = await page.locator('#output').evaluate((el) => el.style.background);
      expect(bg).toBe('#3b082a');
    });

    test('runReplace with array result replaces the array', async ({ page }) => {
      await page.click('#resetBtn');
      // return a slice (array)
      await page.fill('#customCode', 'arr.slice(1,4)');
      await page.click('#runReplace');
      await expect(page.locator('#output')).toContainText('Array replaced by custom result.');
      // Array should now be length 3 and first element should match previous index 1 (2)
      await expect(page.locator('#lenInfo')).toHaveText('3');
      await expect(page.locator('#firstInfo')).toHaveText('2');
    });
  });

  test.describe('UI utilities: show code, copy, download, clear console', () => {
    test('show code updates codeView and shows action (code_view)', async ({ page }) => {
      await page.click('#resetBtn');
      await page.click('#showCodeBtn');
      await expect(page.locator('#codeView')).toContainText('const arr = ');
      await expect(page.locator('#output')).toContainText('Code updated.');
    });

    test('copy code triggers a page error due to navigator.clipboard absence (copy_attempt)', async ({ page }) => {
      // Clear previous errors
      pageErrors = [];

      // Click the copy button. In many headless test environments navigator.clipboard is undefined,
      // causing the code navigator.clipboard?.writeText(...).then(...) to attempt .then on undefined -> TypeError.
      await page.click('#copyCode');

      // Wait a short moment for the pageerror to be emitted
      await page.waitForTimeout(100);

      // We expect at least one page error happened as directed by the spec to let runtime errors surface.
      expect(pageErrors.length).toBeGreaterThan(0);
      // Confirm that at least one of the errors is a TypeError or mentions 'then' (robust against message variation)
      const anyTypeErrorLike = pageErrors.some((e) => /TypeError|then/i.test(String(e?.message || e)));
      expect(anyTypeErrorLike).toBeTruthy();
    });

    test('download JSON triggers a download and shows message (downloading)', async ({ page }) => {
      // Clicking download triggers creation of blob and an anchor click - ensure output updated
      await page.click('#downloadJson');
      await expect(page.locator('#output')).toContainText('Downloaded array.json');
      // No pageerror expected for download action in normal conditions
    });

    test('clear console empties the output and resets styling (console_cleared)', async ({ page }) => {
      await page.click('#resetBtn');
      // produce a visible output first
      await page.click('#pushBtn'); // will update output
      await expect(page.locator('#output')).not.toHaveText('');
      // Now clear
      await page.click('#clearConsole');
      await expect(page.locator('#output')).toHaveText('');
      // style background should be set to the non-error color '#0f172a'
      const bg = await page.locator('#output').evaluate((el) => el.style.background);
      expect(bg).toBe('#0f172a');
      const color = await page.locator('#output').evaluate((el) => el.style.color);
      expect(color).toBe('#fff');
    });
  });

  test.describe('Edge cases and error handling (FSM error state)', () => {
    test('map with empty expression triggers validation error displayed in output (error)', async ({ page }) => {
      await page.click('#resetBtn');
      await page.fill('#mapExpr', ''); // empty expression should cause safeEvalFunction to throw 'Empty expression'
      await page.click('#mapBtn');
      await expect(page.locator('#output')).toContainText('Empty expression');
      // Error styling applied
      const bg = await page.locator('#output').evaluate((el) => el.style.background);
      expect(bg).toBe('#3b082a');
    });

    test('sort with invalid expression results in a shown error (error path)', async ({ page }) => {
      await page.click('#resetBtn');
      // Provide an invalid comparator expression that will cause safeEvalFunction to throw
      await page.fill('#sortExpr', 'this is invalid');
      await page.click('#sortBtn');
      // safeEvalFunction throws 'Invalid expression:' and the catch shows error message
      await expect(page.locator('#output')).toContainText('Invalid expression');
      const bg = await page.locator('#output').evaluate((el) => el.style.background);
      expect(bg).toBe('#3b082a');
    });
  });
});