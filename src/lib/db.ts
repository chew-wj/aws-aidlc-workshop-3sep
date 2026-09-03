import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const TABLE_NAME = process.env.TABLE_NAME ?? 'MealPrep';

const client = new DynamoDBClient({});
export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

/**
 * Key helpers enforcing per-user partitioning (PR-006).
 * The partition key is always USER#<sub>, so a query/get is physically
 * constrained to the caller's data and cannot reach another user's items.
 */
export const userPk = (userId: string) => `USER#${userId}`;
export const recipeSk = (recipeId: string) => `RECIPE#${recipeId}`;
