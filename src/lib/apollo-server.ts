import { unwrapResolverError } from "@apollo/server/errors";
import type {
	Booking,
	BookingContact,
	BookingSemester,
	Cabin,
	EventSignUp,
	FeaturePermission,
	Listing,
	Member,
	Organization,
	Prisma,
	Semester,
} from "@prisma/client";
import type { Transaction } from "@sentry/node";
import type {
	FastifyBaseLogger,
	FastifyInstance,
	FastifyReply,
	FastifyRequest,
} from "fastify";
import { GraphQLError, type GraphQLFormattedError } from "graphql";
import { merge } from "lodash-es";
import type { BookingStatus } from "~/domain/cabins.js";
import { errorCodes, isUserFacingError } from "~/domain/errors.js";
import type { Category, Event, SignUpAvailability } from "~/domain/events.js";
import type { Role } from "~/domain/organizations.js";
import type { User } from "~/domain/users.js";
import type { Context } from "~/services/context.js";

export function getFormatErrorHandler(log?: Partial<FastifyInstance["log"]>) {
	const formatError = (
		formattedError: GraphQLFormattedError,
		error: unknown,
	): GraphQLFormattedError => {
		const originalError = unwrapResolverError(error);

		/**
		 * GraphQLErrors include errors such as invalid queries, missing required arguments, etc.
		 * and should be returned as-is.
		 */
		if (originalError instanceof GraphQLError) {
			return formattedError;
		}

		/**
		 * If the error is a user-facing error, we can return it as-is.
		 */
		if (isUserFacingError(originalError)) {
			return merge({}, formattedError, {
				message: originalError.message,
				extensions: {
					code: originalError.code,
				},
			});
		}

		if (originalError instanceof Error) {
			log?.error?.(originalError);
		}

		/**
		 * If the error is not a user-facing error, we should mask it and return a generic error message.
		 */
		return merge({}, formattedError, {
			message: "An unexpected error occurred",
			extensions: {
				code: errorCodes.ERR_INTERNAL_SERVER_ERROR,
			},
		});
	};
	return formatError;
}

export interface ApolloContext extends ApolloServerDependencies {
	res: FastifyReply;
	req: FastifyRequest;
	user: User | null;
	log: FastifyBaseLogger;
	transaction?: Transaction;
}

declare module "graphql" {
	interface GraphQLErrorExtensions {
		code: string;
	}
}

interface IOrganizationService {
	create(
		userId: string,
		data: {
			name: string;
			description?: string | null;
			featurePermissions?: FeaturePermission[] | null;
		},
	): Promise<Organization>;
	update(
		userId: string,
		organizationId: string,
		data: {
			name?: string | null;
			description?: string | null;
			featurePermissions?: FeaturePermission[] | null;
		},
	): Promise<Organization>;
	addMember(
		userId: string,
		data: { userId: string; organizationId: string; role: Role },
	): Promise<Member>;
	removeMember(
		userId: string,
		data: { userId: string; organizationId: string } | { id: string },
	): Promise<Member>;
	getMembers(userId: string, organizationId: string): Promise<Member[]>;
	get(id: string): Promise<Organization>;
	findMany(data?: { userId?: string }): Promise<Organization[]>;
}

interface IUserService {
	get(id: string): Promise<User>;
	getAll(): Promise<User[]>;
	getByFeideID(feideId: string): Promise<User | null>;
	update(
		id: string,
		data: {
			firstName?: string | null;
			lastName?: string | null;
			phoneNumber?: string | null;
			graduationYear?: number | null;
			allergies?: string | null;
		},
	): Promise<User>;
	superUpdateUser(
		ctx: Context,
		userToUpdateId: string,
		data: {
			firstName?: string | null;
			lastName?: string | null;
			phoneNumber?: string | null;
			graduationYear?: number | null;
			allergies?: string | null;
			isSuperUser?: boolean | null;
		},
	): Promise<User>;
	login(id: string): Promise<User>;
	create(data: Prisma.UserCreateInput): Promise<User>;
	canUpdateYear(user: Pick<User, "graduationYearUpdatedAt">): boolean;
}

