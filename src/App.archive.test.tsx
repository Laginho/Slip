import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App, ARCHIVE_HIDDEN_OFFSET } from "./App";
import { STORAGE_KEY } from "./store";
import { ARCHIVE_ROW_HEIGHT } from "./components/Archive";
import {
  activate,
  click,
  dispatch,
  keyEvent,
  queryLabel,
  render,
  seedStorage,
  stubDarkDesktopMedia,
  stubDarkMedia,
  stubDesktopMedia,
  stubMediaWithChangeListener,
  stubNoMatchMedia,
  stubScrollTop,
  task,
  toRgb,
  typeInto,
  unmount,
} from "./testing";

/**
 * Integration tests for the write-failure boundary. Storage is authoritative: when a
 * local write cannot be persisted (quota exceeded, Safari private mode -- setItem
 * throws), nothing may be adopted by the UI, no follow-up effect may run, and no
 * no-op may pretend storage recovered.
 */

beforeEach(() => {
  stubNoMatchMedia();
  localStorage.clear();
});

afterEach(async () => {
  await unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * Pull to reveal the Archive (ticket 05).
 * The region is a separate scrolling ancestor outside <main>. The content declares
 * minHeight when an Archive link exists so the row can be pulled out of view.
 * All rows use stubScrollTop() so scrollTop is writable in jsdom.
 *
 * Rows 1, 2, 4 (scrollTop half), 5, 7, 8 (declarations), 9 (mount value) are RED on the base.
 * Rows 3, 6, 10 and 4's text half are GREEN already.
 */
describe("pull to reveal the Archive", () => {
  const TODAY = new Date(2026, 8, 2); // 2026-09-02

  let restoreScrollTop: () => void;

  beforeEach(() => {
    vi.setSystemTime(TODAY);
    restoreScrollTop = stubScrollTop();
  });

  afterEach(() => {
    restoreScrollTop();
  });

  it("row 1 — 2 Open, 1 Done: region overscrollBehavior, main minHeight+boxSizing, link row height", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    // Region declarations
    expect(region.style.overscrollBehavior).toBe("contain");
    // Content declarations
    expect(main.style.minHeight).toBe(`calc(100% + ${ARCHIVE_HIDDEN_OFFSET}px)`);
    expect(main.style.boxSizing).toBe("border-box");
    // Link row <p> height
    const linkRow = main.querySelector("p") as HTMLElement;
    expect(linkRow).not.toBeNull();
    expect(linkRow.style.height).toBe(`${ARCHIVE_ROW_HEIGHT}px`);
  });

  it("row 2 — 2 Open, 1 Done: region.scrollTop === ARCHIVE_HIDDEN_OFFSET right after mount", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);
  });

  it("row 3 — scrolled to 0: 'ver concluídas' present, no Done text, button still reads 'ver concluídas'", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    // Scroll to 0 and dispatch scroll event
    region.scrollTop = 0;
    region.dispatchEvent(new Event("scroll"));

    // Nothing auto-opens
    expect(main.textContent).toContain("ver concluídas");
    expect(main.textContent).not.toContain("entregar relatório");
    const toggleBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver concluídas",
    );
    expect(toggleBtn).not.toBeNull();
  });

  it("row 4 — scrolled to 0, click 'ver concluídas': opens, Done text present, region.scrollTop stays 0", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    region.scrollTop = 0;

    const openBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver concluídas",
    )!;
    await click(openBtn);

    expect(main.textContent).toContain("ocultar concluídas");
    expect(main.textContent).toContain("entregar relatório");
    expect(region.scrollTop).toBe(0);
  });

  it("row 5 — open, click 'ocultar concluídas': Done text gone, region.scrollTop returns to ARCHIVE_HIDDEN_OFFSET", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    // Open first
    const openBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver concluídas",
    )!;
    await click(openBtn);

    // Close
    const closeBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ocultar concluídas",
    )!;
    await click(closeBtn);

    expect(main.textContent).not.toContain("entregar relatório");
    expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);
  });

  it("row 6 — 2 Open, 0 Done: no 'ver concluídas', main.style.minHeight === '', region.scrollTop === 0", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    expect(main.textContent).not.toContain("ver concluídas");
    expect(main.style.minHeight).toBe("");
    expect(region.scrollTop).toBe(0);
  });

  it("row 7 — 0 Open, 1 Done: link present, main minHeight declared, region.scrollTop === ARCHIVE_HIDDEN_OFFSET", async () => {
    seedStorage([
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    expect(main.textContent).toContain("ver concluídas");
    expect(main.style.minHeight).toBe(`calc(100% + ${ARCHIVE_HIDDEN_OFFSET}px)`);
    expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);
  });

  it("row 8 — desktop: same four declarations as row 1; Open <ul> still display:grid", async () => {
    const { stubDesktopMedia } = await import("./testing");
    stubDesktopMedia();
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    expect(region.style.overscrollBehavior).toBe("contain");
    expect(main.style.minHeight).toBe(`calc(100% + ${ARCHIVE_HIDDEN_OFFSET}px)`);
    expect(main.style.boxSizing).toBe("border-box");
    const linkRow = main.querySelector("p") as HTMLElement;
    expect(linkRow.style.height).toBe(`${ARCHIVE_ROW_HEIGHT}px`);
    // Open <ul> still grid
    const openList = main.querySelector('ul[role="list"]') as HTMLElement;
    expect(openList).not.toBeNull();
    expect(getComputedStyle(openList).display).toBe("grid");
  });

  it("row 9 — 1 Open, 1 Done: complete + undo, region.scrollTop === ARCHIVE_HIDDEN_OFFSET after each step", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    // Complete the Open task
    await activate(queryLabel(container, "Concluir")!);
    expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);

    // Undo the completion
    const undoBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "desfazer",
    );
    // If the toast is visible, undo it
    if (undoBtn) {
      await click(undoBtn);
      expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);
    }
  });

  it("first completion hides the newly-created Archive row without moving the Open list", async () => {
    seedStorage([task({ id: "o1", text: "comprar leite" })]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    await activate(queryLabel(container, "Concluir")!);

    expect(main.textContent).toContain("ver concluídas");
    expect(main.style.minHeight).toBe(`calc(100% + ${ARCHIVE_HIDDEN_OFFSET}px)`);
    expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);
  });

  it("row 10 — 2 Open, 1 Done: main.children[0] is Archive row, main.children.length === 2 (ticket-04 shape intact)", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    // The Archive link row is the first child, TaskList is the second
    const firstChild = main.children[0] as HTMLElement;
    expect(firstChild.textContent).toContain("ver concluídas");
    expect(main.children.length).toBe(2);
  });
});

