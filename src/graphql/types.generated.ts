import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from "graphql";
import { BookingMapper } from "./cabins/schema.mappers.js";
import { MemberMapper, OrganizationMapper } from "./organizations/schema.mappers.js";
import { UserMapper, UsersResponseMapper } from "./users/schema.mappers.js";
import { IContext } from "@/lib/apolloServer.js";
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string | number };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: Date | string; output: Date | string };
};

export type AddMemberInput = {
  /** The ID of the organization to add the user to */
  organizationId: Scalars["ID"]["input"];
  /** The role of the user in the organization, defaults to Role.MEMBER */
  role?: InputMaybe<Role>;
  /** The ID of the user to add to the organization */
  userId: Scalars["ID"]["input"];
};

export type AddMemberResponse = {
  __typename?: "AddMemberResponse";
  member: Member;
};

export type Booking = {
  __typename?: "Booking";
  cabin: Cabin;
  email: Scalars["String"]["output"];
  endDate: Scalars["DateTime"]["output"];
  firstName: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  lastName: Scalars["String"]["output"];
  phoneNumber: Scalars["String"]["output"];
  startDate: Scalars["DateTime"]["output"];
  status: Status;
};

export type Cabin = {
  __typename?: "Cabin";
  externalPrice: Scalars["Int"]["output"];
  id: Scalars["ID"]["output"];
  internalPrice: Scalars["Int"]["output"];
  name: Scalars["String"]["output"];
};

export type CreateOrganizationInput = {
  /** The description of the organization, cannot exceed 10 000 characters */
  description?: InputMaybe<Scalars["String"]["input"]>;
  /** The name of the organization, must be unique and between 1 and 100 characters */
  name: Scalars["String"]["input"];
};

export type CreateOrganizationResponse = {
  __typename?: "CreateOrganizationResponse";
  organization: Organization;
};

export type LogoutResponse = {
  __typename?: "LogoutResponse";
  status: LogoutStatus;
};

export type LogoutStatus = "ERROR" | "SUCCESS";

export type Member = {
  __typename?: "Member";
  id: Scalars["ID"]["output"];
  /** The organization the member is a member of */
  organization: Organization;
  /** The role of the member in the organization */
  role: Role;
  /** The user that is a member of the organization */
  user: User;
};

