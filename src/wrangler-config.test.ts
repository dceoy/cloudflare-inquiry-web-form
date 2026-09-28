import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

type WranglerConfig = {
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
};

test("pnpm dev uses local Turnstile hostname settings", () => {
  const configText = readFileSync(
    new URL("../wrangler.jsonc", import.meta.url),
    "utf8",
  )
    .split(/\r?\n/)
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
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("=")))
    .sort();

  assert.equal(packageJson.scripts.dev, "wrangler dev --env local");
  assert.deepEqual(local?.assets, config.assets);
  assert.deepEqual(local?.secrets, config.secrets);
  assert.equal(local?.vars.TURNSTILE_HOSTNAMES, "localhost,127.0.0.1");
  assert.deepEqual(devVarNames, [...config.secrets.required].sort());
  assert.equal(config.vars.TURNSTILE_HOSTNAMES, "inquiry.dceoy.com");
  assert.equal(config.previews.vars.TURNSTILE_HOSTNAMES, "");
});
