import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "./store";
import { Card } from "./components/Card";
import { CARD, INK_ON_DARK, INK_ON_LIGHT, OVERDUE_RED } from "./palette";
import { formatDeadline } from "./urgency";
import {
  activate,
  dispatch,
  queryLabel,
  render,
  stubDarkDesktopMedia,
  stubDesktopMedia,
  stubMediaWithChangeListener,
  stubNoMatchMedia,
  task,
  unmount,
} from "./testing";

/**
 * The keyboard contract: Concluir, Editar and Apagar are real buttons with accessible
 * names, reachable and revealed by focus alone -- never gated on a pointer media
 * query. At rest they are invisible AND untouchable (pointer-events:none), so they
 * cannot take a tap meant for the Card or block its swipe strip. Gestures remain
 * shortcuts; these buttons are the interface.
 */

beforeEach(() => {
  stubNoMatchMedia();
});

afterEach(async () => {
  await unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("visual — promoção B/A Conversa (mobile) vs A/A Parede (desktop)", () => {
  const FIXED_NOW = new Date(2026, 7, 27, 12, 0, 0); // 27/08/2026 local

  function cardTask(): Task {
    return task({ id: "vis-1", text: "preparar apresentação", deadline: "2026-08-30" });
  }

  async function renderVisual(wide: boolean): Promise<HTMLElement> {
    const t = cardTask();
    const container = await render(
      <ul>
        <Card
          task={t}
          now={FIXED_NOW}
          wide={wide}
          onComplete={() => true}
          onDelete={() => true}
          onEdit={() => true}
        />
      </ul>,
    );
    return container;
  }

  it("Card mobile (wide=false) é bubble à esquerda: maxWidth 86% radius 6px 16px 16px 16px e prazo vence 30/08 em meta separada", async () => {
    const container = await renderVisual(false);
    const li = container.querySelector("li") as HTMLElement;
    expect(li).not.toBeNull();
    // Bubble constraints —Conversational composition phone <900
    expect(li.style.maxWidth).toBe("86%");
    expect(li.style.borderRadius).toBe("6px 16px 16px 16px");
    // Deadline meta: exactly "vence 30/08" (not plain 30/08), em linha separada
    expect(li.textContent).toContain("vence 30/08");
    // Ensure the plain "30/08" alone is wrapped as vence — at least one node holds the prefix
    const hasVenceNode = [...li.querySelectorAll("span")].some((s) =>
      s.textContent?.includes("vence 30/08"),
    );
    expect(hasVenceNode, "prazo em meta separada com prefixo vence").toBe(true);
  });

  it("Card desktop (wide=true) é parede: radius 10 sem cap 86% e prazo 30/08 sem prefixo vence", async () => {
    const container = await renderVisual(true);
    const li = container.querySelector("li") as HTMLElement;
    expect(li).not.toBeNull();
    // Wall card fills cell — no 86% cap
    expect(li.style.maxWidth).not.toBe("86%");
    // Explicit check: maxWidth either empty or 100%/none, never bubble cap
    expect(["", "100%", "none"]).toContain(li.style.maxWidth);
    expect(li.style.borderRadius).toBe("10px");
    // Desktop keeps compact deadline "30/08" without "vence"
    expect(li.textContent).toContain("30/08");
    expect(li.textContent).not.toContain("vence 30/08");
  });
});

describe("44px hit targets", () => {
  const NOW = new Date(2026, 7, 22);

  async function renderCard(wide = false) {
    const card = task({ id: "t1", text: "entregar relatório" });
    const container = await render(
      <ul>
        <Card
          task={card}
          now={NOW}
          wide={wide}
          onComplete={() => true}
          onDelete={() => true}
          onEdit={() => true}
        />
      </ul>,
    );
    return { card, container };
  }

  it("row 1 — no-match profile: each control has minWidth and minHeight of 44px", async () => {
    const { container } = await renderCard();
    for (const label of ["Concluir", "Editar", "Apagar"]) {
      const button = queryLabel(container, label) as HTMLElement;
      expect(button).not.toBeNull();
      expect(button.style.minWidth).toBe("44px");
      expect(button.style.minHeight).toBe("44px");
    }
  });

  it("row 2 — desktop profile: each control has minWidth and minHeight of 44px", async () => {
    stubDesktopMedia();
    const { container } = await renderCard();
    for (const label of ["Concluir", "Editar", "Apagar"]) {
      const button = queryLabel(container, label) as HTMLElement;
      expect(button).not.toBeNull();
      expect(button.style.minWidth).toBe("44px");
      expect(button.style.minHeight).toBe("44px");
    }
  });

  it("row 3 — fontSize remains 18px and glyph text unchanged", async () => {
    const { container } = await renderCard();
    const glyphs: Record<string, string> = { Concluir: "✓", Editar: "✎", Apagar: "×" };
    for (const [label, glyph] of Object.entries(glyphs)) {
      const button = queryLabel(container, label) as HTMLElement;
      expect(button).not.toBeNull();
      expect(button.style.fontSize).toBe("18px");
      expect(button.textContent).toBe(glyph);
    }
  });

  it("row 4 — resting state: opacity 0 and pointerEvents none", async () => {
    const { container } = await renderCard();
    for (const label of ["Concluir", "Editar", "Apagar"]) {
      const button = queryLabel(container, label) as HTMLButtonElement;
      expect(button).not.toBeNull();
      expect(button.style.opacity).toBe("0");
      expect(button.style.pointerEvents).toBe("none");
    }
  });

  it("row 5 — focus Concluir: all three reveal with pointerEvents auto and opacity non-zero", async () => {
    const { container } = await renderCard();
    const concluir = queryLabel(container, "Concluir")!;
    await act(async () => concluir.focus());
    for (const label of ["Concluir", "Editar", "Apagar"]) {
      const button = queryLabel(container, label) as HTMLButtonElement;
      expect(button.style.pointerEvents).toBe("auto");
      expect(Number(button.style.opacity)).toBeGreaterThan(0);
    }
  });

  it("row 6 — blur: back to pointerEvents none and opacity 0", async () => {
    const { container } = await renderCard();
    const concluir = queryLabel(container, "Concluir") as HTMLButtonElement;
    await act(async () => concluir.focus());
    await act(async () => concluir.blur());
    for (const label of ["Concluir", "Editar", "Apagar"]) {
      const button = queryLabel(container, label) as HTMLButtonElement;
      expect(button.style.opacity).toBe("0");
      expect(button.style.pointerEvents).toBe("none");
    }
  });

  it("row 7 — focus Concluir then activate: onComplete fires once with the Task", async () => {
    const onComplete = vi.fn(() => true);
    const card = task({ id: "t1", text: "entregar relatório" });
    const container = await render(
      <ul>
        <Card
          task={card}
          now={NOW}
          wide={false}
          onComplete={onComplete}
          onDelete={() => true}
          onEdit={() => true}
        />
      </ul>,
    );
    await activate(queryLabel(container, "Concluir")!);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(card);
  });

  it("row 8 — swipe left from trailing edge over a resting control: swipe proceeds, onDelete fires", async () => {
    const onDelete = vi.fn(() => true);
    const card = task({ id: "t1", text: "entregar relatório" });
    const container = await render(
      <ul>
        <Card
          task={card}
          now={NOW}
          wide={false}
          onComplete={() => true}
          onDelete={onDelete}
          onEdit={() => true}
        />
      </ul>,
    );
    const li = container.querySelector("li")!;

    const fire = (type: string, x: number) =>
      new PointerEvent(type, { bubbles: true, clientX: x, clientY: 0, pointerId: 1 });
    const transitionEnd = () =>
      Object.assign(new Event("transitionend", { bubbles: true }), {
        propertyName: "transform",
      });
    // Start from the trailing edge (right side), over a resting Apagar button
    await dispatch(fire("pointerdown", 300), li);
    await dispatch(fire("pointermove", 200), li);
    await dispatch(fire("pointerup", 200), li);

    // The Card should have exited left
    expect(li.style.transform).toBe("translateX(-110%)");
    // The control did not capture the pointer — the swipe proceeded

    await dispatch(transitionEnd(), li);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("row 9 — each control has inline margin \"-13px -12px\" (vertical 13px each side, horizontal -12px)", async () => {
    const { container } = await renderCard();
    for (const label of ["Concluir", "Editar", "Apagar"]) {
      const button = queryLabel(container, label) as HTMLElement;
      expect(button).not.toBeNull();
      expect(button.style.margin).toBe("-13px -12px");
    }
  });

  it("row 10 — desktop (wide): the <li> has inline gap \"10px\"", async () => {
    stubDesktopMedia();
    const { container } = await renderCard(true);
    const li = container.querySelector("li")!;
    expect(li.style.gap).toBe("10px");
  });

  it("row 11 — no-match (bubble): the actions container (parent of Concluir) has inline gap \"4px\"", async () => {
    const { container } = await renderCard();
    const concluir = queryLabel(container, "Concluir")!;
    const actionsContainer = concluir.parentElement!;
    expect(actionsContainer.style.gap).toBe("4px");
  });
});

/**
 * The square post-it (ticket 04). The desktop wall Card is an inline-size container
 * with aspect-ratio 1 and a column layout; the text scales with the square, clamps at
 * eight lines, the Deadline sits bottom-left, and the controls move to the top-right
 * corner. jsdom has no layout engine, so everything here is the declared inline style.
 *
 * Properties cssstyle may not model (containerType, aspectRatio, WebkitLineClamp,
 * WebkitBoxOrient, display: -webkit-box) are read via cssValue(): camelCase access
 * first, then the kebab-case getPropertyValue, then a regex over the raw style
 * attribute — the browser-author string React sent. Reported mechanism per assertion
 * below is the fallback chain in cssValue.
 */
function cssValue(el: HTMLElement, prop: string): string {
  const typed = el.style as unknown as Record<string, string>;
  const direct = typed[prop];
  if (direct !== undefined && direct !== "") return direct;
  const kebab = prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  const fromProperty = el.style.getPropertyValue(kebab);
  if (fromProperty !== "") return fromProperty;
  const attr = el.getAttribute("style") ?? "";
  const kebabMatch = new RegExp(`(?:^|;)\\s*${kebab}\\s*:\\s*([^;]+)`, "i").exec(attr);
  if (kebabMatch) return kebabMatch[1].trim();
  const camelMatch = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "i").exec(attr);
  if (camelMatch) return camelMatch[1].trim();
  return "";
}

/** The `rgb(r, g, b)` form jsdom's cssstyle normalizes a `#rrggbb` literal to. */
function rgb(hex: string): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)!;
  const channels = [m[1], m[2], m[3]].map((x) => parseInt(x, 16));
  return `rgb(${channels.join(", ")})`;
}

describe("the square post-it (ticket 04)", () => {
  const NOW = new Date(2026, 7, 22);

  async function renderSquare(
    text: string,
    opts: {
      wide: boolean;
      deadline?: string;
      onEdit?: (task: Task, next: string) => boolean;
    },
  ): Promise<{ container: HTMLElement; card: Task }> {
    const card = task({
      id: "sq",
      text,
      deadline: opts.deadline ?? null,
    });
    const container = await render(
      <ul>
        <Card
          task={card}
          now={NOW}
          wide={opts.wide}
          onComplete={() => true}
          onDelete={() => true}
          onEdit={opts.onEdit ?? (() => true)}
        />
      </ul>,
    );
    return { card, container };
  }

  it("row 3 — wall li is an inline-size square: containerType, aspect-ratio, hidden overflow, radius 10, relative column in the Kind/Urgency colour", async () => {
    stubDesktopMedia();
    const { container } = await renderSquare("entregar relatório", { wide: true });
    const li = container.querySelector("li") as HTMLElement;

    expect(cssValue(li, "containerType")).toBe("inline-size");
    expect(["1 / 1", "1"]).toContain(cssValue(li, "aspectRatio"));
    expect(li.style.overflow).toBe("hidden");
    expect(li.style.borderRadius).toBe("10px");
    expect(li.style.position).toBe("relative");
    expect(li.style.display).toBe("flex");
    expect(li.style.flexDirection).toBe("column");
    expect(li.style.background).toBe(rgb(CARD.work.light));
    expect(li.style.color).toBe(rgb(INK_ON_LIGHT));
  });

  it("row 4 — wall text scales with the square (6.67cqw), pre-line, clamped at eight lines with an ellipsis", async () => {
    stubDesktopMedia();
    const { container } = await renderSquare("a\nb", { wide: true });
    const span = container.querySelector("li > span") as HTMLElement;

    expect(span.style.fontSize).toBe("6.67cqw");
    expect(span.style.lineHeight).toBe("1.3");
    expect(span.style.whiteSpace).toBe("pre-line");
    expect(cssValue(span, "WebkitLineClamp")).toBe("8");
    expect(cssValue(span, "display")).toBe("-webkit-box");
    expect(cssValue(span, "WebkitBoxOrient")).toBe("vertical");
    expect(span.style.overflow).toBe("hidden");
    expect(span.textContent).toBe("a\nb");
  });

  it("row 5 — wall text keeps the same clamp on a 12-line Task (declarative, no measurement)", async () => {
    stubDesktopMedia();
    const twelveLines = Array.from({ length: 12 }, (_, i) => `linha ${i + 1}`).join("\n");
    const { container } = await renderSquare(twelveLines, { wide: true });
    const span = container.querySelector("li > span") as HTMLElement;

    expect(span.style.fontSize).toBe("6.67cqw");
    expect(span.style.lineHeight).toBe("1.3");
    expect(span.style.whiteSpace).toBe("pre-line");
    expect(cssValue(span, "WebkitLineClamp")).toBe("8");
    expect(cssValue(span, "display")).toBe("-webkit-box");
    expect(cssValue(span, "WebkitBoxOrient")).toBe("vertical");
    expect(span.style.overflow).toBe("hidden");
    // Growing the clamped box reveals lines below its eighth-line ellipsis.
    expect(span.style.flexGrow).toBe("0");
    expect(span.style.flexBasis).toBe("auto");
    expect(span.textContent).toBe(twelveLines);
  });

  it("row 6 — wall Deadline is a bottom-left footer span, dd/mm at 5.8cqw, tabular, 0.75, no 'vence' prefix", async () => {
    stubDesktopMedia();
    const { container } = await renderSquare("a\nb", {
      wide: true,
      deadline: "2026-08-30",
    });
    const li = container.querySelector("li") as HTMLElement;
    const allSpans = [...li.querySelectorAll("span")] as HTMLElement[];
    const footer = allSpans.find((s) => s.textContent === formatDeadline("2026-08-30"));

    expect(footer).toBeDefined();
    expect(footer!.textContent).toBe(formatDeadline("2026-08-30"));
    expect(li.textContent).not.toContain("vence");
    expect(footer!.style.fontSize).toBe("5.8cqw");
    expect(footer!.style.fontVariantNumeric).toBe("tabular-nums");
    expect(footer!.style.opacity).toBe("0.75");
    expect(footer!.style.marginTop).toBe("auto");
    expect(footer!.style.alignSelf).toBe("flex-start");
    expect(footer!.previousElementSibling).toBe(li.firstElementChild);

    // It is the last span before the controls' container: the controls' div follows it.
    const controlsContainer = queryLabel(container, "Concluir")!.parentElement!;
    expect(
      footer!.compareDocumentPosition(controlsContainer) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("row 7 — wall with no Deadline renders no dd/mm footer", async () => {
    stubDesktopMedia();
    const { container } = await renderSquare("a\nb", { wide: true });
    const li = container.querySelector("li") as HTMLElement;
    expect(li.querySelectorAll(":scope > span")).toHaveLength(1);
    expect(li.firstElementChild!.textContent).toBe("a\nb");
  });

  it("row 8 — wall Overdue label is a bold red span nested inside the text, inline", async () => {
    stubDesktopMedia();
    const { container } = await renderSquare("a\nb", {
      wide: true,
      deadline: "2026-08-20",
    });
    const textSpan = container.querySelector("li > span") as HTMLElement;
    const overdue = [...textSpan.querySelectorAll("span")].find((s) =>
      s.textContent?.includes("atrasado"),
    );

    expect(overdue).toBeDefined();
    expect(overdue!.textContent).toBe("2 dias atrasado");
    expect(overdue!.style.color).toBe(rgb(OVERDUE_RED));
    expect(overdue!.style.fontWeight).toBe("700");
    expect(["", "inline"]).toContain(overdue!.style.display);
  });

  it("row 9 — wall controls sit in one absolute top-right container; each is 44px, 7.5cqw, at rest invisible and inert", async () => {
    stubDesktopMedia();
    const { container } = await renderSquare("a\nb", { wide: true });
    const concluir = queryLabel(container, "Concluir")!;
    const parent = concluir.parentElement!;

    expect(parent.style.position).toBe("absolute");
    expect(parent.style.top).not.toBe("");
    expect(parent.style.right).not.toBe("");
    expect(parent.style.display).toBe("flex");

    for (const label of ["Concluir", "Editar", "Apagar"]) {
      const button = queryLabel(container, label) as HTMLElement;
      expect(button).not.toBeNull();
      expect(button.parentElement).toBe(parent);
      expect(button.style.minWidth).toBe("44px");
      expect(button.style.minHeight).toBe("44px");
      expect(button.style.fontSize).toBe("7.5cqw");
      expect(button.style.margin).toBe("-13px -12px");
      expect(button.style.opacity).toBe("0");
      expect(button.style.pointerEvents).toBe("none");
    }
  });

  it("row 10 — genuine hover reveals the controls and reserves 80px for them on the text's first lines", async () => {
    stubMediaWithChangeListener(
      (q) => q === "(min-width: 900px)" || q === "(hover: hover)",
    );
    const { container } = await renderSquare("a\nb", { wide: true });
    const li = container.querySelector("li")!;
    const span = li.querySelector("li > span") as HTMLElement;

    await dispatch(new MouseEvent("mouseover", { bubbles: true }), li);

    for (const label of ["Concluir", "Editar", "Apagar"]) {
      const button = queryLabel(container, label) as HTMLButtonElement;
      expect(button.style.opacity).toBe("0.7");
      expect(button.style.pointerEvents).toBe("auto");
    }
    expect(span.style.paddingRight).toBe("80px");
  });

  it("row 11 — focus reveals the controls the same way without hover, and blur rests them again", async () => {
    stubDesktopMedia();
    const { container } = await renderSquare("a\nb", { wide: true });
    const li = container.querySelector("li")!;
    const span = li.querySelector("li > span") as HTMLElement;
    const concluir = queryLabel(container, "Concluir") as HTMLButtonElement;

    await act(async () => concluir.focus());
    for (const label of ["Concluir", "Editar", "Apagar"]) {
      const button = queryLabel(container, label) as HTMLButtonElement;
      expect(button.style.pointerEvents).toBe("auto");
      expect(button.style.opacity).toBe("0.7");
    }
    expect(span.style.paddingRight).toBe("80px");

    await act(async () => concluir.blur());
    expect(span.style.paddingRight).toBe("0px");
    for (const label of ["Concluir", "Editar", "Apagar"]) {
      const button = queryLabel(container, label) as HTMLButtonElement;
      expect(button.style.pointerEvents).toBe("none");
      expect(button.style.opacity).toBe("0");
    }
  });

  it("row 13 — editing a 12-line wall Task: textarea fills the text region and scrolls internally, no footer", async () => {
    stubDesktopMedia();
    const twelveLines = Array.from({ length: 12 }, (_, i) => `linha ${i + 1}`).join("\n");
    const { container } = await renderSquare(twelveLines, {
      wide: true,
      deadline: "2026-08-30",
    });

    await activate(queryLabel(container, "Editar")!);
    const editor = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="Task"]')!;
    expect(editor.value).toBe(twelveLines);
    expect(editor.style.overflowY).toBe("auto");
    expect(editor.style.flexGrow).toBe("1");

    const textSpan = container.querySelector("li > span") as HTMLElement;
    expect(textSpan.style.flexGrow).toBe("1");
    expect(cssValue(textSpan, "display")).toBe("flex");
    expect(cssValue(textSpan, "WebkitLineClamp")).toBe("");

    // No deadline footer while editing.
    const footers = [...container.querySelectorAll("span")].filter((s) =>
      /\d\d\/\d\d/.test(s.textContent ?? ""),
    );
    expect(footers).toHaveLength(0);
  });

  it("row 14 — bubble (phone) stays byte-identical: six-line clamp and the conversational radius/padding/maxWidth", async () => {
    stubNoMatchMedia();
    const { container } = await renderSquare("a\nb", { wide: false });
    const li = container.querySelector("li") as HTMLElement;
    const span = li.querySelector("li > span") as HTMLElement;

    expect(cssValue(span, "WebkitLineClamp")).toBe("6");
    expect(cssValue(span, "display")).toBe("-webkit-box");
    expect(span.style.whiteSpace).toBe("pre-line");
    expect(span.style.fontSize).toBe("18px");
    expect(span.style.lineHeight).toBe("1.5");

    expect(li.style.borderRadius).toBe("6px 16px 16px 16px");
    expect(li.style.maxWidth).toBe("86%");
    expect(li.style.padding).toBe("10px 14px");
    expect(cssValue(li, "containerType")).toBe("");
    expect(cssValue(li, "aspectRatio")).toBe("");
  });

  it("row 16 — dark wall: the nine Kind × Urgency Cards keep exactly the light scheme's backgrounds and inks", async () => {
    const deadlines: Record<string, string | null> = {
      light: null,
      medium: "2026-08-27", // 5 days out: <now=22>
      dark: "2026-08-22", // due today
    };
    const kinds = ["work", "college", "chore"] as const;

    async function renderScheme(useDark: boolean): Promise<Map<string, string>> {
      if (useDark) stubDarkDesktopMedia();
      else stubDesktopMedia();
      const container = await render(
        <ul>
          {kinds.flatMap((kind) =>
            (["light", "medium", "dark"] as const).map((urgency) => (
              <Card
                key={`${kind}-${urgency}`}
                task={task({
                  id: `${kind}-${urgency}`,
                  text: `${kind} ${urgency}`,
                  kind,
                  deadline: deadlines[urgency],
                })}
                now={NOW}
                wide={true}
                onComplete={() => true}
                onDelete={() => true}
                onEdit={() => true}
              />
            )),
          )}
        </ul>,
      );
      const map = new Map<string, string>();
      const cards = [...container.querySelectorAll("li")] as HTMLElement[];
      for (const kind of kinds) {
        for (const urgency of ["light", "medium", "dark"] as const) {
          const card = cards.find(
            (c) => c.textContent?.includes(`${kind} ${urgency}`) ?? false,
          )!;
          map.set(
            `${kind}:${urgency}`,
            `${card.style.background}|${card.style.color}`,
          );
        }
      }
      await unmount();
      return map;
    }

    const light = await renderScheme(false);
    const dark = await renderScheme(true);

    for (const kind of kinds) {
      for (const urgency of ["light", "medium", "dark"] as const) {
        const lightValue = light.get(`${kind}:${urgency}`)!;
        expect(dark.get(`${kind}:${urgency}`)).toBe(lightValue);
        const expectedInk = urgency === "dark" ? INK_ON_DARK : INK_ON_LIGHT;
        expect(lightValue).toBe(`${rgb(CARD[kind][urgency])}|${rgb(expectedInk)}`);
      }
    }
  });
});
