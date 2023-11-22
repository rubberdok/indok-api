/* eslint-disable */
import * as types from './graphql.js';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 */
const documents = {
    "\n              mutation createOrganization($data: CreateOrganizationInput!) {\n                createOrganization(data: $data) {\n                  organization {\n                    id\n                    name\n                    featurePermissions\n                  }\n                }\n              }\n            ": types.CreateOrganizationDocument,
    "\n          query me {\n            user {\n              user {\n                id\n              }\n            }\n          }\n        ": types.MeDocument,
    "\n            query loggedIn {\n              user {\n                user {\n                  id\n                }\n              }\n            }\n          ": types.LoggedInDocument,
    "\n              query users {\n                users {\n                  users {\n                    id\n                  }\n                  super {\n                    id\n                    email\n                  }\n                }\n              }\n            ": types.UsersDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n              mutation createOrganization($data: CreateOrganizationInput!) {\n                createOrganization(data: $data) {\n                  organization {\n                    id\n                    name\n                    featurePermissions\n                  }\n                }\n              }\n            "): typeof import('./graphql.js').CreateOrganizationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n          query me {\n            user {\n              user {\n                id\n              }\n            }\n          }\n        "): typeof import('./graphql.js').MeDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n            query loggedIn {\n              user {\n                user {\n                  id\n                }\n              }\n            }\n          "): typeof import('./graphql.js').LoggedInDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n              query users {\n                users {\n                  users {\n                    id\n                  }\n                  super {\n                    id\n                    email\n                  }\n                }\n              }\n            "): typeof import('./graphql.js').UsersDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
