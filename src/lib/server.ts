import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import * as Sentry from "@sentry/node";
import { Client } from "@vippsmobilepay/sdk";
import type { Job } from "bullmq";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TokenSet, UserinfoResponse } from "openid-client";
import { BlobStorageAdapter } from "~/adapters/azure-blob-storage.js";
import { type Configuration, env } from "~/config.js";
import type {
	Booking,
	BookingContact,
	BookingSemester,
	BookingSemesterEnumType,
	BookingStatusType,
	BookingTerms,
	BookingType,
	Cabin,
	CalendarMonth,
} from "~/domain/cabins.js";
import type { DocumentService as DocumentServiceType } from "~/domain/documents.js";
import {
	type AuthenticationError,
	type BadRequestError,
	type DownstreamServiceError,
	InternalServerError,
	type InvalidArgumentError,
	type InvalidArgumentErrorV2,
	type NotFoundError,
	type PermissionDeniedError,
	type UnauthorizedError,
} from "~/domain/errors.js";
import type {
	CategoryType,
	EventParticipationStatusType,
	EventSignUp,
	EventType,
	SignUpAvailability,
	SlotType,
} from "~/domain/events/index.js";
import type { FileType, RemoteFile } from "~/domain/files.js";
import type { Listing } from "~/domain/listings.js";
import type {
	FeaturePermissionType,
	Organization,
	OrganizationMember,
	OrganizationRoleType,
} from "~/domain/organizations.js";
import type {
	MerchantType,
	OrderType,
	PaymentAttemptType,
	ProductType,
} from "~/domain/products.js";
import type { StudyProgram, User } from "~/domain/users.js";
import type { Context } from "~/lib/context.js";
import { CabinRepository } from "~/repositories/cabins/index.js";
import { DocumentRepository } from "~/repositories/documents/index.js";
import { EventRepository } from "~/repositories/events/index.js";
import { FileRepository } from "~/repositories/files/index.js";
import { ListingRepository } from "~/repositories/listings/repository.js";
import { MemberRepository } from "~/repositories/organizations/members.js";
import { OrganizationRepository } from "~/repositories/organizations/organizations.js";
import { ProductRepository } from "~/repositories/products/repository.js";
import { UserRepository } from "~/repositories/users/index.js";
import { feideClient } from "~/services/auth/clients.js";
import { AuthService } from "~/services/auth/index.js";
import type { FeideUserInfo } from "~/services/auth/service.js";
import { CabinService } from "~/services/cabins/index.js";
import { DocumentService } from "~/services/documents/index.js";
import {
	type CreateEventParams,
	EventService,
} from "~/services/events/index.js";
import type { UpdateEventParams } from "~/services/events/service.js";
import { SignUpQueueName } from "~/services/events/worker.js";
import { FileService } from "~/services/files/index.js";
import { ListingService } from "~/services/listings/index.js";
import { buildMailService } from "~/services/mail/index.js";
import { EmailQueueName } from "~/services/mail/worker.js";
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
import type { ResultAsync, TResult } from "./result.js";

interface IOrganizationService {
	organizations: {
		create(
			ctx: Context,
			data: {
				name: string;
				description?: string | null;
				featurePermissions?: FeaturePermissionType[] | null;
				colorScheme?: string | null;
			},
		): Promise<Organization>;
		update(
			ctx: Context,
			organizationId: string,
			data: Partial<{
				name: string | null;
				description: string | null;
				featurePermissions: FeaturePermissionType[] | null;
				logoFileId: string | null;
				colorScheme: string | null;
			}>,
		): Promise<Organization>;
		get(id: string): Promise<Organization>;
		findMany(data?: { userId?: string }): Promise<Organization[]>;
	};
	members: {
		addMember(
			ctx: Context,
			data:
				| {
						userId: string;
						organizationId: string;
						role: OrganizationRoleType;
				  }
				| {
						email: string;
						organizationId: string;
						role: OrganizationRoleType;
				  },
		): ResultAsync<
			{ member: OrganizationMember },
			| PermissionDeniedError
			| UnauthorizedError
			| InvalidArgumentErrorV2
			| NotFoundError
			| InternalServerError
		>;
		removeMember(
			ctx: Context,
			params: { memberId: string },
		): ResultAsync<
			{ member: OrganizationMember },
			InvalidArgumentError | PermissionDeniedError | UnauthorizedError
		>;
		findMany(
			ctx: Context,
			params: { organizationId: string },
		): ResultAsync<
			{ members: OrganizationMember[] },
			PermissionDeniedError | UnauthorizedError
		>;
		updateRole(
			ctx: Context,
			params: { memberId: string; newRole: OrganizationRoleType },
		): ResultAsync<
			{ member: OrganizationMember },
			| PermissionDeniedError
			| UnauthorizedError
			| InternalServerError
			| InvalidArgumentErrorV2
			| NotFoundError
		>;
	};
	permissions: {
		hasFeaturePermission(
			ctx: Context,
			data: {
				featurePermission: FeaturePermissionType;
			},
		): Promise<boolean>;
		hasRole(
			ctx: Context,
			data: {
				organizationId: string;
				role: OrganizationRoleType;
				featurePermission?: FeaturePermissionType;
			},
		): Promise<boolean>;
	};
}

