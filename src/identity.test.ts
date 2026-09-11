import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file: string): string {
  return fs.readFileSync(path.join(root, file), "utf-8");
}

describe("identity — rename to Slip + portrait lock", () => {
  // Row 1 — RED: manifest name/short_name currently "Tasks"
  it("vite config manifest has name and short_name 'Slip', no 'Tasks' literal", () => {
    const cfg = read("vite.config.ts");
    expect(cfg).toMatch(/name\s*:\s*["']Slip["']/);
    expect(cfg).toMatch(/short_name\s*:\s*["']Slip["']/);
    expect(cfg).not.toMatch(/["']Tasks["']/);
  });

  // Row 2 — RED: orientation field missing
  it("vite config manifest contains orientation 'portrait'", () => {
    const cfg = read("vite.config.ts");
    expect(cfg).toMatch(/orientation\s*:\s*["']portrait["']/);
  });

  // Row 3 — GREEN guard: base/start_url/scope/navigateFallback unchanged
  it("vite config base, start_url, scope, navigateFallback still /slip/ forms", () => {
    const cfg = read("vite.config.ts");
    expect(cfg).toMatch(/base\s*:\s*["']\/slip\/["']/);
    expect(cfg).toMatch(/start_url\s*:\s*["']\/slip\/["']/);
    expect(cfg).toMatch(/scope\s*:\s*["']\/slip\/["']/);
    expect(cfg).toMatch(/navigateFallback\s*:\s*["']\/slip\/index\.html["']/);
  });

  // Row 4 — RED: title currently "Tasks"
  it("index.html has <title>Slip</title> and theme-color placeholder", () => {
    const html = read("index.html");
    expect(html).toContain("<title>Slip</title>");
    expect(html).toContain("%THEME_COLOR%");
  });

  // Audit 2026-09-10 finding 1: a Task holding an unbreakable token (a pasted URL, a
  // boleto number, a Windows path) painted outside its Card. `pre-line` wraps at spaces
  // only. The rule is inherited from body so it reaches the bubble, the wall square and
  // the Archive row; jsdom never loads this stylesheet, so the file is the only guard.
  it("index.html body sets overflow-wrap: anywhere", () => {
    expect(read("index.html")).toContain("overflow-wrap: anywhere;");
  });

  // Audit 2026-09-10 finding 2: maximum-scale blocks pinch-zoom on Android Chrome, the
  // primary target in PRODUCT.md, and fails WCAG 1.4.4. It bought nothing: iOS Safari has
  // ignored it since v10, so it never guarded the focused-field zoom it is usually
  // reached for -- that is the input's own font size (DESIGN.md typography).
  it("index.html viewport does not cap zoom", () => {
    const html = read("index.html");
    const at = html.indexOf('name="viewport"');
    const meta = html.slice(at, html.indexOf("/>", at));
    expect(meta).toContain("width=device-width");
    expect(meta.toLowerCase()).not.toContain("maximum-scale");
    expect(meta.toLowerCase()).not.toContain("user-scalable");
  });

  // Row 5 — RED: package name currently "task-tracker"
  it("package.json name is 'slip'", () => {
    const pkg = read("package.json");
    const parsed = JSON.parse(pkg);
    expect(parsed.name).toBe("slip");
  });

  // Row 6 — RED: DESIGN.md name currently "Tasks"
  it("DESIGN.md front-matter name is Slip and heading says Design System: Slip", () => {
    const md = read("DESIGN.md");
    expect(md).toMatch(/^name:\s*Slip$/m);
    expect(md).toContain("# Design System: Slip");
    expect(md).not.toContain("Design System: Tasks");
  });

  // Row 7 — GREEN guard: storage key unchanged
  it("STORAGE_KEY is still 'tasks/v1'", () => {
    const store = read("src/store.ts");
    expect(store).toContain('STORAGE_KEY = "tasks/v1"');
  });

  // Row 8 — GREEN guard: capture kind key unchanged
  it("sticky Kind key is still 'capture/kind'", () => {
    const cap = read("src/components/CaptureBar.tsx");
    expect(cap).toContain('"capture/kind"');
  });

  // Row 14 — GREEN guard: DESIGN.md frontmatter padding is the Card's own literal.
  // Frontmatter drifting from the code is this repo's recurring documentation defect.
  it("DESIGN.md task-card padding tokens are the Card's padding literals", () => {
    const design = read("DESIGN.md");
    const phone = design.match(/^ {4}padding: "(.+)"$/m)?.[1];
    const wall = design.match(/^ {4}paddingWall: "(.+)"$/m)?.[1];

    expect(read("src/components/Card.tsx")).toContain(`padding: bubble ? "${phone}" : "${wall}"`);
  });
});

describe("dark chrome shell", () => {
  // Row 11 — RED: index.html must have two theme-color metas; the dark one has a media query
  it("index.html has exactly two theme-color metas; the second has prefers-color-scheme: dark and %THEME_COLOR_DARK%", () => {
    const html = read("index.html");
    const themeColorMetas = html.match(/<meta\s+name="theme-color"[^>]*>/gi) ?? [];
    expect(themeColorMetas.length).toBe(2);

    // First still has %THEME_COLOR%
    expect(themeColorMetas[0]).toMatch(/content="%THEME_COLOR%"/i);
    expect(themeColorMetas[0]).not.toMatch(/media=/i);

    // Second has the dark media query and %THEME_COLOR_DARK%
    expect(themeColorMetas[1]).toMatch(/media="\s*\(prefers-color-scheme:\s*dark\)\s*"/i);
    expect(themeColorMetas[1]).toMatch(/content="%THEME_COLOR_DARK%"/i);
  });

  // Row 12 — RED: vite.config.ts imports SURFACE_DARK and replaces both placeholders
  it("vite.config.ts imports SURFACE_DARK, source contains %THEME_COLOR_DARK%, manifest still uses SURFACE", () => {
    const cfg = read("vite.config.ts");
    expect(cfg).toMatch(/import\s*\{[^}]*SURFACE_DARK[^}]*\}\s*from/);
    expect(cfg).toContain("%THEME_COLOR_DARK%");
    // Manifest block still uses SURFACE (light) for theme_color and background_color
    expect(cfg).toMatch(/theme_color\s*:\s*SURFACE[^_]/);
    expect(cfg).toMatch(/background_color\s*:\s*SURFACE/);
  });

  // Row 13 — RED: PRODUCT.md and DESIGN.md reworded away from "no dark mode"
  it("PRODUCT.md and DESIGN.md have no 'no dark mode' line and each has 'follows the system colour scheme'", () => {
    const product = read("PRODUCT.md");
    const design = read("DESIGN.md");

    // No "no dark mode" in either file
    expect(product).not.toMatch(/no dark mode/i);
    expect(design).not.toMatch(/no dark mode/i);

    // Both must have the system-scheme phrasing (accepts colour or color)
    expect(product).toMatch(/follows the system (colou?r )?scheme/i);
    expect(design).toMatch(/follows the system (colou?r )?scheme/i);

    // Nine-swatch freeze sentence in PRODUCT.md must be byte-identical to main.
    // The sentence: "- The nine Card swatches are individually immutable:"
    expect(product).toContain("- The nine Card swatches are individually immutable:");
  });
});
