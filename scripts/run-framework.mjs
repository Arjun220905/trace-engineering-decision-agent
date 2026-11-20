import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { readExecutionProfile } from "./execution-profile.mjs";

const [command, ...args] = process.argv.slice(2);
if (!["dev", "build"].includes(command))
  throw new Error("Expected dev or build.");
const managedLinux = readExecutionProfile() === "managed-linux";
// Local passwords and the random signing key stay in the ignored .env file.
if (command === "dev" && !managedLinux) {
  const path = new URL("../.env", import.meta.url);
  let settings = existsSync(path)
    ? readFileSync(path, "utf8")
    : "APP_PASSWORD=6969\n";
  if ((parseEnv(settings).APP_SESSION_SECRET?.length ?? 0) < 32) {
    settings += `\nAPP_SESSION_SECRET=${randomBytes(32).toString("hex")}\n`;
    writeFileSync(path, settings, { mode: 0o600 });
  }
  const { migrateLocal } = await import("./migrate-local.mjs");
  await migrateLocal();
}

if (managedLinux && command === "build") {
  const result = spawnSync(
    "bash",
    [fileURLToPath(new URL("./build-verified.sh", import.meta.url)), ...args],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

// Import in this process so the preview owner retains its PID and signals.
const cli = new URL(
  managedLinux
    ? "../node_modules/vite/bin/vite.js"
    : "../node_modules/vinext/dist/cli.js",
  import.meta.url,
);
process.argv = [
  process.execPath,
  fileURLToPath(cli),
  command,
  ...(!managedLinux && command === "dev" ? ["--port", "5173"] : []),
  ...args,
];
await import(cli.href);
