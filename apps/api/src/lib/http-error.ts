export type HttpError = {
  code: string;
  message: string;
  statusCode: number;
};

export const createHttpError = (
  statusCode: number,
  code: string,
  message: string
): HttpError => ({
  code,
  message,
  statusCode
});
