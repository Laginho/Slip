import { useCallback, useEffect, useRef, useState } from "react";
import {
  STORAGE_KEY,
  create,
  editText,
  load,
  persist,
  remove,
  restore,
  setDone,
  type Kind,
  type Task,
} from "./store";
import { merge, sync } from "./sync";

/** Long enough to coalesce a burst of captures, short enough to feel immediate. */
const SYNC_DEBOUNCE_MS = 1500;

/**
 * The pending undo. `snapshot` is the Task as it was *before* the action, which is all
 * restore() needs. `token` exists only to key the toast, so that two identical actions
 * in a row restart the five seconds instead of sharing one window.
 */
type Pending = {
  snapshot: Task;
  label: string;
  token: number;
};

/**
 * The session: the task list, its persistence boundary, the undo window, and the sync
 * loop. Everything stateful that is not layout lives here; App.tsx keeps the viewport
 * concerns (`wide`, `now`) and the rendering.
 */
export function useSession() {
  const [tasks, setTasks] = useState<Task[]>(load);
  const [pending, setPending] = useState<Pending | null>(null);
  const token = useRef(0);

  /**
   * Mutations read the list through this ref rather than the render closure.
   *
   * Store mutations must run outside setState -- they write to localStorage and mint
   * ids, and StrictMode double-invokes updaters -- but that leaves the render closure
   * as the only other source, and it goes stale. Two swipe flights landing in the same
   * tick would both compute from the same list and the first action would be lost.
   */
  const latest = useRef(tasks);
  const syncTimer = useRef<number | undefined>(undefined);

  /** The list has changed and storage already knows. Show it. */
  const adopt = useCallback((next: Task[]) => {
    latest.current = next;
    setTasks(next);
  }, []);

  /**
   * Set when a local write could not be persisted. Deliberately persistent: unlike the
   * undo toast it has no window to expire, because nothing clears it except a write
   * that actually lands -- the user must never be left believing an action was saved
   * when storage refused it.
   */
  const [saveError, setSaveError] = useState(false);

  /**
   * This session's list with whatever another same-origin window has persisted since
   * folded in -- an installed window beside a browser tab is two sessions over one
   * document. Every write starts from here, because writing from `latest.current`
   * alone replaces the document with a copy that predates the other window's saves and
   * loses them. The rule is the sync merge: union by id, newer stamp wins, so a Task
   * deleted or edited over there beats the stale copy held here.
   *
   * Returns `latest.current` itself when storage brought nothing new: merge() keeps the
   * local object for every Task it does not replace, so identity is preserved and a
   * no-op mutation still hands back the same reference.
   *
   * ponytail: read-merge-write is three synchronous steps, not one atomic one. Two
   * windows writing inside the same microseconds could still interleave; a human on
   * two windows never does. If that ceiling matters, elect one writer with the Web
   * Locks API.
   */
  const reconciled = useCallback((): Task[] => {
    const held = latest.current;
    const merged = merge(held, load());
    const same = merged.length === held.length && merged.every((t, i) => t === held[i]);
    return same ? held : merged;
  }, []);

  /**
   * A sync result coming home, re-merged into the list as it stands *now*.
   *
   * The result was computed from a snapshot taken before the round trip, and the user can
   * capture, complete or delete a Task while it is in the air -- opening the app and
   * typing straight away is the ordinary case, not a rare one. Adopting the result
   * directly would replace the list with one computed before those changes existed, and
   * the next sync would persist that, erasing them for good. Re-merging is the fix, and
   * it is the same union rule as everywhere else: for any Task the two sides disagree
   * about, the higher updatedAt wins, and a local change made during the flight is by
   * definition stamped later than the snapshot it is being merged against.
   *
   * Persistence lives here rather than in sync(), so exactly one layer writes storage,
   * and it never writes from a stale snapshot. If the write is refused -- quota, or
   * Safari's private mode, where setItem throws -- nothing is adopted: storage is
   * authoritative, so the UI must not claim to hold something that was not stored.
   */
  const settle = useCallback((result: Task[]) => {
    try {
      adopt(persist(merge(reconciled(), result)));
    } catch {
      // Nothing to say to the user and nothing to retry. The local list is intact and
      // the next successful sync sends it again.
    }
  }, [adopt, reconciled]);

  /**
   * A round trip, fired and forgotten. Never awaited by anything the user is waiting for,
   * and a failure is silent: offline, the app behaves exactly as it does now and syncs on
   * the next success. sync() resolves with the snapshot itself when it could not do
   * anything -- unconfigured, offline, a bad response -- and there is nothing to settle.
   */
  const roundTrip = useCallback(() => {
    const snapshot = latest.current;
    void sync(snapshot).then((result) => {
      if (result !== snapshot) settle(result);
    });
  }, [settle]);

  /**
   * A local change: run the store operation inside the catch boundary, land the result,
   * then tell the server about it shortly. Returns whether persistence succeeded.
   *
   * The operation arrives unevaluated -- `(current) => setDone(current, ...)` -- so that
   * the localStorage write inside the store happens *here*, inside the try/catch.
   * Passing an already-computed array cannot catch a quota or security exception: the
   * expression would have thrown before this function was ever entered. Every local
   * mutation must go through this boundary -- storage is authoritative, so on failure
   * nothing is adopted and callers must skip their follow-up UI state (no undo toast,
   * no cleared Capture fields) and leave the previous list on screen.
   */
  const mutate = (operation: (current: Task[]) => Task[]): boolean => {
    const base = reconciled();
    let next: Task[];
    try {
      next = operation(base);
    } catch {
      setSaveError(true);
      return false;
    }
    // Every store path that actually writes goes through persist(), which returns a new
    // list; a no-op (blank Capture/edit text) hands back the base array untouched. Such a
    // call never touched storage, so it must neither clear saveError -- a false
    // all-clear while the banner is up -- nor arm a sync for data that did not change.
    // It still reports success, so harmless follow-ups (a no-op editor closing) may
    // proceed.
    const wrote = next !== base;
    adopt(next);
    if (wrote) {
      setSaveError(false);
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(roundTrip, SYNC_DEBOUNCE_MS);
    }
    return true;
  };

  /**
   * Sync now, folding in any debounced round trip still pending: roundTrip() reads the
   * latest list, so the pending timer would only repeat what goes out here.
   */
  const syncNow = useCallback(() => {
    window.clearTimeout(syncTimer.current);
    roundTrip();
  }, [roundTrip]);

  useEffect(() => {
    roundTrip();
    // Two moments the debounce cannot see: connectivity coming back while the app is open
    // (writes made offline finally go up) and the app returning to the foreground (the
    // other device's writes come down). The app being *closed* when the network returns
    // is not covered -- the OS gives a page no chance to run -- and ticket 09 records
    // that residual.
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncNow();
    };
    // Another same-origin window wrote the document: show it here too. Nothing to
    // persist -- storage already holds it -- and nothing to sync, that window will.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) adopt(reconciled());
    };
    window.addEventListener("online", syncNow);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(syncTimer.current);
      window.removeEventListener("online", syncNow);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [adopt, reconciled, roundTrip, syncNow]);

  // Every destructive action is applied immediately and offers a way back, rather than
  // being held for five seconds. That is what makes "a second action replaces the
  // pending toast, applying the first" free: the first was never deferred.
  /**
   * A destructive action: apply `operation` to the Task, then offer an undo of what it was.
   *
   * The snapshot is the Task as the list handed to the operation holds it -- not the
   * caller's prop, and not `latest.current`. A Card can act on a prop from an earlier
   * render (its exit guard fires on a timeout that closed over the render where the swipe
   * began), and `latest.current` itself lags another window's save until the `storage`
   * event is handled here; mutate() folds that save in before the operation runs. The
   * snapshot is what undo restores, with a stamp that beats everything, so a snapshot
   * older than the list it came from would put stale text back over the newer edit --
   * this window's or the other window's.
   *
   * The toast is only created once the write has actually persisted. An unpersisted
   * action must not offer an undo of something that never happened.
   */
  const undoable = (
    task: Task,
    label: string,
    operation: (list: Task[], id: string) => Task[],
  ): boolean => {
    let snapshot = task;
    const landed = mutate((list) => {
      snapshot = list.find((held) => held.id === task.id) ?? task;
      return operation(list, task.id);
    });
    if (!landed) return false;
    setPending({ snapshot, label, token: ++token.current });
    return true;
  };

  /** A new Task from Capture. Reports whether the write landed, like every action. */
  const capture = (text: string, kind: Kind, deadline: string | null): boolean =>
    mutate((list) => create(list, text, kind, deadline));

  /**
   * Each action reports whether it landed. A false return is the Card's cue to come
   * back from a swipe flight and Capture's cue to keep what the user typed.
   */
  const complete = (task: Task): boolean =>
    undoable(task, "tarefa concluída", (list, id) => setDone(list, id, true));

  const discard = (task: Task): boolean => undoable(task, "tarefa apagada", remove);

  // Editing is not destructive -- the text is still on screen -- so it gets no toast.
  const edit = (task: Task, text: string): boolean =>
    mutate((list) => editText(list, task.id, text));

  const undo = () => {
    if (pending === null) return;
    // If restore cannot be persisted the undo stays pending -- and its window restarts:
    // bumping the token remounts the toast, restarting its five seconds. Returning
    // early alone is not enough -- the original timer keeps running on the old mount,
    // expires on schedule, and onExpire drops the snapshot anyway, leaving the Task
    // permanently gone with no way back.
    if (!mutate((list) => restore(list, pending.snapshot))) {
      setPending({ ...pending, token: ++token.current });
      return;
    }
    setPending(null);
  };

  /** The undo window ran out. The snapshot is dropped; the action stands. */
  const expire = () => setPending(null);

  return { tasks, pending, saveError, capture, complete, discard, edit, undo, expire };
}
