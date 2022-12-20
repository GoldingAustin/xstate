import type { StateLike, AnyState } from 'xstate';
import type { CheckSnapshot } from './types';

export function isStateLike(state: any): state is StateLike<any> {
  return (
    typeof state === 'object' &&
    'value' in state &&
    'context' in state &&
    'event' in state &&
    '_event' in state
  );
}

function isState(state: any): state is AnyState {
  return isStateLike(state) && 'can' in state && 'matches' in state;
}

/**
 * Takes in an interpreter or actor ref and returns a State object with reactive
 * methods or if not State, the initial value passed in
 * @param state {AnyState | unknown}
 * @param nextStateObject {AnyState | undefined | unknown}
 */
export const deriveServiceState = <
  StateSnapshot extends AnyState,
  StateObject extends StateLike<any>,
  StateReturnType = CheckSnapshot<StateSnapshot>
>(
  state: StateSnapshot | unknown,
  nextStateObject: StateObject | unknown = state
): StateReturnType => {
  if (isState(state) && isStateLike(nextStateObject)) {
    return {
      ...(nextStateObject as object),
      toJSON() {
        return state.toJSON();
      },
      toStrings(...args: Parameters<StateSnapshot['toStrings']>) {
        return state.toStrings(args[0], args[1]);
      },
      can(...args: Parameters<StateSnapshot['can']>) {
        return state.can(args[0]);
      },
      hasTag(...args: Parameters<StateSnapshot['hasTag']>) {
        return state.hasTag(args[0]);
      },
      matches(...args: Parameters<StateSnapshot['matches']>) {
        return state.matches(args[0] as never);
      }
    } as StateReturnType;
  } else {
    return nextStateObject as StateReturnType;
  }
};
