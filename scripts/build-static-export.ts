import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { rename } from "node:fs/promises";

const hiddenRoutes = [
  ["src/app/api", "src/api.__static_export_disabled"],
  ["src/app/audit-machine", "src/audit-machine.__static_export_disabled"],
  ["src/app/backoffice", "src/backoffice.__static_export_disabled"],
  ["src/app/businesses", "src/businesses.__static_export_disabled"],
  ["src/app/prospecting", "src/prospecting.__static_export_disabled"]
] as const;

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
  for (const [, hiddenDir] of hiddenRoutes) {
    if (existsSync(hiddenDir)) {
      throw new Error(`${hiddenDir} already exists. Restore or remove it before running the static export.`);
    }
  }

  const movedRoutes: typeof hiddenRoutes[number][] = [];
  try {
    for (const route of hiddenRoutes) {
      const [sourceDir, hiddenDir] = route;
      if (existsSync(sourceDir)) {
        await rename(sourceDir, hiddenDir);
        movedRoutes.push(route);
      }
    }

    await run("pnpm", ["build"]);
  } finally {
    for (const [sourceDir, hiddenDir] of movedRoutes.reverse()) {
      if (existsSync(hiddenDir)) {
        await rename(hiddenDir, sourceDir);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
