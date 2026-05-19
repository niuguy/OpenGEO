import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { rename } from "node:fs/promises";

const apiDir = "src/app/api";
const hiddenApiDir = "src/api.__static_export_disabled";

async function run(command: string, args: string[]) {
  const child = spawn(command, args, {
    env: {
      ...process.env,
      STATIC_EXPORT: "true"
    },
    shell: false,
    stdio: "inherit"
  });

  const code = await new Promise<number | null>((resolve) => {
    child.on("exit", resolve);
  });

  if (code !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with code ${code}`);
  }
}

async function main() {
  if (existsSync(hiddenApiDir)) {
    throw new Error(`${hiddenApiDir} already exists. Restore or remove it before running the static export.`);
  }

  let apiHidden = false;
  try {
    if (existsSync(apiDir)) {
      await rename(apiDir, hiddenApiDir);
      apiHidden = true;
    }

    await run("pnpm", ["build"]);
  } finally {
    if (apiHidden && existsSync(hiddenApiDir)) {
      await rename(hiddenApiDir, apiDir);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
