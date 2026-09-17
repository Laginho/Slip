import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file: string): string {
  return fs.readFileSync(path.join(root, file), "utf-8");
}

describe("repo metadata — SLIP-38 license + README", () => {
  it("package.json has \"license\": \"MIT\"", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.license).toBe("MIT");
  });

  it("LICENSE exists with the MIT permission notice, Bruno Lage, 2026", () => {
    const license = read("LICENSE");
    expect(license).toContain(
      'Permission is hereby granted, free of charge, to any person obtaining a copy',
    );
    expect(license).toContain("Bruno Lage");
    expect(license).toContain("2026");
  });

  it("README no longer claims the secrets must be configured before the build can deploy", () => {
    const flat = read("README.md").replace(/\s+/g, " ");
    expect(flat).not.toContain("Before the build can deploy, configure");
  });

  it("every npm command the README mentions is a script in package.json", () => {
    const readme = read("README.md");
    const pkg = JSON.parse(read("package.json"));
    const mentioned = new Set<string>();
    for (const m of readme.matchAll(/npm (?:run )?([a-z:-]+)/g)) {
      if (m[1] !== "ci") mentioned.add(m[1]);
    }
    expect(mentioned.size).toBeGreaterThan(0);
    for (const script of mentioned) {
      expect(pkg.scripts).toHaveProperty(script);
    }
  });
});
