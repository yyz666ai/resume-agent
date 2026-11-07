import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { harnessHome } from "./harness.js";
const require = createRequire(import.meta.url);
const bin = path.join(
  path.dirname(require.resolve("@deepseek-ai/dsh/package.json")),
  "lib/bin.js",
);
const child = spawn(process.execPath, [bin, "web", "--no-open"], {
  stdio: "inherit",
  env: { ...process.env, DSH_HOME: harnessHome },
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
