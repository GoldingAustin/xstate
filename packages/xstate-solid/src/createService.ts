import type {
  AnyStateMachine,
  InterpreterOptions,
  AreAllImplementationsAssumedToBeProvided,
  InternalMachineOptions,
  InterpreterFrom,
  StateFrom
} from 'xstate';
import { createStore, reconcile } from 'solid-js/store';
import type { UseMachineOptions } from './types';
import { onCleanup, onMount } from 'solid-js';
import { interpret, Interpreter, Observer, State, toObserver } from 'xstate';

type RestParams<
  TMachine extends AnyStateMachine
  > = AreAllImplementationsAssumedToBeProvided<
  TMachine['__TResolvedTypesMeta']
  > extends false
  ? [
    options: InterpreterOptions &
      UseMachineOptions<TMachine['__TContext'], TMachine['__TEvent']> &
      InternalMachineOptions<
        TMachine['__TContext'],
        TMachine['__TEvent'],
        TMachine['__TResolvedTypesMeta'],
        true
        >,
    observerOrListener?:
      | Observer<
      State<
        TMachine['__TContext'],
        TMachine['__TEvent'],
        any,
        TMachine['__TTypestate'],
        TMachine['__TResolvedTypesMeta']
        >
      >
      | ((
      value: State<
        TMachine['__TContext'],
        TMachine['__TEvent'],
        any,
        TMachine['__TTypestate'],
        TMachine['__TResolvedTypesMeta']
        >
    ) => void)
  ]
  : [
    options?: InterpreterOptions &
      UseMachineOptions<TMachine['__TContext'], TMachine['__TEvent']> &
      InternalMachineOptions<
        TMachine['__TContext'],
        TMachine['__TEvent'],
        TMachine['__TResolvedTypesMeta']
        >,
    observerOrListener?:
      | Observer<
      State<
        TMachine['__TContext'],
        TMachine['__TEvent'],
        any,
        TMachine['__TTypestate'],
        TMachine['__TResolvedTypesMeta']
        >
      >
      | ((
      value: State<
        TMachine['__TContext'],
        TMachine['__TEvent'],
        any,
        TMachine['__TTypestate'],
        TMachine['__TResolvedTypesMeta']
        >
    ) => void)
  ];

export function createService<TMachine extends AnyStateMachine>(
  machine: TMachine,
  ...[options = {}, observerOrListener]: RestParams<TMachine>
): InterpreterFrom<TMachine> & InstanceType<typeof Interpreter> {
  const {
    context,
    guards,
    actions,
    activities,
    services,
    delays,
    state: rehydratedState,
    ...interpreterOptions
  } = options;

  const machineConfig = {
    context,
    guards,
    actions,
    activities,
    services,
    delays
  };

  const machineWithConfig = machine.withConfig(machineConfig as any, () => ({
    ...machine.context,
    ...context
  }));

  const service = interpret(machineWithConfig, interpreterOptions).start(
    rehydratedState ? (State.create(rehydratedState) as any) : undefined
  );

  onMount(() => {
    let sub;

    if (observerOrListener) {
      sub = service.subscribe(toObserver(observerOrListener));
    }

    onCleanup(() => {
      service.stop();
      sub?.unsubscribe();
    });
  });

  const [state, setState] = createStore<StateFrom<TMachine>>({
    ...service.state,
    toJSON() {
      return service.state.toJSON();
    },
    toStrings(...args: Parameters<StateFrom<TMachine>['toStrings']>) {
      return service.state.toStrings(args[0], args[1]);
    },
    can(...args: Parameters<StateFrom<TMachine>['can']>) {
      // tslint:disable-next-line:no-unused-expression
      state.value; // sets state.value to be tracked
      return service.state.can(args[0]);
    },
    hasTag(...args: Parameters<StateFrom<TMachine>['hasTag']>) {
      // tslint:disable-next-line:no-unused-expression
      state.tags; // sets state.tags to be tracked
      return service.state.hasTag(args[0]);
    },
    matches(...args: Parameters<StateFrom<TMachine>['matches']>) {
      // tslint:disable-next-line:no-unused-expression
      state.value; // sets state.value to be tracked
      return service.state.matches(args[0] as never);
    }
  } as StateFrom<TMachine>);

  onMount(() => {
    const { unsubscribe } = service.subscribe((nextState) => {
        setState(reconcile(nextState as StateFrom<TMachine>));
    });

    onCleanup(unsubscribe);
  });

  const newService = { ...service, state } as unknown as InterpreterFrom<TMachine>;

  // Apply interpreter prototype methods to newService, destructuring breaks methods - need to bind
  for (const [name, method] of Object.entries(Interpreter.prototype)) {
    newService[name] = method.bind(newService);
  }

  return newService;
}
