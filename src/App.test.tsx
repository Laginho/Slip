import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { STORAGE_KEY } from "./store";
import {
  activate,
  click,
  dispatch,
  keyEvent,
  queryLabel,
  render,
  seedStorage,
  stubMediaWithChangeListener,
  stubNoMatchMedia,
  stubScrollTop,
  task,
  throwOnSetItem,
  typeInto,
  unmount,
} from "./testing";

/**
 * Integration tests for the write-failure boundary. Storage is authoritative: when a
 * local write cannot be persisted (quota exceeded, Safari private mode -- setItem
 * throws), nothing may be adopted by the UI, no follow-up effect may run, and no
 * no-op may pretend storage recovered.
 */

const SAVE_ERROR = "não foi possível salvar";

/** The undo toast labels its button with visible text, not an aria-label. */
function undoButton(container: ParentNode): HTMLButtonElement | null {
  return (
    ([...container.querySelectorAll("button")].find(
      (button) => button.textContent === "desfazer",
    ) as HTMLButtonElement | undefined) ?? null
  );
}

async function submitCapture(container: HTMLElement): Promise<void> {
  await dispatch(
    new Event("submit", { bubbles: true, cancelable: true }),
    container.querySelector("form")!,
  );
}

beforeEach(() => {
  stubNoMatchMedia();
  localStorage.clear();
});

afterEach(async () => {
  await unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Capture under a failing write", () => {
  it("keeps the input, shows the persistent error, and persists nothing", async () => {
    throwOnSetItem();
    const container = await render(<App />);

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea[placeholder="uma tarefa..."]')!;
    typeInto(textarea, "comprar leite");
    await submitCapture(container);

    // Everything the user typed stays put for a retry.
    expect(textarea.value).toBe("comprar leite");
    // The list still holds nothing, storage still holds nothing.
    expect(container.querySelector('main ul[role="list"]')).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    // And a small persistent save error is on screen.
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).toContain(SAVE_ERROR);

    // A retry that succeeds clears both.
    vi.mocked(Storage.prototype.setItem).mockRestore();
    await submitCapture(container);
    expect(container.textContent).toContain("comprar leite");
    expect(textarea.value).toBe("");
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toHaveLength(1);
  });

  it("survives a sticky-kind selection when its own setItem throws too", async () => {
    throwOnSetItem();
    const container = await render(<App />);

    // Open the Kind pop-up and pick college; must not escape the bar as an uncaught exception.
    await click(container.querySelector("button[aria-haspopup]") as HTMLButtonElement);
    const option = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "F faculdade",
    )!;
    await click(option);

    // Losing only the stickiness is not a Task-write failure: no save error.
    expect(container.querySelector('[role="alert"]')).toBeNull();

    // The selection applied for this session -- asserted behaviourally: once writes
    // recover, the very next Capture lands as college, not as the default work.
    vi.mocked(Storage.prototype.setItem).mockRestore();
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea[placeholder="uma tarefa..."]')!;
    typeInto(textarea, "prova de história");
    await submitCapture(container);

    const [stored] = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.kind).toBe("college");
    expect(textarea.value).toBe("");
  });
});

