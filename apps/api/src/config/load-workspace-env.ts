import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { config } from 'dotenv';

const workspaceMarker = 'pnpm-workspace.yaml';

const loadFileIfPresent = (path: string, override = false) => {
  if (!existsSync(path)) return;
  config({ override, path });
};

export const findWorkspaceRoot = (startDir: string) => {
  let current = resolve(startDir);

  while (true) {
    if (existsSync(resolve(current, workspaceMarker))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }

    current = parent;
  }
};

export const loadWorkspaceEnv = (startDir = process.cwd()) => {
  const workspaceRoot = findWorkspaceRoot(startDir);

  if (!workspaceRoot) {
    loadFileIfPresent(resolve(startDir, '.env'));
    loadFileIfPresent(resolve(startDir, '.env.local'), true);
    return;
  }

  loadFileIfPresent(resolve(workspaceRoot, '.env'));
  loadFileIfPresent(resolve(workspaceRoot, '.env.local'), true);
};
