/* @jsxImportSource solid-js */
import { createService } from '../src/fsm';
import { createMachine, assign, interpret, StateMachine } from '@xstate/fsm';
import {
  screen,
  render,
  fireEvent,
  waitFor
} from 'solid-testing-library';
import {
  createEffect,
  createSignal,
  onMount,
  Switch,
  Match,
  on
} from 'solid-js';

describe('useMachine hook for fsm', () => {
  const context = {
    data: undefined
  };
  const fetchMachine = createMachine<typeof context, any>({
    id: 'fetch',
    initial: 'idle',
    context,
    states: {
      idle: {
        on: { FETCH: 'loading' }
      },
      loading: {
        entry: ['load'],
        on: {
          RESOLVE: {
            target: 'success',
            actions: assign({
              data: (_, e) => e.data
            })
          }
        }
      },
      success: {}
    }
  });

  const Fetcher = ({
    onFetch = () => new Promise((res) => res('some data'))
  }: {
    onFetch: () => Promise<any>;
  }) => {
    const {state, send} = createService(fetchMachine, {
      actions: {
        load: () =>
          onFetch().then((res) => {
            send({ type: 'RESOLVE', data: res });
          })
      }
    });

    return (
      <Switch fallback={null}>
        <Match when={state.matches('idle')}>
          <button onclick={(_) => send('FETCH')}>Fetch</button>;
        </Match>
        <Match when={state.matches('loading')}>
          <div>Loading...</div>
        </Match>
        <Match when={state.matches('success')}>
          Success! Data: <div data-testid="data">{state.context.data}</div>
        </Match>
      </Switch>
    );
  };

  it('should work with the useMachine hook', async () => {
    render(() => (
      <Fetcher onFetch={() => new Promise((res) => res('fake data'))} />
    ));
    const button = screen.getByText('Fetch');
    fireEvent.click(button);
    screen.getByText('Loading...');
    await waitFor(() => screen.getByText(/Success/));
    const dataEl = screen.getByTestId('data');
    expect(dataEl.textContent).toBe('fake data');
  });

  it('should provide the service', () => {
    const Test = () => {
      const service = createService(fetchMachine);

      expect(typeof service.send).toBe('function');

      return null;
    };

    render(() => <Test />);
  });

  it('actions should not have stale data', (done) => {
    const toggleMachine = createMachine({
      initial: 'inactive',
      states: {
        inactive: {
          on: { TOGGLE: 'active' }
        },
        active: {
          entry: 'doAction'
        }
      }
    });

    const Toggle = () => {
      const [ext, setExt] = createSignal(false);

      const doAction = () => {
        expect(ext()).toBeTruthy();
        done();
      };

      const {send} = createService(toggleMachine, {
        actions: {
          doAction
        }
      });

      return (
        <div>
          <button
            data-testid="extbutton"
            onClick={(_) => {
              setExt(true);
            }}
          />
          <button
            data-testid="button"
            onClick={(_) => {
              send('TOGGLE');
            }}
          />
        </div>
      );
    };

    render(() => <Toggle />);

    const button = screen.getByTestId('button');
    const extButton = screen.getByTestId('extbutton');
    fireEvent.click(extButton);

    fireEvent.click(button);
  });

  it('should keep options defined on a machine when they are not possed to `useMachine` hook', (done) => {
    let actual = false;

    const toggleMachine = createMachine(
      {
        initial: 'inactive',
        states: {
          inactive: {
            on: { TOGGLE: 'active' }
          },
          active: {
            entry: 'doAction'
          }
        }
      },
      {
        actions: {
          doAction() {
            actual = true;
          }
        }
      }
    );

    const Comp = () => {
      const {send} = createService(toggleMachine);
      onMount(() => {
        send('TOGGLE');
        expect(actual).toEqual(true);
        done();
      });

      return null;
    };

    render(() => <Comp />);
  });

  it('should be able to lookup initial action passed to the hook', (done) => {
    let outer = false;

    const machine = createMachine(
      {
        initial: 'foo',
        states: {
          foo: {
            entry: 'doAction'
          }
        }
      },
      {
        actions: {
          doAction() {
            outer = true;
          }
        }
      }
    );

    const Comp = () => {
      let inner = false;

      createService(machine, {
        actions: {
          doAction() {
            inner = true;
          }
        }
      });

      onMount(() => {
        expect(outer).toBe(false);
        expect(inner).toBe(true);
        done();
      });

      return null;
    };

    render(() => <Comp />);
  });

  it('should not change actions configured on a machine itself', () => {
    let flag = false;

    const machine = createMachine(
      {
        initial: 'foo',
        states: {
          foo: {
            on: {
              EV: 'bar'
            }
          },
          bar: {
            entry: 'doAction'
          }
        }
      },
      {
        actions: {
          doAction() {
            flag = true;
          }
        }
      }
    );

    const Comp = () => {
      createService(machine, {
        actions: {
          doAction() {
            //
          }
        }
      });

      return null;
    };

    render(() => <Comp />);

    const service = interpret(machine).start();
    service.send('EV');
    expect(flag).toBe(true);
  });

  it('should capture only nested value update', (done) => {
    const machine = createMachine<
      { item: { count: number; total: number } },
      { type: 'COUNT' } | { type: 'TOTAL' }
    >({
      initial: 'active',
      context: {
        item: {
          count: 0,
          total: 0
        }
      },
      states: {
        active: {
          on: {
            COUNT: {
              actions: [
                assign({
                  item: (ctx) => ({ ...ctx.item, count: ctx.item.count + 1 })
                })
              ]
            },
            TOTAL: {
              actions: [
                assign({
                  item: (ctx) => ({ ...ctx.item, total: ctx.item.total + 1 })
                })
              ]
            }
          }
        }
      }
    });

    const App = () => {
      const [stateCount, setStateCount] = createSignal(0);
      const {state, send} = createService(machine);
      createEffect(
        on(
          () => state.context.item.count,
          () => {
            setStateCount((c) => c + 1);
          },
          { defer: true }
        )
      );
      onMount(() => {
        send('COUNT');
        send('TOTAL');
        send('COUNT');
        send('TOTAL');
      });

      return <div data-testid="count">{stateCount()}</div>;
    };

    render(() => <App />);

    const countEl = screen.getByTestId('count');

    // Effect should only trigger once for the COUNT events:
    expect(countEl.textContent).toEqual('1');
    done();
  });

  // Example from: https://github.com/davidkpiano/xstate/discussions/1944
  it('fsm useMachine service should be typed correctly', () => {
    interface Context {
      count?: number;
    }

    interface Event {
      type: 'READY';
    }

    type State =
      | {
          value: 'idle';
          context: Context & {
            count: undefined;
          };
        }
      | {
          value: 'ready';
          context: Context & {
            count: number;
          };
        };

    type Service = StateMachine.Service<Context, Event, State>;

    const machine = createMachine<Context, Event, State>({
      id: 'machine',
      initial: 'idle',
      context: {
        count: undefined
      },
      states: {
        idle: {},
        ready: {}
      }
    });

    const useCustomService = (service: Service) => createEffect(() => service);

    function App() {
      const service = createService(machine);

      useCustomService(service);

      return null;
    }

    const noop = (_val: any) => {
      /* ... */
    };

    noop(App);
  });
});
