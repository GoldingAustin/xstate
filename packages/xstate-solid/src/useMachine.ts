import type {
  AnyState,
  AnyStateMachine,
  StateFrom,
  InterpreterFrom,
  Prop
} from 'xstate';
import { InterpreterStatus, State } from 'xstate';
import type { CheckSnapshot, RestParams } from './types';
import { createService } from './createService';
import { onCleanup, onMount } from 'solid-js';
import { deriveServiceState } from './deriveServiceState';
import { createImmutable } from './createImmutable';

type UseMachineReturn<
  TMachine extends AnyStateMachine,
  TInterpreter = InterpreterFrom<TMachine>
> = [
  CheckSnapshot<StateFrom<TMachine>>,
  Prop<TInterpreter, 'send'>,
  TInterpreter
];

export function useMachine<TMachine extends AnyStateMachine>(
  machine: TMachine,
  ...[options = {}]: RestParams<TMachine>
): UseMachineReturn<TMachine> {
  const service = createService(machine, options);

  const getSnapshot = () => {
    if (service.status === InterpreterStatus.NotStarted) {
      return (options.state
        ? State.create(options.state)
        : service.machine.initialState) as AnyState;
    }

    return service.getSnapshot();
  };

  const [state, setState] = createImmutable(deriveServiceState(getSnapshot()));

  onMount(() => {
    const { unsubscribe } = service.subscribe((nextState) => {
      setState(
        deriveServiceState(getSnapshot(), nextState) as StateFrom<TMachine>
      );
    });

    onCleanup(unsubscribe);
  });

  return [state, service.send, service] as UseMachineReturn<TMachine>;
}