export type Mutation = {
  __typename?: "Mutation";
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

export type MutationaddMemberArgs = {
  data: AddMemberInput;
};

export type MutationauthenticateArgs = {
  code: Scalars["String"]["input"];
};

export type MutationcreateOrganizationArgs = {
  data: CreateOrganizationInput;
};

export type MutationcreateUserArgs = {
  firstName: Scalars["String"]["input"];
};

export type MutationnewBookingArgs = {
  data: NewBookingInput;
};

export type MutationredirectUrlArgs = {
  state?: InputMaybe<Scalars["String"]["input"]>;
};

export type MutationremoveMemberArgs = {
  data: RemoveMemberInput;
};

export type MutationupdateBookingStatusArgs = {
  data: UpdateBookingStatusInput;
};

export type MutationupdateOrganizationArgs = {
  data: UpdateOrganizationInput;
};

export type MutationupdateUserArgs = {
  data: UpdateUserInput;
  id: Scalars["ID"]["input"];
};

export type NewBookingInput = {
  cabinId: Scalars["ID"]["input"];
  email: Scalars["String"]["input"];
  endDate: Scalars["DateTime"]["input"];
  firstName: Scalars["String"]["input"];
  lastName: Scalars["String"]["input"];
  phoneNumber: Scalars["String"]["input"];
  startDate: Scalars["DateTime"]["input"];
};

export type Organization = {
  __typename?: "Organization";
  description: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  /** The members of the organization */
  members: Array<Member>;
  name: Scalars["String"]["output"];
};

export type Query = {
  __typename?: "Query";
  user: UserResponse;
  users: UsersResponse;
};

export type RedirectUrlResponse = {
  __typename?: "RedirectUrlResponse";
  url: Scalars["String"]["output"];
};

export type RemoveMemberInput = {
  id: Scalars["ID"]["input"];
};

export type RemoveMemberResponse = {
  __typename?: "RemoveMemberResponse";
  member: Member;
};

export type Role =
  /**
   * An admin of the organization, can do everything a member can,
   * # and can also manage members in the organization and delete the organization.
   */
  | "ADMIN"
  /**
   * A member of the organization, can do everything except
   * manage members in the organization and delete the organization.
   */
  | "MEMBER";

export type Status = "CANCELLED" | "CONFIRMED" | "PENDING" | "REJECTED";

export type UpdateBookingStatusInput = {
  id: Scalars["ID"]["input"];
  status: Status;
};

export type UpdateOrganizationInput = {
  /**
   * The new description of the organization, cannot exceed 10 000 characters
   * Omitting the value or passing null will leave the description unchanged
   */
  description?: InputMaybe<Scalars["String"]["input"]>;
  /** The ID of the organization to update */
  id: Scalars["ID"]["input"];
  /**
   * The new name of the organization
   * Omitting the value or passing null will leave the name unchanged
   */
  name?: InputMaybe<Scalars["String"]["input"]>;
};

export type UpdateOrganizationResponse = {
  __typename?: "UpdateOrganizationResponse";
  organization: Organization;
};

export type UpdateUserInput = {
  allergies?: InputMaybe<Scalars["String"]["input"]>;
  firstName: Scalars["String"]["input"];
  graduationYear?: InputMaybe<Scalars["Int"]["input"]>;
  lastName: Scalars["String"]["input"];
  phoneNumber?: InputMaybe<Scalars["String"]["input"]>;
};

export type User = {
  __typename?: "User";
  allergies?: Maybe<Scalars["String"]["output"]>;
  canUpdateYear: Scalars["Boolean"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  firstLogin: Scalars["Boolean"]["output"];
  firstName: Scalars["String"]["output"];
  graduationYear?: Maybe<Scalars["Int"]["output"]>;
  graduationYearUpdatedAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  lastName: Scalars["String"]["output"];
  phoneNumber?: Maybe<Scalars["String"]["output"]>;
  username: Scalars["String"]["output"];
};

export type UserResponse = {
  __typename?: "UserResponse";
  user?: Maybe<User>;
};

export type UsersResponse = {
  __typename?: "UsersResponse";
  total: Scalars["Int"]["output"];
  users: Array<User>;
};

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AddMemberInput: AddMemberInput;
  ID: ResolverTypeWrapper<Scalars["ID"]["output"]>;
  AddMemberResponse: ResolverTypeWrapper<Omit<AddMemberResponse, "member"> & { member: ResolversTypes["Member"] }>;
  Booking: ResolverTypeWrapper<BookingMapper>;
  String: ResolverTypeWrapper<Scalars["String"]["output"]>;
  Cabin: ResolverTypeWrapper<Cabin>;
  Int: ResolverTypeWrapper<Scalars["Int"]["output"]>;
  CreateOrganizationInput: CreateOrganizationInput;
  CreateOrganizationResponse: ResolverTypeWrapper<
    Omit<CreateOrganizationResponse, "organization"> & { organization: ResolversTypes["Organization"] }
  >;
  DateTime: ResolverTypeWrapper<Scalars["DateTime"]["output"]>;
  LogoutResponse: ResolverTypeWrapper<LogoutResponse>;
  LogoutStatus: LogoutStatus;
  Member: ResolverTypeWrapper<MemberMapper>;
  Mutation: ResolverTypeWrapper<{}>;
  NewBookingInput: NewBookingInput;
  Organization: ResolverTypeWrapper<OrganizationMapper>;
  Query: ResolverTypeWrapper<{}>;
  RedirectUrlResponse: ResolverTypeWrapper<RedirectUrlResponse>;
  RemoveMemberInput: RemoveMemberInput;
  RemoveMemberResponse: ResolverTypeWrapper<
    Omit<RemoveMemberResponse, "member"> & { member: ResolversTypes["Member"] }
  >;
  Role: Role;
  Status: Status;
  UpdateBookingStatusInput: UpdateBookingStatusInput;
  UpdateOrganizationInput: UpdateOrganizationInput;
  UpdateOrganizationResponse: ResolverTypeWrapper<
    Omit<UpdateOrganizationResponse, "organization"> & { organization: ResolversTypes["Organization"] }
  >;
  UpdateUserInput: UpdateUserInput;
  User: ResolverTypeWrapper<UserMapper>;
  Boolean: ResolverTypeWrapper<Scalars["Boolean"]["output"]>;
  UserResponse: ResolverTypeWrapper<Omit<UserResponse, "user"> & { user?: Maybe<ResolversTypes["User"]> }>;
  UsersResponse: ResolverTypeWrapper<UsersResponseMapper>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AddMemberInput: AddMemberInput;
  ID: Scalars["ID"]["output"];
  AddMemberResponse: Omit<AddMemberResponse, "member"> & { member: ResolversParentTypes["Member"] };
  Booking: BookingMapper;
  String: Scalars["String"]["output"];
  Cabin: Cabin;
  Int: Scalars["Int"]["output"];
  CreateOrganizationInput: CreateOrganizationInput;
  CreateOrganizationResponse: Omit<CreateOrganizationResponse, "organization"> & {
    organization: ResolversParentTypes["Organization"];
  };
  DateTime: Scalars["DateTime"]["output"];
  LogoutResponse: LogoutResponse;
  Member: MemberMapper;
  Mutation: {};
  NewBookingInput: NewBookingInput;
  Organization: OrganizationMapper;
  Query: {};
  RedirectUrlResponse: RedirectUrlResponse;
  RemoveMemberInput: RemoveMemberInput;
  RemoveMemberResponse: Omit<RemoveMemberResponse, "member"> & { member: ResolversParentTypes["Member"] };
  UpdateBookingStatusInput: UpdateBookingStatusInput;
  UpdateOrganizationInput: UpdateOrganizationInput;
  UpdateOrganizationResponse: Omit<UpdateOrganizationResponse, "organization"> & {
    organization: ResolversParentTypes["Organization"];
  };
  UpdateUserInput: UpdateUserInput;
  User: UserMapper;
  Boolean: Scalars["Boolean"]["output"];
  UserResponse: Omit<UserResponse, "user"> & { user?: Maybe<ResolversParentTypes["User"]> };
  UsersResponse: UsersResponseMapper;
};

export type AddMemberResponseResolvers<
  ContextType = IContext,
  ParentType extends ResolversParentTypes["AddMemberResponse"] = ResolversParentTypes["AddMemberResponse"],
> = {
  member?: Resolver<ResolversTypes["Member"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BookingResolvers<
  ContextType = IContext,
  ParentType extends ResolversParentTypes["Booking"] = ResolversParentTypes["Booking"],
> = {
  cabin?: Resolver<ResolversTypes["Cabin"], ParentType, ContextType>;
  email?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  endDate?: Resolver<ResolversTypes["DateTime"], ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  phoneNumber?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  startDate?: Resolver<ResolversTypes["DateTime"], ParentType, ContextType>;
  status?: Resolver<ResolversTypes["Status"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CabinResolvers<
  ContextType = IContext,
  ParentType extends ResolversParentTypes["Cabin"] = ResolversParentTypes["Cabin"],
> = {
  externalPrice?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  internalPrice?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  name?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateOrganizationResponseResolvers<
  ContextType = IContext,
  ParentType extends
    ResolversParentTypes["CreateOrganizationResponse"] = ResolversParentTypes["CreateOrganizationResponse"],
> = {
  organization?: Resolver<ResolversTypes["Organization"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes["DateTime"], any> {
  name: "DateTime";
}

export type LogoutResponseResolvers<
  ContextType = IContext,
  ParentType extends ResolversParentTypes["LogoutResponse"] = ResolversParentTypes["LogoutResponse"],
> = {
  status?: Resolver<ResolversTypes["LogoutStatus"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MemberResolvers<
  ContextType = IContext,
  ParentType extends ResolversParentTypes["Member"] = ResolversParentTypes["Member"],
> = {
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  organization?: Resolver<ResolversTypes["Organization"], ParentType, ContextType>;
  role?: Resolver<ResolversTypes["Role"], ParentType, ContextType>;
  user?: Resolver<ResolversTypes["User"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<
  ContextType = IContext,
  ParentType extends ResolversParentTypes["Mutation"] = ResolversParentTypes["Mutation"],
> = {
  addMember?: Resolver<
    ResolversTypes["AddMemberResponse"],
    ParentType,
    ContextType,
    RequireFields<MutationaddMemberArgs, "data">
  >;
  authenticate?: Resolver<
    ResolversTypes["UserResponse"],
    ParentType,
    ContextType,
    RequireFields<MutationauthenticateArgs, "code">
  >;
  createOrganization?: Resolver<
    ResolversTypes["CreateOrganizationResponse"],
    ParentType,
    ContextType,
    RequireFields<MutationcreateOrganizationArgs, "data">
  >;
  createUser?: Resolver<
    Maybe<ResolversTypes["User"]>,
    ParentType,
    ContextType,
    RequireFields<MutationcreateUserArgs, "firstName">
  >;
  logout?: Resolver<ResolversTypes["LogoutResponse"], ParentType, ContextType>;
  newBooking?: Resolver<
    ResolversTypes["Booking"],
    ParentType,
    ContextType,
    RequireFields<MutationnewBookingArgs, "data">
  >;
  redirectUrl?: Resolver<
    ResolversTypes["RedirectUrlResponse"],
    ParentType,
    ContextType,
    Partial<MutationredirectUrlArgs>
  >;
  removeMember?: Resolver<
    ResolversTypes["RemoveMemberResponse"],
    ParentType,
    ContextType,
    RequireFields<MutationremoveMemberArgs, "data">
  >;
  updateBookingStatus?: Resolver<
    ResolversTypes["Booking"],
    ParentType,
    ContextType,
    RequireFields<MutationupdateBookingStatusArgs, "data">
  >;
  updateOrganization?: Resolver<
    ResolversTypes["UpdateOrganizationResponse"],
    ParentType,
    ContextType,
    RequireFields<MutationupdateOrganizationArgs, "data">
  >;
  updateUser?: Resolver<
    ResolversTypes["User"],
    ParentType,
    ContextType,
    RequireFields<MutationupdateUserArgs, "data" | "id">
  >;
};

export type OrganizationResolvers<
  ContextType = IContext,
  ParentType extends ResolversParentTypes["Organization"] = ResolversParentTypes["Organization"],
> = {
  description?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes["Member"]>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<
  ContextType = IContext,
  ParentType extends ResolversParentTypes["Query"] = ResolversParentTypes["Query"],
> = {
  user?: Resolver<ResolversTypes["UserResponse"], ParentType, ContextType>;
  users?: Resolver<ResolversTypes["UsersResponse"], ParentType, ContextType>;
};

export type RedirectUrlResponseResolvers<
  ContextType = IContext,
  ParentType extends ResolversParentTypes["RedirectUrlResponse"] = ResolversParentTypes["RedirectUrlResponse"],
> = {
  url?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RemoveMemberResponseResolvers<
  ContextType = IContext,
  ParentType extends ResolversParentTypes["RemoveMemberResponse"] = ResolversParentTypes["RemoveMemberResponse"],
> = {
  member?: Resolver<ResolversTypes["Member"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UpdateOrganizationResponseResolvers<
  ContextType = IContext,
  ParentType extends
    ResolversParentTypes["UpdateOrganizationResponse"] = ResolversParentTypes["UpdateOrganizationResponse"],
> = {
  organization?: Resolver<ResolversTypes["Organization"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserResolvers<
  ContextType = IContext,
  ParentType extends ResolversParentTypes["User"] = ResolversParentTypes["User"],
> = {
  allergies?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  canUpdateYear?: Resolver<ResolversTypes["Boolean"], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes["DateTime"], ParentType, ContextType>;
  firstLogin?: Resolver<ResolversTypes["Boolean"], ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  graduationYear?: Resolver<Maybe<ResolversTypes["Int"]>, ParentType, ContextType>;
  graduationYearUpdatedAt?: Resolver<Maybe<ResolversTypes["DateTime"]>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  phoneNumber?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  username?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserResponseResolvers<
  ContextType = IContext,
  ParentType extends ResolversParentTypes["UserResponse"] = ResolversParentTypes["UserResponse"],
> = {
  user?: Resolver<Maybe<ResolversTypes["User"]>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UsersResponseResolvers<
  ContextType = IContext,
  ParentType extends ResolversParentTypes["UsersResponse"] = ResolversParentTypes["UsersResponse"],
> = {
  total?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes["User"]>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = IContext> = {
  AddMemberResponse?: AddMemberResponseResolvers<ContextType>;
  Booking?: BookingResolvers<ContextType>;
  Cabin?: CabinResolvers<ContextType>;
  CreateOrganizationResponse?: CreateOrganizationResponseResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  LogoutResponse?: LogoutResponseResolvers<ContextType>;
  Member?: MemberResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RedirectUrlResponse?: RedirectUrlResponseResolvers<ContextType>;
  RemoveMemberResponse?: RemoveMemberResponseResolvers<ContextType>;
  UpdateOrganizationResponse?: UpdateOrganizationResponseResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserResponse?: UserResponseResolvers<ContextType>;
  UsersResponse?: UsersResponseResolvers<ContextType>;
};
