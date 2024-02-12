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
	PrismaClient,
	Semester,
} from "@prisma/client";
import * as Sentry from "@sentry/node";
import { Client } from "@vippsmobilepay/sdk";
import type { Job } from "bullmq";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { type Configuration, env } from "~/config.js";
import type { BookingStatus } from "~/domain/cabins.js";
import {
	InternalServerError,
	type InvalidArgumentError,
	type NotFoundError,
	type PermissionDeniedError,
	type UnauthorizedError,
} from "~/domain/errors.js";
import type {
	CategoryType,
	EventType,
	SignUpAvailability,
	SlotType,
} from "~/domain/events/index.js";
import type { Role } from "~/domain/organizations.js";
import type {
	MerchantType,
	OrderType,
	PaymentAttemptType,
	ProductType,
} from "~/domain/products.js";
import type { StudyProgram, User } from "~/domain/users.js";
import type { Context } from "~/lib/context.js";
import { CabinRepository } from "~/repositories/cabins/repository.js";
import { EventRepository } from "~/repositories/events/index.js";
import { ListingRepository } from "~/repositories/listings/repository.js";
import { MemberRepository } from "~/repositories/organizations/members.js";
import { OrganizationRepository } from "~/repositories/organizations/organizations.js";
import { ProductRepository } from "~/repositories/products/repository.js";
import { UserRepository } from "~/repositories/users/index.js";
import { feideClient } from "~/services/auth/clients.js";
import { AuthService } from "~/services/auth/index.js";
import { CabinService } from "~/services/cabins/index.js";
import {
	type CreateEventParams,
	EventService,
} from "~/services/events/index.js";
import type { UpdateEventParams } from "~/services/events/service.js";
import { SignUpQueueName } from "~/services/events/worker.js";
import { ListingService } from "~/services/listings/index.js";
import { buildMailService } from "~/services/mail/index.js";
import { OrganizationService } from "~/services/organizations/index.js";
import { PermissionService } from "~/services/permissions/index.js";
import { ProductService } from "~/services/products/index.js";
import {
	type PaymentProcessingDataType,
	type PaymentProcessingNameType,
	PaymentProcessingQueueName,
	type PaymentProcessingResultType,
} from "~/services/products/worker.js";
import { UserService } from "~/services/users/index.js";
import fastifyMessageQueue from "./fastify/message-queue.js";
import fastifyPrisma from "./fastify/prisma.js";
import fastifyService from "./fastify/service.js";
import { postmark } from "./postmark.js";
import prisma from "./prisma.js";
import type { ResultAsync } from "./result.js";

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

interface IAuthService {
	userLoginCallback(req: FastifyRequest, data: { code: string }): Promise<User>;
	studyProgramCallback(
		req: FastifyRequest,
		data: { code: string },
	): Promise<User>;
	authorizationUrl(
		req: FastifyRequest,
		postAuthorizationRedirectUrl?: string | null,
		kind?: "login" | "studyProgram",
	): string;
	logout(req: FastifyRequest): Promise<void>;
	login(req: FastifyRequest, user: User): Promise<User>;
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
	getStudyProgram(
		by: { id: string } | { externalId: string },
	): Promise<StudyProgram | null>;
	createStudyProgram(studyProgram: {
		name: string;
		externalId: string;
	}): Promise<StudyProgram>;
}

interface BookingData {
	email: string;
	firstName: string;
	lastName: string;
	startDate: Date;
	endDate: Date;
	phoneNumber: string;
	cabinId: string;
}

