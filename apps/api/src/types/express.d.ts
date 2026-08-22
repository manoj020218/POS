import type { AccessContext } from '../modules/tenant-core/access-context.js';

declare global {
  namespace Express {
    interface Request {
      accessContext?: AccessContext;
    }
  }
}

export {};
