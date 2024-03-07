import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import type {
	BookingContact,
	BookingSemester,
	Cabin,
	EventSignUp,
	FeaturePermission,
	Listing,
	Member,
	Organization,
	ParticipationStatus,
	Prisma,
	PrismaClient,
	Semester,
} from "@prisma/client";
import * as Sentry from "@sentry/node";
import { Client } from "@vippsmobilepay/sdk";
import type { Job } from "bullmq";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { BlobStorageAdapter } from "~/adapters/azure-blob-storage.js";
import { type Configuration, env } from "~/config.js";
import type {
	BookingStatus,
	BookingType,
	CalendarMonth,
} from "~/domain/cabins.js";
import {
	type DownstreamServiceError,
	InternalServerError,
	type InvalidArgumentError,
	type InvalidArugmentErrorType,
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
import type { FileType, RemoteFile } from "~/domain/files.js";
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
import { FileRepository } from "~/repositories/files/index.js";
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
import { FileService } from "~/services/files/index.js";
import { ListingService } from "~/services/listings/index.js";
import { buildMailService } from "~/services/mail/index.js";
import { OrganizationService } from "~/services/organizations/index.js";
import { ProductService } from "~/services/products/index.js";
import {
	type PaymentProcessingDataType,
	type PaymentProcessingNameType,
	PaymentProcessingQueueName,
	type PaymentProcessingResultType,
} from "~/services/products/worker.js";
import { UserService } from "~/services/users/index.js";
import fastifyBullBoardPlugin from "./fastify/bull-board.js";
import fastifyMessageQueue from "./fastify/message-queue.js";
import fastifyPrisma from "./fastify/prisma.js";
import fastifyService from "./fastify/service.js";
import { postmark } from "./postmark.js";
import prisma from "./prisma.js";
import type { ResultAsync } from "./result.js";

interface IOrganizationService {
	organizations: {
		create(
			ctx: Context,
			data: {
				name: string;
				description?: string | null;
				featurePermissions?: FeaturePermission[] | null;
			},
		): Promise<Organization>;
		update(
			ctx: Context,
			organizationId: string,
			data: Partial<{
				name: string | null;
				description: string | null;
				featurePermissions: FeaturePermission[] | null;
				logoFileId: string | null;
			}>,
		): Promise<Organization>;
		get(id: string): Promise<Organization>;
		findMany(data?: { userId?: string }): Promise<Organization[]>;
	};
	members: {
		addMember(
			ctx: Context,
			data: { userId: string; organizationId: string; role: Role },
		): ResultAsync<
			{ member: Member },
			PermissionDeniedError | UnauthorizedError
		>;
		removeMember(
			ctx: Context,
			params: { memberId: string },
		): ResultAsync<
			{ member: Member },
			InvalidArgumentError | PermissionDeniedError | UnauthorizedError
		>;
		findMany(
			ctx: Context,
			params: { organizationId: string },
		): ResultAsync<
			{ members: Member[] },
			PermissionDeniedError | UnauthorizedError
		>;
	};
	permissions: {
		hasFeaturePermission(
			ctx: Context,
			data: {
				featurePermission: FeaturePermission;
			},
		): Promise<boolean>;
		hasRole(
			ctx: Context,
			data: {
				organizationId: string;
				role: Role;
				featurePermission?: FeaturePermission;
			},
		): Promise<boolean>;
	};
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

type NewBookingParams = {
	cabins: { id: string }[];
	email: string;
	firstName: string;
	lastName: string;
	startDate: Date;
	endDate: Date;
	phoneNumber: string;
	internalParticipantsCount: number;
	externalParticipantsCount: number;
	questions?: string | null;
};

interface ICabinService {
	newBooking(
		ctx: Context,
		params: NewBookingParams,
	): ResultAsync<
		{ booking: BookingType },
		InvalidArugmentErrorType | InternalServerError
	>;
	updateBookingStatus(
		ctx: Context,
		params: {
			bookingId: string;
			status: BookingStatus;
			feedback?: string | null;
		},
	): ResultAsync<
		{ booking: BookingType },
		| NotFoundError
		| InternalServerError
		| InvalidArgumentError
		| UnauthorizedError
		| PermissionDeniedError
	>;
	getCabin(id: string): Promise<Cabin>;
	getCabinByBookingId(bookingId: string): Promise<Cabin>;
	findManyCabins(): Promise<Cabin[]>;
	updateBookingSemester(
		ctx: Context,
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
		ctx: Context,
		data: Partial<{
			name: string | null;
			phoneNumber: string | null;
			email: string | null;
		}>,
	): Promise<Pick<BookingContact, "email" | "name" | "phoneNumber" | "id">>;
	createCabin(
		ctx: Context,
		params: {
			name: string;
			capacity: number;
			internalPrice: number;
			externalPrice: number;
		},
	): ResultAsync<
		{ cabin: Cabin },
		| InvalidArgumentError
		| PermissionDeniedError
		| UnauthorizedError
		| InternalServerError
	>;
	totalCost(
		ctx: Context,
		data: {
			startDate: Date;
			endDate: Date;
			guests: {
				internal: number;
				external: number;
			};
			cabins: { id: string }[];
		},
	): ResultAsync<
		{ totalCost: number },
		InternalServerError | NotFoundError | InvalidArgumentError
	>;
	findManyBookings(
		ctx: Context,
		params?: { bookingStatus?: BookingStatus | null } | null,
	): ResultAsync<
		{ bookings: BookingType[]; total: number },
		UnauthorizedError | PermissionDeniedError | InternalServerError
	>;
	getAvailabilityCalendar(
		ctx: Context,
		params: {
			month: number;
			year: number;
			count: number;
			cabins: { id: string }[];
		},
	): ResultAsync<
		{
			calendarMonths: CalendarMonth[];
		},
		InternalServerError
	>;
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
		| InvalidArgumentError
		| PermissionDeniedError
		| InternalServerError
		| NotFoundError
	>;
	get(id: string): Promise<EventType>;
	findMany(data?: {
		onlyFutureEvents?: boolean | null;
		organizationId?: string | null;
		organizations?: { id: string }[] | null;
		categories?: { id: string }[] | null;
		startAfter?: Date | null;
		endBefore?: Date | null;
	}): Promise<EventType[]>;
	signUp(
		ctx: Context,
		params: {
			userId?: string | null;
			eventId: string;
			userProvidedInformation?: string | null;
		},
	): ResultAsync<
		{ signUp: EventSignUp },
		InvalidArgumentError | UnauthorizedError | InternalServerError
	>;
	retractSignUp(
		ctx: Context,
		params: { eventId: string },
	): ResultAsync<
		{ signUp: EventSignUp },
		| NotFoundError
		| InternalServerError
		| UnauthorizedError
		| InvalidArgumentError
	>;
	canSignUpForEvent(
		ctx: Context,
		params: { eventId: string },
	): Promise<boolean>;
	getSignUpAvailability(
		ctx: Context,
		params: { eventId: string },
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
	getSignUp(
		ctx: Context,
		params: { userId?: string; eventId: string },
	): ResultAsync<
		{ signUp: EventSignUp },
		NotFoundError | UnauthorizedError | InternalServerError
	>;
	getOrderForSignUp(
		ctx: Context,
		params: { eventId: string; userId?: string },
	): ResultAsync<
		{ order: OrderType },
		| NotFoundError
		| InternalServerError
		| InvalidArgumentError
		| UnauthorizedError
		| PermissionDeniedError
	>;
	findManySignUpsForUser(
		ctx: Context,
		params?: {
			userId: string;
			orderBy?: "asc" | "desc" | null;
			participationStatus?: ParticipationStatus | null;
		} | null,
	): ResultAsync<
		{ signUps: EventSignUp[]; total: number },
		UnauthorizedError | InternalServerError
	>;
	findManySignUps(
		ctx: Context,
		params: {
			eventId: string;
			participationStatus?: ParticipationStatus | null;
		},
	): ResultAsync<
		{ signUps: EventSignUp[]; total: number },
		| UnauthorizedError
		| PermissionDeniedError
		| InvalidArgumentError
		| NotFoundError
		| InternalServerError
	>;
	getApproximatePositionOnWaitingList(
		ctx: Context,
		params: { eventId: string },
	): ResultAsync<
		{ position: number },
		| InternalServerError
		| NotFoundError
		| UnauthorizedError
		| InvalidArgumentError
	>;
	removeSignUp(
		ctx: Context,
		params: { signUpId: string },
	): ResultAsync<
		{ signUp: EventSignUp },
		| InternalServerError
		| InvalidArgumentError
		| UnauthorizedError
		| PermissionDeniedError
		| NotFoundError
	>;
}

interface IListingService {
	get(id: string): Promise<Listing>;
	findMany(params?: { organizationId?: string | null }): Promise<Listing[]>;
	create(
		ctx: Context,
		data: {
			name: string;
			description?: string | null;
			applicationUrl?: string | null;
			closesAt: Date;
			organizationId: string;
		},
	): Promise<Listing>;
	update(
		ctx: Context,
		id: string,
		data: Partial<{
			name: string | null;
			description: string | null;
			applicationUrl: string | null;
			closesAt: Date | null;
		}>,
	): Promise<Listing>;
	delete(ctx: Context, id: string): Promise<Listing>;
}

type IProductService = {
	payments: {
		initiatePaymentAttempt(
			ctx: Context,
			params: { orderId: string; returnUrl: string },
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
			| DownstreamServiceError
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
		get(
			ctx: Context,
			params: { reference: string },
		): ResultAsync<
			{ paymentAttempt: PaymentAttemptType | null },
			InternalServerError
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

interface IFileService {
	createFileUploadUrl(
		ctx: Context,
		params: { extension: string },
	): ResultAsync<
		{ file: FileType; url: string },
		| DownstreamServiceError
		| InternalServerError
		| UnauthorizedError
		| InvalidArgumentError
	>;
	createFileDownloadUrl(
		ctx: Context,
		params: { id: string },
	): ResultAsync<
		{ url: string; file: FileType },
		| InternalServerError
		| NotFoundError
		| DownstreamServiceError
		| InvalidArgumentError
	>;
	getFile(
		ctx: Context,
		params: { id: string },
	): ResultAsync<{ file: RemoteFile }, NotFoundError | InternalServerError>;
}

type UserContext = {
	user: User | null;
};

type Services = {
	users: IUserService;
	auth: IAuthService;
	organizations: IOrganizationService;
	events: IEventService;
	listings: IListingService;
	cabins: ICabinService;
	products: IProductService;
	files: IFileService;
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
	const fileRepository = FileRepository({ db: database });

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

	const userService = new UserService(userRepository, mailService);

	const organizationService = OrganizationService({
		organizationRepository,
		memberRepository,
		userService,
	});

	const { permissions: permissionService } = organizationService;

	const listingService = new ListingService(
		listingRepository,
		permissionService,
	);
	const cabinService = new CabinService(
		cabinRepository,
		mailService,
		permissionService,
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
	const blobServiceClient = new BlobServiceClient(
		`https://${env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
		new DefaultAzureCredential({
			managedIdentityClientId: env.AZURE_MANAGED_IDENTITY_CLIENT_ID,
		}),
	);

	const blobStorageAdapter = BlobStorageAdapter({
		accountName: env.AZURE_STORAGE_ACCOUNT_NAME,
		containerName: env.AZURE_STORAGE_CONTAINER_NAME,
		blobServiceClient,
	});
	const fileService = FileService({ fileRepository, blobStorageAdapter });

	const services: Services = {
		users: userService,
		auth: authService,
		organizations: organizationService,
		events: eventService,
		listings: listingService,
		cabins: cabinService,
		products: productService,
		files: fileService,
	};

	await serverInstance.register(fastifyService, { services });
	await serverInstance.register(fastifyBullBoardPlugin, {
		prefix: "/admin/queues",
	});
	return services;
}

export { registerServices, startServer };
export type {
	ServerDependencies,
	Services,
	ICabinService,
	NewBookingParams,
	IOrganizationService,
	IFileService,
};