interface ICabinService {
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
		ctx: Context,
		params: CreateEventParams,
	): ResultAsync<
		{ event: EventType; slots?: SlotType[] },
		InvalidArgumentError | PermissionDeniedError | InternalServerError
	>;
	update(
		ctx: Context,
		params: UpdateEventParams,
	): ResultAsync<
		{ event: EventType; slots: SlotType[]; categories: CategoryType[] },
		InvalidArgumentError | PermissionDeniedError | InternalServerError
	>;
	get(id: string): Promise<EventType>;
	findMany(data?: { onlyFutureEvents?: boolean | null }): Promise<EventType[]>;
	signUp(ctx: Context, userId: string, eventId: string): Promise<EventSignUp>;
	retractSignUp(userId: string, eventId: string): Promise<EventSignUp>;
	canSignUpForEvent(userId: string, eventId: string): Promise<boolean>;
	getSignUpAvailability(
		userId: string | undefined,
		eventId: string,
	): Promise<SignUpAvailability>;
	createCategory(
		ctx: UserContext,
		data: { name: string },
	): Promise<CategoryType>;
	updateCategory(ctx: UserContext, data: CategoryType): Promise<CategoryType>;
	getCategories(
		ctx: UserContext,
		by?: { eventId?: string },
	): Promise<CategoryType[]>;
	deleteCategory(ctx: UserContext, data: { id: string }): Promise<CategoryType>;
	getSlots(
		ctx: Context,
		params: { eventId: string },
	): ResultAsync<{ slots: SlotType[] }, never>;
}