export interface BookingData {
	email: string;
	firstName: string;
	lastName: string;
	startDate: Date;
	endDate: Date;
	phoneNumber: string;
	cabinId: string;
}

export interface ICabinService {
	newBooking(data: BookingData): Promise<Booking>;
	updateBookingStatus(
		userId: string,
		id: string,
		status: BookingStatus,
	): Promise<Booking>;
	getCabin(id: string): Promise<Cabin>;
	getCabinByBookingId(bookingId: string): Promise<Cabin>;
	findManyCabins(): Promise<Cabin[]>;
	updateBookingSemester(
		userId: string,
		data: {
			semester: Semester;
			startAt?: Date | null;
			endAt?: Date | null;
			bookingsEnabled?: boolean | null;
		},
	): Promise<BookingSemester>;
	getBookingSemester(semester: Semester): Promise<BookingSemester | null>;
	getBookingContact(): Promise<
		Pick<BookingContact, "email" | "name" | "phoneNumber" | "id">
	>;
	updateBookingContact(
		userId: string,
		data: Partial<{
			name: string | null;
			phoneNumber: string | null;
			email: string | null;
		}>,
	): Promise<Pick<BookingContact, "email" | "name" | "phoneNumber" | "id">>;
}

interface IEventService {
	create(
		userId: string,
		organizationId: string,
		event: {
			name: string;
			description?: string | null;
			startAt: Date;
			endAt?: Date | null;
			location?: string | null;
		},
		signUpDetails?: {
			signUpsEnabled: boolean;
			signUpsStartAt: Date;
			signUpsEndAt: Date;
			capacity: number;
			slots: { capacity: number }[];
		} | null,
	): Promise<Event>;
	update(
		userId: string,
		id: string,
		data: Partial<{
			name: string | null;
			description: string | null;
			startAt: Date | null;
			endAt: Date | null;
			location: string | null;
			capacity: number | null;
		}>,
	): Promise<Event>;
	get(id: string): Promise<Event>;
	findMany(data?: { onlyFutureEvents?: boolean | null }): Promise<Event[]>;
	signUp(ctx: Context, userId: string, eventId: string): Promise<EventSignUp>;
	retractSignUp(userId: string, eventId: string): Promise<EventSignUp>;
	canSignUpForEvent(userId: string, eventId: string): Promise<boolean>;
	getSignUpAvailability(
		userId: string | undefined,
		eventId: string,
	): Promise<SignUpAvailability>;
	createCategory(ctx: UserContext, data: { name: string }): Promise<Category>;
	updateCategory(ctx: UserContext, data: Category): Promise<Category>;
	getCategories(ctx: UserContext): Promise<Category[]>;
	deleteCategory(ctx: UserContext, data: { id: string }): Promise<Category>;
}

interface ListingService {
	get(id: string): Promise<Listing>;
	findMany(): Promise<Listing[]>;
	create(
		userId: string,
		data: {
			name: string;
			description?: string | null;
			applicationUrl?: string | null;
			closesAt: Date;
			organizationId: string;
		},
	): Promise<Listing>;
	update(
		userId: string,
		id: string,
		data: Partial<{
			name: string | null;
			description: string | null;
			applicationUrl: string | null;
			closesAt: Date | null;
		}>,
	): Promise<Listing>;
	delete(userId: string, id: string): Promise<Listing>;
}

export interface ApolloServerDependencies {
	userService: IUserService;
	organizationService: IOrganizationService;
	cabinService: ICabinService;
	eventService: IEventService;
	listingService: ListingService;
	permissionService: IPermissionService;
}

interface IPermissionService {
	isSuperUser(userId: string): Promise<{ isSuperUser: boolean }>;
	hasFeaturePermission(data: {
		userId: string;
		featurePermission: FeaturePermission;
	}): Promise<boolean>;
}

type UserContext = {
	user: User | null;
};
