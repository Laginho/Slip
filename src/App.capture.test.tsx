import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App, ARCHIVE_HIDDEN_OFFSET } from "./App";
import { STORAGE_KEY } from "./store";
import {
  activate,
  click,
  dispatch,
  keyEvent,
  queryLabel,
  render,
  seedStorage,
  stubDarkMedia,
  stubDesktopMedia,
  stubMediaWithChangeListener,
  stubNoMatchMedia,
  task,
  throwOnSetItem,
  toRgb,
  typeInto,
  unmount,
} from "./testing";
import { CARD, INK_ON_LIGHT } from "./palette";

/**
 * Integration tests for the write-failure boundary. Storage is authoritative: when a
 * local write cannot be persisted (quota exceeded, Safari private mode -- setItem
 * throws), nothing may be adopted by the UI, no follow-up effect may run, and no
 * no-op may pretend storage recovered.
 */

const SAVE_ERROR = "não foi possível salvar";

async function submitCapture(container: HTMLElement): Promise<void> {
  await dispatch(
    new Event("submit", { bubbles: true, cancelable: true }),
    container.querySelector("form")!,
  );
}

/** Query shortcuts — the pill is always a <form>. */
function pillOf(container: HTMLElement) {
  return container.querySelector("form") as HTMLElement;
}
function fieldOf(container: HTMLElement) {
  return queryLabel(container, "nova tarefa") as HTMLTextAreaElement;
}
function sendOf(container: HTMLElement) {
  return queryLabel(container, "enviar") as HTMLButtonElement;
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

/**
 * Capture pill (ticket 02) — one render path, floating pill.
 * The form is always a pill: centred ≤720px, --capture-bg, no border,
 * borderRadius 999px when one line, 26px when multiline.
 * Enter sends under a fine pointer; Shift+Enter breaks; under coarse
 * the button sends; enterKeyHint follows the same rule.
 * Send button: 44px min, 36px circle, --text-primary ground,
 * --surface glyph, dimmed while blank.
 */
describe("the capture pill (ticket 02)", () => {
  function circleOf(container: HTMLElement) {
    return sendOf(container).firstElementChild as HTMLElement;
  }

  it("row 1 — phone: pill style declarations, no div, no hairline anywhere in the closed pill", async () => {
    stubNoMatchMedia();
    const container = await render(<App />);
    const pill = pillOf(container);

    expect(pill.style.background).toBe("var(--capture-bg)");
    expect(pill.style.border).toBe("");
    expect(pill.style.borderTop).toBe("");
    expect(pill.style.maxWidth).toBe("720px");
    expect(pill.style.marginLeft).toBe("auto");
    expect(pill.style.marginRight).toBe("auto");
    expect(pill.style.borderRadius).toBe("999px");
    expect(pill.querySelector("div")).toBeNull();
    // The chips are gone and the Kind pop-up is closed: no hairline anywhere in the pill.
    const hairlineEls = [...pill.querySelectorAll<HTMLElement>("*")].filter((el) =>
      (el.style.border || "").includes("var(--hairline)"),
    );
    expect(hairlineEls).toHaveLength(0);
  });

  it("row 2 — desktop: identical pill declarations", async () => {
    stubDesktopMedia();
    const container = await render(<App />);
    const pill = pillOf(container);

    expect(pill.style.background).toBe("var(--capture-bg)");
    expect(pill.style.border).toBe("");
    expect(pill.style.borderTop).toBe("");
    expect(pill.style.maxWidth).toBe("720px");
    expect(pill.style.marginLeft).toBe("auto");
    expect(pill.style.marginRight).toBe("auto");
    expect(pill.style.borderRadius).toBe("999px");
  });

  it("row 3 — child order, placeholders, send type", async () => {
    const container = await render(<App />);
    const pill = pillOf(container);
    const field = fieldOf(container);
    const send = sendOf(container);

    expect([...pill.children].map((el) => el.tagName)).toEqual([
      "BUTTON", "TEXTAREA", "INPUT", "BUTTON",
    ]);
    expect(field.placeholder).toBe("uma tarefa...");
    expect(queryLabel(container, "prazo")!.getAttribute("placeholder")).toBe("dd");
    expect(send.type).toBe("submit");
  });

  it("row 4 — empty: borderRadius 999px, rows 1", async () => {
    const container = await render(<App />);
    const field = fieldOf(container);

    expect(pillOf(container).style.borderRadius).toBe("999px");
    expect(field.rows).toBe(1);
  });

  it("row 5 — two lines: borderRadius 26px, rows 2", async () => {
    const container = await render(<App />);
    const field = fieldOf(container);
    typeInto(field, "a\nb");

    expect(pillOf(container).style.borderRadius).toBe("26px");
    expect(field.rows).toBe(2);
  });

  it("row 6 — 7-line value: rows capped at 5, overflowY auto", async () => {
    const container = await render(<App />);
    const field = fieldOf(container);
    typeInto(field, "a\nb\nc\nd\ne\nf\ng");

    expect(field.rows).toBe(5);
    expect(field.style.overflowY).toBe("auto");
  });

  it("row 7 — back to one line: 999px, rows 1", async () => {
    const container = await render(<App />);
    const field = fieldOf(container);
    typeInto(field, "x");

    expect(pillOf(container).style.borderRadius).toBe("999px");
    expect(field.rows).toBe(1);
  });

  it("row 8 — fine pointer: Enter prevents default, creates li, clears field, refocuses", async () => {
    stubMediaWithChangeListener((q) => q === "(pointer: fine)");
    const container = await render(<App />);
    const field = fieldOf(container);
    typeInto(field, "x");

    const event = keyEvent("Enter");
    await dispatch(event, field);

    expect(event.defaultPrevented).toBe(true);
    expect(container.querySelector("li")).not.toBeNull();
    expect(field.value).toBe("");
    expect(document.activeElement).toBe(field);
  });

  it("row 9 — fine pointer: Shift+Enter does not prevent, no li, text stays", async () => {
    stubMediaWithChangeListener((q) => q === "(pointer: fine)");
    const container = await render(<App />);
    const field = fieldOf(container);
    typeInto(field, "x");

    const event = keyEvent("Enter", { shiftKey: true });
    await dispatch(event, field);

    expect(event.defaultPrevented).toBe(false);
    expect(container.querySelector("li")).toBeNull();
    expect(field.value).toBe("x");
  });

  it("row 10 — coarse pointer: Enter does not prevent, no li", async () => {
    stubNoMatchMedia();
    const container = await render(<App />);
    const field = fieldOf(container);
    typeInto(field, "x");

    const event = keyEvent("Enter");
    await dispatch(event, field);

    expect(event.defaultPrevented).toBe(false);
    expect(container.querySelector("li")).toBeNull();
  });

  it("row 11 — coarse: click send creates li with multiline text, clears field", async () => {
    stubNoMatchMedia();
    const container = await render(<App />);
    const field = fieldOf(container);
    typeInto(field, "x\ny");

    await click(sendOf(container));

    const li = container.querySelector("li");
    expect(li).not.toBeNull();
    expect(li!.querySelector("span")!.textContent).toContain("x\ny");
    expect(field.value).toBe("");
  });

  it("row 12 — fine pointer: enterKeyHint is send", async () => {
    stubMediaWithChangeListener((q) => q === "(pointer: fine)");
    const container = await render(<App />);
    expect(fieldOf(container).getAttribute("enterkeyhint")).toBe("send");
  });

  it("row 13 — coarse: enterKeyHint is enter", async () => {
    stubNoMatchMedia();
    const container = await render(<App />);
    expect(fieldOf(container).getAttribute("enterkeyhint")).toBe("enter");
  });

  it("row 14 — live flip: coarse→fine enables Enter send and flips enterKeyHint", async () => {
    const rec = stubMediaWithChangeListener(() => false);
    const container = await render(<App />);
    const field = fieldOf(container);

    // Start coarse
    expect(field.getAttribute("enterkeyhint")).toBe("enter");

    // Flip to fine
    const fineListeners = rec.listeners.get("(pointer: fine)") ?? [];
    expect(fineListeners.length).toBeGreaterThan(0);
    act(() => {
      fineListeners[0]({ matches: true } as MediaQueryListEvent);
    });

    expect(field.getAttribute("enterkeyhint")).toBe("send");

    typeInto(field, "x");
    const event = keyEvent("Enter");
    await dispatch(event, field);
    expect(event.defaultPrevented).toBe(true);
    expect(container.querySelector("li")).not.toBeNull();
  });

  it("row 15 — Alt+2 switches Kind to college (via textarea focus)", async () => {
    stubMediaWithChangeListener((q) => q === "(pointer: fine)");
    const container = await render(<App />);
    const field = fieldOf(container);
    field.focus();
    typeInto(field, "abc");

    await dispatch(keyEvent("2", { altKey: true }), field);

    const dot = container.querySelector("button[aria-haspopup]") as HTMLButtonElement;
    expect(dot.textContent).toBe("F");
    expect(dot.title).toBe("Alt+2");
    expect((dot.firstElementChild as HTMLElement).style.background).toBe(
      toRgb(CARD.college.light),
    );
    expect(field.value).toBe("abc");
  });

  it("row 16 — Ctrl+H from textarea opens archive (unchanged Leva 1a path)", async () => {
    stubDesktopMedia();
    vi.setSystemTime(new Date(2026, 8, 2));
    seedStorage([
      task({ id: "o1", text: "comprar leite" }),
      task({ id: "d1", text: "entregar relatório", done: true, updatedAt: new Date(2026, 8, 2).getTime() }),
    ]);
    const container = await render(<App />);
    const main = container.querySelector("main")!;
    const region = main.parentElement as HTMLElement;
    region.scrollTop = ARCHIVE_HIDDEN_OFFSET;

    const field = fieldOf(container);
    field.focus();

    const event = keyEvent("H", { ctrlKey: true });
    await dispatch(event, field);

    expect(main.textContent).toContain("ocultar concluídas");
  });

  it("row 17 — empty: send disabled, circle dimmed", async () => {
    const container = await render(<App />);
    const send = sendOf(container);
    const circle = circleOf(container);

    expect(send.disabled).toBe(true);
    expect(circle.style.background).toBe("var(--text-quiet)");
  });

  it("row 18 — whitespace-only still disabled", async () => {
    const container = await render(<App />);
    typeInto(fieldOf(container), "   \n ");

    expect(sendOf(container).disabled).toBe(true);
  });

  it("row 19 — non-empty: send enabled, circle bright", async () => {
    const container = await render(<App />);
    typeInto(fieldOf(container), "x");
    const send = sendOf(container);
    const circle = circleOf(container);

    expect(send.disabled).toBe(false);
    expect(circle.style.background).toBe("var(--text-primary)");
    expect(circle.style.color).toBe("var(--surface)");
    expect(send.querySelector("svg")!.getAttribute("fill")).toBe("currentColor");
  });

  it("row 20 — send button and circle dimensions", async () => {
    const container = await render(<App />);
    const send = sendOf(container);
    const circle = circleOf(container);

    expect(send.style.minWidth).toBe("44px");
    expect(send.style.minHeight).toBe("44px");
    expect(circle.style.width).toBe("36px");
    expect(circle.style.height).toBe("36px");
  });

  it("row 21 — failed write keeps text, day, and the Kind dot", async () => {
    throwOnSetItem();
    const container = await render(<App />);
    const field = fieldOf(container);
    typeInto(field, "x");
    const prazo = queryLabel(container, "prazo") as HTMLInputElement;
    typeInto(prazo, "27");

    await click(sendOf(container));

    expect(container.textContent).toContain(SAVE_ERROR);
    expect(field.value).toBe("x");
    expect(prazo.value).toBe("27");
    // Dot unchanged (work is default)
    const dot = container.querySelector("button[aria-haspopup]") as HTMLButtonElement;
    expect(dot.textContent).toBe("T");
    expect(dot.title).toBe("Alt+1");
    expect((dot.firstElementChild as HTMLElement).style.background).toBe(toRgb(CARD.work.light));
  });

  it("row 22 — successful capture clears fields, refocuses, shows task with deadline", async () => {
    vi.setSystemTime(new Date(2026, 7, 22)); // 2026-08-22
    const container = await render(<App />);
    const field = fieldOf(container);
    typeInto(field, "x");
    const prazo = queryLabel(container, "prazo") as HTMLInputElement;
    typeInto(prazo, "27");

    await click(sendOf(container));

    const li = container.querySelector("li");
    expect(li).not.toBeNull();
    expect(li!.textContent).toContain("x");
    expect(li!.textContent).toContain("27/08");
    expect(field.value).toBe("");
    expect(prazo.value).toBe("");
    // Dot unchanged
    const dot = container.querySelector("button[aria-haspopup]") as HTMLButtonElement;
    expect(dot.textContent).toBe("T");
    expect((dot.firstElementChild as HTMLElement).style.background).toBe(toRgb(CARD.work.light));
    expect(document.activeElement).toBe(field);
  });

  it("never accepts a day past 31 into the field", async () => {
    const container = await render(<App />);
    const prazo = queryLabel(container, "prazo") as HTMLInputElement;

    typeInto(prazo, "3");
    expect(prazo.value).toBe("3");
    // The second keystroke would make 32: refused, leaving the digit already accepted.
    typeInto(prazo, "32");
    expect(prazo.value).toBe("3");
  });

  it.each(["0", "00"])(
    "disables send for an incomplete day of %s and keeps the capture intact",
    async (day) => {
    const container = await render(<App />);
    const field = fieldOf(container);
    const prazo = queryLabel(container, "prazo") as HTMLInputElement;
    typeInto(field, "renovar seguro");
    // 0 has to reach the field -- it is the first keystroke of "03" -- so capture()
    // keeps accepting it while the visible send control expresses that Capture is blocked.
    typeInto(prazo, day);

    expect(sendOf(container).disabled).toBe(true);
    await submitCapture(container);

    expect(container.querySelector("li")).toBeNull();
    expect(field.value).toBe("renovar seguro");
    expect(prazo.value).toBe(day);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    },
  );

  it("row 23 — blank lines are normalised through the real path", async () => {
    const container = await render(<App />);
    typeInto(fieldOf(container), "a\n\n\n\nb");
    await submitCapture(container);

    const li = container.querySelector("li");
    expect(li).not.toBeNull();
    expect(li!.querySelector("span")!.textContent).toContain("a\n\nb");
  });

  it("row 24 — fine pointer: textarea focused after render", async () => {
    stubMediaWithChangeListener((q) => q === "(pointer: fine)");
    const container = await render(<App />);
    expect(document.activeElement).toBe(fieldOf(container));
  });

  it("row 25 — coarse: body focused after render (not textarea)", async () => {
    stubNoMatchMedia();
    await render(<App />);
    expect(document.activeElement).toBe(document.body);
  });

  it("E1 — matchMedia undefined: render does not throw; Enter is coarse (no prevent, no li)", async () => {
    vi.stubGlobal("matchMedia", undefined);
    const container = await render(<App />);
    const field = fieldOf(container);
    expect(field).not.toBeNull();

    typeInto(field, "x");
    const event = keyEvent("Enter");
    await dispatch(event, field);
    expect(event.defaultPrevented).toBe(false);
    expect(container.querySelector("li")).toBeNull();
  });

  it("E2 — whitespace submit via submitCapture: no li, no error", async () => {
    const container = await render(<App />);
    typeInto(fieldOf(container), "  \n");
    await submitCapture(container);

    expect(container.querySelector("li")).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});

/**
 * Ticket 03 — the three Kind chips collapse into one dot that opens a pop-up.
 *
 * DOM contract: inside the pill, in document order, the dot button, the textarea, the
 * day field and the send button. The pop-up is rendered only while open, so a closed
 * pill carries no hairline and no div at all.
 */
describe("the Kind dot and pop-up (ticket 03)", () => {
  const KIND_KEY = "capture/kind";
  const OPTION_TEXT = ["T trabalho", "F faculdade", "C casa"];
  const HUES = [CARD.work.light, CARD.college.light, CARD.chore.light];

  function dotOf(container: HTMLElement) {
    return container.querySelector("button[aria-haspopup]") as HTMLButtonElement;
  }
  function popupOf(container: HTMLElement) {
    return container.querySelector('[aria-label="tipo"]') as HTMLElement | null;
  }
  function optionsOf(container: HTMLElement) {
    return [...(popupOf(container)?.querySelectorAll("button") ?? [])] as HTMLButtonElement[];
  }
  /** Both the dot and each option wrap their letter in a circle span. */
  function circleOf(button: HTMLElement) {
    return button.firstElementChild as HTMLElement;
  }
  async function openPopup(container: HTMLElement): Promise<HTMLButtonElement[]> {
    await click(dotOf(container));
    return optionsOf(container);
  }

  it("row 1 — fresh storage: one dot, no chips, work letter, hue, title and 44x44/28px sizing", async () => {
    const container = await render(<App />);
    const pill = pillOf(container);

    // The three chips are gone: the closed pill holds exactly the dot and the send button.
    expect(pill.querySelectorAll("button")).toHaveLength(2);

    const dot = dotOf(container);
    expect(dot.textContent).toBe("T");
    expect(dot.title).toBe("Alt+1");
    expect(dot.type).toBe("button");
    expect(dot.getAttribute("aria-haspopup")).toBe("true");
    expect(dot.getAttribute("aria-expanded")).toBe("false");
    expect(dot.style.minWidth).toBe("44px");
    expect(dot.style.minHeight).toBe("44px");

    const circle = circleOf(dot);
    expect(circle.style.width).toBe("28px");
    expect(circle.style.height).toBe("28px");
    expect(circle.style.borderRadius).toBe("999px");
    expect(circle.style.background).toBe(toRgb(CARD.work.light));
    expect(circle.style.color).toBe(toRgb(INK_ON_LIGHT));
  });

  it("row 2 — stored chore: dot C, title Alt+3, chore hue", async () => {
    localStorage.setItem(KIND_KEY, "chore");
    const container = await render(<App />);
    const dot = dotOf(container);

    expect(dot.textContent).toBe("C");
    expect(dot.title).toBe("Alt+3");
    expect(circleOf(dot).style.background).toBe(toRgb(CARD.chore.light));
  });

  it("row 3 — nothing renders the pop-up until it is opened", async () => {
    const container = await render(<App />);
    expect(popupOf(container)).toBeNull();
    expect(dotOf(container).getAttribute("aria-expanded")).toBe("false");

    localStorage.setItem(KIND_KEY, "chore");
    const seeded = await render(<App />);
    expect(popupOf(seeded)).toBeNull();
  });

  it("row 4 — click the dot: expanded, three lettered options above the dot, current one pressed", async () => {
    const container = await render(<App />);
    const options = await openPopup(container);

    expect(dotOf(container).getAttribute("aria-expanded")).toBe("true");

    const popup = popupOf(container)!;
    expect(popup.getAttribute("role")).toBe("group");
    expect(popup.style.position).toBe("absolute");
    expect(popup.style.bottom).toBe("100%");
    expect(popup.style.background).toBe("var(--capture-bg)");
    expect(popup.style.border).toBe("1px solid var(--hairline)");

    expect(options.map((b) => b.textContent)).toEqual(OPTION_TEXT);
    expect(options.map((b) => b.type)).toEqual(["button", "button", "button"]);
    expect(options.map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);

    options.forEach((option, i) => {
      const circle = circleOf(option);
      expect(circle.style.width).toBe("28px");
      expect(circle.style.height).toBe("28px");
      expect(circle.style.borderRadius).toBe("999px");
      expect(circle.style.background).toBe(toRgb(HUES[i]));
      expect(circle.style.color).toBe(toRgb(INK_ON_LIGHT));
    });
  });

  it("row 5 — choosing faculdade selects college, closes, persists and refocuses the field", async () => {
    const container = await render(<App />);
    const options = await openPopup(container);
    await click(options[1]);

    expect(popupOf(container)).toBeNull();
    const dot = dotOf(container);
    expect(dot.textContent).toBe("F");
    expect(dot.title).toBe("Alt+2");
    expect(dot.getAttribute("aria-expanded")).toBe("false");
    expect(localStorage.getItem(KIND_KEY)).toBe("college");
    expect(document.activeElement).toBe(fieldOf(container));
  });

  it("row 6 — Escape on an option or on the dot closes without changing the Kind", async () => {
    const container = await render(<App />);
    const options = await openPopup(container);
    await dispatch(keyEvent("Escape"), options[1]);

    expect(popupOf(container)).toBeNull();
    expect(dotOf(container).textContent).toBe("T");
    expect(localStorage.getItem(KIND_KEY)).toBeNull();
    expect(document.activeElement).toBe(fieldOf(container));

    await click(dotOf(container));
    await dispatch(keyEvent("Escape"), dotOf(container));

    expect(popupOf(container)).toBeNull();
    expect(dotOf(container).textContent).toBe("T");
    expect(localStorage.getItem(KIND_KEY)).toBeNull();
  });

  it("row 7 — pointerdown on the list region closes without changing the Kind", async () => {
    localStorage.setItem(KIND_KEY, "chore");
    const container = await render(<App />);
    await openPopup(container);

    await dispatch(new Event("pointerdown", { bubbles: true }), container.querySelector("main")!);

    expect(popupOf(container)).toBeNull();
    expect(dotOf(container).textContent).toBe("C");
    expect(localStorage.getItem(KIND_KEY)).toBe("chore");
  });

  it("row 8 — pointerdown inside the textarea counts as outside: closes without change", async () => {
    localStorage.setItem(KIND_KEY, "chore");
    const container = await render(<App />);
    await openPopup(container);

    await dispatch(new Event("pointerdown", { bubbles: true }), fieldOf(container));

    expect(popupOf(container)).toBeNull();
    expect(dotOf(container).textContent).toBe("C");
    expect(localStorage.getItem(KIND_KEY)).toBe("chore");
  });

  it("row 9 — hover and focus on the dot never open the pop-up", async () => {
    const container = await render(<App />);
    const dot = dotOf(container);

    for (const type of ["mouseenter", "mouseover", "pointerenter", "pointerover"]) {
      await dispatch(new Event(type, { bubbles: true }), dot);
      expect(popupOf(container), type).toBeNull();
    }
    await act(async () => dot.focus());

    expect(popupOf(container)).toBeNull();
    expect(dot.getAttribute("aria-expanded")).toBe("false");
  });

  it("row 10 — Alt+3 from the textarea selects chore without opening the pop-up", async () => {
    const container = await render(<App />);
    const field = fieldOf(container);
    await act(async () => field.focus());

    await dispatch(keyEvent("3", { altKey: true }), field);

    expect(popupOf(container)).toBeNull();
    const dot = dotOf(container);
    expect(dot.textContent).toBe("C");
    expect(dot.title).toBe("Alt+3");
    expect(localStorage.getItem(KIND_KEY)).toBe("chore");
  });

  it("row 11 — Alt+1 with the pop-up open selects work and closes it", async () => {
    localStorage.setItem(KIND_KEY, "chore");
    const container = await render(<App />);
    await openPopup(container);

    await dispatch(keyEvent("1", { altKey: true }), dotOf(container));

    expect(popupOf(container)).toBeNull();
    expect(dotOf(container).textContent).toBe("T");
    expect(localStorage.getItem(KIND_KEY)).toBe("work");
  });

  it("row 12 — a Kind chosen in the pop-up is the one sent, and stays selected after", async () => {
    const container = await render(<App />);
    const options = await openPopup(container);
    await click(options[1]);

    typeInto(fieldOf(container), "prova de história");
    await click(sendOf(container));

    const [stored] = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.kind).toBe("college");
    expect(dotOf(container).textContent).toBe("F");
  });

  it("row 13 — a throwing setItem still applies casa for the session, with no banner", async () => {
    throwOnSetItem();
    const container = await render(<App />);
    const options = await openPopup(container);
    await click(options[2]);

    expect(dotOf(container).textContent).toBe("C");
    expect(popupOf(container)).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();

    vi.mocked(Storage.prototype.setItem).mockRestore();
    typeInto(fieldOf(container), "lavar louça");
    await click(sendOf(container));

    const [stored] = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.kind).toBe("chore");
  });

  it("row 14 — document order dot, textarea, day field, send; every control tabIndex 0", async () => {
    const container = await render(<App />);
    typeInto(fieldOf(container), "x"); // an enabled send button is part of the tab ring
    const pill = pillOf(container);

    const closed = [...pill.querySelectorAll<HTMLElement>("button, textarea, input")];
    expect(closed).toHaveLength(4);
    expect(closed[0]).toBe(dotOf(container));
    expect(closed[1]).toBe(fieldOf(container));
    expect(closed[2]).toBe(queryLabel(container, "prazo"));
    expect(closed[3]).toBe(sendOf(container));
    for (const el of closed) expect(el.tabIndex).toBe(0);

    const options = await openPopup(container);
    expect(options).toHaveLength(3);
    for (const option of options) expect(option.tabIndex).toBe(0);
  });

  it("row 15 — Enter/Space on the dot or an option activates the button, never the form", async () => {
    const container = await render(<App />);
    typeInto(fieldOf(container), "x");

    // The dot is a button: the pill's Enter-to-send must not fire from it.
    const dotEnter = keyEvent("Enter");
    await dispatch(dotEnter, dotOf(container));
    expect(dotEnter.defaultPrevented).toBe(false);
    expect(container.querySelector("li")).toBeNull();

    const options = await openPopup(container);
    const optionEnter = keyEvent("Enter");
    await dispatch(optionEnter, options[1]);
    expect(optionEnter.defaultPrevented).toBe(false);
    expect(container.querySelector("li")).toBeNull();

    const optionSpace = keyEvent(" ");
    await dispatch(optionSpace, options[1]);
    expect(optionSpace.defaultPrevented).toBe(false);
    expect(container.querySelector("li")).toBeNull();

    // jsdom never synthesises the click a real Enter/Space produces; model the activation.
    await activate(options[1]);
    expect(popupOf(container)).toBeNull();
    expect(dotOf(container).textContent).toBe("F");
    expect(localStorage.getItem(KIND_KEY)).toBe("college");
    expect(document.activeElement).toBe(fieldOf(container));
  });

  it("row 16 — desktop: the same dot and pop-up declarations (profile-independent)", async () => {
    stubDesktopMedia();
    const container = await render(<App />);
    const dot = dotOf(container);

    expect(dot.textContent).toBe("T");
    expect(dot.title).toBe("Alt+1");
    expect(dot.style.minWidth).toBe("44px");
    expect(dot.style.minHeight).toBe("44px");
    expect(circleOf(dot).style.background).toBe(toRgb(CARD.work.light));

    const options = await openPopup(container);
    expect(options.map((b) => b.textContent)).toEqual(OPTION_TEXT);
    expect(options.map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
    expect(popupOf(container)!.style.background).toBe("var(--capture-bg)");
    expect(popupOf(container)!.style.border).toBe("1px solid var(--hairline)");
  });

  it("row 17 — dark: pop-up on the capture ground with a hairline; circles keep the Kind hues", async () => {
    stubDarkMedia();
    const container = await render(<App />);
    const options = await openPopup(container);
    const popup = popupOf(container)!;

    expect(popup.style.background).toBe("var(--capture-bg)");
    expect(popup.style.border).toBe("1px solid var(--hairline)");
    options.forEach((option, i) => {
      expect(circleOf(option).style.background).toBe(toRgb(HUES[i]));
      expect(circleOf(option).style.color).toBe(toRgb(INK_ON_LIGHT));
    });
    expect(circleOf(dotOf(container)).style.background).toBe(toRgb(CARD.work.light));
    expect(circleOf(dotOf(container)).style.color).toBe(toRgb(INK_ON_LIGHT));
  });

  it("E1 — matchMedia undefined: the dot renders and the pop-up opens without throwing", async () => {
    vi.stubGlobal("matchMedia", undefined);
    const container = await render(<App />);
    expect(dotOf(container)).not.toBeNull();

    const options = await openPopup(container);
    expect(options.map((b) => b.textContent)).toEqual(OPTION_TEXT);
  });

  it("E2 — a stored Kind outside the three falls back to work", async () => {
    localStorage.setItem(KIND_KEY, "banana");
    const container = await render(<App />);
    const dot = dotOf(container);

    expect(dot.textContent).toBe("T");
    expect(dot.title).toBe("Alt+1");
    expect(circleOf(dot).style.background).toBe(toRgb(CARD.work.light));
  });
});
