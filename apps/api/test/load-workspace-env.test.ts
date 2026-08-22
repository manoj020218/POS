import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  findWorkspaceRoot,
  loadWorkspaceEnv
} from '../src/config/load-workspace-env.js';

const testKey = 'SMART_POS_ENV_TEST';
const tempRoots: string[] = [];

afterEach(() => {
  delete process.env[testKey];

  while (tempRoots.length > 0) {
    rmSync(tempRoots.pop()!, { force: true, recursive: true });
  }
});

describe('loadWorkspaceEnv', () => {
  it('finds the workspace root from a nested package path', () => {
    const root = mkdtempSync(join(tmpdir(), 'smart-pos-workspace-'));
    const nestedDir = join(root, 'apps', 'api');

    tempRoots.push(root);
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');

    expect(findWorkspaceRoot(nestedDir)).toBe(root);
  });

  it('loads the root .env file for nested package scripts', () => {
    const root = mkdtempSync(join(tmpdir(), 'smart-pos-workspace-'));
    const nestedDir = join(root, 'apps', 'api');

    tempRoots.push(root);
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');
    writeFileSync(join(root, '.env'), `${testKey}=from-root\n`);

    loadWorkspaceEnv(nestedDir);

    expect(process.env[testKey]).toBe('from-root');
  });

  it('lets .env.local override the root .env file', () => {
    const root = mkdtempSync(join(tmpdir(), 'smart-pos-workspace-'));

    tempRoots.push(root);
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');
    writeFileSync(join(root, '.env'), `${testKey}=from-env\n`);
    writeFileSync(join(root, '.env.local'), `${testKey}=from-local\n`);

    loadWorkspaceEnv(root);

    expect(process.env[testKey]).toBe('from-local');
  });
});
