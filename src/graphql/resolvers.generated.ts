/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated.js';
    import    { AddMemberResponse } from './organizations/resolvers/AddMemberResponse.js';
import    { Booking } from './cabins/resolvers/Booking.js';
import    { BookingContact } from './cabins/resolvers/BookingContact.js';
import    { BookingContactResponse } from './cabins/resolvers/BookingContactResponse.js';
import    { BookingSemester } from './cabins/resolvers/BookingSemester.js';
import    { BookingSemestersResponse } from './cabins/resolvers/BookingSemestersResponse.js';
import    { Cabin } from './cabins/resolvers/Cabin.js';
import    { CabinsResponse } from './cabins/resolvers/CabinsResponse.js';
import    { CreateEventResponse } from './events/resolvers/CreateEventResponse.js';
import    { CreateListingResponse } from './listings/resolvers/CreateListingResponse.js';
import    { CreateOrganizationResponse } from './organizations/resolvers/CreateOrganizationResponse.js';
import    { DeleteListingResponse } from './listings/resolvers/DeleteListingResponse.js';
import    { Event } from './events/resolvers/Event.js';
import    { EventResponse } from './events/resolvers/EventResponse.js';
import    { EventsResponse } from './events/resolvers/EventsResponse.js';
import    { Listing } from './listings/resolvers/Listing.js';
import    { ListingResponse } from './listings/resolvers/ListingResponse.js';
import    { ListingsResponse } from './listings/resolvers/ListingsResponse.js';
import    { Member } from './organizations/resolvers/Member.js';
import    { addMember as Mutation_addMember } from './organizations/resolvers/Mutation/addMember.js';
import    { createEvent as Mutation_createEvent } from './events/resolvers/Mutation/createEvent.js';
import    { createListing as Mutation_createListing } from './listings/resolvers/Mutation/createListing.js';
import    { createOrganization as Mutation_createOrganization } from './organizations/resolvers/Mutation/createOrganization.js';
import    { deleteListing as Mutation_deleteListing } from './listings/resolvers/Mutation/deleteListing.js';
import    { newBooking as Mutation_newBooking } from './cabins/resolvers/Mutation/newBooking.js';
import    { removeMember as Mutation_removeMember } from './organizations/resolvers/Mutation/removeMember.js';
import    { retractSignUp as Mutation_retractSignUp } from './events/resolvers/Mutation/retractSignUp.js';
import    { signUp as Mutation_signUp } from './events/resolvers/Mutation/signUp.js';
import    { updateBookingContact as Mutation_updateBookingContact } from './cabins/resolvers/Mutation/updateBookingContact.js';
import    { updateBookingSemester as Mutation_updateBookingSemester } from './cabins/resolvers/Mutation/updateBookingSemester.js';
import    { updateBookingStatus as Mutation_updateBookingStatus } from './cabins/resolvers/Mutation/updateBookingStatus.js';
import    { updateListing as Mutation_updateListing } from './listings/resolvers/Mutation/updateListing.js';
import    { updateOrganization as Mutation_updateOrganization } from './organizations/resolvers/Mutation/updateOrganization.js';
import    { updateUser as Mutation_updateUser } from './users/resolvers/Mutation/updateUser.js';
import    { NewBookingResponse } from './cabins/resolvers/NewBookingResponse.js';
import    { Organization } from './organizations/resolvers/Organization.js';
import    { PrivateUser } from './users/resolvers/PrivateUser.js';
import    { PublicUser } from './users/resolvers/PublicUser.js';
import    { bookingContact as Query_bookingContact } from './cabins/resolvers/Query/bookingContact.js';
import    { bookingSemesters as Query_bookingSemesters } from './cabins/resolvers/Query/bookingSemesters.js';
import    { cabins as Query_cabins } from './cabins/resolvers/Query/cabins.js';
import    { event as Query_event } from './events/resolvers/Query/event.js';
import    { events as Query_events } from './events/resolvers/Query/events.js';
import    { listing as Query_listing } from './listings/resolvers/Query/listing.js';
import    { listings as Query_listings } from './listings/resolvers/Query/listings.js';
import    { user as Query_user } from './users/resolvers/Query/user.js';
import    { users as Query_users } from './users/resolvers/Query/users.js';
import    { RemoveMemberResponse } from './organizations/resolvers/RemoveMemberResponse.js';
import    { RetractSignUpResponse } from './events/resolvers/RetractSignUpResponse.js';
import    { SignUp } from './events/resolvers/SignUp.js';
import    { SignUpResponse } from './events/resolvers/SignUpResponse.js';
import    { UpdateBookingContactResponse } from './cabins/resolvers/UpdateBookingContactResponse.js';
import    { UpdateBookingResponse } from './cabins/resolvers/UpdateBookingResponse.js';
import    { UpdateBookingSemesterResponse } from './cabins/resolvers/UpdateBookingSemesterResponse.js';
import    { UpdateListingResponse } from './listings/resolvers/UpdateListingResponse.js';
import    { UpdateOrganizationResponse } from './organizations/resolvers/UpdateOrganizationResponse.js';
import    { UpdateUserResponse } from './users/resolvers/UpdateUserResponse.js';
import    { UserResponse } from './users/resolvers/UserResponse.js';
import    { UsersResponse } from './users/resolvers/UsersResponse.js';
import    { DateTimeResolver } from 'graphql-scalars';
    export const resolvers: Resolvers = {
      Query: { bookingContact: Query_bookingContact,bookingSemesters: Query_bookingSemesters,cabins: Query_cabins,event: Query_event,events: Query_events,listing: Query_listing,listings: Query_listings,user: Query_user,users: Query_users },
      Mutation: { addMember: Mutation_addMember,createEvent: Mutation_createEvent,createListing: Mutation_createListing,createOrganization: Mutation_createOrganization,deleteListing: Mutation_deleteListing,newBooking: Mutation_newBooking,removeMember: Mutation_removeMember,retractSignUp: Mutation_retractSignUp,signUp: Mutation_signUp,updateBookingContact: Mutation_updateBookingContact,updateBookingSemester: Mutation_updateBookingSemester,updateBookingStatus: Mutation_updateBookingStatus,updateListing: Mutation_updateListing,updateOrganization: Mutation_updateOrganization,updateUser: Mutation_updateUser },
      
      AddMemberResponse: AddMemberResponse,
Booking: Booking,
BookingContact: BookingContact,
BookingContactResponse: BookingContactResponse,
BookingSemester: BookingSemester,
BookingSemestersResponse: BookingSemestersResponse,
Cabin: Cabin,
CabinsResponse: CabinsResponse,
CreateEventResponse: CreateEventResponse,
CreateListingResponse: CreateListingResponse,
CreateOrganizationResponse: CreateOrganizationResponse,
DeleteListingResponse: DeleteListingResponse,
Event: Event,
EventResponse: EventResponse,
EventsResponse: EventsResponse,
Listing: Listing,
ListingResponse: ListingResponse,
ListingsResponse: ListingsResponse,
Member: Member,
NewBookingResponse: NewBookingResponse,
Organization: Organization,
PrivateUser: PrivateUser,
PublicUser: PublicUser,
RemoveMemberResponse: RemoveMemberResponse,
RetractSignUpResponse: RetractSignUpResponse,
SignUp: SignUp,
SignUpResponse: SignUpResponse,
UpdateBookingContactResponse: UpdateBookingContactResponse,
UpdateBookingResponse: UpdateBookingResponse,
UpdateBookingSemesterResponse: UpdateBookingSemesterResponse,
UpdateListingResponse: UpdateListingResponse,
UpdateOrganizationResponse: UpdateOrganizationResponse,
UpdateUserResponse: UpdateUserResponse,
UserResponse: UserResponse,
UsersResponse: UsersResponse,
DateTime: DateTimeResolver
    }