describe("Card actions under a failing write", () => {
  it("complete keeps the Task open, creates no undo toast, and leaves storage untouched", async () => {
    const seeded = seedStorage([task({ id: "a", text: "entregar relatório" })]);
    throwOnSetItem();
    const container = await render(<App />);

    await activate(queryLabel(container, "Concluir")!); // focus first, then activate

    expect(container.textContent).toContain("entregar relatório");
    expect(undoButton(container)).toBeNull(); // no undo of what never landed
    expect(container.textContent).toContain(SAVE_ERROR);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(seeded);
  });

  it("delete keeps the Card, creates no undo toast, and leaves storage untouched", async () => {
    const seeded = seedStorage([task({ id: "a", text: "entregar relatório" })]);
    throwOnSetItem();
    const container = await render(<App />);

    await activate(queryLabel(container, "Apagar")!);

    expect(container.textContent).toContain("entregar relatório");
    expect(undoButton(container)).toBeNull();
    expect(container.textContent).toContain(SAVE_ERROR);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(seeded);
  });

  it("edit keeps the editor open with the draft, and commits once storage recovers", async () => {
    // Enter only commits under a fine primary pointer; under coarse it inserts a break.
    stubMediaWithChangeListener((q) => q === "(pointer: fine)");
    const seeded = seedStorage([task({ id: "a", text: "texto original" })]);
    throwOnSetItem();
    const container = await render(<App />);

    await activate(queryLabel(container, "Editar")!);
    const input = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="Task"]')!;
    typeInto(input, "texto editado");
    await dispatch(keyEvent("Enter"), input);

    // The editor stayed open and every keystroke survived -- nothing was discarded
    // behind the generic banner.
    const stillOpen = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="Task"]')!;
    expect(stillOpen.value).toBe("texto editado");
    expect(container.textContent).toContain(SAVE_ERROR);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(seeded);

    // Storage recovers; the same Enter path now commits and closes.
    vi.mocked(Storage.prototype.setItem).mockRestore();
    await dispatch(keyEvent("Enter"), input);
    expect(container.querySelector('textarea[aria-label="Task"]')).toBeNull();
    expect(container.textContent).toContain("texto editado");
    const [stored] = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.text).toBe("texto editado");
    expect(stored.updatedAt).toBeGreaterThan(task({ id: "a" }).updatedAt);
  });

  it("a no-op edit closes the editor but must not clear the save error", async () => {
    // Enter only commits under a fine primary pointer; under coarse it inserts a break.
    stubMediaWithChangeListener((q) => q === "(pointer: fine)");
    const seeded = seedStorage([task({ id: "a", text: "texto original" })]);
    throwOnSetItem();
    const container = await render(<App />);
    await activate(queryLabel(container, "Concluir")!); // raise the banner with a real failure
    expect(container.textContent).toContain(SAVE_ERROR);

    // Clearing an editor's text is a store no-op: nothing is written anywhere.
    await activate(queryLabel(container, "Editar")!);
    const input = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="Task"]')!;
    typeInto(input, "");
    await dispatch(keyEvent("Enter"), input);

    // The harmless no-op still reports success, so the editor closes...
    expect(container.querySelector('textarea[aria-label="Task"]')).toBeNull();
    // ...but storage has not recovered, so the banner must NOT claim it did.
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(seeded);
  });
});

