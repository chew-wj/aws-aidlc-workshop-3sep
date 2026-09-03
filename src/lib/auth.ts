import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

/**
 * Derives the authenticated user id (Cognito `sub`) from the request.
 *
 * Security (PR-006): ownership is ALWAYS taken from the JWT claims verified by
 * the API Gateway Cognito authorizer, never from the request body or path. This
 * is the single source of truth for "who is the caller" and is what prevents
 * IDOR — a user cannot act on behalf of another by forging an id in the payload.
 */
export class UnauthenticatedError extends Error {
  constructor(message = 'Missing authenticated user') {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

export function getUserId(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): string {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  const sub = claims?.sub;
  if (typeof sub !== 'string' || sub.length === 0) {
    throw new UnauthenticatedError();
  }
  return sub;
}