interface IListingService {
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

interface IPermissionService {
	isSuperUser(userId: string): Promise<{ isSuperUser: boolean }>;
	hasFeaturePermission(data: {
		userId: string;
		featurePermission: FeaturePermission;
	}): Promise<boolean>;
}

type IProductService = {
	payments: {
		initiatePaymentAttempt(
			ctx: Context,
			params: { orderId: string },
		): ResultAsync<
			{
				redirectUrl: string;
				paymentAttempt: PaymentAttemptType;
				order: OrderType;
				pollingJob: Job<
					PaymentProcessingDataType,
					PaymentProcessingResultType,
					PaymentProcessingNameType
				>;
			},
			| UnauthorizedError
			| NotFoundError
			| InvalidArgumentError
			| InternalServerError
		>;
		findMany(
			ctx: Context,
			params?: {
				userId?: string | null;
				productId?: string | null;
				orderId?: string | null;
			} | null,
		): ResultAsync<
			{ paymentAttempts: PaymentAttemptType[]; total: number },
			InternalServerError | PermissionDeniedError | UnauthorizedError
		>;
	};
	orders: {
		create(
			ctx: Context,
			data: Pick<OrderType, "productId">,
		): ResultAsync<{ order: OrderType }, UnauthorizedError | NotFoundError>;
		findMany(
			ctx: Context,
			params?: { userId?: string | null; productId?: string | null } | null,
		): ResultAsync<
			{ orders: OrderType[]; total: number },
			InternalServerError | PermissionDeniedError | UnauthorizedError
		>;
		get(
			ctx: Context,
			params: { id: string },
		): ResultAsync<
			{ order: OrderType },
			| NotFoundError
			| UnauthorizedError
			| PermissionDeniedError
			| InternalServerError
		>;
	};
	products: {
		findMany(
			_ctx: Context,
		): ResultAsync<
			{ products: ProductType[]; total: number },
			InternalServerError
		>;
		get(
			ctx: Context,
			params: { id: string },
		): ResultAsync<{ product: ProductType }, NotFoundError>;
	};
	merchants: {
		create(
			ctx: Context,
			data: {
				name: string;
				serialNumber: string;
				subscriptionKey: string;
				clientId: string;
				clientSecret: string;
			},
		): ResultAsync<
			{ merchant: MerchantType },
			| PermissionDeniedError
			| UnauthorizedError
			| InvalidArgumentError
			| InternalServerError
		>;
	};
};

type UserContext = {
	user: User | null;
};

type Services = {
	users: IUserService;
	auth: IAuthService;
	organizations: IOrganizationService;
	permissions: IPermissionService;
	events: IEventService;
	listings: IListingService;
	cabins: ICabinService;
	products: IProductService;
};

type ServerDependencies = {
	databaseClient: PrismaClient;
};

/**
 * startServer starts listening to HTTP requests on the specified port.
 */
async function startServer(
	dependencies: { server: FastifyInstance },
	opts: Pick<Configuration, "PORT">,
): Promise<{ server: FastifyInstance }> {
	const { server } = dependencies;
	const { PORT } = opts;

	/**
	 * Start the Fastify server
	 */
	try {
		await server.listen({
			port: PORT,
			host: "0.0.0.0",
		});
	} catch (err) {
		if (err instanceof Error) {
			// Log the error
			server.log.fatal(err, "Error starting server");
			// Capture the error with Sentry and exit the process
			server.Sentry.captureException(err, {
				level: "fatal",
				tags: {
					kind: "server",
				},
			});
		}
		process.exit(1);
	}

	return { server };
}

/**
 * registerServices registers all services with the server instance.
 */
async function registerServices(
	serverInstance: FastifyInstance,
	configuration?: Partial<Configuration>,
): Promise<Services> {
	await serverInstance.register(fastifyPrisma, { client: prisma });
	const database = serverInstance.database;

	serverInstance.Sentry.addIntegration(
		new Sentry.Integrations.Prisma({ client: database }),
	);

	const cabinRepository = new CabinRepository(database);
	const userRepository = new UserRepository(database);
	const memberRepository = new MemberRepository(database);
	const organizationRepository = new OrganizationRepository(database);
	const eventRepository = new EventRepository(database);
	const listingRepository = new ListingRepository(database);
	const productRepository = new ProductRepository(database);

	const permissionService = new PermissionService(
		memberRepository,
		userRepository,
		organizationRepository,
	);
	const organizationService = new OrganizationService(
		organizationRepository,
		memberRepository,
		permissionService,
	);
	const listingService = new ListingService(
		listingRepository,
		permissionService,
	);

	await serverInstance.register(fastifyMessageQueue, {
		name: "email",
	});

	if (!serverInstance.queues.email) {
		throw new InternalServerError("Email queue not initialized");
	}

	const mailService = buildMailService(
		{
			emailQueue: serverInstance.queues.email,
			emailClient: postmark(env.POSTMARK_API_TOKEN, {
				useTestMode: env.NODE_ENV === "test",
			}),
		},
		{
			companyName: env.COMPANY_NAME,
			contactMail: env.CONTACT_EMAIL,
			noReplyEmail: env.NO_REPLY_EMAIL,
			parentCompany: env.PARENT_COMPANY,
			productName: env.PRODUCT_NAME,
			websiteUrl: env.CLIENT_URL,
		},
	);

	const cabinService = new CabinService(
		cabinRepository,
		mailService,
		permissionService,
	);

	const userService = new UserService(
		userRepository,
		permissionService,
		mailService,
	);

	await serverInstance.register(fastifyMessageQueue, {
		name: PaymentProcessingQueueName,
	});
	if (!serverInstance.queues[PaymentProcessingQueueName]) {
		throw new InternalServerError("Payment processing queue not initialized");
	}
	const productService = ProductService({
		vippsFactory: Client,
		paymentProcessingQueue: serverInstance.queues[PaymentProcessingQueueName],
		productRepository,
		config: {
			useTestMode: configuration?.VIPPS_TEST_MODE,
			returnUrl: env.SERVER_URL,
		},
	});

	await serverInstance.register(fastifyMessageQueue, {
		name: SignUpQueueName,
	});
	if (!serverInstance.queues[SignUpQueueName]) {
		throw new InternalServerError("Sign-ups queue not initialized");
	}

	const eventService = new EventService(
		eventRepository,
		permissionService,
		userService,
		productService,
		serverInstance.queues[SignUpQueueName],
	);
	const authService = new AuthService(userService, feideClient);

	const services: Services = {
		users: userService,
		auth: authService,
		organizations: organizationService,
		permissions: permissionService,
		events: eventService,
		listings: listingService,
		cabins: cabinService,
		products: productService,
	};

	await serverInstance.register(fastifyService, { services });
	return services;
}

export { registerServices, startServer };
export type { ServerDependencies, Services };
