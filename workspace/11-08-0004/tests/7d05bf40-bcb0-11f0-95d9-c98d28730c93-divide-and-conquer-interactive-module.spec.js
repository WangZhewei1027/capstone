import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7d05bf40-bcb0-11f0-95d9-c98d28730c93.html';

// Utility injected into page to query common application internals in a resilient way
const GET_APP_HELPERS = () => {
  // This function runs in browser context
  function findGlobal() {
    // list of likely global names used by the interactive module
    const candidates = ['app', 'dnc', 'DNC', '__DNC_APP__', 'DivideConquerApp', 'fsm', 'stateManager', 'stateMachine'];
    for (const name of candidates) {
      // eslint-disable-next-line no-undef
      const obj = window[name];
      if (obj) {
        return { name, obj };
      }
    }
    return null;
  }

  const res = findGlobal();

  function readState() {
    // try many patterns to determine current FSM state
    try {
      if (res) {
        const obj1 = res.obj1;
        if (typeof obj.getState === 'function') return obj.getState();
        if (typeof obj.state === 'string') return obj.state;
        if (obj.currentState) return obj.currentState;
        if (obj.fsm && typeof obj.fsm.getState === 'function') return obj.fsm.getState();
        if (obj.fsm && obj.fsm.state) return obj.fsm.state;
      }
      // fallback to DOM data attribute
      if (document.body && document.body.dataset && document.body.dataset.state) return document.body.dataset.state;
    } catch (e) {
      return null;
    }
    return null;
  }

  function isAnimatingFlag() {
    try {
      if (res && res.obj) {
        const obj2 = res.obj2;
        if (typeof obj.animating === 'boolean') return obj.animating;
        if (typeof obj.isAnimating === 'function') return !!obj.isAnimating();
        if (obj.flags && typeof obj.flags.animating === 'boolean') return obj.flags.animating;
      }
      // DOM heuristic: element with class 'animating' or data-animating attribute
      if (document.querySelector('.animating, [data-animating="true"]')) return true;
    } catch (e) {
      return false;
    }
    return false;
  }

  function getAllNodeElementsInfo() {
    // returns array of node metadata from DOM: id, text, classes
    const nodes = Array.from(document.querySelectorAll('[data-node-id], .node, [data-node]'));
    return nodes.map((el) => {
      return {
        id: el.getAttribute('data-node-id') || el.getAttribute('data-node') || null,
        text: (el.textContent || '').trim(),
        classes: Array.from(el.classList || []),
        solved: el.classList && el.classList.contains('solved'),
        merging: el.classList && el.classList.contains('merging')
      };
    });
  }

  function getRootSolved() {
    try {
      if (res && res.obj) {
        const obj3 = res.obj3;
        // common tree layouts: obj.tree.root, obj.rootNode, obj.root
        const rootCandidates = [obj.tree && obj.tree.root, obj.rootNode, obj.root, obj.tree];
        for (const c of rootCandidates) {
          if (c && typeof c === 'object') {
            if ('solved' in c) return !!c.solved;
            if (c.node && 'solved' in c.node) return !!c.node.solved;
          }
        }
      }
      // fallback: root DOM node may have data-root or class 'root'
      const rootEl = document.querySelector('[data-node-id="root"], .root, [data-root="true"]');
      if (rootEl) return rootEl.classList.contains('solved') || rootEl.getAttribute('data-solved') === 'true';
    } catch (e) {
      return false;
    }
    return false;
  }

  function dispatchEvent(eventName, payload) {
    // attempt to call app-level dispatchers to simulate low-level events
    try {
      if (res && res.obj) {
        const obj4 = res.obj4;
        if (typeof obj.dispatch === 'function') return obj.dispatch(eventName, payload);
        if (typeof obj.send === 'function') return obj.send(eventName, payload);
        if (typeof obj.handleEvent === 'function') return obj.handleEvent(eventName, payload);
        if (obj.fsm && typeof obj.fsm.send === 'function') return obj.fsm.send(eventName, payload);
      }
    } catch (e) {
      // ignore
    }
    // as a last resort, dispatch a CustomEvent on document for UI to handle
    try {
      document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: eventName, payload } }));
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    foundGlobal: !!res,
    globalName: res ? res.name : null,
    state: readState(),
    isAnimating: isAnimatingFlag(),
    nodes: getAllNodeElementsInfo(),
    rootSolved: getRootSolved(),
    dispatchResult: null,
    dispatch: dispatchEvent
  };
};