interface IAuthService {
	logout(req: FastifyRequest): Promise<void>;
	login(req: FastifyRequest, user: User): Promise<User>;
	generateAuthorizationUrl(
		req: FastifyRequest,
		params: {
			redirectUri: "/auth/login/callback" | "/auth/study-program/callback";
			returnTo?: string;
		},
	): TResult<
		{ authorizationUrl: string },
		InternalServerError | BadRequestError
	>;
	getAuthorizationToken(
		req: FastifyRequest,
		params: {
			code: string;
			redirectUri: "/auth/login/callback" | "/auth/study-program/callback";
		},
	): ResultAsync<{ token: TokenSet }, DownstreamServiceError | BadRequestError>;
	getUserInfo(
		req: FastifyRequest,
		params: { token: TokenSet },
	): ResultAsync<
		{ userInfo: UserinfoResponse<FeideUserInfo> },
		DownstreamServiceError
	>;
	getOrCreateUser(
		req: FastifyRequest,
		{ userInfo }: { userInfo: UserinfoResponse<FeideUserInfo> },
	): ResultAsync<
		{ user: User },
		InternalServerError | AuthenticationError | DownstreamServiceError
	>;
	updateStudyProgramForUser(
		req: FastifyRequest,
		params: { token: TokenSet },
	): ResultAsync<
		{ studyProgram: StudyProgram | null },
		DownstreamServiceError | UnauthorizedError
	>;
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
			enrolledStudyPrograms?: StudyProgram[] | null;
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
	create(
		data: Pick<
			User,
			"firstName" | "lastName" | "email" | "username" | "feideId"
		> &
			Partial<
				Pick<
					User,
					| "allergies"
					| "graduationYear"
					| "isSuperUser"
					| "phoneNumber"
					| "confirmedStudyProgramId"
				>
			>,
	): Promise<User>;
	getStudyProgram(
		by: { id: string } | { externalId: string },
	): Promise<StudyProgram | null>;
	createStudyProgram(studyProgram: {
		name: string;
		externalId: string;
	}): Promise<StudyProgram>;
	findManyStudyPrograms(
		ctx: Context,
	): ResultAsync<
		{ studyPrograms: StudyProgram[] },
		InternalServerError | UnauthorizedError
	>;
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
		InvalidArgumentErrorV2 | InternalServerError
	>;
	updateBookingStatus(
		ctx: Context,
		params: {
			bookingId: string;
			status: BookingStatusType;
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
			semester: BookingSemesterEnumType;
			startAt?: Date | null;
			endAt?: Date | null;
			bookingsEnabled?: boolean | null;
		},
	): Promise<BookingSemester>;
	getBookingSemester(
		semester: BookingSemesterEnumType,
	): Promise<BookingSemester | null>;
	getBookingContact(): Promise<
		Pick<BookingContact, "email" | "name" | "phoneNumber" | "id" | "updatedAt">
	>;
	updateBookingContact(
		ctx: Context,
		data: Partial<{
			name: string | null;
			phoneNumber: string | null;
			email: string | null;
		}>,
	): Promise<
		Pick<BookingContact, "email" | "name" | "phoneNumber" | "id" | "updatedAt">
	>;
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
		| InvalidArgumentErrorV2
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
		params?: { bookingStatus?: BookingStatusType | null } | null,
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
			guests: {
				internal: number;
				external: number;
			};
		},
	): ResultAsync<
		{
			calendarMonths: CalendarMonth[];
		},
		InternalServerError
	>;
	updateCabin(
		ctx: Context,
		params: { id: string } & Partial<{
			capacity: number | null;
			internalPrice: number | null;
			externalPrice: number | null;
			internalPriceWeekend: number | null;
			externalPriceWeekend: number | null;
			name: string | null;
		}>,
	): ResultAsync<
		{ cabin: Cabin },
		| InternalServerError
		| InvalidArgumentErrorV2
		| UnauthorizedError
		| PermissionDeniedError
		| NotFoundError
	>;
	updateBookingTerms(
		ctx: Context,
	): ResultAsync<
		{ bookingTerms: BookingTerms; uploadUrl: string },
		| DownstreamServiceError
		| InternalServerError
		| UnauthorizedError
		| PermissionDeniedError
		| InvalidArgumentErrorV2
	>;
	getBookingTerms(
		ctx: Context,
		params?: { id?: string | null } | null,
	): ResultAsync<
		{ bookingTerms: BookingTerms },
		NotFoundError | InternalServerError
	>;
	getBookingByIdAndEmail(
		ctx: Context,
		params: { id: string; email: string },
	): ResultAsync<{ booking: Booking }, NotFoundError | InternalServerError>;
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
			participationStatus?: EventParticipationStatusType | null;
		} | null,
	): ResultAsync<
		{ signUps: EventSignUp[]; total: number },
		UnauthorizedError | InternalServerError
	>;
	findManySignUps(
		ctx: Context,
		params: {
			eventId: string;
			participationStatus?: EventParticipationStatusType | null;
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
		findMany(
			ctx: Context,
		): ResultAsync<
			{ merchants: MerchantType[]; total: number },
			UnauthorizedError | InternalServerError
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
	downloadFileToBuffer(
		ctx: Context,
		params: { id: string },
	): ResultAsync<
		{ buffer: Buffer },
		NotFoundError | DownstreamServiceError | InternalServerError
	>;
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
	documents: DocumentServiceType;
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
			Sentry.captureException(err, {
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
	Sentry.setupFastifyErrorHandler(serverInstance);
	Sentry.setTag("server", "service");
	await serverInstance.register(fastifyPrisma, { client: prisma });
	const database = serverInstance.database;
	database.$on("error", (e) => {
		serverInstance.log.child({ service: "prisma" }).error(e);
	});
	database.$on("warn", (e) => {
		serverInstance.log.child({ service: "prisma" }).warn(e);
	});
	database.$on("info", (e) => {
		serverInstance.log.child({ service: "prisma" }).info(e);
	});
	database.$on("query", (e) => {
		serverInstance.log.child({ service: "prisma" }).debug(e);
	});

	const cabinRepository = new CabinRepository(database);
	const userRepository = new UserRepository(database);
	const memberRepository = new MemberRepository(database);
	const organizationRepository = new OrganizationRepository(database);
	const eventRepository = new EventRepository(database);
	const listingRepository = new ListingRepository(database);
	const productRepository = new ProductRepository(database);
	const fileRepository = FileRepository({ db: database });
	const documentRepository = DocumentRepository({ db: database });

	await serverInstance.register(fastifyMessageQueue, {
		name: EmailQueueName,
	});

	if (!serverInstance.queues.email) {
		throw new InternalServerError("Email queue not initialized");
	}

	const mailService = buildMailService(
		{
			emailQueue: serverInstance.queues[EmailQueueName],
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
		mailService,
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

	const cabinService = new CabinService(
		cabinRepository,
		mailService,
		permissionService,
		fileService,
	);

	const documentService = DocumentService({
		files: fileService,
		permissions: permissionService,
		repository: documentRepository,
	});

	const services: Services = {
		users: userService,
		auth: authService,
		organizations: organizationService,
		events: eventService,
		listings: listingService,
		cabins: cabinService,
		products: productService,
		files: fileService,
		documents: documentService,
	};

	await serverInstance.register(fastifyService, { services });
	await serverInstance.register(fastifyBullBoardPlugin, {
		prefix: "/admin/queues",
	});

	// biome-ignore lint/suspicious/useAwait: async hooks
	serverInstance.addHook("onReady", async () => {
		Sentry.addIntegration(Sentry.anrIntegration({ captureStackTrace: true }));
	});
	return services;
}

export { registerServices, startServer };
export type {
	ICabinService,
	IFileService,
	IOrganizationService,
	IUserService,
	NewBookingParams,
	Services,
	IProductService,
};
