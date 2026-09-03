import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { ddb, recipeSk, TABLE_NAME, userPk } from '../lib/db';
import type { Recipe } from './model';

/**
 * All operations are scoped to userId via the USER#<sub> partition key (PR-006).
 * There is no code path that reads or writes another user's partition.
 */
export async function putRecipe(recipe: Recipe): Promise<Recipe> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: userPk(recipe.userId),
        SK: recipeSk(recipe.recipeId),
        ...recipe,
      },
    })
  );
  return recipe;
}

export async function getRecipe(
  userId: string,
  recipeId: string
): Promise<Recipe | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: userPk(userId), SK: recipeSk(recipeId) },
    })
  );
  return (res.Item as Recipe | undefined) ?? null;
}

export async function listRecipes(userId: string): Promise<Recipe[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': userPk(userId),
        ':sk': 'RECIPE#',
      },
    })
  );
  return (res.Items as Recipe[] | undefined) ?? [];
}

export async function deleteRecipe(
  userId: string,
  recipeId: string
): Promise<void> {
  await ddb.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: userPk(userId), SK: recipeSk(recipeId) },
    })
  );
}