/**
 * DARK CHROME — matrix rows 1–7.
 * The root <div> must set CSS custom properties (--surface, --text-primary, etc.)
 * from the palette, and every component must consume them via var(--…) instead of
 * importing chrome constants directly. Row 1 asserts the variables exist on the
 * root; rows 2–6 assert components use the vars; row 7 asserts the dark state
 * flips live when the media query changes.
 *
 * All rows are red on the base: App.tsx has no dark state and no CSS variables,
 * components import constants directly. Rows 2–7 additionally need the palette
 * CHROME object which does not exist yet.
 */
describe("dark chrome", () => {
  const SAMPLE_TASK = task({ id: "dark-1", text: "estudar para prova" });

  it("1 — root div sets CSS custom properties from palette", async () => {
    stubNoMatchMedia();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_TASK]));
    const container = await render(<App />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();

    // The root must declare these custom properties. On the base the root uses
    // `background: SURFACE` directly and sets no variables — this fails.
    const style = root.style;
    expect(style.getPropertyValue("--surface"), "--surface").not.toBe("");
    expect(style.getPropertyValue("--text-primary"), "--text-primary").not.toBe("");
    expect(style.getPropertyValue("--text-quiet"), "--text-quiet").not.toBe("");
    expect(style.getPropertyValue("--hairline"), "--hairline").not.toBe("");
    expect(style.getPropertyValue("--capture-bg"), "--capture-bg").not.toBe("");
    expect(style.getPropertyValue("--toast-bg"), "--toast-bg").not.toBe("");
    expect(style.getPropertyValue("--toast-ink"), "--toast-ink").not.toBe("");
  });

  it("2 — light mode: CSS variables match the palette light values", async () => {
    stubNoMatchMedia();
    const palette = await import("./palette");
    const CHROME = (palette as Record<string, unknown>).CHROME as Record<string, Record<string, string>>;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_TASK]));
    const container = await render(<App />);
    const root = container.firstElementChild as HTMLElement;
    const style = root.style;

    expect(style.getPropertyValue("--surface")).toBe(CHROME.light.surface);
    expect(style.getPropertyValue("--text-primary")).toBe(CHROME.light.textPrimary);
    expect(style.getPropertyValue("--text-quiet")).toBe(CHROME.light.textQuiet);
    expect(style.getPropertyValue("--hairline")).toBe(CHROME.light.hairline);
    expect(style.getPropertyValue("--capture-bg")).toBe(CHROME.light.captureBg);
    expect(style.getPropertyValue("--toast-bg")).toBe(CHROME.light.toastBg);
    expect(style.getPropertyValue("--toast-ink")).toBe(CHROME.light.toastInk);
  });

  it("3 — dark mode: CSS variables match the palette dark values", async () => {
    stubDarkMedia();
    const palette = await import("./palette");
    const CHROME = (palette as Record<string, unknown>).CHROME as Record<string, Record<string, string>>;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_TASK]));
    const container = await render(<App />);
    const root = container.firstElementChild as HTMLElement;
    const style = root.style;

    expect(style.getPropertyValue("--surface")).toBe(CHROME.dark.surface);
    expect(style.getPropertyValue("--text-primary")).toBe(CHROME.dark.textPrimary);
    expect(style.getPropertyValue("--text-quiet")).toBe(CHROME.dark.textQuiet);
    expect(style.getPropertyValue("--hairline")).toBe(CHROME.dark.hairline);
    expect(style.getPropertyValue("--capture-bg")).toBe(CHROME.dark.captureBg);
    expect(style.getPropertyValue("--toast-bg")).toBe(CHROME.dark.toastBg);
    expect(style.getPropertyValue("--toast-ink")).toBe(CHROME.dark.toastInk);
  });

  it("4 — root background/color use var(--surface) / var(--text-primary), not literals", async () => {
    stubNoMatchMedia();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_TASK]));
    const container = await render(<App />);
    const root = container.firstElementChild as HTMLElement;

    // On the base, root uses `background: SURFACE` (the literal). It must be var(--surface).
    expect(root.style.background).toContain("var(--surface)");
    expect(root.style.color).toContain("var(--text-primary)");
  });

  it("5 — save-error banner uses var(--toast-bg) / var(--toast-ink)", async () => {
    stubNoMatchMedia();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const container = await render(<App />);

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea[placeholder="uma tarefa..."]')!;
    typeInto(textarea, "comprar leite");
    await dispatch(
      new Event("submit", { bubbles: true, cancelable: true }),
      container.querySelector("form")!,
    );

    const banner = container.querySelector<HTMLElement>('[role="alert"]');
    expect(banner).not.toBeNull();
    // On the base the banner uses TOAST_BG/TOAST_INK literals; it must use var(--…)
    expect(banner!.style.background).toContain("var(--toast-bg)");
    expect(banner!.style.color).toContain("var(--toast-ink)");
  });

  it("6 — CaptureBar uses var(--capture-bg), no hairline anywhere in the closed pill", async () => {
    stubNoMatchMedia();
    localStorage.clear();
    const container = await render(<App />);

    const form = container.querySelector("form") as HTMLElement;
    expect(form).not.toBeNull();
    // One render path: pill uses var(--capture-bg)
    expect(form.style.background).toContain("var(--capture-bg)");
    // No border/borderTop on the pill
    expect(form.style.border, "no border on pill").toBe("");
    expect(form.style.borderTop, "no borderTop on pill").toBe("");
    // Chips gone and the Kind pop-up closed: nothing in the pill mentions var(--hairline)
    const hairlineEls = [...form.querySelectorAll<HTMLElement>("*")].filter((el) =>
      (el.style.border || "").includes("var(--hairline)"),
    );
    expect(hairlineEls).toHaveLength(0);
  });

  it("7 — UndoToast uses var(--toast-bg) / var(--toast-ink)", async () => {
    stubNoMatchMedia();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_TASK]));
    const container = await render(<App />);

    await activate(queryLabel(container, "Concluir")!);
    const toast = container.querySelector<HTMLElement>('[role="status"]');
    expect(toast).not.toBeNull();
    // On the base, UndoToast imports TOAST_BG/TOAST_INK directly; it must use var(--…)
    expect(toast!.style.background).toContain("var(--toast-bg)");
    expect(toast!.style.color).toContain("var(--toast-ink)");
  });

  it("8 — dark state flips live when prefers-color-scheme changes", async () => {
    stubNoMatchMedia();
    const palette = await import("./palette");
    const CHROME = (palette as Record<string, unknown>).CHROME as Record<string, Record<string, string>>;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_TASK]));
    const container = await render(<App />);
    const root = container.firstElementChild as HTMLElement;

    // Starts in light mode
    expect(root.style.getPropertyValue("--surface")).toBe(CHROME.light.surface);

    // Re-render with a stub that starts NOT dark (predicate false) and records
    // the addEventListener("change", ...) call so we can fire it later.
    await unmount();
    const rec = stubMediaWithChangeListener(
      (q) => q === "(min-width: 900px)", // dark is NOT matched initially
    );
    const container2 = await render(<App />);
    const root2 = container2.firstElementChild as HTMLElement;

    // Still light after re-render
    expect(root2.style.getPropertyValue("--surface")).toBe(CHROME.light.surface);

    // Fire the change listener to simulate prefers-color-scheme flipping to dark
    const darkListeners = rec.listeners.get("(prefers-color-scheme: dark)") ?? [];
    expect(darkListeners.length, "change listener must be registered").toBeGreaterThan(0);
    act(() => {
      darkListeners[0]({ matches: true } as MediaQueryListEvent);
    });

    // Now dark
    expect(root2.style.getPropertyValue("--surface")).toBe(CHROME.dark.surface);
  });

  it("9 — overdue on dark: atrasado label is OVERDUE_RED, Card li is INK_ON_DARK, background is CARD[kind].dark", async () => {
    stubDarkMedia();
    const palette = await import("./palette");
    const CARD = (palette as Record<string, unknown>).CARD as Record<string, Record<string, string>>;
    const OVERDUE_RED = (palette as Record<string, unknown>).OVERDUE_RED as string;
    const INK_ON_DARK = (palette as Record<string, unknown>).INK_ON_DARK as string;

    /** jsdom normalises hex to rgb(); compare via normalised form. */
    // Fixed now: 2026-09-02. Deadline 2 days before = 2026-08-31 → 2 days overdue.
    vi.setSystemTime(new Date(2026, 8, 2));
    const overdueTask = task({ id: "dark-overdue", text: "entregar relatório", deadline: "2026-08-31" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([overdueTask]));
    const container = await render(<App />);
    const li = container.querySelector("li") as HTMLElement;
    expect(li).not.toBeNull();

    // Card background must be the dark step for its kind (work → CARD.work.dark)
    expect(li.style.background).toBe(toRgb(CARD.work.dark));
    // Card ink must be INK_ON_DARK (urgency is "dark" → light ink)
    expect(li.style.color).toBe(toRgb(INK_ON_DARK));

    // The "atrasado" label must use OVERDUE_RED
    // The overdue label is the innermost span with fontWeight:700 (the outer text
    // span has no colour, so selecting by textContent matches the parent).
    const atrasado = li.querySelector("span[style*='font-weight: 700']") as HTMLElement | null;
    expect(atrasado, "atrasado span").not.toBeNull();
    expect(atrasado!.textContent).toContain("atrasado");
    expect(atrasado!.style.color).toBe(toRgb(OVERDUE_RED));
  });

  it("10 — dark + desktop: grid display and root --surface is CHROME.dark.surface", async () => {
    stubDarkDesktopMedia();
    const palette = await import("./palette");
    const CHROME = (palette as Record<string, unknown>).CHROME as Record<string, Record<string, string>>;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      task({ id: "dark-d1", text: "estudar para prova" }),
      task({ id: "dark-d2", text: "comprar leite" }),
    ]));
    const container = await render(<App />);
    const root = container.firstElementChild as HTMLElement;

    // Root must be dark
    expect(root.style.getPropertyValue("--surface")).toBe(CHROME.dark.surface);

    // Open list must be grid (same assertion ticket 04 row 9 uses)
    const lists = [...container.querySelectorAll('ul[role="list"]')] as HTMLElement[];
    expect(lists.length).toBeGreaterThan(0);
    expect(getComputedStyle(lists[0]).display).toBe("grid");
  });
});

