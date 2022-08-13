# @xstate/solid

The [@xstate/solid package](https://github.com/statelyai/xstate/tree/main/packages/xstate-solid) contains utilities for using [XState](https://github.com/statelyai/xstate) with [SolidJS](https://github.com/solidjs/solid).

[[toc]]

## Quick Start

1. Install `xstate` and `@xstate/solid`:

```bash
npm i xstate @xstate/solid
```

**Via CDN**

```html
<script src="https://unpkg.com/@xstate/solid/dist/xstate-solid.umd.min.js"></script>
```

By using the global variable `XStateSolid`

or

```html
<script src="https://unpkg.com/@xstate/solid/dist/xstate-solid-fsm.umd.min.js"></script>
```

By using the global variable `XStateSolidFSM`

2. Import the `useMachine` hook:

```js
import { useMachine } from '@xstate/solid';
import { createMachine } from 'xstate';

const toggleMachine = createMachine({
  id: 'toggle',
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: 'active' }
    },
    active: {
      on: { TOGGLE: 'inactive' }
    }
  }
});

export const Toggler = () => {
  const {state, send} = useMachine(toggleMachine);

  return (
    <button onclick={() => send('TOGGLE')}>
      {state.value === 'inactive'
        ? 'Click to activate'
        : 'Active! Click to deactivate'}
    </button>
  );
};
```

## API

### `useMachine(machine, options?)`

A SolidJS hook that interprets the given `machine` and starts a service that runs for the lifetime of the component.

**Arguments**

- `machine` - An [XState machine](https://xstate.js.org/docs/guides/machines.html):

  ```js
  // existing machine
  const {state, send} = useMachine(machine);
  ```

- `options` (optional) - [Interpreter options](https://xstate.js.org/docs/guides/interpretation.html#options) and/or any of the following machine config options: `guards`, `actions`, `services`, `delays`, `immediate`, `context`, `state`.

**Returns** an object matching an Interpreter or service of `{state, send, subscribe, ...other service objects}`:

- `state` - Represents the current state of the machine as an XState `State` object. This is a read-only value that is tracked by SolidJS for granular reactivity.
- `send` - A function that sends events to the running service.

### `useActor(actor, getSnapshot?)`

A SolidJS hook that subscribes to emitted changes from an existing [actor](https://xstate.js.org/docs/guides/actors.html).

**Arguments**

- `actor` - an actor-like object that contains `.send(...)` and `.subscribe(...)` methods. Allows [SolidJS Signal](https://www.solidjs.com/docs/latest/api#createsignal) (or function) to dynamically specify an actor.
- `getSnapshot` - a function that should return the latest emitted value from the `actor`.
  - Defaults to attempting to get the `actor.state`, or returning `undefined` if that does not exist.

```js
const {state, send} = useActor(someSpawnedActor);

// with custom actors
const {state, send} = useActor(customActor, (actor) => {
  // implementation-specific pseudocode example:
  return actor.getLastEmittedValue();
});
```

### `useSelector(actor, selector, compare?, getSnapshot?)`

A SolidJS hook that returns the selected value from the snapshot of an `actor`, such as a service. This hook will only cause a rerender if the selected value changes, as determined by the optional `compare` function.

**Arguments**

- `actor` - a service or an actor-like object that contains `.send(...)` and `.subscribe(...)` methods. Allows [SolidJS Signal](https://www.solidjs.com/docs/latest/api#createsignal) (or function) to dynamically specify a service or actor.
- `selector` - a function that takes in an actor's "current state" (snapshot) as an argument and returns the desired selected value.
- `compare` (optional) - a function that determines if the current selected value is the same as the previous selected value.
- `getSnapshot` (optional) - a function that should return the latest emitted value from the `actor`.
  - Defaults to attempting to get the `actor.state`, or returning `undefined` if that does not exist. Will automatically pull the state from services.

**Returns**

- [SolidJS Signal](https://www.solidjs.com/docs/latest/api#createsignal) with the selected value.

```js
import { useSelector } from '@xstate/solid';

// Selectors can be defined outside or inside the component
const selectCount = (state) => state.context.count;

const App = (props) => {
  const count = useSelector(props.service, selectCount);

  count(); // the product of the selector
  // ...
};
```

With `compare` function:

```js
// ...

const selectUser = (state) => state.context.user;
const compareUser = (prevUser, nextUser) => prevUser.id === nextUser.id;

const App = (props) => {
  const user = useSelector(props.service, selectUser, compareUser);

  // ...
};
```

With `useInterpret(...)`:

```js
import { useInterpret, useSelector } from '@xstate/solid';
import { someMachine } from '../path/to/someMachine';

const selectCount = (state) => state.context.count;

const App = (props) => {
  const service = useInterpret(someMachine);
  const count = useSelector(service, selectCount);

  // ...
};
```

### `useMachine(machine)` with `@xstate/fsm`

A SolidJS hook that interprets the given finite state `machine` from [`@xstate/fsm`] and starts a service that runs for the lifetime of the component.

This special `useMachine` hook is imported from `@xstate/solid/fsm`

**Arguments**

- `machine` - An [XState finite state machine (FSM)](https://xstate.js.org/docs/packages/xstate-fsm/).
- `options` - An optional `options` object.

**Returns** an object matching an FSM Interpreter or service of `{state, send, ...other service objects}`:

- `state` - Represents the current state of the machine as an `@xstate/fsm` `StateMachine.State` object. This is a read-only value that is tracked by SolidJS for granular reactivity.
- `send` - A function that sends events to the running service.

**Example**

```js
import { useEffect } from 'solid-js';
import { useMachine } from '@xstate/solid/fsm';
import { createMachine } from '@xstate/fsm';

const context = {
  data: undefined
};
const fetchMachine = createMachine({
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
            data: (context, event) => event.data
          })
        }
      }
    },
    success: {}
  }
});

const Fetcher = ({
  onFetch = () => new Promise((res) => res('some data'))
}) => {
  const {state, send} = useMachine(fetchMachine, {
    actions: {
      load: () => {
        onFetch().then((res) => {
          send({ type: 'RESOLVE', data: res });
        });
      }
    }
  });

  return (
    <Switch fallback={null}>
      <Match when={state.value === 'idle'}>
        <button onclick={(_) => send('FETCH')}>Fetch</button>;
      </Match>
      <Match when={state.value === 'loading'}>
        <div>Loading...</div>;
      </Match>
      <Match when={state.value === 'success'}>
        Success! Data: <div data-testid="data">{state.context.data}</div>
      </Match>
    </Switch>
  );
};
```

## Configuring Machines

Existing machines can be configured by passing the machine options as the 2nd argument of `useMachine(machine, options)`.

Example: the `'fetchData'` service and `'notifySuccess'` action are both configurable:

```js
const fetchMachine = createMachine({
  id: 'fetch',
  initial: 'idle',
  context: {
    data: undefined,
    error: undefined
  },
  states: {
    idle: {
      on: { FETCH: 'loading' }
    },
    loading: {
      invoke: {
        src: 'fetchData',
        onDone: {
          target: 'success',
          actions: assign({
            data: (_, event) => event.data
          })
        },
        onError: {
          target: 'failure',
          actions: assign({
            error: (_, event) => event.data
          })
        }
      }
    },
    success: {
      entry: 'notifySuccess',
      type: 'final'
    },
    failure: {
      on: {
        RETRY: 'loading'
      }
    }
  }
});

const Fetcher = ({ onResolve }) => {
  const [state, send] = useMachine(fetchMachine, {
    actions: {
      notifySuccess: (ctx) => onResolve(ctx.data)
    },
    services: {
      fetchData: (_, e) =>
        fetch(`some/api/${e.query}`).then((res) => res.json())
    }
  });

  return (
    <Switch fallback={null}>
      <Match when={state.matches('idle')}>
        <button onClick={() => send('FETCH', { query: 'something' })}>
          Search for something
        </button>
      </Match>
      <Match when={state.matches('loading')}>
        <div>Searching...</div>
      </Match>
      <Match when={state.matches('success')}>
        <div>Success! Data: {state.context.data}</div>
      </Match>
      <Match when={state.matches('failure')}>
        <div>
          <p>{state.context.error.message}</p>
          <button onClick={() => send('RETRY')}>Retry</button>
        </div>
      </Match>
    </Switch>
  );
};
```

## Matching States

When using [hierarchical](https://xstate.js.org/docs/guides/hierarchical.html) and [parallel](https://xstate.js.org/docs/guides/parallel.html) machines, the state values will be objects, not strings. In this case, it is best to use [`state.matches(...)`](https://xstate.js.org/docs/guides/states.html#state-methods-and-getters).

The SolidJS [Switch and Match Components]() are ideal for this use case:

```jsx
const Loader = () => {
  const {state, send} = useMachine(/* ... */);

  return (
    <div>
      <Switch fallback={null}>
        <Match when={state.matches('idle')}>
          <Loader.Idle />
        </Match>
        <Match when={state.matches({ loading: 'user' })}>
          <Loader.LoadingUser />
        </Match>
        <Match when={state.matches({ loading: 'friends' })}>
          <Loader.LoadingFriends />
        </Match>
      </Switch>
    </div>
  );
};
```

## Persisted and Rehydrated State

You can persist and rehydrate state with `useMachine(...)` via `options.state`:

```js
// ...

// Get the persisted state config object from somewhere, e.g. localStorage
const persistedState = JSON.parse(localStorage.getItem('some-persisted-state-key')) || someMachine.initialState;

const App = () => {
  const {state, send} = useMachine(someMachine, {
    state: persistedState // provide persisted state config object here
  });

  // state will initially be that persisted state, not the machine's initialState

  return (/* ... */)
}
```

## Services
 `useMachine(machine)` returns the full service:

```js
//               
const service = useMachine(someMachine);
```

You can subscribe to that service's state changes with the [`createEffect` hook](https://www.solidjs.com/docs/latest/api#createeffect):

```js
// ...

createEffect(() => {
  const subscription = service.subscribe((state) => {
    // simple state logging
    console.log(state);
  });

  onCleanup(() => subscription.unsubscribe());
}); // note: service should never change
```
