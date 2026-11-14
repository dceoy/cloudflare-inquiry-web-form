import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

interface WranglerConfig {
  assets: {
    directory: string;
    run_worker_first: string[];
  };
  env?: {
    local?: {
      assets: {
        directory: string;
        run_worker_first: string[];
      };
      secrets: { required: string[] };
      vars: Record<string, string>;
    };
  };
  previews: { vars: Record<string, string> };
  secrets: { required: string[] };
  vars: Record<string, string>;
}

const NEWLINE_RE = /\r?\n/u;

test("pnpm dev uses local Turnstile test settings", () => {
  const configText = readFileSync(
    new URL("../wrangler.jsonc", import.meta.url),
    "utf8",
  )
    .split(NEWLINE_RE)
    .filter((line) => !line.startsWith("//"))
    .join("\n");
  const config = JSON.parse(configText) as WranglerConfig;
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { scripts: { dev: string } };
  const devVars = readFileSync(
    new URL("../.dev.vars.example", import.meta.url),
    "utf8",
  );
  const local = config.env?.local;
  const devVarNames = devVars
    .trim()
    .split(NEWLINE_RE)
    .map((line) => line.slice(0, line.indexOf("=")))
    .toSorted((a, b) => a.localeCompare(b));

  assert.equal(packageJson.scripts.dev, "wrangler dev --env local");
  assert.deepEqual(local?.assets, config.assets);
  assert.deepEqual(local?.secrets, config.secrets);
  assert.equal(
    local?.vars["TURNSTILE_HOSTNAMES"],
    "localhost,127.0.0.1,dummy-key.example.com",
  );
  assert.equal(local?.vars["TURNSTILE_ACTION"], "test");
  assert.deepEqual(devVarNames, [...config.secrets.required].toSorted((a, b) => a.localeCompare(b)));
  assert.equal(config.vars["TURNSTILE_HOSTNAMES"], "inquiry.dceoy.com");
  assert.equal(config.vars["TURNSTILE_ACTION"], "contact");
  assert.equal(config.previews.vars["TURNSTILE_HOSTNAMES"], "");
  assert.equal(config.previews.vars["TURNSTILE_ACTION"], "contact");
});
