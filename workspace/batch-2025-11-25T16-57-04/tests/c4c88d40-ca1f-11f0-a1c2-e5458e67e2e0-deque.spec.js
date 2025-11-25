import { test, expect } from '@playwright/test';

test.describe('Deque FSM and DOM interactions (c4c88d40-ca1f-11f0-a1c2-e5458e67e2e0)', () => {
  const url = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T16-57-04/html/c4c88d40-ca1f-11f0-a1c2-e5458e67e2e0.html';

  // Helper to ensure the required DOM elements exist and deque is reset.
  async function ensureElementsAndReset(page) {
    await page.goto(url);
    await page.evaluate(() => {
      // Create #array and #deque if they don't exist (the page's HTML does not include them).
      if (!document.getElementById('array')) {
        const a = document.createElement('pre');
        a.id = 'array';
        a.innerHTML = '';
        document.body.appendChild(a);
      }
      if (!document.getElementById('deque')) {
        const d = document.createElement('pre');
        d.id = 'deque';
        d.innerHTML = '';
        document.body.appendChild(d);
      }
      // Ensure a fresh deque array in the page context
      window.deque = [];
    });
  }

  test.beforeEach(async ({ page }) => {
    // Load the page and prepare the DOM for tests
    await ensureElementsAndReset(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up innerHTML after each test to avoid cross-test contamination
    await page.evaluate(() => {
      const a = document.getElementById('array');
      const d = document.getElementById('deque');
      if (a) a.innerHTML = '';
      if (d) d.innerHTML = '';
      window.deque = [];
    });
  });

  test.describe('Basic existence and idle state checks', () => {
    test('page defines the expected functions and idle state does no DOM modifications', async ({ page }) => {
      // Verify that the page exposes all functions referenced by the FSM
      const functionsExist = await page.evaluate(() => {
        return {
          appendElement: typeof window.appendElement === 'function',
          dequeue: typeof window.dequeue === 'function',
          displayArray: typeof window.displayArray === 'function',
          removeElement: typeof window.removeElement === 'function',
          denoteElement: typeof window.denoteElement === 'function',
        };
      });
      expect(functionsExist.appendElement).toBe(true);
      expect(functionsExist.dequeue).toBe(true);
      expect(functionsExist.displayArray).toBe(true);
      expect(functionsExist.removeElement).toBe(true);
      expect(functionsExist.denoteElement).toBe(true);

      // Idle: no function invoked yet, so both #array and #deque should be empty
      const arrayHTML = await page.$eval('#array', el => el.innerHTML);
      const dequeHTML = await page.$eval('#deque', el => el.innerHTML);
      expect(arrayHTML).toBe('');
      expect(dequeHTML).toBe('');
    });
  });

  test.describe('APPENDING (appending -> denoteElement via onEnter)', () => {
    test('appendElement calls denoteElement and appends the element to #deque', async ({ page }) => {
      // Ensure deque is empty initially
      await page.evaluate(() => { window.deque = []; document.getElementById('deque').innerHTML = ''; });

      // Invoke appendElement which (per implementation) calls denoteElement(element)
      await page.evaluate(() => appendElement('A'));

      // Expect that #deque innerHTML now contains the appended notation 'A'
      const dequeHTML = await page.$eval('#deque', el => el.innerHTML);
      expect(dequeHTML).toBe('A');

      // Append another value and verify it concatenates
      await page.evaluate(() => appendElement('B'));
      const dequeHTML2 = await page.$eval('#deque', el => el.innerHTML);
      expect(dequeHTML2).toBe('AB');
    });

    test('appendElement does not mutate internal deque array (edge case verifying implementation)', async ({ page }) => {
      // Put a known value in window.deque
      await page.evaluate(() => { window.deque = ['existing']; document.getElementById('deque').innerHTML = ''; });

      // Call appendElement which, in this implementation, only calls denoteElement and doesn't push into deque
      await page.evaluate(() => appendElement('X'));

      // Verify that the deque array remains unchanged
      const dequeArray = await page.evaluate(() => window.deque.slice());
      expect(dequeArray).toEqual(['existing']);

      // But #deque shows the denotation from append
      const dequeHTML = await page.$eval('#deque', el => el.innerHTML);
      expect(dequeHTML).toBe('X');
    });

    test('appendElement with null/undefined values results in stringified insertion into #deque', async ({ page }) => {
      await page.evaluate(() => { document.getElementById('deque').innerHTML = ''; });

      await page.evaluate(() => appendElement(null));
      let dequeHTML = await page.$eval('#deque', el => el.innerHTML);
      // null is stringified to "null"
      expect(dequeHTML).toBe('null');

      await page.evaluate(() => appendElement(undefined));
      dequeHTML = await page.$eval('#deque', el => el.innerHTML);
      // undefined stringified is "undefined"
      expect(dequeHTML).toBe('nullundefined');
    });
  });

  test.describe('DEQUEUE (dequeuing) behavior', () => {
    test('dequeue removes and returns the first element of window.deque', async ({ page }) => {
      // Prepopulate deque with two values
      await page.evaluate(() => { window.deque = ['x', 'y']; });

      // Call dequeue and capture its return value
      const result = await page.evaluate(() => dequeue());
      expect(result).toBe('x');

      // Verify internal deque mutated: first element removed, leaving ['y']
      const remaining = await page.evaluate(() => window.deque.slice());
      expect(remaining).toEqual(['y']);
    });

    test('dequeue on an empty deque returns undefined (edge case)', async ({ page }) => {
      await page.evaluate(() => { window.deque = []; });

      const result = await page.evaluate(() => dequeue());
      expect(result).toBeUndefined();

      // Also, deque remains an empty array
      const remaining = await page.evaluate(() => window.deque.slice());
      expect(remaining).toEqual([]);
    });
  });

  test.describe('DISPLAY_ARRAY (displaying) behavior', () => {
    test('displayArray outputs concatenated elements followed by a newline to #array', async ({ page }) => {
      // Prepare deque with string values
      await page.evaluate(() => {
        window.deque = ['1', '2', '3'];
        document.getElementById('array').innerHTML = '';
      });

      // Call displayArray
      await page.evaluate(() => displayArray());

      // displayArray concatenates without separators and appends '\n'
      const arrayHTML = await page.$eval('#array', el => el.innerHTML);
      expect(arrayHTML).toBe('123\n');
    });

    test('displayArray on empty deque appends only a newline character to #array', async ({ page }) => {
      await page.evaluate(() => {
        window.deque = [];
        document.getElementById('array').innerHTML = '';
      });

      await page.evaluate(() => displayArray());
      const arrayHTML = await page.$eval('#array', el => el.innerHTML);
      expect(arrayHTML).toBe('\n');
    });

    test('calling displayArray when #array is missing throws (ERROR trigger / edge case)', async ({ page }) => {
      // Remove the #array element to simulate missing DOM target and verify behavior
      await page.evaluate(() => {
        const a = document.getElementById('array');
        if (a) a.remove();
      });

      // When #array is missing, the function tries to access null.innerHTML and should throw.
      const threw = await page.evaluate(() => {
        try {
          displayArray();
          return false; // did not throw
        } catch (e) {
          // return a boolean and basic message so test can assert it indeed errored
          return { name: e && e.name ? e.name : null, message: e && e.message ? e.message : String(e) };
        }
      });

      // We expect an error object describing a TypeError or similar
      expect(threw).not.toBe(false);
      // Basic shape check: should include a name or message
      expect(typeof threw.message === 'string' || typeof threw.name === 'string').toBe(true);

      // Recreate the element for subsequent tests
      await page.evaluate(() => {
        if (!document.getElementById('array')) {
          const a = document.createElement('pre');
          a.id = 'array';
          a.innerHTML = '';
          document.body.appendChild(a);
        }
      });
    });
  });

  test.describe('REMOVE_ELEMENT (removing) behavior and denotation side-effects', () => {
    test('removeElement denotes the targeted element then denotes null (per implementation)', async ({ page }) => {
      // Set deque and clear deque output area
      await page.evaluate(() => {
        window.deque = ['a', 'b', 'c'];
        document.getElementById('deque').innerHTML = '';
      });

      // Call removeElement for index 1, should denote 'b' then 'null'
      await page.evaluate(() => removeElement(1));
      const dequeHTML = await page.$eval('#deque', el => el.innerHTML);
      expect(dequeHTML).toBe('bnull');
    });

    test('removeElement with out-of-bounds index denotes undefined then null (edge case due to implementation override)', async ({ page }) => {
      await page.evaluate(() => {
        window.deque = ['a', 'b'];
        document.getElementById('deque').innerHTML = '';
      });

      // Index 10 is out of bounds; per the page's final implementation removeElement will still call denoteElement(deque[index])
      await page.evaluate(() => removeElement(10));
      const dequeHTML = await page.$eval('#deque', el => el.innerHTML);
      // deque[10] is undefined -> "undefined" stringified, then "null" -> "undefinednull"
      expect(dequeHTML).toBe('undefinednull');
    });
  });

  test.describe('DENOTE_ELEMENT (denoting) behavior', () => {
    test('denoteElement appends the provided element string representation to #deque', async ({ page }) => {
      // Clear #deque and call denoteElement multiple times
      await page.evaluate(() => { document.getElementById('deque').innerHTML = ''; });

      await page.evaluate(() => denoteElement('Z'));
      await page.evaluate(() => denoteElement('Y'));

      const dequeHTML = await page.$eval('#deque', el => el.innerHTML);
      expect(dequeHTML).toBe('ZY');
    });

    test('denoteElement with falsy values appends their string equivalents', async ({ page }) => {
      await page.evaluate(() => { document.getElementById('deque').innerHTML = ''; });

      await page.evaluate(() => denoteElement(null));
      await page.evaluate(() => denoteElement(undefined));
      await page.evaluate(() => denoteElement(0));
      const dequeHTML = await page.$eval('#deque', el => el.innerHTML);
      expect(dequeHTML).toBe('nullundefined0');
    });
  });

  test.describe('FSM event coverage sanity checks', () => {
    test('simulate all FSM events by invoking the corresponding functions / behaviors', async ({ page }) => {
      // Reset
      await page.evaluate(() => {
        window.deque = ['m', 'n'];
        document.getElementById('array').innerHTML = '';
        document.getElementById('deque').innerHTML = '';
      });

      // APPEND_ELEMENT -> appendElement (triggers denoteElement)
      await page.evaluate(() => appendElement('P'));
      const afterAppend = await page.$eval('#deque', el => el.innerHTML);
      expect(afterAppend).toContain('P');

      // DEQUEUE -> dequeue (triggers removal)
      const dequeued = await page.evaluate(() => dequeue());
      expect(dequeued).toBe('m'); // first element expected

      // DISPLAY_ARRAY -> displayArray
      await page.evaluate(() => displayArray());
      const arrayAfterDisplay = await page.$eval('#array', el => el.innerHTML);
      // remaining deque had ['n'] after previous dequeue and we appended nothing into deque via appendElement,
      // so displayArray should output 'n' followed by newline
      expect(arrayAfterDisplay).toBe('n\n');

      // REMOVE_ELEMENT -> removeElement (index 0)
      await page.evaluate(() => { document.getElementById('deque').innerHTML = ''; });
      await page.evaluate(() => removeElement(0));
      const dequeAfterRemove = await page.$eval('#deque', el => el.innerHTML);
      // removeElement denotes deque[0] then null -> 'nnull' (since deque still contained 'n')
      expect(dequeAfterRemove).toBe('nnull');

      // DENOTE_ELEMENT -> denoteElement directly
      await page.evaluate(() => denoteElement('Z'));
      const finalDeque = await page.$eval('#deque', el => el.innerHTML);
      expect(finalDeque.endsWith('Z')).toBe(true);
    });
  });
});