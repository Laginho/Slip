import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const wizard = path.join(root, "scripts/setup-publish.sh");

function read(file: string): string {
  return fs.readFileSync(path.join(root, file), "utf-8");
}

function exists(file: string): boolean {
  return fs.existsSync(path.join(root, file));
}

function toUnix(file: string): string {
  return file.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, drive: string) => `/${drive.toLowerCase()}`);
}

function executable(candidate: string): boolean {
  return spawnSync(candidate, ["--version"], { encoding: "utf-8" }).status === 0;
}

function findBash(): string {
  const configured = process.env.GIT_BASH_PATH;
  if (configured && executable(configured)) return configured;
  if (process.platform !== "win32" && executable("bash")) return "bash";

  const git = spawnSync("git", ["--exec-path"], { encoding: "utf-8" });
  if (git.status === 0) {
    const candidate = path.resolve(git.stdout.trim(), "..", "..", "..", "bin", "bash.exe");
    if (executable(candidate)) return candidate;
  }

  const located = spawnSync("where.exe", ["bash.exe"], { encoding: "utf-8" });
  for (const candidate of located.stdout?.split(/\r?\n/).filter(Boolean) ?? []) {
    if (executable(candidate)) return candidate;
  }
  throw new Error("bash was not found; set GIT_BASH_PATH to a Bash executable");
}

let buildDir = "";

beforeAll(() => {
  buildDir = fs.mkdtempSync(path.join(os.tmpdir(), "slip-build-"));
  const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");
  const build = spawnSync(
    process.execPath,
    [viteCli, "build", "--outDir", buildDir, "--emptyOutDir"],
    { cwd: root, encoding: "utf-8", timeout: 120_000 },
  );
  expect(build.status, `fresh Vite build failed:\n${build.stdout}\n${build.stderr}`).toBe(0);
  // A cold Vite build outlasts Vitest's 10s default hook timeout on a loaded machine.
}, 120_000);

afterAll(() => {
  if (buildDir) fs.rmSync(buildDir, { recursive: true, force: true });
});

