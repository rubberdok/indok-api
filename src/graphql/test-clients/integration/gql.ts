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
    "\n          mutation redirectUrl {\n            redirectUrl {\n              url\n            }\n          }\n        ": types.RedirectUrlDocument,
    "\n            mutation authenticate1 {\n              authenticate(code: \"code\") {\n                user {\n                  id\n                }\n              }\n            }\n          ": types.Authenticate1Document,
    "\n            mutation redirectUrl {\n              redirectUrl {\n                url\n              }\n            }\n          ": types.RedirectUrlDocument,
    "\n              mutation authenticate($code: String!) {\n                authenticate(code: $code) {\n                  user {\n                    id\n                  }\n                }\n              }\n            ": types.AuthenticateDocument,
    "\n          mutation logout {\n            logout {\n              status\n            }\n          }\n        ": types.LogoutDocument,
    "\n            mutation authenticate($code: String!) {\n              authenticate(code: $code) {\n                user {\n                  id\n                }\n              }\n            }\n          ": types.AuthenticateDocument,
    "\n            mutation logout {\n              logout {\n                status\n              }\n            }\n          ": types.LogoutDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n          mutation redirectUrl {\n            redirectUrl {\n              url\n            }\n          }\n        "): typeof import('./graphql.js').RedirectUrlDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n            mutation authenticate1 {\n              authenticate(code: \"code\") {\n                user {\n                  id\n                }\n              }\n            }\n          "): typeof import('./graphql.js').Authenticate1Document;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n            mutation redirectUrl {\n              redirectUrl {\n                url\n              }\n            }\n          "): typeof import('./graphql.js').RedirectUrlDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n              mutation authenticate($code: String!) {\n                authenticate(code: $code) {\n                  user {\n                    id\n                  }\n                }\n              }\n            "): typeof import('./graphql.js').AuthenticateDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n          mutation logout {\n            logout {\n              status\n            }\n          }\n        "): typeof import('./graphql.js').LogoutDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n            mutation authenticate($code: String!) {\n              authenticate(code: $code) {\n                user {\n                  id\n                }\n              }\n            }\n          "): typeof import('./graphql.js').AuthenticateDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n            mutation logout {\n              logout {\n                status\n              }\n            }\n          "): typeof import('./graphql.js').LogoutDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