describe("undo under a failing write", () => {
  it("keeps the undo pending when restore cannot be persisted", async () => {
    seedStorage([task({ id: "a", text: "entregar relatório" })]);
    const container = await render(<App />);

    // The completion itself succeeds, so the toast appears and storage moves.
    await activate(queryLabel(container, "Concluir")!);
    const completed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(completed[0].done).toBe(true);
    const undo = undoButton(container);
    expect(undo).not.toBeNull();

    // Now storage refuses everything; the undo must stay available.
    throwOnSetItem();
    await activate(undo!);

    expect(undoButton(container)).not.toBeNull(); // still pending
    expect(container.textContent).toContain(SAVE_ERROR);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(completed);
  });

  it("restarts the toast window on failure instead of expiring on the old schedule", async () => {
    vi.useFakeTimers();
    try {
      seedStorage([task({ id: "a", text: "entregar relatório" })]);
      const container = await render(<App />);

      // The delete lands at ~t=0 and starts the five-second window.
      await activate(queryLabel(container, "Apagar")!);
      expect(undoButton(container)).not.toBeNull();

      await act(async () => vi.advanceTimersByTime(3000)); // t=3s: user tries undo
      throwOnSetItem();
      await activate(undoButton(container)!); // refused; the window restarts

      // Past the ORIGINAL deadline (t=5s) the undo must still be offered -- this is
      // exactly where the pre-fix code let the toast expire and drop the snapshot.
      await act(async () => vi.advanceTimersByTime(2500)); // t=5.5s
      expect(undoButton(container)).not.toBeNull();

      // The restarted window expires five seconds after the failed attempt (t=8s).
      await act(async () => vi.advanceTimersByTime(3000)); // t=8.5s
      expect(undoButton(container)).toBeNull();
      expect(container.textContent).toContain(SAVE_ERROR);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("storage refusing reads", () => {
  it("renders an empty app instead of crashing when getItem throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const container = await render(<App />);
    expect(container.querySelector("main")!.textContent).toBe("");
    expect(container.querySelector('textarea[placeholder="uma tarefa..."]')).not.toBeNull();
  });
});

/**
 * The notification layer (undo toast + save-error banner) is fixed to the top of the
 * window and out of the document flow. jsdom has no layout engine, so "does not
 * displace" is asserted structurally: both notifications must live in a fixed-position
 * layer outside <main>, and the list's markup must be byte-identical while a
 * notification mounts, while it is up, and after it goes away.
 */
describe("the notification layer", () => {
  /** The toast root sits inside width wrappers; what matters is that some ancestor
   *  is fixed against the window -- that is what takes it out of the document flow. */
  function nearestFixedAncestor(el: Element): HTMLElement | null {
    let node: HTMLElement | null = el.parentElement;
    while (node !== null) {
      if (getComputedStyle(node).position === "fixed") return node;
      node = node.parentElement;
    }
    return null;
  }

  it("floats the undo toast over the top; only the action, never the toast, touches the list", async () => {
    vi.useFakeTimers();
    try {
      seedStorage([
        task({ id: "a", text: "entregar relatório" }),
        task({ id: "b", text: "comprar pão" }),
      ]);
      const container = await render(<App />);
      const main = container.querySelector("main")!;

      await activate(queryLabel(container, "Concluir")!);

      const toast = container.querySelector('[role="status"]')!;
      expect(toast).not.toBeNull();
      // Out of flow entirely, so mounting it cannot move the list.
      expect(nearestFixedAncestor(toast)).not.toBeNull();
      expect(main.contains(toast)).toBe(false);
      const whileToastUp = main.innerHTML;

      await act(async () => vi.advanceTimersByTime(5000));
      expect(container.querySelector('[role="status"]')).toBeNull();
      // Across the toast's whole life -- mounted, expiring, gone -- main's markup
      // never moved: the only diff was the completed Card leaving, at action time.
      expect(main.innerHTML).toBe(whileToastUp);
    } finally {
      vi.useRealTimers();
    }
  });

  it("floats the save-error banner the same way, without displacing the list", async () => {
    throwOnSetItem();
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const before = main.innerHTML;

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea[placeholder="uma tarefa..."]')!;
    await act(async () => typeInto(textarea, "comprar leite"));
    await submitCapture(container);

    const banner = container.querySelector('[role="alert"]')!;
    expect(banner).not.toBeNull();
    expect(nearestFixedAncestor(banner)).not.toBeNull();
    expect(main.contains(banner)).toBe(false);
    // The failed write adopted nothing: the list is byte-identical with the banner up.
    expect(main.innerHTML).toBe(before);
  });

  it("stacks toast and banner in the one floating layer when an undo fails to persist", async () => {
    seedStorage([task({ id: "a", text: "entregar relatório" })]);
    const container = await render(<App />);

    await activate(queryLabel(container, "Concluir")!);
    expect(container.querySelector('[role="alert"]')).toBeNull(); // success cleared any error
    throwOnSetItem();
    await activate(undoButton(container)!); // refused: toast restarts, banner raises

    const status = container.querySelector('[role="status"]')!;
    const alert = container.querySelector('[role="alert"]')!;
    expect(status).not.toBeNull();
    expect(alert).not.toBeNull();
    // Both live in the same fixed layer above the content, never in the flow.
    expect(nearestFixedAncestor(status)).not.toBeNull();
    expect(nearestFixedAncestor(alert)).not.toBeNull();
    expect(main_of(status)).toBe(main_of(alert));
  });

  /** Both notifications must descend from the same layer element. */
  function main_of(el: Element): Element {
    return el.parentElement!.parentElement!;
  }

  it("T1 — layer aligns children to the right edge (flex-end), not centre", async () => {
    seedStorage([task({ id: "t1", text: "entregar relatório" })]);
    const container = await render(<App />);

    await activate(queryLabel(container, "Concluir")!);
    const toast = container.querySelector<HTMLElement>('[role="status"]')!;
    const layer = nearestFixedAncestor(toast)!;

    expect(layer).not.toBeNull();
    expect(layer.style.position).toBe("fixed");
    expect(layer.style.top).toBe("0px");
    expect(layer.style.left).toBe("0px");
    expect(layer.style.right).toBe("0px");
    expect(layer.style.alignItems).toBe("flex-end");
    expect(layer.style.pointerEvents).toBe("none");
  });

  it("T2 — toast has no width:100% and caps at 360px; pointer-events:auto", async () => {
    seedStorage([task({ id: "t2", text: "comprar pão" })]);
    const container = await render(<App />);

    await activate(queryLabel(container, "Concluir")!);
    const toast = container.querySelector<HTMLElement>('[role="status"]')!;

    expect(toast).not.toBeNull();
    expect(toast.style.width).toBe("");
    expect(toast.style.maxWidth).toBe("min(360px, calc(100vw - 24px))");
    expect(toast.style.pointerEvents).toBe("auto");
  });

  it("T3 — no ancestor between toast and fixed layer carries max-width:596px", async () => {
    seedStorage([task({ id: "t3", text: "ler um capítulo" })]);
    const container = await render(<App />);

    await activate(queryLabel(container, "Concluir")!);
    const toast = container.querySelector<HTMLElement>('[role="status"]')!;
    const layer = nearestFixedAncestor(toast)!;

    let node: Element | null = toast.parentElement;
    while (node !== null && node !== layer) {
      expect(
        (node as HTMLElement).style.maxWidth,
        `ancestor ${node.tagName} must not have maxWidth:596px`,
      ).not.toBe("596px");
      node = node.parentElement;
    }
  });

  it("T4 — toast and banner share the same fixed layer; banner has maxWidth cap", async () => {
    seedStorage([task({ id: "t4", text: "entregar relatório" })]);
    const container = await render(<App />);

    await activate(queryLabel(container, "Concluir")!);
    expect(container.querySelector('[role="status"]')).not.toBeNull();

    throwOnSetItem();
    await activate(undoButton(container)!);

    const status = container.querySelector<HTMLElement>('[role="status"]')!;
    const alert = container.querySelector<HTMLElement>('[role="alert"]')!;
    expect(status).not.toBeNull();
    expect(alert).not.toBeNull();

    expect(nearestFixedAncestor(status)).toBe(nearestFixedAncestor(alert));
    expect(alert.style.maxWidth).toBe("min(360px, calc(100vw - 24px))");
  });
});

/**
 * Visual promotion 04 RED: Phone B/A Conversa vs Desktop A/A Parede.
 * Phone (<900): list/col + CaptureBar floating pill on capture ground;
 * Desktop (>=900): grid wall + same pill (one render path).
 * Enter sends under a fine pointer; the send button is the phone's path.
 * Labels pt-BR: `nova tarefa` (textarea placeholder/aria) e `prazo` (deadline).
 * Mocks permitidos: apenas matchMedia e relógio fixo. Não duplica gestos/keyboard.
 */
describe("visual promoção 04 — responsive B/A Conversa vs A/A Parede", () => {
  const FIXED_TASK = task({ id: "vis-1", text: "preparar apresentação", deadline: "2026-08-30" });

  it("App mobile (matchMedia false): TaskList lista/coluna e CaptureBar floating pill + labels pt-BR", async () => {
    stubNoMatchMedia();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([FIXED_TASK]));
    const container = await render(<App />);

    // TaskList: lista coluna (flex) não grid wall
    const lists = [...container.querySelectorAll('ul[role="list"]')] as HTMLElement[];
    expect(lists.length, "TaskList renderiza lista").toBeGreaterThan(0);
    const firstListDisplay = lists[0] ? getComputedStyle(lists[0]).display : "";
    // Mobile <900 must be flex column; wall is grid
    expect(firstListDisplay).toBe("flex");
    // Also gap 12 for conversational list (wall is grid gap 16)
    if (lists[0]) expect(lists[0].style.gap).toBe("12px");

    // CaptureBar: floating pill on capture ground (one render path)
    const form = container.querySelector("form") as HTMLElement;
    expect(form).not.toBeNull();
    expect(form.style.background, "pill ground").toBe("var(--capture-bg)");
    expect(form.style.border, "no border on pill").toBe("");
    expect(form.style.borderTop, "no borderTop on pill").toBe("");
    expect(form.style.maxWidth, "pill max width").toBe("720px");
    expect(form.style.marginLeft, "pill centred").toBe("auto");
    expect(form.style.marginRight, "pill centred").toBe("auto");
    expect(form.style.borderRadius, "pill radius").toBe("999px");
    // No div inside the pill — single render path
    expect(form.querySelector("div"), "no div inside pill").toBeNull();
    // No hairline anywhere in the closed pill (chips gone, Kind pop-up closed)
    const hairlineEls = [...form.querySelectorAll<HTMLElement>("*")].filter((el) =>
      (el.style.border || "").includes("var(--hairline)"),
    );
    expect(hairlineEls).toHaveLength(0);

    // Labels pt-BR
    const novaTarefa = queryLabel(container, "nova tarefa");
    expect(novaTarefa, 'label pt-BR "nova tarefa"').not.toBeNull();
    const prazo = queryLabel(container, "prazo");
    expect(prazo, 'label pt-BR "prazo"').not.toBeNull();
    // Deadline still 30/08 semantics but mobile Card shows "vence 30/08"
    expect(container.textContent).toContain("vence 30/08");
  });

  it("App desktop (matchMedia true): TaskList grid wall e CaptureBar same pill declarations (one render path)", async () => {
    const { stubDesktopMedia } = await import("./testing");
    stubDesktopMedia();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([FIXED_TASK]));
    const container = await render(<App />);

    // TaskList: grid wall (≥900)
    const lists = [...container.querySelectorAll('ul[role="list"]')] as HTMLElement[];
    expect(lists.length).toBeGreaterThan(0);
    const firstListDisplay = getComputedStyle(lists[0]).display;
    expect(firstListDisplay, "wall deve ser grid").toBe("grid");
    expect(lists[0].style.gridTemplateColumns).toBe("repeat(3, minmax(260px, 300px))");
    expect(lists[0].style.gap).toBe("16px");

    // CaptureBar: same pill as mobile (one render path)
    const form = container.querySelector("form") as HTMLElement;
    expect(form).not.toBeNull();
    expect(form.style.background, "pill ground").toBe("var(--capture-bg)");
    expect(form.style.border, "no border on pill").toBe("");
    expect(form.style.borderTop, "no borderTop on pill").toBe("");
    expect(form.style.maxWidth, "pill max width").toBe("720px");
    expect(form.style.marginLeft, "pill centred").toBe("auto");
    expect(form.style.marginRight, "pill centred").toBe("auto");
    expect(form.style.borderRadius, "pill radius").toBe("999px");
    // No div inside the pill
    expect(form.querySelector("div"), "no div inside pill").toBeNull();

    // Ordem preservada — mesma Task aparece
    expect(container.textContent).toContain("preparar apresentação");
    expect(container.textContent).toContain("30/08");
    // Desktop NÃO usa prefixo vence
    expect(container.textContent).not.toContain("vence 30/08");
  });
});

/**
 * FIXUP 04 — overflow horizontal do compositor mobile (READ P1).
 * Evidência: form=375px, composer=437.34px, scrollWidth=453px em 375x812 (doc bloqueado).
 * Causa: item flex interno não pode encolher (COMPOSER flex:1 sem minWidth:0).
 * Em jsdom não há layout real, então o assert é estrutural: o compositor deve
 * permitir shrink (minWidth 0 / min-width 0). Desktop continua sem compositor interno.
 */
describe("fixup 04 — compositor mobile cabe no viewport sem overflow", () => {
  const OVERFLOW_TASK = task({ id: "fix-1", text: "preparar apresentação", deadline: "2026-08-30" });

  it("mobile (<900): textarea declares minWidth 0 (flex item can shrink)", async () => {
    stubNoMatchMedia();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([OVERFLOW_TASK]));
    const container = await render(<App />);

    const form = container.querySelector("form") as HTMLElement;
    expect(form).not.toBeNull();

    // One render path: textarea is a direct child of the form
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea[placeholder="uma tarefa..."]');
    expect(textarea, "textarea must exist").not.toBeNull();
    // The textarea must declare minWidth 0 so the flex item can shrink
    const inlineMinWidth = textarea!.style.minWidth;
    const computedMinWidth = getComputedStyle(textarea!).minWidth;
    const allowsShrink = inlineMinWidth === "0" || inlineMinWidth === "0px" || computedMinWidth === "0px";
    expect(allowsShrink, `textarea minWidth must be 0 (inline='${inlineMinWidth}' computed='${computedMinWidth}')`).toBe(true);
  });

  it("both profiles: no div inside the pill (one render path)", async () => {
    // Phone
    stubNoMatchMedia();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([OVERFLOW_TASK]));
    const phoneContainer = await render(<App />);
    expect(phoneContainer.querySelector("form")!.querySelectorAll("div").length, "phone pill has no div").toBe(0);

    // Desktop
    await unmount();
    const { stubDesktopMedia } = await import("./testing");
    stubDesktopMedia();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([OVERFLOW_TASK]));
    const desktopContainer = await render(<App />);
    expect(desktopContainer.querySelector("form")!.querySelectorAll("div").length, "desktop pill has no div").toBe(0);
  });
});

