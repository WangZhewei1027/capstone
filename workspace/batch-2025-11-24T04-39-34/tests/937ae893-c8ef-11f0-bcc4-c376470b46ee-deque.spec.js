import { test, expect } from '@playwright/test';

test.describe('Deque FSM Tests', () => {
  let deque;

  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/batch-2025-11-24T04-39-34/html/937ae893-c8ef-11f0-bcc4-c376470b46ee.html');
    deque = await page.evaluate(() => new Deque());
  });

  test('Initial state should be empty', async () => {
    const isEmpty = await page.evaluate(deque => deque.isEmpty(), deque);
    expect(isEmpty).toBe(true);
  });

  test.describe('State Transitions', () => {
    test('Transition from empty to not_empty on PUSH_FRONT', async () => {
      await page.evaluate(deque => deque.pushFront('item1'), deque);
      const isEmpty = await page.evaluate(deque => deque.isEmpty(), deque);
      expect(isEmpty).toBe(false);
    });

    test('Transition from empty to not_empty on PUSH_BACK', async () => {
      await page.evaluate(deque => deque.pushBack('item2'), deque);
      const isEmpty = await page.evaluate(deque => deque.isEmpty(), deque);
      expect(isEmpty).toBe(false);
    });

    test('Transition from not_empty to check_empty on POP_FRONT', async () => {
      await page.evaluate(deque => {
        deque.pushBack('item3');
        deque.popFront();
      }, deque);
      const isEmpty = await page.evaluate(deque => deque.isEmpty(), deque);
      expect(isEmpty).toBe(true);
    });

    test('Transition from not_empty to check_empty on POP_BACK', async () => {
      await page.evaluate(deque => {
        deque.pushBack('item4');
        deque.popBack();
      }, deque);
      const isEmpty = await page.evaluate(deque => deque.isEmpty(), deque);
      expect(isEmpty).toBe(true);
    });

    test('Transition from check_empty to empty on EMPTY_TRUE', async () => {
      await page.evaluate(deque => {
        deque.pushBack('item5');
        deque.popBack();
      }, deque);
      const isEmpty = await page.evaluate(deque => deque.isEmpty(), deque);
      expect(isEmpty).toBe(true);
    });

    test('Remain in not_empty on EMPTY_FALSE', async () => {
      await page.evaluate(deque => {
        deque.pushBack('item6');
        deque.pushBack('item7');
        deque.popBack();
      }, deque);
      const isEmpty = await page.evaluate(deque => deque.isEmpty(), deque);
      expect(isEmpty).toBe(false);
    });
  });

  test.describe('Edge Cases', () => {
    test('Pop from empty deque should return null', async () => {
      const popFrontResult = await page.evaluate(deque => deque.popFront(), deque);
      const popBackResult = await page.evaluate(deque => deque.popBack(), deque);
      expect(popFrontResult).toBe(null);
      expect(popBackResult).toBe(null);
    });

    test('Peek from empty deque should return null', async () => {
      const peekFrontResult = await page.evaluate(deque => deque.peekFront(), deque);
      const peekBackResult = await page.evaluate(deque => deque.peekBack(), deque);
      expect(peekFrontResult).toBe(null);
      expect(peekBackResult).toBe(null);
    });
  });

  test.afterEach(async ({ page }) => {
    await page.close();
  });
});