import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T16-57-04/html/c4c5ce20-ca1f-11f0-a1c2-e5458e67e2e0.html';

class ArrayPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.array = page.locator('.array');
    this.element = page.locator('.element');
    this.body = page.locator('body');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the two elements to be present in DOM
    await expect(this.array).toHaveCount(1);
    await expect(this.element).toHaveCount(1);
  }

  // Interaction helpers --------------------------------------------------

  async hoverArray() {
    await this.array.hover();
    // ensure event loop has time to process any handlers
    await this.page.waitForTimeout(50);
  }

  async leaveArray() {
    // Move mouse to body to trigger mouseleave from array
    await this.body.hover();
    await this.page.waitForTimeout(50);
  }

  async clickArray() {
    await this.array.click();
    await this.page.waitForTimeout(50);
  }

  async hoverElement() {
    await this.element.hover();
    await this.page.waitForTimeout(50);
  }

  async leaveElement() {
    // Move mouse to body to trigger mouseleave from element
    await this.body.hover();
    await this.page.waitForTimeout(50);
  }

  async clickElement() {
    await this.element.click();
    await this.page.waitForTimeout(50);
  }

  // Assertion helpers ----------------------------------------------------

  async classListOfArray() {
    return (await this.array.getAttribute('class')) || '';
  }

  async classListOfElement() {
    return (await this.element.getAttribute('class')) || '';
  }

  async arrayHasClass(cls) {
    const cl = await this.classListOfArray();
    return cl.split(/\s+/).includes(cls);
  }

  async elementHasClass(cls) {
    const cl = await this.classListOfElement();
    return cl.split(/\s+/).includes(cls);
  }

  async expectArrayHasClass(cls) {
    const has = await this.arrayHasClass(cls);
    expect(has).toBeTruthy();
  }

  async expectArrayNotHasClass(cls) {
    const has = await this.arrayHasClass(cls);
    expect(has).toBeFalsy();
  }

  async expectElementHasClass(cls) {
    const has = await this.elementHasClass(cls);
    expect(has).toBeTruthy();
  }

  async expectElementNotHasClass(cls) {
    const has = await this.elementHasClass(cls);
    expect(has).toBeFalsy();
  }
}

