import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Archive } from "./Archive";
import { SYNC_STORAGE_KEY } from "../sync";
import { click, render, task, typeInto, unmount } from "../testing";

/**
 * SLIP-35: the Sync row at the bottom of the Archive section. Collapsed by default,
 * like the existing "ver concluídas" link; expands in place into two inputs and a
 * Save button. Present even when there are no Done Tasks -- that emptiness is the
 * point, since the published build ships keyless.
 */

const NOW = new Date(2026, 8, 2);

beforeEach(() => {
  localStorage.clear();
});

afterEach(async () => {
  await unmount();
});

function syncToggle(container: HTMLElement): HTMLButtonElement {
  return [...container.querySelectorAll("button")].find(
    (b) => b.textContent === "sincronizar",
  ) as HTMLButtonElement;
}

function urlInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('[aria-label="URL do Supabase"]') as HTMLInputElement;
}

function keyInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('[aria-label="chave anon do Supabase"]') as HTMLInputElement;
}

function saveButton(container: HTMLElement): HTMLButtonElement {
  return [...container.querySelectorAll("button")].find(
    (b) => b.textContent === "salvar",
  ) as HTMLButtonElement;
}

describe("Sync row — zero Done Tasks", () => {
  it("offers optional setup help and preserves entered credentials when returning to the choices", async () => {
    const container = await render(
      <Archive tasks={[]} now={NOW} open={false} onToggle={() => {}} />,
    );
    await click(syncToggle(container));
    expect(container.textContent).toContain("opcional");
    expect(urlInput(container)).toBeNull();
    const help = [...container.querySelectorAll("a")].find((link) => link.textContent === "preciso configurar");
    expect(help?.getAttribute("href")).toBe("https://github.com/Laginho/Slip/blob/main/docs/setup.md");
    expect(help?.target).toBe("_blank");
    const chooseCredentials = () => [...container.querySelectorAll("button")].find((button) => button.textContent === "já tenho um projeto")!;
    await click(chooseCredentials());
    typeInto(urlInput(container), "https://mine.supabase.co");
    typeInto(keyInput(container), "anon-key");
    await click([...container.querySelectorAll("button")].find((button) => button.textContent === "voltar")!);
    expect(urlInput(container)).toBeNull();
    await click(chooseCredentials());
    expect(urlInput(container).value).toBe("https://mine.supabase.co");
    expect(keyInput(container).value).toBe("anon-key");
  });

  it("is the only thing an empty Archive shows", async () => {
    const container = await render(
      <Archive tasks={[]} now={NOW} open={false} onToggle={() => {}} />,
    );
    expect(syncToggle(container)).toBeTruthy();
    expect(container.textContent).not.toContain("ver concluídas");
  });

  it("starts collapsed: no inputs, no Save button", async () => {
    const container = await render(
      <Archive tasks={[]} now={NOW} open={false} onToggle={() => {}} />,
    );
    expect(urlInput(container)).toBeNull();
    expect(keyInput(container)).toBeNull();
    expect(saveButton(container)).toBeFalsy();
  });

  it("expands in place on click: no route, no modal, same container", async () => {
    const container = await render(
      <Archive tasks={[]} now={NOW} open={false} onToggle={() => {}} />,
    );
    await click(syncToggle(container));
    await click([...container.querySelectorAll("button")].find((button) => button.textContent === "já tenho um projeto")!);
    expect(urlInput(container)).toBeTruthy();
    expect(keyInput(container)).toBeTruthy();
    expect(saveButton(container)).toBeTruthy();
    expect(document.querySelectorAll("[role='dialog']")).toHaveLength(0);
  });
});

describe("Sync row — alongside Done Tasks", () => {
  const withDone = [task({ id: "d1", text: "entregar relatório", done: true, updatedAt: NOW.getTime() })];

  it("sits after the 'ver concluídas' link when collapsed", async () => {
    const container = await render(
      <Archive tasks={withDone} now={NOW} open={false} onToggle={() => {}} />,
    );
    expect(container.textContent).toContain("ver concluídas");
    expect(syncToggle(container)).toBeTruthy();
  });

  it("sits at the bottom, after the Done list, when open", async () => {
    const container = await render(
      <Archive tasks={withDone} now={NOW} open={true} onToggle={() => {}} />,
    );
    expect(container.textContent).toContain("entregar relatório");
    expect(syncToggle(container)).toBeTruthy();
  });
});

describe("Sync row — Save", () => {
  it("stores a valid pair with no error shown", async () => {
    const container = await render(
      <Archive tasks={[]} now={NOW} open={false} onToggle={() => {}} />,
    );
    await click(syncToggle(container));
    await click([...container.querySelectorAll("button")].find((button) => button.textContent === "já tenho um projeto")!);
    typeInto(urlInput(container), "https://mine.supabase.co");
    typeInto(keyInput(container), "anon-key");
    await click(saveButton(container));

    expect(JSON.parse(localStorage.getItem(SYNC_STORAGE_KEY)!)).toEqual({
      url: "https://mine.supabase.co",
      key: "anon-key",
    });
    expect(container.querySelector("[role='alert']")).toBeNull();
  });

  it("refuses an http URL, stores nothing, shows one line why", async () => {
    const container = await render(
      <Archive tasks={[]} now={NOW} open={false} onToggle={() => {}} />,
    );
    await click(syncToggle(container));
    await click([...container.querySelectorAll("button")].find((button) => button.textContent === "já tenho um projeto")!);
    typeInto(urlInput(container), "http://mine.supabase.co");
    typeInto(keyInput(container), "anon-key");
    await click(saveButton(container));

    expect(localStorage.getItem(SYNC_STORAGE_KEY)).toBeNull();
    const alert = container.querySelector("[role='alert']");
    expect(alert).not.toBeNull();
    expect(alert!.textContent!.length).toBeGreaterThan(0);
  });

  it("refuses a service_role key, stores nothing, shows one line why", async () => {
    const container = await render(
      <Archive tasks={[]} now={NOW} open={false} onToggle={() => {}} />,
    );
    await click(syncToggle(container));
    await click([...container.querySelectorAll("button")].find((button) => button.textContent === "já tenho um projeto")!);
    typeInto(urlInput(container), "https://mine.supabase.co");
    typeInto(keyInput(container), "service_role-abc");
    await click(saveButton(container));

    expect(localStorage.getItem(SYNC_STORAGE_KEY)).toBeNull();
    expect(container.querySelector("[role='alert']")).not.toBeNull();
  });

  it("both fields empty removes an existing stored pair", async () => {
    localStorage.setItem(
      SYNC_STORAGE_KEY,
      JSON.stringify({ url: "https://mine.supabase.co", key: "anon-key" }),
    );
    const container = await render(
      <Archive tasks={[]} now={NOW} open={false} onToggle={() => {}} />,
    );
    await click(syncToggle(container));
    await click([...container.querySelectorAll("button")].find((button) => button.textContent === "já tenho um projeto")!);
    await click(saveButton(container));

    expect(localStorage.getItem(SYNC_STORAGE_KEY)).toBeNull();
    expect(container.querySelector("[role='alert']")).toBeNull();
  });
});