/**
 * Archive at the top (ticket 04).
 * Rows 1, 3, 5 (first-child), 6 (no copy) are RED on the base.
 * Rows 2, 4, 7, 8, 9, 10 are behaviour guards that must stay green.
 */
describe("Archive at the top", () => {
  const TODAY = new Date(2026, 8, 2); // 2026-09-02

  it("row 1 — Archive is the first child of <main>; Open list follows", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const firstChild = main.children[0] as HTMLElement;

    expect(firstChild.textContent).toContain("ver concluídas");

    const openList = main.querySelector('ul[role="list"]');
    expect(openList).not.toBeNull();
    // Open list must come AFTER the archive link in DOM order
    expect(main.contains(firstChild)).toBe(true);
    expect(firstChild.compareDocumentPosition(openList!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("row 2 — clicking 'ver concluídas' shows Done rows; button reads 'ocultar concluídas'; still first child", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    const toggleBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver concluídas",
    )!;
    expect(toggleBtn).not.toBeNull();
    await click(toggleBtn);

    expect(main.textContent).toContain("entregar relatório");
    expect(main.textContent).toContain("ocultar concluídas");
    // Still the first child
    const firstChild = main.children[0] as HTMLElement;
    expect(firstChild.textContent).toContain("ocultar concluídas");
  });

  it("row 3 — opening the Archive scrolls the region to top (scroll position moved to main.parentElement in ticket 05)", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const restore = stubScrollTop();
    try {
      const container = await render(<App />);
      const main = container.querySelector("main")!;
      const region = main.parentElement as HTMLElement;

      // Simulate the region being scrolled down
      region.scrollTop = 120;

      const toggleBtn = [...main.querySelectorAll("button")].find(
        (b) => b.textContent === "ver concluídas",
      )!;
      await click(toggleBtn);

      expect(region.scrollTop).toBe(0);
    } finally {
      restore();
    }
  });

  it("row 4 — clicking 'ocultar concluídas' hides Done rows; button reads 'ver concluídas'", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    // Open first
    const openBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver concluídas",
    )!;
    await click(openBtn);
    expect(main.textContent).toContain("entregar relatório");

    // Close
    const closeBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ocultar concluídas",
    )!;
    await click(closeBtn);

    expect(main.textContent).not.toContain("entregar relatório");
    expect(main.textContent).toContain("ver concluídas");
  });

  it("row 5 — 2 Open, 0 Done: no 'ver concluídas' anywhere; first child is the Open list", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "o2", text: "ligar dentista" }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    expect(main.textContent).not.toContain("ver concluídas");
    expect(main.children[0].matches('ul[role="list"]')).toBe(true);
  });

  it("row 6 — 0 Open, 0 Done: scrolling region has no text content; no empty-state copy", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    expect(main.textContent?.trim()).toBe("");
  });

  it("row 7 — 0 Open, 1 Done: only the Archive link exists in the region", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    expect(main.textContent).toContain("ver concluídas");
    expect(main.textContent).not.toContain("nada por aqui");
    // No Open list rendered
    expect(main.querySelector('ul[role="list"]')).toBeNull();
  });

  it("row 8 — seven-day window: 1 Done 8 days ago + 1 Done today shows one row + 'ver mais antigas'", async () => {
    const eightDaysAgo = new Date(2026, 8, 2 - 8); // 2026-08-25
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "d1", text: "relatório antigo", done: true, updatedAt: eightDaysAgo.getTime() }),
      task({ id: "d2", text: "relatório recente", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    // Open the archive
    const openBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver concluídas",
    )!;
    await click(openBtn);

    // Only today's task visible initially
    expect(main.textContent).toContain("relatório recente");
    expect(main.textContent).not.toContain("relatório antigo");
    expect(main.textContent).toContain("ver mais antigas");

    // Click "ver mais antigas"
    const allBtn = [...main.querySelectorAll("button")].find(
      (b) => b.textContent === "ver mais antigas",
    )!;
    await click(allBtn);

    expect(main.textContent).toContain("relatório antigo");
    expect(main.textContent).toContain("relatório recente");
  });

  it("row 9 — desktop: Archive still first child; Open list still a grid", async () => {
    const { stubDesktopMedia } = await import("./testing");
    stubDesktopMedia();
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const firstChild = main.children[0] as HTMLElement;

    expect(firstChild.textContent).toContain("ver concluídas");

    const openList = main.querySelector('ul[role="list"]') as HTMLElement;
    expect(openList).not.toBeNull();
    expect(getComputedStyle(openList).display).toBe("grid");
  });

  it("row 10 — completing the last Open Task: undo toast lands in the fixed layer, not the region; Archive stays first", async () => {
    vi.setSystemTime(TODAY);
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: TODAY.getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;

    await activate(queryLabel(container, "Concluir")!);

    const toast = container.querySelector('[role="status"]');
    expect(toast).not.toBeNull();
    expect(main.contains(toast)).toBe(false); // the toast is in the fixed layer, outside the region
    expect(main.querySelector('ul[role="list"]')).toBeNull(); // the last Open Task left; the Open list renders nothing
    expect(main.children.length).toBe(1); // only the Archive remains
    // Archive link still first
    const firstChild = main.children[0] as HTMLElement;
    expect(firstChild.textContent).toContain("ver concluídas");
  });
});
