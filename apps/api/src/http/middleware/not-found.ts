import type { NextFunction, Request, Response } from 'express';

export const notFoundHandler = (_request: Request, _response: Response, next: NextFunction) => {
  next({
    code: 'ROUTE_NOT_FOUND',
    message: 'Route not found',
    statusCode: 404
  });
};
