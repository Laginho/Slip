import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "./store";
import { config, merge, saveConfig, sync, SYNC_STORAGE_KEY } from "./sync";
import { task } from "./testing";

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/**
 * The six cases from the spec's merge table. These are the objective check on this
 * ticket; case 4 is the bug the entire local-first design exists to prevent.
 */
describe("merge — the six spec cases", () => {
  it("1. union by id: a Task on only one side survives", () => {
    const a = task({ id: "a" });
    const b = task({ id: "b" });
    const merged = merge([a], [b]);
    expect(merged).toHaveLength(2);
    expect(merged.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("2. local wins when local is newer", () => {
    const merged = merge(
      [task({ id: "a", done: false, updatedAt: 200 })],
      [task({ id: "a", done: true, updatedAt: 100 })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].done).toBe(false);
  });

  it("3. remote wins when remote is newer", () => {
    const merged = merge(
      [task({ id: "a", done: false, updatedAt: 100 })],
      [task({ id: "a", done: true, updatedAt: 200 })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].done).toBe(true);
  });

  it("4. a deleted Task must not resurrect", () => {
    // The case this whole design exists for. A naive union brings the Task back on
    // every sync, forever, because the other device still holds an undeleted copy.
    const merged = merge(
      [task({ id: "a", deleted: true, updatedAt: 200 })],
      [task({ id: "a", deleted: false, updatedAt: 100 })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].deleted).toBe(true);
  });

  it("5. a remote tombstone for a Task never seen locally arrives deleted", () => {
    const merged = merge([], [task({ id: "a", deleted: true })]);
    expect(merged).toHaveLength(1);
    expect(merged[0].deleted).toBe(true);
  });

  it("6. equal timestamps pick a deterministic winner, with no duplicate", () => {
    const local = task({ id: "a", text: "x", updatedAt: 100 });
    const remote = task({ id: "a", text: "y", updatedAt: 100 });

    const one = merge([local], [remote]);
    const other = merge([remote], [local]);

    expect(one).toHaveLength(1);
    expect(other).toHaveLength(1);
    // Deterministic *and* convergent: both devices must reach the same answer, or they
    // would each keep their own copy and disagree forever.
    expect(one[0]).toEqual(other[0]);
  });

  it("an equal-stamp delete beats an edit, from either direction", () => {
    const live = task({ id: "a", text: "edited", deleted: false, updatedAt: 100 });
    const tombstone = task({ id: "a", text: "before", deleted: true, updatedAt: 100 });

    expect(merge([live], [tombstone])).toEqual([tombstone]);
    expect(merge([tombstone], [live])).toEqual([tombstone]);
  });
});

describe("merge — beyond the table", () => {
  it("never duplicates an id, however many times it appears", () => {
    const merged = merge(
      [task({ id: "a", updatedAt: 1 }), task({ id: "b", updatedAt: 1 })],
      [task({ id: "a", updatedAt: 2 }), task({ id: "b", updatedAt: 2 })],
    );
    expect(merged).toHaveLength(2);
  });

  it("reduces duplicate ids the same way on both sides", () => {
    const older = task({ id: "a", text: "older", updatedAt: 1 });
    const newer = task({ id: "a", text: "newer", updatedAt: 2 });

    expect(merge([newer, older], [])).toEqual([newer]);
    expect(merge([], [newer, older])).toEqual([newer]);
  });

  it("keeps deleted Tasks in the merged list rather than dropping them", () => {
    // Dropping a tombstone would let the other device resurrect the Task next time.
    const merged = merge([task({ id: "a", deleted: true, updatedAt: 5 })], []);
    expect(merged).toHaveLength(1);
  });

  it("is unchanged by merging with an empty remote", () => {
    const local = [task({ id: "a" }), task({ id: "b" })];
    expect(merge(local, [])).toEqual(local);
  });

  it("discards remote rows that are not valid Tasks", () => {
    // The table has one baked-in key and no auth, so anything could be in it.
    const merged = merge([task({ id: "a" })], [
      { id: "bad", kind: "toString" },
      null,
      { id: "worse", text: "x", kind: "work", deadline: "2026-02-30", done: false, deleted: false, updatedAt: 1 },
    ] as unknown as Task[]);
    expect(merged.map((t) => t.id)).toEqual(["a"]);
  });
});

/**
 * SLIP-35: config() reads a device-stored pair before the build-time env pair.
 */
describe("config — device pair before env pair", () => {
  it("returns the stored pair when both fields are non-empty", () => {
    localStorage.setItem(
      SYNC_STORAGE_KEY,
      JSON.stringify({ url: "https://mine.supabase.co", key: "mine-key" }),
    );
    expect(config()).toEqual({ url: "https://mine.supabase.co", key: "mine-key" });
  });

  it("falls back to the env pair when nothing is stored", () => {
    expect(config()).toEqual({ url: "https://example.supabase.co", key: "test-key" });
  });

  it("ignores a stored pair with one empty field, falling back to env", () => {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify({ url: "https://mine.supabase.co", key: "" }));
    expect(config()).toEqual({ url: "https://example.supabase.co", key: "test-key" });
  });

  it("returns null when neither a stored nor an env pair is complete", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    expect(config()).toBeNull();
  });

  /**
   * SLIP-40: these seed sync/v1 directly rather than through saveConfig, which is the
   * whole point -- validation at the field protects nothing on the read side. A pair
   * saveConfig would have refused is as unconfigured as a pair with a blank field.
   */
  const env = { url: "https://example.supabase.co", key: "test-key" };

  it("ignores a stored http: url, falling back to env", () => {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify({ url: "http://mine.supabase.co", key: "anon-key" }));
    expect(config()).toEqual(env);
  });

  it("ignores a stored url that does not parse, falling back to env", () => {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify({ url: "not a url", key: "anon-key" }));
    expect(config()).toEqual(env);
  });

  it("ignores a stored service_role key, falling back to env", () => {
    localStorage.setItem(
      SYNC_STORAGE_KEY,
      JSON.stringify({ url: "https://mine.supabase.co", key: "service_role-secret" }),
    );
    expect(config()).toEqual(env);
  });

  it("ignores a stored sb_secret_ key, falling back to env", () => {
    localStorage.setItem(
      SYNC_STORAGE_KEY,
      JSON.stringify({ url: "https://mine.supabase.co", key: "sb_secret_abc123" }),
    );
    expect(config()).toEqual(env);
  });
});