// Group tests for Array FSM behavior
test.describe('Array FSM interactions - c4c5ce20-ca1f-11f0-a1c2-e5458e67e2e0', () => {
  let page;
  let app;

  test.beforeEach(async ({ browser }) => {
    // new context/page per test to avoid cross-test interference
    const context = await browser.newContext();
    page = await context.newPage();
    app = new ArrayPage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    // close page's context to clean up
    await page.context().close();
  });

  test('idle state: no hover or selected classes on load', async () => {
    // Validate initial idle state: neither .array nor .element has hover or selected classes
    await app.expectArrayNotHasClass('hover');
    await app.expectArrayNotHasClass('selected');
    await app.expectElementNotHasClass('hover');
    await app.expectElementNotHasClass('selected');
  });

  test('array_hovered: hovering array adds hover class and removing mouse leaves removes it', async () => {
    // Hover array -> should enter array_hovered: .array gets 'hover'
    await app.hoverArray();
    await app.expectArrayHasClass('hover');
    // Ensure element is not affected
    await app.expectElementNotHasClass('hover');

    // Mouse leave array -> should return to idle and remove hover class
    await app.leaveArray();
    await app.expectArrayNotHasClass('hover');
  });

  test('element_hovered: hovering element adds hover class and leaving removes it', async () => {
    // Hover element -> should enter element_hovered: .element gets 'hover'
    await app.hoverElement();
    await app.expectElementHasClass('hover');
    // Ensure array is not affected
    await app.expectArrayNotHasClass('hover');

    // Mouse leave element -> should return to idle and remove hover
    await app.leaveElement();
    await app.expectElementNotHasClass('hover');
  });

  test('array_selected: clicking array toggles selected on and off', async () => {
    // Click array -> array_selected: .array gets 'selected'
    await app.clickArray();
    await app.expectArrayHasClass('selected');
    // Click array again -> idle: selected removed
    await app.clickArray();
    await app.expectArrayNotHasClass('selected');
  });

  test('element_selected: clicking element toggles selected on and off', async () => {
    // Click element -> element_selected: .element gets 'selected'
    await app.clickElement();
    await app.expectElementHasClass('selected');
    // Click element again -> idle: selected removed
    await app.clickElement();
    await app.expectElementNotHasClass('selected');
  });

  test('transition: array_hovered -> element_hovered on entering element (hover)', async () => {
    // Hover array first
    await app.hoverArray();
    await app.expectArrayHasClass('hover');

    // Now hover element -> should remove array hover and add element hover
    await app.hoverElement();
    // FSM expects array hover removed, element hover added
    await app.expectArrayNotHasClass('hover');
    await app.expectElementHasClass('hover');

    // Cleanup: leave element
    await app.leaveElement();
    await app.expectElementNotHasClass('hover');
  });

  test('transition: array_hovered -> element_selected on clicking element', async () => {
    // Hover array
    await app.hoverArray();
    await app.expectArrayHasClass('hover');

    // Click element -> element_selected: element gets selected; array hover removed
    await app.clickElement();
    await app.expectElementHasClass('selected');
    await app.expectArrayNotHasClass('hover');

    // Clicking element again should go to idle (remove element selected)
    await app.clickElement();
    await app.expectElementNotHasClass('selected');
  });

  test('transition: element_hovered -> array_hovered on entering array (hover)', async () => {
    // Hover element first
    await app.hoverElement();
    await app.expectElementHasClass('hover');

    // Hover array -> should remove element hover and add array hover
    await app.hoverArray();
    await app.expectElementNotHasClass('hover');
    await app.expectArrayHasClass('hover');

    // Leave array
    await app.leaveArray();
    await app.expectArrayNotHasClass('hover');
  });

  test('transition: element_hovered -> element_selected on clicking element', async () => {
    // Hover element then click element
    await app.hoverElement();
    await app.expectElementHasClass('hover');

    await app.clickElement();
    // Should now be selected and hover removed or not depending on implementation:
    // FSM onEnter for element_selected adds selected; onExit for element_hovered removes hover.
    await app.expectElementHasClass('selected');
    // element hover should be removed as the state changed to selected
    await app.expectElementNotHasClass('hover');

    // Click element to return to idle
    await app.clickElement();
    await app.expectElementNotHasClass('selected');
  });

  test('transition: array_selected -> element_hovered on hovering element', async () => {
    // Click array to select it
    await app.clickArray();
    await app.expectArrayHasClass('selected');

    // Hover element: should transition to element_hovered, removing array selected
    await app.hoverElement();
    // FSM indicates onExit of array_selected removes .array selected and onEnter of element_hovered adds .element hover
    await app.expectArrayNotHasClass('selected');
    await app.expectElementHasClass('hover');

    // cleanup
    await app.leaveElement();
    await app.expectElementNotHasClass('hover');
  });

  test('transition: element_selected -> array_selected on clicking array', async () => {
    // Click element to select it
    await app.clickElement();
    await app.expectElementHasClass('selected');

    // Click array -> should switch selection: array selected, element selected removed
    await app.clickArray();
    await app.expectArrayHasClass('selected');
    await app.expectElementNotHasClass('selected');

    // Click array again to go back to idle
    await app.clickArray();
    await app.expectArrayNotHasClass('selected');
  });

  // Edge cases and error scenarios --------------------------------------

  test('edge case: dispatching an unrelated event does not change FSM state', async () => {
    // Start idle
    await app.expectArrayNotHasClass('hover');
    await app.expectElementNotHasClass('hover');
    await app.expectArrayNotHasClass('selected');
    await app.expectElementNotHasClass('selected');

    // Dispatch a keyboard event on body which FSM should ignore
    await app.page.evaluate(() => {
      const ev = new KeyboardEvent('keydown', { key: 'a' });
      document.body.dispatchEvent(ev);
    });
    // Nothing should change
    await app.expectArrayNotHasClass('hover');
    await app.expectElementNotHasClass('hover');
    await app.expectArrayNotHasClass('selected');
    await app.expectElementNotHasClass('selected');
  });

  test('edge case: rapid sequence of events (hover/click) results in a valid end state', async () => {
    // Rapidly hover array, hover element, click element, click array
    await app.hoverArray();
    await app.hoverElement();
    await app.clickElement();
    // After clickElement we expect element_selected
    await app.expectElementHasClass('selected');
    // Now click array to transition to array_selected
    await app.clickArray();
    await app.expectArrayHasClass('selected');
    await app.expectElementNotHasClass('selected');
  });

  test('edge case: events on missing selector do not throw and do not change state', async () => {
    // Attempt to dispatch events to a non-existent selector
    const result = await app.page.evaluate(() => {
      try {
        const el = document.querySelector('.nonexistent');
        if (el) {
          el.dispatchEvent(new Event('click'));
        } else {
          // nothing to do, but ensure no exception is thrown
        }
        return true;
      } catch (e) {
        return false;
      }
    });
    expect(result).toBeTruthy();

    // State remains idle
    await app.expectArrayNotHasClass('selected');
    await app.expectElementNotHasClass('selected');
  });
});