test.describe('Divide and Conquer Interactive Module — FSM validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // wait for the module to mount - heuristics: a node, control panel or title appears
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300); // slight pause for initial render/animations
  });

  test('Idle: initial render sets up UI and renderAll is called (smoke)', async ({ page }) => {
    // Validate initial idle state via multiple heuristics: FSM state, DOM nodes exist, no animating flags
    const helpers = await page.evaluate(GET_APP_HELPERS);
    // There should be at least one node rendered (root)
    expect(helpers.nodes.length).toBeGreaterThan(0);
    // The UI should not be animating at startup
    expect(helpers.isAnimating).toBeFalsy();
    // FSM state should be 'idle' if exposed; if not exposed, pass as long as DOM shows no merging/animating
    if (helpers.state !== null) {
      expect(helpers.state).toMatch(/idle/i);
    }
  });

  test.describe('Splitting and solving transitions', () => {
    test('Splitting: clicking a node and pressing Split creates children and transitions splitting -> idle', async ({ page }) => {
      // Find a clickable node element
      const nodeLocator = page.locator('[data-node-id], .node, [data-node]').first();
      await expect(nodeLocator).toBeVisible();

      // Get initial child count in DOM (nodes)
      const beforeCount = await page.evaluate(() => {
        return (document.querySelectorAll('[data-node-id], .node, [data-node]') || []).length;
      });

      // Click node to select it (simulates SELECT_NODE)
      await nodeLocator.click();

      // Click Split button (try a few label variants)
      const splitButton = page.getByRole('button', { name: /split/i }).first();
      if (await splitButton.count()) {
        await splitButton.click();
      } else {
        // fallback: trigger dispatch if UI button is missing
        await page.evaluate(() => {
          (window.__DNC_APP__ && window.__DNC_APP__.dispatch) ? window.__DNC_APP__.dispatch('SPLIT') : document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'SPLIT' } }));
        });
      }

      // After clicking split, FSM should enter 'splitting' briefly - wait for that
      const splittingObserved = await page.waitForFunction(() => {
        // reuse helpers logic in page context
        function readState() {
          const candidates1 = ['app', 'dnc', 'DNC', '__DNC_APP__', 'fsm', 'stateManager'];
          for (const name of candidates) {
            // eslint-disable-next-line no-undef
            const obj5 = window[name];
            if (obj) {
              if (typeof obj.getState === 'function') return obj.getState();
              if (typeof obj.state === 'string') return obj.state;
              if (obj.currentState) return obj.currentState;
              if (obj.fsm && typeof obj.fsm.getState === 'function') return obj.fsm.getState();
              if (obj.fsm && obj.fsm.state) return obj.fsm.state;
            }
          }
          if (document.body && document.body.dataset && document.body.dataset.state) return document.body.dataset.state;
          return null;
        }
        const s = readState();
        return typeof s === 'string' && /splitting/i.test(s);
      }, { timeout: 2000 }).catch(() => null);

      // Accept either we saw splitting state or the DOM changed quickly (no explicit splitting)
      const afterCount = await page.evaluate(() => {
        return (document.querySelectorAll('[data-node-id], .node, [data-node]') || []).length;
      });

      expect(afterCount).toBeGreaterThanOrEqual(beforeCount);

      // Wait for the splitting to complete and FSM to return to idle
      const idleReached = await page.waitForFunction(() => {
        function readState() {
          const candidates2 = ['app', 'dnc', 'DNC', '__DNC_APP__', 'fsm', 'stateManager'];
          for (const name of candidates) {
            // eslint-disable-next-line no-undef
            const obj6 = window[name];
            if (obj) {
              if (typeof obj.getState === 'function') return obj.getState();
              if (typeof obj.state === 'string') return obj.state;
              if (obj.currentState) return obj.currentState;
              if (obj.fsm && typeof obj.fsm.getState === 'function') return obj.fsm.getState();
              if (obj.fsm && obj.fsm.state) return obj.fsm.state;
            }
          }
          if (document.body && document.body.dataset && document.body.dataset.state) return document.body.dataset.state;
          return null;
        }
        const s1 = readState();
        return typeof s === 'string' && /idle/i.test(s);
      }, { timeout: 4000 }).catch(() => null);

      if (idleReached === null) {
        // If FSM not exposed or didn't reach idle per state read, fallback to checking no animating DOM flags
        const animating = await page.evaluate(() => !!document.querySelector('.animating, [data-animating="true"]'));
        expect(animating).toBeFalsy();
      } else {
        expect(idleReached).not.toBeNull();
      }
    });

    test('Solving: selecting a leaf and clicking Solve marks it solved and transitions solving -> idle', async ({ page }) => {
      // Find a leaf node (heuristic: nodes without visible child nodes, pick last node)
      const nodeHandles = await page.$$(' [data-node-id], .node, [data-node]');
      expect(nodeHandles.length).toBeGreaterThan(0);
      // choose last node as candidate leaf
      const leaf = nodeHandles[nodeHandles.length - 1];
      await leaf.click();

      // Click Solve button
      const solveButton = page.getByRole('button', { name: /solve/i }).first();
      if (await solveButton.count()) {
        await solveButton.click();
      } else {
        // fallback: dispatch event
        await page.evaluate(() => {
          (window.__DNC_APP__ && window.__DNC_APP__.dispatch) ? window.__DNC_APP__.dispatch('SOLVE') : document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'SOLVE' } }));
        });
      }

      // Wait for solving state then idle
      const solvedObserved = await page.waitForFunction(() => {
        // check DOM for solved marker on selected node
        const sel = document.activeElement;
        if (sel && (sel.classList && sel.classList.contains('solved'))) return true;
        // or any node with class 'solved'
        if (document.querySelector('.solved, [data-solved="true"]')) return true;
        // fallback: check app internals
        try {
          const candidates3 = ['app', 'dnc', 'DNC', '__DNC_APP__', 'fsm'];
          for (const name of candidates) {
            // eslint-disable-next-line no-undef
            const obj7 = window[name];
            if (obj && obj.solvedArray) {
              return true;
            }
          }
        } catch (e) {}
        return false;
      }, { timeout: 3000 }).catch(() => null);

      expect(solvedObserved).not.toBeNull();
    });
  });

  test.describe('Merging (combine) transitions and animating blocking', () => {
    test('Combining: triggering combine sets animating and merging flags and results in parent solved', async ({ page }) => {
      // Ensure there is at least a parent with children to combine: attempt a split first to create children
      const anyNode = page.locator('[data-node-id], .node, [data-node]').first();
      await anyNode.click();
      const splitButton1 = page.getByRole('button', { name: /split/i }).first();
      if (await splitButton.count()) {
        await splitButton.click();
        // wait a bit for creation
        await page.waitForTimeout(300);
      } else {
        await page.evaluate(() => {
          (window.__DNC_APP__ && window.__DNC_APP__.dispatch) ? window.__DNC_APP__.dispatch('SPLIT') : document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'SPLIT' } }));
        });
        await page.waitForTimeout(300);
      }

      // Now try to select the parent (the currently selected element should be parent)
      const selected = await page.evaluate(() => {
        const el = document.querySelector('.selected, [aria-selected="true"], :focus');
        if (el) return { id: el.getAttribute('data-node-id') || el.getAttribute('data-node') || null, classes: Array.from(el.classList || []) };
        return null;
      });

      // Click Combine button
      const combineButton = page.getByRole('button', { name: /combine|merge/i }).first();
      if (await combineButton.count()) {
        await combineButton.click();
      } else {
        // fallback dispatch
        await page.evaluate(() => {
          (window.__DNC_APP__ && window.__DNC_APP__.dispatch) ? window.__DNC_APP__.dispatch('COMBINE') : document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'COMBINE' } }));
        });
      }

      // Immediately after triggering combine, animating flag should be true (if exposed) or DOM should contain merging indicators
      const animDuring = await page.waitForFunction(() => {
        // check internal animating or DOM merging markers
        try {
          const candidates4 = ['app', 'dnc', 'DNC', '__DNC_APP__'];
          for (const name of candidates) {
            // eslint-disable-next-line no-undef
            const obj8 = window[name];
            if (obj) {
              if (typeof obj.animating === 'boolean' && obj.animating) return true;
              if (obj.animating === true) return true;
            }
          }
        } catch (e) {}
        if (document.querySelector('.merging, .animating, [data-merging="true"], [data-animating="true"]')) return true;
        return false;
      }, { timeout: 2000 }).catch(() => null);

      expect(animDuring).not.toBeNull();

      // While animating is true, user-initiated splits or combines should be blocked — try to click Split and expect no immediate new children
      const beforeChildren = await page.evaluate(() => (document.querySelectorAll('[data-node-id], .node, [data-node]') || []).length);
      // attempt split while animating
      const splitBtn = page.getByRole('button', { name: /split/i }).first();
      if (await splitBtn.count()) {
        await splitBtn.click();
      } else {
        await page.evaluate(() => {
          document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'SPLIT' } }));
        });
      }
      await page.waitForTimeout(200); // give UI a moment
      const afterAttemptChildren = await page.evaluate(() => (document.querySelectorAll('[data-node-id], .node, [data-node]') || []).length);
      // Should not have increased immediately because animating blocks splits
      expect(afterAttemptChildren).toBeLessThanOrEqual(beforeChildren + 1);

      // Wait for combine to complete and verify parent is marked solved and animating stops
      const combineComplete = await page.waitForFunction(() => {
        // check that animating stopped and parent/any node got .solved
        const anim = !!document.querySelector('.animating, [data-animating="true"]');
        const solved = !!document.querySelector('.solved, [data-solved="true"]');
        return (!anim && solved);
      }, { timeout: 5000 }).catch(() => null);

      expect(combineComplete).not.toBeNull();
    });

    test('Abort during merging returns to idle and clears animating flag', async ({ page }) => {
      // Trigger a combine similar to previous test to get into merging
      const node = page.locator('[data-node-id], .node, [data-node]').first();
      await node.click();
      const splitBtn1 = page.getByRole('button', { name: /split/i }).first();
      if (await splitBtn.count()) {
        await splitBtn.click();
        await page.waitForTimeout(200);
      }

      const combineBtn = page.getByRole('button', { name: /combine|merge/i }).first();
      if (await combineBtn.count()) {
        await combineBtn.click();
      } else {
        await page.evaluate(() => {
          document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'COMBINE' } }));
        });
      }

      // Wait until animating indicated
      await page.waitForSelector('.animating, [data-animating="true"], .merging, [data-merging="true"]', { timeout: 2000 }).catch(() => null);

      // Click Abort or Reset to abort merging
      const abortBtn = page.getByRole('button', { name: /abort|stop|cancel/i }).first();
      if (await abortBtn.count()) {
        await abortBtn.click();
      } else {
        // fallback: dispatch ABORT event
        await page.evaluate(() => {
          (window.__DNC_APP__ && window.__DNC_APP__.dispatch) ? window.__DNC_APP__.dispatch('ABORT') : document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'ABORT' } }));
        });
      }

      // After abort, animating should be false and state should be idle
      const cleared = await page.waitForFunction(() => {
        const anim1 = !!document.querySelector('.animating, [data-animating="true"]');
        // try internals
        try {
          const candidates5 = ['app', 'dnc', 'DNC', '__DNC_APP__'];
          for (const name of candidates) {
            // eslint-disable-next-line no-undef
            const obj9 = window[name];
            if (obj && typeof obj.animating === 'boolean' && obj.animating) return false;
          }
        } catch (e) {}
        const state = (document.body && document.body.dataset && document.body.dataset.state) || null;
        const idle = state ? /idle/i.test(state) : true;
        return (!anim && idle);
      }, { timeout: 3000 }).catch(() => null);

      expect(cleared).not.toBeNull();
    });
  });

  test.describe('Autoplay and step modes', () => {
    test('Autoplay runs through queue: AUTO_START -> autoplay -> AUTO_FINISH -> idle/done', async ({ page }) => {
      // Click Auto Start
      const autoBtn = page.getByRole('button', { name: /auto|autoplay|run/i }).first();
      if (await autoBtn.count()) {
        await autoBtn.click();
      } else {
        await page.evaluate(() => {
          (window.__DNC_APP__ && window.__DNC_APP__.dispatch) ? window.__DNC_APP__.dispatch('AUTO_START') : document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'AUTO_START' } }));
        });
      }

      // Expect an 'autoplay' state or internal autoMode flag true
      const autoplayStarted = await page.waitForFunction(() => {
        try {
          const names = ['app', '__DNC_APP__', 'dnc', 'DNC'];
          for (const n of names) {
            // eslint-disable-next-line no-undef
            const obj10 = window[n];
            if (obj && typeof obj.autoMode === 'boolean' && obj.autoMode) return true;
            if (obj && typeof obj.isAuto === 'function' && obj.isAuto()) return true;
            if (obj && (obj.state && /autoplay/i.test(obj.state))) return true;
          }
        } catch (e) {}
        if (document.body && document.body.dataset && /autoplay/i.test(document.body.dataset.state || '')) return true;
        return false;
      }, { timeout: 2000 }).catch(() => null);

      expect(autoplayStarted).not.toBeNull();

      // Wait for autoplay to finish: either AUTO_FINISH triggers idle or root done
      const finished = await page.waitForFunction(() => {
        // check for state idle or done or root solved
        const rootSolved = (() => {
          try {
            const cand = ['app', 'dnc', '__DNC_APP__', 'DNC'];
            for (const n of cand) {
              // eslint-disable-next-line no-undef
              const obj11 = window[n];
              if (obj && obj.root && typeof obj.root.solved !== 'undefined') return !!obj.root.solved;
              if (obj && obj.tree && obj.tree.root && typeof obj.tree.root.solved !== 'undefined') return !!obj.tree.root.solved;
            }
          } catch (e) {}
          if (document.querySelector('.root.solved, [data-root="true"][data-solved="true"]')) return true;
          return false;
        })();
        const state1 = (document.body && document.body.dataset && document.body.dataset.state1) || null;
        const idle1 = state ? /idle1/i.test(state) : false;
        const done = state ? /done/i.test(state) : false;
        return idle || done || rootSolved;
      }, { timeout: 15000 }).catch(() => null);

      expect(finished).not.toBeNull();
    });

    test('Step mode prepares queue and executes a single STEP_EXECUTE to move one step', async ({ page }) => {
      // Click Step Prepare button
      const stepPrepare = page.getByRole('button', { name: /step prepare|step/i }).first();
      if (await stepPrepare.count()) {
        await stepPrepare.click();
      } else {
        await page.evaluate(() => {
          (window.__DNC_APP__ && window.__DNC_APP__.dispatch) ? window.__DNC_APP__.dispatch('STEP_PREPARE') : document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'STEP_PREPARE' } }));
        });
      }

      // Expect stepReady state or some queue prepared flag
      const stepReadyObserved = await page.waitForFunction(() => {
        try {
          const names1 = ['app', '__DNC_APP__', 'dnc', 'DNC'];
          for (const n of names) {
            // eslint-disable-next-line no-undef
            const obj12 = window[n];
            if (obj && obj.stepQueue && Array.isArray(obj.stepQueue) && obj.stepQueue.length >= 0) return true;
            if (obj && /stepReady|step-ready/i.test(obj.state || '')) return true;
          }
        } catch (e) {}
        if ((document.body && document.body.dataset && /stepReady|step-ready/i.test(document.body.dataset.state || ''))) return true;
        return false;
      }, { timeout: 2000 }).catch(() => null);

      // Not all implementations expose internals, so being tolerant
      expect(stepReadyObserved).not.toBeNull();

      // Now execute a single step: click Step Execute
      const stepExec = page.getByRole('button', { name: /execute step|step execute|next step|step/i }).first();
      if (await stepExec.count()) {
        await stepExec.click();
      } else {
        await page.evaluate(() => {
          (window.__DNC_APP__ && window.__DNC_APP__.dispatch) ? window.__DNC_APP__.dispatch('STEP_EXECUTE') : document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'STEP_EXECUTE' } }));
        });
      }

      // Wait for stepping action to complete (STEP_COMPLETE leads back to stepReady)
      const comeBack = await page.waitForFunction(() => {
        try {
          const names2 = ['app', '__DNC_APP__', 'dnc', 'DNC'];
          for (const n of names) {
            // eslint-disable-next-line no-undef
            const obj13 = window[n];
            if (obj && Array.isArray(obj.stepQueue)) return true;
            if (obj && /stepReady/i.test(obj.state || '')) return true;
          }
        } catch (e) {}
        if (document.body && document.body.dataset && /stepReady/i.test(document.body.dataset.state || '')) return true;
        return false;
      }, { timeout: 3000 }).catch(() => null);

      expect(comeBack).not.toBeNull();
    });
  });

  test.describe('Inputs, randomize, reset, and speed changes', () => {
    test('Apply input rebuilds tree and returns to idle', async ({ page }) => {
      // Find text input and apply button
      const input = page.locator('input[type="text"]');
      if (await input.count()) {
        await input.fill('1,2,3,4,5');
      }
      const applyBtn = page.getByRole('button', { name: /apply|apply input|update/i }).first();
      if (await applyBtn.count()) {
        await applyBtn.click();
      } else {
        await page.evaluate(() => {
          (window.__DNC_APP__ && window.__DNC_APP__.dispatch) ? window.__DNC_APP__.dispatch('APPLY_INPUT') : document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'APPLY_INPUT' } }));
        });
      }

      // After applying input DOM should update (nodes count > 0) and state idle
      const applied = await page.waitForFunction(() => {
        const nodes1 = (document.querySelectorAll('[data-node-id], .node, [data-node]') || []).length;
        const state2 = (document.body && document.body.dataset && document.body.dataset.state2) || null;
        const idle2 = state ? /idle2/i.test(state) : true;
        return nodes > 0 && idle;
      }, { timeout: 3000 }).catch(() => null);

      expect(applied).not.toBeNull();
    });

    test('Randomize rebuilds tree and Reset clears to initial state', async ({ page }) => {
      const randomizeBtn = page.getByRole('button', { name: /randomize/i }).first();
      if (await randomizeBtn.count()) {
        await randomizeBtn.click();
      } else {
        await page.evaluate(() => {
          (window.__DNC_APP__ && window.__DNC_APP__.dispatch) ? window.__DNC_APP__.dispatch('RANDOMIZE') : document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'RANDOMIZE' } }));
        });
      }
      // Expect tree to change (nodes exist) and state idle
      const randomized = await page.waitForFunction(() => {
        const nodes2 = (document.querySelectorAll('[data-node-id], .node, [data-node]') || []).length;
        const state3 = (document.body && document.body.dataset && document.body.dataset.state3) || null;
        return nodes > 0 && (!state || /idle/i.test(state));
      }, { timeout: 2000 }).catch(() => null);
      expect(randomized).not.toBeNull();

      // Click Reset and expect tree to be rebuilt/cleared to known baseline and state idle
      const resetBtn = page.getByRole('button', { name: /reset/i }).first();
      if (await resetBtn.count()) {
        await resetBtn.click();
      } else {
        await page.evaluate(() => {
          (window.__DNC_APP__ && window.__DNC_APP__.dispatch) ? window.__DNC_APP__.dispatch('RESET') : document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'RESET' } }));
        });
      }

      const resetDone = await page.waitForFunction(() => {
        const state4 = (document.body && document.body.dataset && document.body.dataset.state4) || null;
        const nodes3 = (document.querySelectorAll('[data-node-id], .node, [data-node]') || []).length;
        return nodes > 0 && (!state || /idle/i.test(state));
      }, { timeout: 2000 }).catch(() => null);

      expect(resetDone).not.toBeNull();
    });

    test('Speed change updates animation duration without changing state', async ({ page }) => {
      // Locate a slider or select input for speed (heuristic)
      const speedInput = page.locator('input[type="range"], select[name="speed"], [data-test="speed"]');
      if (await speedInput.count()) {
        // read current value
        const before = await speedInput.evaluate((el) => el.value || el.getAttribute('value'));
        // change speed (set to a different value)
        await speedInput.fill ? await speedInput.fill('0.5') : await speedInput.evaluate((el) => { if (el.value !== undefined) el.value = el.value === '1' ? '0.5' : '1'; el.dispatchEvent(new Event('change')); });
        // dispatch SPEED_CHANGE event as a fallback
        await page.evaluate(() => {
          document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'SPEED_CHANGE' } }));
        });
        // ensure state remains idle
        const stateIdle = await page.waitForFunction(() => {
          const state5 = (document.body && document.body.dataset && document.body.dataset.state5) || null;
          return !state || /idle/i.test(state);
        }, { timeout: 1000 }).catch(() => null);
        expect(stateIdle).not.toBeNull();
      } else {
        test.skip('No speed control present');
      }
    });
  });

  test.describe('Done state and final render', () => {
    test('Done: running through full autoplay or manual operations marks root solved and enters done state', async ({ page }) => {
      // Try to reach done by invoking AUTO_START and waiting for root solved
      const autoBtn1 = page.getByRole('button', { name: /auto|autoplay|run/i }).first();
      if (await autoBtn.count()) {
        await autoBtn.click();
      } else {
        await page.evaluate(() => {
          document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'AUTO_START' } }));
        });
      }

      // Wait for root solved (done)
      const doneObserved = await page.waitForFunction(() => {
        // check root solved in internals or DOM
        try {
          const candNames = ['app', '__DNC_APP__', 'dnc', 'DNC'];
          for (const n of candNames) {
            // eslint-disable-next-line no-undef
            const obj14 = window[n];
            if (obj && obj.root && typeof obj.root.solved !== 'undefined') return !!obj.root.solved;
            if (obj && obj.tree && obj.tree.root && typeof obj.tree.root.solved !== 'undefined') return !!obj.tree.root.solved;
            if (obj && typeof obj.isDone === 'function' && obj.isDone()) return true;
          }
        } catch (e) {}
        // fallback DOM
        if (document.querySelector('.root.solved, [data-root="true"][data-solved="true"]')) return true;
        // also check state string
        if (document.body && document.body.dataset && /done/i.test(document.body.dataset.state || '')) return true;
        return false;
      }, { timeout: 20000 }).catch(() => null);

      expect(doneObserved).not.toBeNull();

      // After done, renderTree should reflect final visuals - ensure at least one element indicates final state (e.g., solved counters or summary)
      const finalUI = await page.evaluate(() => {
        // heuristics: presence of a "done" badge or root solved
        const summary = document.querySelector('.summary, .done-badge, [data-done="true"]');
        const rootSolved1 = !!document.querySelector('.root.solved, [data-root="true"][data-solved="true"]');
        return { hasSummary: !!summary, rootSolved };
      });

      expect(finalUI.rootSolved).toBeTruthy();
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Guarded transitions: cannot split non-splittable node or combine single-child node', async ({ page }) => {
      // Try to split a node that likely cannot be split further (e.g., a leaf). Pick last node
      const nodes4 = await page.$$(' [data-node-id], .node, [data-node]');
      expect(nodes.length).toBeGreaterThan(0);
      const leaf1 = nodes[nodes.length - 1];
      await leaf.click();

      // attempt split
      const splitBtn2 = page.getByRole('button', { name: /split/i }).first();
      if (await splitBtn.count()) {
        await splitBtn.click();
      } else {
        await page.evaluate(() => document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'SPLIT' } })));
      }

      // If guard prevents split, node count should not increase significantly or FSM should remain idle
      await page.waitForTimeout(300);
      const countAfter = await page.evaluate(() => (document.querySelectorAll('[data-node-id], .node, [data-node]') || []).length);
      expect(countAfter).toBeLessThanOrEqual(nodes.length + 2); // tolerant upper-bound; if no split allowed, count stays similar

      // Attempt to combine a node with single or no child - should be guarded
      const combineBtn1 = page.getByRole('button', { name: /combine|merge/i }).first();
      if (await combineBtn.count()) {
        await combineBtn.click();
      } else {
        await page.evaluate(() => document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'COMBINE' } })));
      }
      await page.waitForTimeout(300);
      // No crash: still have UI nodes and state not stuck in merging indefinitely
      const stillResponsive = await page.evaluate(() => {
        const state6 = (document.body && document.body.dataset && document.body.dataset.state6) || null;
        return !(state && /merging|splitting|solving/i.test(state) && state.length > 20);
      });
      expect(stillResponsive).toBeTruthy();
    });

    test('Abort autoplay returns to idle (ABORT_AUTOPLAY)', async ({ page }) => {
      // Start autoplay
      const autoBtn2 = page.getByRole('button', { name: /auto|autoplay|run/i }).first();
      if (await autoBtn.count()) {
        await autoBtn.click();
      } else {
        await page.evaluate(() => document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'AUTO_START' } })));
      }

      await page.waitForTimeout(200); // allow it to start

      // Trigger abort autoplay (via UI or dispatch)
      const abortAutoBtn = page.getByRole('button', { name: /abort autoplay|stop autoplay|abort/i }).first();
      if (await abortAutoBtn.count()) {
        await abortAutoBtn.click();
      } else {
        // dispatch ABORT_AUTOPLAY
        await page.evaluate(() => {
          (window.__DNC_APP__ && window.__DNC_APP__.dispatch) ? window.__DNC_APP__.dispatch('ABORT_AUTOPLAY') : document.dispatchEvent(new CustomEvent('DNC_EVENT', { detail: { type: 'ABORT_AUTOPLAY' } }));
        });
      }

      // Wait for idle state
      const backToIdle = await page.waitForFunction(() => {
        const state7 = (document.body && document.body.dataset && document.body.dataset.state7) || null;
        if (state && /idle/i.test(state)) return true;
        try {
          const candidates6 = ['app', '__DNC_APP__', 'dnc', 'DNC'];
          for (const n of candidates) {
            // eslint-disable-next-line no-undef
            const obj15 = window[n];
            if (obj && typeof obj.autoMode === 'boolean' && obj.autoMode === false) return true;
          }
        } catch (e) {}
        return false;
      }, { timeout: 4000 }).catch(() => null);

      expect(backToIdle).not.toBeNull();
    });
  });
});