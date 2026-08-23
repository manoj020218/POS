import type { RequestHandler, Response } from 'express';

import { asyncHandler } from '../../http/middleware/async-handler.js';
import { parseSchema } from '../../lib/parse-schema.js';
import { getAccessContext } from '../tenant-core/access-context.js';
import {
  changePasswordSchema,
  createAuthUserSchema,
  loginSchema,
  logoutSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  replaceUserBranchAccessSchema,
  refreshSchema,
  sessionIdParamsSchema,
  updateAuthUserSchema,
  userIdParamsSchema
} from './auth.schemas.js';
import type { AuthService } from './auth.routes.js';

const getUserAgent = (value: string | undefined) => value?.trim() || undefined;

export const loginController = (service: AuthService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const result = await service.login({
      ...parseSchema(loginSchema, request.body),
      userAgent: getUserAgent(request.header('user-agent'))
    });

    response.status(200).json({ data: result });
  });

export const logoutController = (service: AuthService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    await service.logout(parseSchema(logoutSchema, request.body));
    response.status(204).send();
  });

export const changePasswordController = (service: AuthService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const accessContext = getAccessContext(request);
    await service.changePassword({
      ...parseSchema(changePasswordSchema, request.body),
      tenantId: accessContext.tenantId,
      userId: accessContext.userId
    });

    response.status(204).send();
  });

export const createUserController = (service: AuthService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const accessContext = getAccessContext(request);
    const user = await service.createUser({
      ...parseSchema(createAuthUserSchema, request.body),
      actor: accessContext,
      tenantId: accessContext.tenantId
    });

    response.status(201).json({ data: user });
  });

export const requestPasswordResetController = (service: AuthService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    await service.requestPasswordReset(parseSchema(passwordResetRequestSchema, request.body));
    response.status(202).send();
  });

export const resetPasswordController = (service: AuthService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    await service.resetPassword(parseSchema(passwordResetConfirmSchema, request.body));
    response.status(204).send();
  });

export const listSessionsController = (service: AuthService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const accessContext = getAccessContext(request);
    const sessions = await service.listSessions(accessContext);

    response.status(200).json({ data: sessions });
  });

export const listUsersController = (service: AuthService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const accessContext = getAccessContext(request);
    const users = await service.listUsers(accessContext);

    response.status(200).json({ data: users });
  });

export const listUserBranchAccessController = (service: AuthService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const accessContext = getAccessContext(request);
    const branches = await service.listUserBranchAccess({
      tenantId: accessContext.tenantId,
      userId: parseSchema(userIdParamsSchema, request.params).userId
    });

    response.status(200).json({ data: branches });
  });

export const revokeSessionController = (service: AuthService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const accessContext = getAccessContext(request);
    await service.revokeUserSession({
      sessionId: parseSchema(sessionIdParamsSchema, request.params).sessionId,
      tenantId: accessContext.tenantId,
      userId: accessContext.userId
    });

    response.status(204).send();
  });

export const replaceUserBranchAccessController = (service: AuthService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const accessContext = getAccessContext(request);
    const branches = await service.replaceUserBranchAccess({
      ...parseSchema(replaceUserBranchAccessSchema, request.body),
      tenantId: accessContext.tenantId,
      userId: parseSchema(userIdParamsSchema, request.params).userId
    });

    response.status(200).json({ data: branches });
  });

export const updateUserController = (service: AuthService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const accessContext = getAccessContext(request);
    const user = await service.updateUser({
      ...parseSchema(updateAuthUserSchema, request.body),
      actor: accessContext,
      actorUserId: accessContext.userId,
      tenantId: accessContext.tenantId,
      userId: parseSchema(userIdParamsSchema, request.params).userId
    });

    response.status(200).json({ data: user });
  });

export const refreshController = (service: AuthService): RequestHandler =>
  asyncHandler(async (request, response: Response) => {
    const result = await service.refresh({
      ...parseSchema(refreshSchema, request.body),
      userAgent: getUserAgent(request.header('user-agent'))
    });

    response.status(200).json({ data: result });
  });
