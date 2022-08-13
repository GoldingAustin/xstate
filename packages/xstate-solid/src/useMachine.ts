import type {
  AnyStateMachine,
  InterpreterOptions,
  AreAllImplementationsAssumedToBeProvided,
  InternalMachineOptions,
  InterpreterFrom,
  StateFrom
} from 'xstate';
import type { SetStoreFunction } from 'solid-js/store';
import { createStore } from 'solid-js/store';
import type { UseMachineOptions, Prop } from './types';
import { createService } from './createService';
import { batch, onCleanup, onMount } from 'solid-js';
import { updateState } from './updateState';
import { Interpreter } from 'xstate';

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
        >
    ]
  : [
      options?: InterpreterOptions &
        UseMachineOptions<TMachine['__TContext'], TMachine['__TEvent']> &
        InternalMachineOptions<
          TMachine['__TContext'],
          TMachine['__TEvent'],
          TMachine['__TResolvedTypesMeta']
        >
    ];

export type UseMachineReturn<
  TMachine extends AnyStateMachine,
  TInterpreter = InterpreterFrom<TMachine>
> = [StateFrom<TMachine>, Prop<TInterpreter, 'send'>, TInterpreter];

export function useMachine<TMachine extends AnyStateMachine>(
  machine: TMachine,
  ...[options = {}]: RestParams<TMachine>
): InterpreterFrom<TMachine> & InstanceType<typeof Interpreter> {
  const service = createService(machine, options);

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
      batch(() => {
        updateState(
          nextState,
          setState as SetStoreFunction<StateFrom<AnyStateMachine>>
        );
      });
    });

    onCleanup(unsubscribe);
  });

  const newService = {...service, state };

  // Apply interpreter prototype methods to newService, destructuring breaks methods - need to bind
  for (const [name, method] of Object.entries(Interpreter.prototype)) {
    newService[name] = method.bind(newService);
  }

  return newService;
}