describe("saveConfig — validate and store the device pair", () => {
  it("stores a valid https pair under sync/v1 and returns no error", () => {
    expect(saveConfig("https://mine.supabase.co", "anon-key")).toBeNull();
    expect(JSON.parse(localStorage.getItem(SYNC_STORAGE_KEY)!)).toEqual({
      url: "https://mine.supabase.co",
      key: "anon-key",
    });
  });

  it("refuses an http URL and stores nothing", () => {
    expect(saveConfig("http://mine.supabase.co", "anon-key")).not.toBeNull();
    expect(localStorage.getItem(SYNC_STORAGE_KEY)).toBeNull();
  });

  it("refuses an unparseable URL and stores nothing", () => {
    expect(saveConfig("not a url", "anon-key")).not.toBeNull();
    expect(localStorage.getItem(SYNC_STORAGE_KEY)).toBeNull();
  });

  it("refuses an empty key and stores nothing", () => {
    expect(saveConfig("https://mine.supabase.co", "")).not.toBeNull();
    expect(localStorage.getItem(SYNC_STORAGE_KEY)).toBeNull();
  });

  it("refuses a service_role key and stores nothing", () => {
    expect(saveConfig("https://mine.supabase.co", "service_role-secret")).not.toBeNull();
    expect(localStorage.getItem(SYNC_STORAGE_KEY)).toBeNull();
  });

  it("refuses an sb_secret_ prefixed key and stores nothing", () => {
    expect(saveConfig("https://mine.supabase.co", "sb_secret_abc123")).not.toBeNull();
    expect(localStorage.getItem(SYNC_STORAGE_KEY)).toBeNull();
  });

  it("refuses a legacy JWT whose payload claims service_role", () => {
    const payload = btoa(JSON.stringify({ role: "service_role" }));
    const jwt = `header.${payload}.signature`;
    expect(saveConfig("https://mine.supabase.co", jwt)).not.toBeNull();
    expect(localStorage.getItem(SYNC_STORAGE_KEY)).toBeNull();
  });

  it("accepts a legacy JWT whose payload claims anon", () => {
    const payload = btoa(JSON.stringify({ role: "anon" }));
    const jwt = `header.${payload}.signature`;
    expect(saveConfig("https://mine.supabase.co", jwt)).toBeNull();
    expect(localStorage.getItem(SYNC_STORAGE_KEY)).not.toBeNull();
  });

  it("removes sync/v1 when both fields are saved empty", () => {
    localStorage.setItem(
      SYNC_STORAGE_KEY,
      JSON.stringify({ url: "https://mine.supabase.co", key: "anon-key" }),
    );
    expect(saveConfig("", "")).toBeNull();
    expect(localStorage.getItem(SYNC_STORAGE_KEY)).toBeNull();
  });

  it("returns a reason instead of throwing when the write is refused", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(saveConfig("https://mine.supabase.co", "anon-key")).toBe("não foi possível salvar");
  });
});

describe("sync", () => {
  it("uses a pair saved via saveConfig on the very next call, without a reload", async () => {
    saveConfig("https://device.supabase.co", "device-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([]));

    await sync([task({ id: "a" })]);

    expect(fetchSpy.mock.calls[0][0]).toBe("https://device.supabase.co/rest/v1/tasks?select=*");
    expect((fetchSpy.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      apikey: "device-key",
    });
  });

  it("does nothing and never touches the network when unconfigured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const local = [task({ id: "a" })];
    expect(await sync(local)).toEqual(local);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the local list unchanged when offline", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const local = [task({ id: "a" })];
    // Silent and harmless: no throw, no error state, the app works exactly as before.
    expect(await sync(local)).toEqual(local);
  });

  it("returns the local list unchanged when the server errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("nope", { status: 500 }),
    );
    const local = [task({ id: "a" })];
    expect(await sync(local)).toEqual(local);
  });

  it("merges what comes back without writing the caller's stale snapshot", async () => {
    const remote = task({ id: "b", text: "do servidor" });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json([remote]));

    const local = [task({ id: "a" })];
    const merged = await sync(local);

    expect(merged.map((t) => t.id).sort()).toEqual(["a", "b"]);
    // The caller owns persistence because only it can rebase this result over changes
    // made while the request was in flight.
    expect(localStorage.length).toBe(0);
    expect(fetchSpy).toHaveBeenCalledTimes(2); // one read, one write
  });

  it("sends the whole list, not a diff", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([]));

    const local = [task({ id: "a" }), task({ id: "b" }), task({ id: "c", deleted: true })];
    await sync(local);

    const write = fetchSpy.mock.calls[1];
    const body = JSON.parse((write[1] as RequestInit).body as string);
    expect(body).toHaveLength(3);
    // Deleted Tasks sync like any other Task -- that is what keeps them deleted.
    expect(body.map((t: Task) => t.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("still returns the merge when the write half fails", async () => {
    const remote = task({ id: "b" });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json([remote]))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const merged = await sync([task({ id: "a" })]);
    expect(merged.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });
});
