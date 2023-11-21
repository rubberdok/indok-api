/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated.js';
    import    { AddMemberResponse } from './organizations/resolvers/AddMemberResponse.js';
import    { Booking } from './cabins/resolvers/Booking.js';
import    { Cabin } from './cabins/resolvers/Cabin.js';
import    { CreateEventResponse } from './events/resolvers/CreateEventResponse.js';
import    { CreateOrganizationResponse } from './organizations/resolvers/CreateOrganizationResponse.js';
import    { Event } from './events/resolvers/Event.js';
import    { EventResponse } from './events/resolvers/EventResponse.js';
import    { EventsResponse } from './events/resolvers/EventsResponse.js';
import    { Member } from './organizations/resolvers/Member.js';
import    { addMember as Mutation_addMember } from './organizations/resolvers/Mutation/addMember.js';
import    { createEvent as Mutation_createEvent } from './events/resolvers/Mutation/createEvent.js';
import    { createOrganization as Mutation_createOrganization } from './organizations/resolvers/Mutation/createOrganization.js';
import    { newBooking as Mutation_newBooking } from './cabins/resolvers/Mutation/newBooking.js';
import    { removeMember as Mutation_removeMember } from './organizations/resolvers/Mutation/removeMember.js';
import    { signUp as Mutation_signUp } from './events/resolvers/Mutation/signUp.js';
import    { updateBookingStatus as Mutation_updateBookingStatus } from './cabins/resolvers/Mutation/updateBookingStatus.js';
import    { updateOrganization as Mutation_updateOrganization } from './organizations/resolvers/Mutation/updateOrganization.js';
import    { updateUser as Mutation_updateUser } from './users/resolvers/Mutation/updateUser.js';
import    { Organization } from './organizations/resolvers/Organization.js';
import    { PrivateUser } from './users/resolvers/PrivateUser.js';
import    { PublicUser } from './users/resolvers/PublicUser.js';
import    { event as Query_event } from './events/resolvers/Query/event.js';
import    { events as Query_events } from './events/resolvers/Query/events.js';
import    { user as Query_user } from './users/resolvers/Query/user.js';
import    { users as Query_users } from './users/resolvers/Query/users.js';
import    { RemoveMemberResponse } from './organizations/resolvers/RemoveMemberResponse.js';
import    { SignUp } from './events/resolvers/SignUp.js';
import    { SignUpResponse } from './events/resolvers/SignUpResponse.js';
import    { UpdateOrganizationResponse } from './organizations/resolvers/UpdateOrganizationResponse.js';
import    { UpdateUserResponse } from './users/resolvers/UpdateUserResponse.js';
import    { UserResponse } from './users/resolvers/UserResponse.js';
import    { UsersResponse } from './users/resolvers/UsersResponse.js';
import    { DateTimeResolver } from 'graphql-scalars';
    export const resolvers: Resolvers = {
      Query: { event: Query_event,events: Query_events,user: Query_user,users: Query_users },
      Mutation: { addMember: Mutation_addMember,createEvent: Mutation_createEvent,createOrganization: Mutation_createOrganization,newBooking: Mutation_newBooking,removeMember: Mutation_removeMember,signUp: Mutation_signUp,updateBookingStatus: Mutation_updateBookingStatus,updateOrganization: Mutation_updateOrganization,updateUser: Mutation_updateUser },
      
      AddMemberResponse: AddMemberResponse,
Booking: Booking,
Cabin: Cabin,
CreateEventResponse: CreateEventResponse,
CreateOrganizationResponse: CreateOrganizationResponse,
Event: Event,
EventResponse: EventResponse,
EventsResponse: EventsResponse,
Member: Member,
Organization: Organization,
PrivateUser: PrivateUser,
PublicUser: PublicUser,
RemoveMemberResponse: RemoveMemberResponse,
SignUp: SignUp,
SignUpResponse: SignUpResponse,
UpdateOrganizationResponse: UpdateOrganizationResponse,
UpdateUserResponse: UpdateUserResponse,
UserResponse: UserResponse,
UsersResponse: UsersResponse,
DateTime: DateTimeResolver
    }