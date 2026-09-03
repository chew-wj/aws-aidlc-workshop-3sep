import { randomUUID } from 'node:crypto';
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { getUserId, UnauthenticatedError } from '../lib/auth';
import {
  badRequest,
  created,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '../lib/http';
import { parseRecipeInput, ValidationError } from '../lib/validation';
import { buildRecipe, scaleRecipe } from './model';
import {
  deleteRecipe,
  getRecipe,
  listRecipes,
  putRecipe,
} from './repository';

/**
 * Recipe CRUD handler (PR-001).
 * - Auth: owner derived from verified Cognito sub (PR-006)
 * - Validation: all writes validated before persistence (PR-007)
 * - Optional serving scaling on read via ?servings= (PR-005)
 */
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const userId = getUserId(event);
    const method = event.requestContext.http.method;
    const recipeId = event.pathParameters?.recipeId;

    switch (method) {
      case 'POST': {
        const input = parseRecipeInput(parseBody(event.body));
        const now = new Date().toISOString();
        const recipe = buildRecipe(userId, randomUUID(), input, now);
        await putRecipe(recipe);
        return created(recipe);
      }

      case 'GET': {
        if (recipeId) {
          const recipe = await getRecipe(userId, recipeId);
          if (!recipe) return notFound('Recipe not found');
          const servings = Number(event.queryStringParameters?.servings);
          return ok(
            Number.isFinite(servings) && servings > 0
              ? scaleRecipe(recipe, servings)
              : recipe
          );
        }
        return ok(await listRecipes(userId));
      }

      case 'DELETE': {
        if (!recipeId) return badRequest('recipeId path parameter required');
        const existing = await getRecipe(userId, recipeId);
        if (!existing) return notFound('Recipe not found');
        await deleteRecipe(userId, recipeId);
        return ok({ deleted: recipeId });
      }

      default:
        return badRequest(`Unsupported method ${method}`);
    }
  } catch (err) {
    if (err instanceof UnauthenticatedError) return unauthorized();
    if (err instanceof ValidationError)
      return badRequest(err.message, err.details);
    console.error('Unhandled error', err);
    return serverError();
  }
}

function parseBody(body: string | undefined): unknown {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new ValidationError(['body must be valid JSON']);
  }
}
