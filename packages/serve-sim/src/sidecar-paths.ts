import { dirname, join } from "path";
import { fileURLToPath } from "url";

declare const __SERVE_SIM_STANDALONE__: boolean | undefined;

export function isStandaloneBuild(): boolean {
  return typeof __SERVE_SIM_STANDALONE__ === "boolean" && __SERVE_SIM_STANDALONE__;
}

interface SidecarCandidateOptions {
  standalone?: boolean;
  execPath?: string;
}

export function sidecarCandidates(
  moduleUrl: string,
  relativePath: string[],
  options: SidecarCandidateOptions = {},
): string[] {
  const moduleDir = dirname(fileURLToPath(moduleUrl));
  const candidates = [
    join(moduleDir, ...relativePath),
    join(moduleDir, "..", "dist", ...relativePath),
  ];

  if (options.standalone ?? isStandaloneBuild()) {
    candidates.unshift(join(dirname(options.execPath ?? process.execPath), ...relativePath));
  }

  return [...new Set(candidates)];
}
