/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
import type { Resolvers } from "./types.generated.js";
import { AddMemberResponse } from "./organizations/resolvers/AddMemberResponse.js";
import { Booking } from "./cabins/resolvers/Booking.js";
import { Cabin } from "./cabins/resolvers/Cabin.js";
import { CreateOrganizationResponse } from "./organizations/resolvers/CreateOrganizationResponse.js";
import { LogoutResponse } from "./auth/resolvers/LogoutResponse.js";
import { Member } from "./organizations/resolvers/Member.js";
import { addMember as Mutation_addMember } from "./organizations/resolvers/Mutation/addMember.js";
import { authenticate as Mutation_authenticate } from "./auth/resolvers/Mutation/authenticate.js";
import { createOrganization as Mutation_createOrganization } from "./organizations/resolvers/Mutation/createOrganization.js";
import { logout as Mutation_logout } from "./auth/resolvers/Mutation/logout.js";
import { newBooking as Mutation_newBooking } from "./cabins/resolvers/Mutation/newBooking.js";
import { redirectUrl as Mutation_redirectUrl } from "./auth/resolvers/Mutation/redirectUrl.js";
import { removeMember as Mutation_removeMember } from "./organizations/resolvers/Mutation/removeMember.js";
import { updateBookingStatus as Mutation_updateBookingStatus } from "./cabins/resolvers/Mutation/updateBookingStatus.js";
import { updateOrganization as Mutation_updateOrganization } from "./organizations/resolvers/Mutation/updateOrganization.js";
import { updateUser as Mutation_updateUser } from "./users/resolvers/Mutation/updateUser.js";
import { Organization } from "./organizations/resolvers/Organization.js";
import { user as Query_user } from "./users/resolvers/Query/user.js";
import { users as Query_users } from "./users/resolvers/Query/users.js";
import { RedirectUrlResponse } from "./auth/resolvers/RedirectUrlResponse.js";
import { RemoveMemberResponse } from "./organizations/resolvers/RemoveMemberResponse.js";
import { UpdateOrganizationResponse } from "./organizations/resolvers/UpdateOrganizationResponse.js";
import { User } from "./users/resolvers/User.js";
import { UserResponse } from "./users/resolvers/UserResponse.js";
import { UsersResponse } from "./users/resolvers/UsersResponse.js";
import { DateTimeResolver } from "graphql-scalars";
export const resolvers: Resolvers = {
  Query: { user: Query_user, users: Query_users },
  Mutation: {
    addMember: Mutation_addMember,
    authenticate: Mutation_authenticate,
    createOrganization: Mutation_createOrganization,
    logout: Mutation_logout,
    newBooking: Mutation_newBooking,
    redirectUrl: Mutation_redirectUrl,
    removeMember: Mutation_removeMember,
    updateBookingStatus: Mutation_updateBookingStatus,
    updateOrganization: Mutation_updateOrganization,
    updateUser: Mutation_updateUser,
  },

  AddMemberResponse: AddMemberResponse,
  Booking: Booking,
  Cabin: Cabin,
  CreateOrganizationResponse: CreateOrganizationResponse,
  LogoutResponse: LogoutResponse,
  Member: Member,
  Organization: Organization,
  RedirectUrlResponse: RedirectUrlResponse,
  RemoveMemberResponse: RemoveMemberResponse,
  UpdateOrganizationResponse: UpdateOrganizationResponse,
  User: User,
  UserResponse: UserResponse,
  UsersResponse: UsersResponse,
  DateTime: DateTimeResolver,
};
