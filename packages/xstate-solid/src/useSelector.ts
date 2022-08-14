import type { ActorRef, Subscribable } from 'xstate';
import { defaultGetSnapshot } from './useActor';
import type { Accessor } from 'solid-js';
import { createEffect, createMemo, on, onCleanup } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';

const isSnapshotSymbol: unique symbol = Symbol('is-xstate-solid-snapshot');
const snapshotKey = '_snapshot';
/**
 * Returns an object that can be used in a store
 * Handles primitives or objects.
 */
const setSnapshotValue = <Value extends object | unknown>(value: Value): object => {
  // If primitive, store in a unique object or return the value if an object
  return (typeof value === 'object' && value
    ? value
    : { [snapshotKey]: value, [isSnapshotSymbol]: true }) as object;
};

const getSnapshotValue = <ReturnValue>(state): ReturnValue =>
  snapshotKey in state && state[isSnapshotSymbol] ? state[snapshotKey] : state;

const defaultCompare = (a, b) => a === b;

export function useSelector<
  TActor extends ActorRef<any>,
  T,
  TEmitted = TActor extends Subscribable<infer Emitted> ? Emitted : never
>(
  actor: Accessor<TActor> | TActor,
  selector: (emitted: TEmitted) => T,
  compare: (a: T, b: T) => boolean = defaultCompare,
  getSnapshot: (a: TActor) => TEmitted = defaultGetSnapshot
): Accessor<T> {
  const actorMemo = createMemo<TActor>(
    typeof actor === 'function' ? actor : () => actor
  );

  const getActorSnapshot = (act: TActor): T => selector(getSnapshot(act));

  const [state, setState] = createStore(setSnapshotValue(getActorSnapshot(actorMemo())));

  const guardedUpdate = (emitted: TEmitted) => {
    const next = selector(emitted);
    if (!compare(getSnapshotValue(state), next)) {
      setState(reconcile(setSnapshotValue(next)));
    }
  };

  createEffect(
    on(
      // If the actor itself or snapshot value changes
      () => [actorMemo, getActorSnapshot(actorMemo())],
      () => {
        // Update with the latest actor
        guardedUpdate(getSnapshot(actorMemo()));
        const { unsubscribe } = actorMemo().subscribe((emitted) => {
          guardedUpdate(emitted);
        });
        onCleanup(unsubscribe);
      }
    )
  );

  return createMemo<T>(() => getSnapshotValue(state));
}