describe("publish — GitHub Pages, PWA, and sync", () => {
  it("builds every public asset under /slip/", () => {
    const html = fs.readFileSync(path.join(buildDir, "index.html"), "utf-8");
    expect(html).toContain("/slip/");
    expect(html).not.toMatch(/(?:href|src)="\/(?:assets|manifest|icon-|apple-touch-icon|registerSW|sw\.js|workbox)/);
  });

  it("builds a standalone manifest and service worker for /slip/", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(buildDir, "manifest.webmanifest"), "utf-8"),
    ) as { start_url: string; scope: string; display: string; icons: { sizes: string }[] };

    expect(manifest.start_url).toBe("/slip/");
    expect(manifest.scope).toBe("/slip/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.map(({ sizes }) => sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(fs.existsSync(path.join(buildDir, "sw.js"))).toBe(true);
  });

  it("deploys only after tests, typecheck, lint, build, and a dependency audit", () => {
    const workflow = read(".github/workflows/pages.yml");
    expect(workflow).toMatch(/actions\/checkout@v7/);
    expect(workflow).toMatch(/actions\/setup-node@v7/);
    expect(workflow).toMatch(/actions\/configure-pages@v6/);
    expect(workflow).toMatch(/actions\/upload-pages-artifact@v5/);
    expect(workflow).toMatch(/actions\/deploy-pages@v5/);
    expect(workflow).toMatch(/run: npm test/);
    expect(workflow).toMatch(/run: npx tsc --noEmit/);
    expect(workflow).toMatch(/run: npm run lint/);
    expect(workflow).toMatch(/run: npm audit --audit-level=high/);
    expect(workflow).toMatch(/run: npm run build/);
    expect(workflow).not.toMatch(/cancel-in-progress:\s*true/);
  });

  it("keeps Supabase secrets step-scoped and fails deployment when they are absent", () => {
    const workflow = read(".github/workflows/pages.yml");
    expect(workflow).not.toMatch(/\n {4}env:/);
    expect(workflow).toMatch(/\n {8}env:\s*\n {10}VITE_SUPABASE_URL:\s*\$\{\{\s*secrets\.VITE_SUPABASE_URL/);
    expect(workflow).toMatch(/\n {10}VITE_SUPABASE_ANON_KEY:\s*\$\{\{\s*secrets\.VITE_SUPABASE_ANON_KEY/);
    expect(workflow).toContain("VITE_SUPABASE_URL secret is not set");
    expect(workflow).toContain("VITE_SUPABASE_ANON_KEY secret is not set");
  });

  it("defines the canonical Task table and permits no physical delete", () => {
    const schema = read("supabase/schema.sql").toLowerCase();
    for (const column of ["id", "text", "kind", "deadline", "done", "deleted", "updatedat"]) {
      expect(schema, `column ${column}`).toContain(column);
    }
    expect(schema).toMatch(/primary\s+key\s*\(\s*id\s*\)|id\s+.*primary\s+key/);
    expect(schema).toMatch(/for\s+select/);
    expect(schema).toMatch(/for\s+insert/);
    expect(schema).toMatch(/for\s+update/);
    expect(schema).not.toMatch(/for\s+delete/);
    expect(schema).toMatch(/length\s*\(\s*btrim\s*\(\s*id\s*\)\s*\)\s*>\s*0/);
  });

  it("keeps local credentials ignored and real credentials out of source", () => {
    expect(read(".gitignore")).toMatch(/^\.env\.local$/m);
    expect(exists(".env.example")).toBe(true);
    expect(read(".env.example")).toContain("VITE_SUPABASE_URL");
    expect(read(".env.example")).toContain("VITE_SUPABASE_ANON_KEY");
    expect(read("src/sync.ts")).not.toMatch(/https:\/\/.*\.supabase\.co/);
    expect(read("vite.config.ts")).not.toMatch(/supabase.*anon.*key/i);
  });
});
type Harness = { tmp: string; bin: string; ghLog: string; openLog: string };
const tempDirs: string[] = [];
const bash = findBash();

function makeHarness(): Harness {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "slip-publish-"));
  tempDirs.push(tmp);
  const bin = path.join(tmp, "bin");
  fs.mkdirSync(bin);
  const ghLog = path.join(tmp, "gh.log");
  const openLog = path.join(tmp, "open.log");

  const stub = (name: string, body: string) => {
    const file = path.join(bin, name);
    fs.writeFileSync(file, `#!/usr/bin/env bash\n${body}\n`);
    fs.chmodSync(file, 0o755);
  };

  stub("gh", `echo "$@" >> "${toUnix(ghLog)}"
if [[ "$1" == "auth" && "$2" == "status" ]]; then exit 0; fi
if [[ "$1" == "secret" && "$2" == "set" ]]; then exit 0; fi
if [[ "$1" == "secret" && "$2" == "list" ]]; then exit 0; fi
exit 0`);
  const opener = `echo "$0 $@" >> "${toUnix(openLog)}"\nexit 0`;
  for (const command of ["wslview", "explorer.exe", "xdg-open", "open"]) stub(command, opener);
  return { tmp, bin, ghLog, openLog };
}

function runWizard(input: string, harness: Harness, extraEnv: Record<string, string> = {}) {
  const inheritedPath = (process.env.PATH ?? "")
    .split(path.delimiter)
    .map(toUnix)
    .join(":");
  return spawnSync(bash, [toUnix(wizard)], {
    input,
    cwd: harness.tmp,
    env: { ...process.env, PATH: `${toUnix(harness.bin)}:${inheritedPath}`, ...extraEnv },
    encoding: "utf-8",
    timeout: 8_000,
  });
}

function log(file: string): string {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
}

afterEach(() => {
  while (tempDirs.length) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("publish setup wizard", () => {
  const url = "https://synthetic.invalid.test.supabase.co";
  const publishable = "sb_publishable_synthetic_invalid_abc123";

  it("stops before credentials when the schema is not confirmed", () => {
    const harness = makeHarness();
    const result = runWizard(["", "", "no"].join("\n") + "\n", harness);

    expect(result.status).not.toBe(0);
    expect(fs.existsSync(path.join(harness.tmp, ".env.local"))).toBe(false);
    expect(log(harness.ghLog)).not.toMatch(/secret\s+set|secret\s+list/);
  });

  it("rejects an empty URL before writing or forwarding credentials", () => {
    const harness = makeHarness();
    const result = runWizard(["", "", "y", "", publishable].join("\n") + "\n", harness);

    expect(result.status).not.toBe(0);
    expect(fs.existsSync(path.join(harness.tmp, ".env.local"))).toBe(false);
    expect(log(harness.ghLog)).not.toMatch(/secret\s+set|secret\s+list/);
  });

  it.each([
    "service_role_synthetic_invalid_xyz",
    "sb_secret_synthetic_invalid_999",
  ])("rejects privileged key shape %s", (key) => {
    const harness = makeHarness();
    const result = runWizard(["", "", "y", url, key].join("\n") + "\n", harness);

    expect(result.status).not.toBe(0);
    expect(log(path.join(harness.tmp, ".env.local"))).not.toContain(key);
    expect(log(harness.ghLog)).not.toContain(key);
  });

  it("rejects a legacy JWT whose payload claims service_role", () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url");
    const jwt = `${header}.${payload}.synthetic_signature_invalid`;
    const harness = makeHarness();
    const result = runWizard(["", "", "y", url, jwt].join("\n") + "\n", harness);

    expect(result.status).not.toBe(0);
    expect(log(path.join(harness.tmp, ".env.local"))).not.toContain(jwt);
    expect(log(harness.ghLog)).not.toContain(jwt);
  });

  it("always writes .env.local even when ENV_FILE is inherited", () => {
    const harness = makeHarness();
    const result = runWizard(
      ["", "", "y", url, publishable].join("\n") + "\n",
      harness,
      { ENV_FILE: ".env" },
    );

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(harness.tmp, ".env.local"))).toBe(true);
    expect(fs.existsSync(path.join(harness.tmp, ".env"))).toBe(false);
  });

  it("completes without opening a browser or listing secrets", () => {
    const harness = makeHarness();
    const result = runWizard(["", "", "y", url, publishable].join("\n") + "\n", harness);

    expect(result.status, result.stderr).toBe(0);
    expect(log(harness.openLog)).toBe("");
    expect(log(harness.ghLog)).not.toMatch(/secret\s+list/);
    expect(result.stdout).toContain("https://supabase.com/dashboard/new/");
    expect(result.stdout).toContain("https://supabase.com/dashboard/");
  });
});
