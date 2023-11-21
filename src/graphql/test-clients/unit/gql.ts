/* eslint-disable */
import * as types from './graphql.js';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

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
    "\n          query getUsers {\n            users {\n              users {\n                id\n              }\n              total\n            }\n          }\n        ": types.GetUsersDocument,
    "\n          mutation newBooking($data: NewBookingInput!) {\n            newBooking(data: $data) {\n              id\n            }\n          }\n        ": types.NewBookingDocument,
    "\n            mutation createEvent($data: CreateEventInput!) {\n              createEvent(data: $data) {\n                event {\n                  id\n                  name\n                  description\n                }\n              }\n            }\n          ": types.CreateEventDocument,
    "\n            mutation retractSignUp($data: RetractSignUpInput!) {\n              retractSignUp(data: $data) {\n                signUp {\n                  id\n                  event {\n                    id\n                  }\n                  user {\n                    id\n                  }\n                  participationStatus\n                }\n              }\n            }\n          ": types.RetractSignUpDocument,
    "\n            mutation signUp($data: SignUpInput!) {\n              signUp(data: $data) {\n                signUp {\n                  id\n                  event {\n                    id\n                  }\n                  user {\n                    id\n                  }\n                  participationStatus\n                }\n              }\n            }\n          ": types.SignUpDocument,
    "\n          query event($data: EventInput!) {\n            event(data: $data) {\n              event {\n                id\n              }\n            }\n          }\n        ": types.EventDocument,
    "\n          query events {\n            events {\n              events {\n                id\n              }\n              total\n            }\n          }\n        ": types.EventsDocument,
    "\n          query futureEvents($data: EventsInput!) {\n            events(data: $data) {\n              events {\n                id\n              }\n              total\n            }\n          }\n        ": types.FutureEventsDocument,
    "\n          query weekEvents {\n            events {\n              thisWeek {\n                id\n              }\n              nextWeek {\n                id\n              }\n              twoWeeksOrLater {\n                id\n              }\n              total\n            }\n          }\n        ": types.WeekEventsDocument,
    "\n            mutation createListing($data: CreateListingInput!) {\n              createListing(data: $data) {\n                listing {\n                  id\n                }\n              }\n            }\n          ": types.CreateListingDocument,
    "\n            mutation deleteListing($data: DeleteListingInput!) {\n              deleteListing(data: $data) {\n                listing {\n                  id\n                }\n              }\n            }\n          ": types.DeleteListingDocument,
    "\n            mutation updateListing($id: ID!, $data: UpdateListingInput!) {\n              updateListing(id: $id, data: $data) {\n                listing {\n                  id\n                }\n              }\n            }\n          ": types.UpdateListingDocument,
    "\n          query listing($data: ListingInput!) {\n            listing(data: $data) {\n              listing {\n                id\n              }\n            }\n          }\n        ": types.ListingDocument,
    "\n          query listings {\n            listings {\n              listings {\n                id\n              }\n            }\n          }\n        ": types.ListingsDocument,
    "\n              mutation createOrganization1 {\n                createOrganization(data: { name: \"test\" }) {\n                  organization {\n                    id\n                  }\n                }\n              }\n            ": types.CreateOrganization1Document,
    "\n              mutation createOrganization {\n                createOrganization(data: { name: \"test\" }) {\n                  organization {\n                    id\n                    name\n                  }\n                }\n              }\n            ": types.CreateOrganizationDocument,
    "\n              mutation updateOrganization1 {\n                updateOrganization(data: { name: \"test\", id: \"id\" }) {\n                  organization {\n                    id\n                  }\n                }\n              }\n            ": types.UpdateOrganization1Document,
    "\n              mutation updateOrganization2 {\n                updateOrganization(data: { name: \"test\", id: \"id\" }) {\n                  organization {\n                    id\n                    name\n                  }\n                }\n              }\n            ": types.UpdateOrganization2Document,
    "\n              mutation addMember1 {\n                addMember(data: { userId: \"user\", organizationId: \"org\" }) {\n                  member {\n                    id\n                    organization {\n                      members {\n                        id\n                      }\n                    }\n                  }\n                }\n              }\n            ": types.AddMember1Document,
    "\n              mutation addMember2 {\n                addMember(data: { userId: \"user\", organizationId: \"org\" }) {\n                  member {\n                    id\n                    organization {\n                      id\n                      members {\n                        id\n                      }\n                    }\n                  }\n                }\n              }\n            ": types.AddMember2Document,
    "\n              mutation removeMember1 {\n                removeMember(data: { id: \"id\" }) {\n                  member {\n                    id\n                    organization {\n                      members {\n                        id\n                      }\n                    }\n                  }\n                }\n              }\n            ": types.RemoveMember1Document,
    "\n              mutation removeMember2 {\n                removeMember(data: { id: \"id\" }) {\n                  member {\n                    id\n                    organization {\n                      id\n                      members {\n                        id\n                      }\n                    }\n                  }\n                }\n              }\n            ": types.RemoveMember2Document,
    "\n            mutation UpdateAuthenticatedUser($data: UpdateUserInput!) {\n              updateUser(data: $data) {\n                user {\n                  id\n                }\n              }\n            }\n          ": types.UpdateAuthenticatedUserDocument,
    "\n            query UserWithOrganizations {\n              user {\n                user {\n                  id\n                  organizations {\n                    id\n                  }\n                }\n              }\n            }\n          ": types.UserWithOrganizationsDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n          query getUsers {\n            users {\n              users {\n                id\n              }\n              total\n            }\n          }\n        "): (typeof documents)["\n          query getUsers {\n            users {\n              users {\n                id\n              }\n              total\n            }\n          }\n        "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n          mutation newBooking($data: NewBookingInput!) {\n            newBooking(data: $data) {\n              id\n            }\n          }\n        "): (typeof documents)["\n          mutation newBooking($data: NewBookingInput!) {\n            newBooking(data: $data) {\n              id\n            }\n          }\n        "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n            mutation createEvent($data: CreateEventInput!) {\n              createEvent(data: $data) {\n                event {\n                  id\n                  name\n                  description\n                }\n              }\n            }\n          "): (typeof documents)["\n            mutation createEvent($data: CreateEventInput!) {\n              createEvent(data: $data) {\n                event {\n                  id\n                  name\n                  description\n                }\n              }\n            }\n          "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n            mutation retractSignUp($data: RetractSignUpInput!) {\n              retractSignUp(data: $data) {\n                signUp {\n                  id\n                  event {\n                    id\n                  }\n                  user {\n                    id\n                  }\n                  participationStatus\n                }\n              }\n            }\n          "): (typeof documents)["\n            mutation retractSignUp($data: RetractSignUpInput!) {\n              retractSignUp(data: $data) {\n                signUp {\n                  id\n                  event {\n                    id\n                  }\n                  user {\n                    id\n                  }\n                  participationStatus\n                }\n              }\n            }\n          "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n            mutation signUp($data: SignUpInput!) {\n              signUp(data: $data) {\n                signUp {\n                  id\n                  event {\n                    id\n                  }\n                  user {\n                    id\n                  }\n                  participationStatus\n                }\n              }\n            }\n          "): (typeof documents)["\n            mutation signUp($data: SignUpInput!) {\n              signUp(data: $data) {\n                signUp {\n                  id\n                  event {\n                    id\n                  }\n                  user {\n                    id\n                  }\n                  participationStatus\n                }\n              }\n            }\n          "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n          query event($data: EventInput!) {\n            event(data: $data) {\n              event {\n                id\n              }\n            }\n          }\n        "): (typeof documents)["\n          query event($data: EventInput!) {\n            event(data: $data) {\n              event {\n                id\n              }\n            }\n          }\n        "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n          query events {\n            events {\n              events {\n                id\n              }\n              total\n            }\n          }\n        "): (typeof documents)["\n          query events {\n            events {\n              events {\n                id\n              }\n              total\n            }\n          }\n        "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n          query futureEvents($data: EventsInput!) {\n            events(data: $data) {\n              events {\n                id\n              }\n              total\n            }\n          }\n        "): (typeof documents)["\n          query futureEvents($data: EventsInput!) {\n            events(data: $data) {\n              events {\n                id\n              }\n              total\n            }\n          }\n        "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n          query weekEvents {\n            events {\n              thisWeek {\n                id\n              }\n              nextWeek {\n                id\n              }\n              twoWeeksOrLater {\n                id\n              }\n              total\n            }\n          }\n        "): (typeof documents)["\n          query weekEvents {\n            events {\n              thisWeek {\n                id\n              }\n              nextWeek {\n                id\n              }\n              twoWeeksOrLater {\n                id\n              }\n              total\n            }\n          }\n        "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n            mutation createListing($data: CreateListingInput!) {\n              createListing(data: $data) {\n                listing {\n                  id\n                }\n              }\n            }\n          "): (typeof documents)["\n            mutation createListing($data: CreateListingInput!) {\n              createListing(data: $data) {\n                listing {\n                  id\n                }\n              }\n            }\n          "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n            mutation deleteListing($data: DeleteListingInput!) {\n              deleteListing(data: $data) {\n                listing {\n                  id\n                }\n              }\n            }\n          "): (typeof documents)["\n            mutation deleteListing($data: DeleteListingInput!) {\n              deleteListing(data: $data) {\n                listing {\n                  id\n                }\n              }\n            }\n          "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n            mutation updateListing($id: ID!, $data: UpdateListingInput!) {\n              updateListing(id: $id, data: $data) {\n                listing {\n                  id\n                }\n              }\n            }\n          "): (typeof documents)["\n            mutation updateListing($id: ID!, $data: UpdateListingInput!) {\n              updateListing(id: $id, data: $data) {\n                listing {\n                  id\n                }\n              }\n            }\n          "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n          query listing($data: ListingInput!) {\n            listing(data: $data) {\n              listing {\n                id\n              }\n            }\n          }\n        "): (typeof documents)["\n          query listing($data: ListingInput!) {\n            listing(data: $data) {\n              listing {\n                id\n              }\n            }\n          }\n        "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n          query listings {\n            listings {\n              listings {\n                id\n              }\n            }\n          }\n        "): (typeof documents)["\n          query listings {\n            listings {\n              listings {\n                id\n              }\n            }\n          }\n        "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n              mutation createOrganization1 {\n                createOrganization(data: { name: \"test\" }) {\n                  organization {\n                    id\n                  }\n                }\n              }\n            "): (typeof documents)["\n              mutation createOrganization1 {\n                createOrganization(data: { name: \"test\" }) {\n                  organization {\n                    id\n                  }\n                }\n              }\n            "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n              mutation createOrganization {\n                createOrganization(data: { name: \"test\" }) {\n                  organization {\n                    id\n                    name\n                  }\n                }\n              }\n            "): (typeof documents)["\n              mutation createOrganization {\n                createOrganization(data: { name: \"test\" }) {\n                  organization {\n                    id\n                    name\n                  }\n                }\n              }\n            "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n              mutation updateOrganization1 {\n                updateOrganization(data: { name: \"test\", id: \"id\" }) {\n                  organization {\n                    id\n                  }\n                }\n              }\n            "): (typeof documents)["\n              mutation updateOrganization1 {\n                updateOrganization(data: { name: \"test\", id: \"id\" }) {\n                  organization {\n                    id\n                  }\n                }\n              }\n            "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n              mutation updateOrganization2 {\n                updateOrganization(data: { name: \"test\", id: \"id\" }) {\n                  organization {\n                    id\n                    name\n                  }\n                }\n              }\n            "): (typeof documents)["\n              mutation updateOrganization2 {\n                updateOrganization(data: { name: \"test\", id: \"id\" }) {\n                  organization {\n                    id\n                    name\n                  }\n                }\n              }\n            "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n              mutation addMember1 {\n                addMember(data: { userId: \"user\", organizationId: \"org\" }) {\n                  member {\n                    id\n                    organization {\n                      members {\n                        id\n                      }\n                    }\n                  }\n                }\n              }\n            "): (typeof documents)["\n              mutation addMember1 {\n                addMember(data: { userId: \"user\", organizationId: \"org\" }) {\n                  member {\n                    id\n                    organization {\n                      members {\n                        id\n                      }\n                    }\n                  }\n                }\n              }\n            "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n              mutation addMember2 {\n                addMember(data: { userId: \"user\", organizationId: \"org\" }) {\n                  member {\n                    id\n                    organization {\n                      id\n                      members {\n                        id\n                      }\n                    }\n                  }\n                }\n              }\n            "): (typeof documents)["\n              mutation addMember2 {\n                addMember(data: { userId: \"user\", organizationId: \"org\" }) {\n                  member {\n                    id\n                    organization {\n                      id\n                      members {\n                        id\n                      }\n                    }\n                  }\n                }\n              }\n            "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n              mutation removeMember1 {\n                removeMember(data: { id: \"id\" }) {\n                  member {\n                    id\n                    organization {\n                      members {\n                        id\n                      }\n                    }\n                  }\n                }\n              }\n            "): (typeof documents)["\n              mutation removeMember1 {\n                removeMember(data: { id: \"id\" }) {\n                  member {\n                    id\n                    organization {\n                      members {\n                        id\n                      }\n                    }\n                  }\n                }\n              }\n            "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n              mutation removeMember2 {\n                removeMember(data: { id: \"id\" }) {\n                  member {\n                    id\n                    organization {\n                      id\n                      members {\n                        id\n                      }\n                    }\n                  }\n                }\n              }\n            "): (typeof documents)["\n              mutation removeMember2 {\n                removeMember(data: { id: \"id\" }) {\n                  member {\n                    id\n                    organization {\n                      id\n                      members {\n                        id\n                      }\n                    }\n                  }\n                }\n              }\n            "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n            mutation UpdateAuthenticatedUser($data: UpdateUserInput!) {\n              updateUser(data: $data) {\n                user {\n                  id\n                }\n              }\n            }\n          "): (typeof documents)["\n            mutation UpdateAuthenticatedUser($data: UpdateUserInput!) {\n              updateUser(data: $data) {\n                user {\n                  id\n                }\n              }\n            }\n          "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n            query UserWithOrganizations {\n              user {\n                user {\n                  id\n                  organizations {\n                    id\n                  }\n                }\n              }\n            }\n          "): (typeof documents)["\n            query UserWithOrganizations {\n              user {\n                user {\n                  id\n                  organizations {\n                    id\n                  }\n                }\n              }\n            }\n          "];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;