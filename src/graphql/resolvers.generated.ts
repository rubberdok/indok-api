/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated.js';
    import    { AddMemberResponse } from './organizations/resolvers/AddMemberResponse.js';
import    { Booking } from './cabins/resolvers/Booking.js';
import    { Cabin } from './cabins/resolvers/Cabin.js';
import    { CreateOrganizationResponse } from './organizations/resolvers/CreateOrganizationResponse.js';
import    { Member } from './organizations/resolvers/Member.js';
import    { addMember as Mutation_addMember } from './organizations/resolvers/Mutation/addMember.js';
import    { createOrganization as Mutation_createOrganization } from './organizations/resolvers/Mutation/createOrganization.js';
import    { newBooking as Mutation_newBooking } from './cabins/resolvers/Mutation/newBooking.js';
import    { removeMember as Mutation_removeMember } from './organizations/resolvers/Mutation/removeMember.js';
import    { updateBookingStatus as Mutation_updateBookingStatus } from './cabins/resolvers/Mutation/updateBookingStatus.js';
import    { updateOrganization as Mutation_updateOrganization } from './organizations/resolvers/Mutation/updateOrganization.js';
import    { updateUser as Mutation_updateUser } from './users/resolvers/Mutation/updateUser.js';
import    { Organization } from './organizations/resolvers/Organization.js';
import    { user as Query_user } from './users/resolvers/Query/user.js';
import    { users as Query_users } from './users/resolvers/Query/users.js';
import    { RemoveMemberResponse } from './organizations/resolvers/RemoveMemberResponse.js';
import    { UpdateOrganizationResponse } from './organizations/resolvers/UpdateOrganizationResponse.js';
import    { User } from './users/resolvers/User.js';
import    { UserResponse } from './users/resolvers/UserResponse.js';
import    { UsersResponse } from './users/resolvers/UsersResponse.js';
import    { DateTimeResolver } from 'graphql-scalars';
    export const resolvers: Resolvers = {
      Query: { user: Query_user,users: Query_users },
      Mutation: { addMember: Mutation_addMember,createOrganization: Mutation_createOrganization,newBooking: Mutation_newBooking,removeMember: Mutation_removeMember,updateBookingStatus: Mutation_updateBookingStatus,updateOrganization: Mutation_updateOrganization,updateUser: Mutation_updateUser },
      
      AddMemberResponse: AddMemberResponse,
Booking: Booking,
Cabin: Cabin,
CreateOrganizationResponse: CreateOrganizationResponse,
Member: Member,
Organization: Organization,
RemoveMemberResponse: RemoveMemberResponse,
UpdateOrganizationResponse: UpdateOrganizationResponse,
User: User,
UserResponse: UserResponse,
UsersResponse: UsersResponse,
DateTime: DateTimeResolver
    }