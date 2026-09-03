import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export function json(
  statusCode: number,
  body: unknown
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const ok = (body: unknown) => json(200, body);
export const created = (body: unknown) => json(201, body);
export const badRequest = (message: string, details?: unknown) =>
  json(400, { error: 'BadRequest', message, details });
export const unauthorized = (message = 'Unauthorized') =>
  json(401, { error: 'Unauthorized', message });
export const notFound = (message = 'Not found') =>
  json(404, { error: 'NotFound', message });
export const serverError = (message = 'Internal error') =>
  json(500, { error: 'InternalError', message });
