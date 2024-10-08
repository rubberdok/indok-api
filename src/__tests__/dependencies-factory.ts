import type { BlobServiceClient } from "@azure/storage-blob";
import { faker } from "@faker-js/faker";
import type { Client } from "@vippsmobilepay/sdk";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { merge, pick } from "lodash-es";
import { DateTime } from "luxon";
import type { ServerClient } from "postmark";
import { newMockOpenIdClient } from "~/__tests__/mocks/openIdClient.js";
import { BlobStorageAdapter } from "~/adapters/azure-blob-storage.js";
import { env } from "~/config.js";
import { User } from "~/domain/users.js";
import prisma from "~/lib/prisma.js";
import type { Services } from "~/lib/server.js";
import { CabinRepository } from "~/repositories/cabins/repository.js";
import { DocumentRepository } from "~/repositories/documents/repository.js";
import { EventRepository } from "~/repositories/events/index.js";
import { FileRepository } from "~/repositories/files/repository.js";
import { ListingRepository } from "~/repositories/listings/repository.js";
import { MemberRepository } from "~/repositories/organizations/members.js";
import { OrganizationRepository } from "~/repositories/organizations/organizations.js";
import { ProductRepository } from "~/repositories/products/repository.js";
import { UserRepository } from "~/repositories/users/index.js";
import { AuthService } from "~/services/auth/index.js";
import type { OpenIDClient } from "~/services/auth/service.js";
import { CabinService } from "~/services/cabins/index.js";
import { DocumentService } from "~/services/documents/service.js";
import { EventService } from "~/services/events/service.js";
import type { SignUpQueueType } from "~/services/events/worker.js";
import { FileService } from "~/services/files/service.js";
import { ListingService } from "~/services/listings/service.js";
import { buildMailService } from "~/services/mail/index.js";
import type { EmailQueueType } from "~/services/mail/worker.js";
import { OrganizationService } from "~/services/organizations/index.js";
import { ProductService } from "~/services/products/service.js";
import type { PaymentProcessingQueueType } from "~/services/products/worker.js";
import { UserService } from "~/services/users/service.js";

export function makeTestServices(
	overrides?: Partial<Services & { openIdClient: OpenIDClient }>,
): Services & {
	mockBlobServiceClient: DeepMockProxy<BlobServiceClient>;
} {
	const openIdClient = overrides?.openIdClient ?? newMockOpenIdClient();
	const database = prisma;

	const cabinRepository = new CabinRepository(database);
	const userRepository = new UserRepository(database);
	const memberRepository = new MemberRepository(database);
	const organizationRepository = new OrganizationRepository(database);
	const eventRepository = new EventRepository(database);
	const listingRepository = new ListingRepository(database);
	const productRepository = new ProductRepository(database);
	const fileRepository = FileRepository({ db: database });
	const documentRepository = DocumentRepository({ db: database });

	const mailService = buildMailService(
		{
			emailClient: mockDeep<ServerClient>(),
			emailQueue: mockDeep<EmailQueueType>(),
		},
		{
			noReplyEmail: env.NO_REPLY_EMAIL,
			contactMail: env.CONTACT_EMAIL,
			companyName: env.COMPANY_NAME,
			parentCompany: env.PARENT_COMPANY,
			productName: env.PRODUCT_NAME,
			websiteUrl: env.CLIENT_URL,
		},
	);
	const userService = new UserService(userRepository, mailService);
	const organizationService = OrganizationService({
		memberRepository,
		organizationRepository,
		userService,
	});
	const listingService = new ListingService(
		listingRepository,
		organizationService.permissions,
	);

	const products = ProductService({
		vippsFactory: mockDeep<typeof Client>(),
		paymentProcessingQueue: mockDeep<PaymentProcessingQueueType>(),
		productRepository,
		mailService,
		config: {
			useTestMode: true,
			returnUrl: env.SERVER_URL,
		},
	});
	const eventService = new EventService(
		eventRepository,
		organizationService.permissions,
		userService,
		products,
		mockDeep<SignUpQueueType>(),
	);
	const authService = new AuthService(userService, openIdClient);
	const mockBlobServiceClient = mockDeep<BlobServiceClient>();

	mockBlobServiceClient.getUserDelegationKey.mockResolvedValue({
		value: faker.string.uuid(),
		signedExpiresOn: new Date(),
		signedObjectId: faker.string.uuid(),
		signedStartsOn: new Date(),
		signedService: faker.internet.url(),
		signedTenantId: faker.string.uuid(),
		signedVersion: faker.string.uuid(),
		_response: mock(),
	});
	const blobStorageAdapter = BlobStorageAdapter({
		accountName: "testaccount",
		containerName: "testcontainer",
		blobServiceClient: mockBlobServiceClient,
	});
	const fileService = FileService({ fileRepository, blobStorageAdapter });
	const documents = DocumentService({
		files: fileService,
		repository: documentRepository,
		permissions: organizationService.permissions,
	});

	const cabinService = new CabinService(
		cabinRepository,
		mailService,
		organizationService.permissions,
		fileService,
	);

	const services: Services = {
		users: userService,
		auth: authService,
		organizations: organizationService,
		events: eventService,
		listings: listingService,
		cabins: cabinService,
		products,
		files: fileService,
		documents: documents,
	};

	return {
		mockBlobServiceClient,
		...services,
		...overrides,
	};
}

function makeUser(userData: Partial<User> = {}): Promise<User> {
	const database = prisma;
	const userRepository = new UserRepository(database);
	const mailService = buildMailService(
		{
			emailClient: mockDeep<ServerClient>(),
			emailQueue: mockDeep<EmailQueueType>(),
		},
		{
			noReplyEmail: env.NO_REPLY_EMAIL,
			contactMail: env.CONTACT_EMAIL,
			companyName: env.COMPANY_NAME,
			parentCompany: env.PARENT_COMPANY,
			productName: env.PRODUCT_NAME,
			websiteUrl: env.CLIENT_URL,
		},
	);
	const userService = new UserService(userRepository, mailService);

	const user = new User(
		merge(
			{
				allergies: faker.word.adjective(),
				canUpdateYear: true,
				createdAt: new Date(),
				email: faker.internet.email({ firstName: faker.string.uuid() }),
				feideId: faker.string.uuid(),
				firstLogin: false,
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				graduationYear: DateTime.now().plus({ years: 1 }).year,
				graduationYearUpdatedAt: null,
				id: faker.string.uuid(),
				isSuperUser: false,
				lastLogin: new Date(),
				phoneNumber: faker.phone.number(),
				confirmedStudyProgramId: null,
				updatedAt: new Date(),
				username: faker.string.uuid(),
			},
			userData,
		),
	);
	const userCreateInput = pick(user, [
		"allergies",
		"email",
		"feideId",
		"firstName",
		"lastName",
		"graduationYear",
		"phoneNumber",
		"username",
	]);
	return userService.create(userCreateInput);
}

export { makeUser };