/**
 * Ctrl+H toggles the Archive (ticket 06).
 * The shortcut only flips the archiveOpen state; scroll is handled by the
 * existing effect from ticket 05. Rows 1, 2, 4, 6, 9, 11 are RED on the
 * base (no keyboard handler in App.tsx). Rows 3, 5, 7, 8, 10 are GREEN
 * already (they assert nothing happens).
 */
describe("Ctrl+H toggles the Archive", () => {
  const TODAY = new Date(2026, 8, 2); // 2026-09-02

  let restoreScrollTop: () => void;

  beforeEach(() => {
    vi.setSystemTime(TODAY);
    stubDesktopMedia();
    restoreScrollTop = stubScrollTop();
  });

  afterEach(() => {
    restoreScrollTop();
  });

  /** Common seed: 2 Open + 1 Done, enough to exercise the archive. */
  function seedTwoOpenOneDone(): void {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
  }

  it("row 1 — 2 Open, 1 Done, closed: Ctrl+H opens archive; Done text present; scrollTop 0; defaultPrevented", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;
    region.scrollTop = ARCHIVE_HIDDEN_OFFSET; // starts hidden

    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, window);

    expect(main.textContent).toContain("ocultar concluídas");
    expect(main.textContent).toContain("entregar relatório");
    expect(region.scrollTop).toBe(0);
    expect(event.defaultPrevented).toBe(true);
  });

  it("row 2 — open: Ctrl+H closes archive; Done text gone; scrollTop ARCHIVE_HIDDEN_OFFSET", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    // Open first
    region.scrollTop = 0;
    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, window);

    // Archive is open; close it
    const event2 = keyEvent("H", { ctrlKey: true });
    await dispatch(event2, window);

    expect(main.textContent).toContain("ver concluídas");
    expect(main.textContent).not.toContain("entregar relatório");
    expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);
  });

  it("row 3 — Ctrl+Shift+H: still closed; defaultPrevented false", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    const event = keyEvent("H", { ctrlKey: true, shiftKey: true });
    await dispatch(event, window);

    expect(main.textContent).toContain("ver concluídas");
    expect(main.textContent).not.toContain("entregar relatório");
    expect(event.defaultPrevented).toBe(false);
  });

  it("row 4 — lowercase h (Ctrl+h) opens archive", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;
    region.scrollTop = ARCHIVE_HIDDEN_OFFSET;

    const event = keyEvent("h", { ctrlKey: true });
    await dispatch(event, window);

    expect(main.textContent).toContain("ocultar concluídas");
    expect(region.scrollTop).toBe(0);
  });

  it("row 5 — plain h, Alt+H, Meta+H: nothing happens; none defaultPrevented", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    for (const init of [{ key: "h" }, { altKey: true, key: "H" }, { metaKey: true, key: "H" }]) {
      const event = keyEvent(init.key, init);
      await dispatch(event, window);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(main.textContent).toContain("ver concluídas");
    expect(main.textContent).not.toContain("entregar relatório");
  });

  it("row 6 — Ctrl+H on capture textarea: opens; textarea value preserved", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;
    region.scrollTop = ARCHIVE_HIDDEN_OFFSET;

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="nova tarefa"]')!;
    typeInto(textarea, "abc");
    textarea.focus();

    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, textarea);

    expect(main.textContent).toContain("ocultar concluídas");
    expect(textarea.value).toBe("abc");
  });

  it("row 7 — Ctrl+H on Card editor: still closed; editor stays, draft intact; defaultPrevented false", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    await activate(queryLabel(container, "Editar")!);
    const editor = container.querySelector<HTMLTextAreaElement>("textarea[aria-label='tarefa']")!;
    typeInto(editor, "rascunho");

    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, editor);

    expect(main.textContent).toContain("ver concluídas");
    expect(main.textContent).not.toContain("entregar relatório");
    const after = container.querySelector<HTMLTextAreaElement>("textarea[aria-label='tarefa']");
    expect(after).not.toBeNull();
    expect(after!.value).toBe("rascunho");
    expect(event.defaultPrevented).toBe(false);
  });

  it("row 8 — 2 Open, 0 Done: Ctrl+H does nothing; defaultPrevented false; no throw", async () => {
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, window);

    expect(main.textContent).not.toContain("concluídas");
    expect(event.defaultPrevented).toBe(false);
  });

  it("row 9 — desktop + Ctrl+H: opens archive (same as row 1 but with desktop media)", async () => {
    stubDesktopMedia();
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;
    region.scrollTop = ARCHIVE_HIDDEN_OFFSET;

    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, window);

    expect(main.textContent).toContain("ocultar concluídas");
    expect(region.scrollTop).toBe(0);
  });

  it("row 10 — render then unmount: Ctrl+H does not throw; no console.error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    seedTwoOpenOneDone();
    await render(<App />);

    await unmount();

    // Dispatch after unmount must not throw or warn about state updates
    const event = keyEvent("H", { ctrlKey: true });
    expect(() => dispatch(event, window)).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("row 11 — open via click then Ctrl+H closes: shared state; scrollTop ARCHIVE_HIDDEN_OFFSET", async () => {
    seedTwoOpenOneDone();
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;

    // Open by clicking the link
    const toggleBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver concluídas",
    )!;
    await click(toggleBtn);
    expect(main.textContent).toContain("ocultar concluídas");

    // Close via Ctrl+H
    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, window);

    expect(main.textContent).toContain("ver concluídas");
    expect(main.textContent).not.toContain("entregar relatório");
    expect(region.scrollTop).toBe(ARCHIVE_HIDDEN_OFFSET);
  });
});
