/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
};

export type AddMemberInput = {
  /** The ID of the organization to add the user to */
  organizationId: Scalars['ID']['input'];
  /** The role of the user in the organization, defaults to Role.MEMBER */
  role?: InputMaybe<Role>;
  /** The ID of the user to add to the organization */
  userId: Scalars['ID']['input'];
};

export type AddMemberResponse = {
  __typename?: 'AddMemberResponse';
  member: Member;
};

export type Booking = {
  __typename?: 'Booking';
  cabin: Cabin;
  email: Scalars['String']['output'];
  endDate: Scalars['DateTime']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lastName: Scalars['String']['output'];
  phoneNumber: Scalars['String']['output'];
  startDate: Scalars['DateTime']['output'];
  status: Status;
};

export type Cabin = {
  __typename?: 'Cabin';
  externalPrice: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  internalPrice: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type CreateOrganizationInput = {
  /** The description of the organization, cannot exceed 10 000 characters */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The name of the organization, must be unique and between 1 and 100 characters */
  name: Scalars['String']['input'];
};

export type CreateOrganizationResponse = {
  __typename?: 'CreateOrganizationResponse';
  organization: Organization;
};

export type LogoutResponse = {
  __typename?: 'LogoutResponse';
  status: LogoutStatus;
};

export enum LogoutStatus {
  Error = 'ERROR',
  Success = 'SUCCESS'
}

export type Member = {
  __typename?: 'Member';
  id: Scalars['ID']['output'];
  organization: Organization;
  role: Role;
  user: User;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Add a member to the organization */
  addMember: AddMemberResponse;
  authenticate: UserResponse;
  /** Create a new organization, and add the current user as an admin of the organization. */
  createOrganization: CreateOrganizationResponse;
  createUser?: Maybe<User>;
  logout: LogoutResponse;
  newBooking: Booking;
  redirectUrl: RedirectUrlResponse;
  /** Remove a member from the organization by the ID of the membership. */
  removeMember: RemoveMemberResponse;
  updateBookingStatus: Booking;
  /**
   * Update an organization with the given name and description.
   * Passing null or omitting a value will leave the value unchanged.
   */
  updateOrganization: UpdateOrganizationResponse;
  updateUser: User;
};


export type MutationAddMemberArgs = {
  data: AddMemberInput;
};


export type MutationAuthenticateArgs = {
  code: Scalars['String']['input'];
};


export type MutationCreateOrganizationArgs = {
  data: CreateOrganizationInput;
};


export type MutationCreateUserArgs = {
  firstName: Scalars['String']['input'];
};


export type MutationNewBookingArgs = {
  data: NewBookingInput;
};


export type MutationRedirectUrlArgs = {
  state?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRemoveMemberArgs = {
  data: RemoveMemberInput;
};


export type MutationUpdateBookingStatusArgs = {
  id: Scalars['ID']['input'];
  status: Status;
};


export type MutationUpdateOrganizationArgs = {
  data: UpdateOrganizationInput;
};


export type MutationUpdateUserArgs = {
  data: UpdateUserInput;
  id: Scalars['ID']['input'];
};

export type NewBookingInput = {
  cabinId: Scalars['ID']['input'];
  email: Scalars['String']['input'];
  endDate: Scalars['DateTime']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  phoneNumber: Scalars['String']['input'];
  startDate: Scalars['DateTime']['input'];
};

export type Organization = {
  __typename?: 'Organization';
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  members: Array<Member>;
  name: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  user: UserResponse;
  users: UsersResponse;
};

export type RedirectUrlResponse = {
  __typename?: 'RedirectUrlResponse';
  url: Scalars['String']['output'];
};

export type RemoveMemberInput = {
  id: Scalars['ID']['input'];
};

export type RemoveMemberResponse = {
  __typename?: 'RemoveMemberResponse';
  member: Member;
};

export enum Role {
  /**
   * An admin of the organization, can do everything a member can,
   * # and can also manage members in the organization and delete the organization.
   */
  Admin = 'ADMIN',
  /**
   * A member of the organization, can do everything except
   * manage members in the organization and delete the organization.
   */
  Member = 'MEMBER'
}

export enum Status {
  Cancelled = 'CANCELLED',
  Confirmed = 'CONFIRMED',
  Pending = 'PENDING',
  Rejected = 'REJECTED'
}

export type UpdateOrganizationInput = {
  /**
   * The new description of the organization, cannot exceed 10 000 characters
   * Omitting the value or passing null will leave the description unchanged
   */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the organization to update */
  id: Scalars['ID']['input'];
  /**
   * The new name of the organization
   * Omitting the value or passing null will leave the name unchanged
   */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrganizationResponse = {
  __typename?: 'UpdateOrganizationResponse';
  organization: Organization;
};

export type UpdateUserInput = {
  allergies?: InputMaybe<Scalars['String']['input']>;
  firstName: Scalars['String']['input'];
  graduationYear?: InputMaybe<Scalars['Int']['input']>;
  lastName: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  allergies?: Maybe<Scalars['String']['output']>;
  canUpdateYear: Scalars['Boolean']['output'];
  createdAt: Scalars['String']['output'];
  firstLogin: Scalars['Boolean']['output'];
  firstName: Scalars['String']['output'];
  graduationYear?: Maybe<Scalars['Int']['output']>;
  graduationYearUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  lastName: Scalars['String']['output'];
  phoneNumber?: Maybe<Scalars['String']['output']>;
  username: Scalars['String']['output'];
};

export type UserResponse = {
  __typename?: 'UserResponse';
  user?: Maybe<User>;
};

export type UsersResponse = {
  __typename?: 'UsersResponse';
  total: Scalars['Int']['output'];
  users: Array<User>;
};

export type GetUsersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUsersQuery = { __typename?: 'Query', users: { __typename?: 'UsersResponse', total: number, users: Array<{ __typename?: 'User', id: string }> } };


export const GetUsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getUsers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"users"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"users"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<GetUsersQuery, GetUsersQueryVariables>;