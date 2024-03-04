import type { Client } from "@vippsmobilepay/sdk";
import { mockDeep } from "jest-mock-extended";
import type { ServerClient } from "postmark";
import { newMockOpenIdClient } from "~/__tests__/mocks/openIdClient.js";
import { env } from "~/config.js";
import prisma from "~/lib/prisma.js";
import type { Services } from "~/lib/server.js";
import { CabinRepository } from "~/repositories/cabins/repository.js";
import { EventRepository } from "~/repositories/events/index.js";
import { ListingRepository } from "~/repositories/listings/repository.js";
import { MemberRepository } from "~/repositories/organizations/members.js";
import { OrganizationRepository } from "~/repositories/organizations/organizations.js";
import { ProductRepository } from "~/repositories/products/repository.js";
import { UserRepository } from "~/repositories/users/index.js";
import { AuthService } from "~/services/auth/index.js";
import { CabinService } from "~/services/cabins/index.js";
import { EventService } from "~/services/events/service.js";
import type { SignUpQueueType } from "~/services/events/worker.js";
import { ListingService } from "~/services/listings/service.js";
import { buildMailService } from "~/services/mail/index.js";
import type { EmailQueueType } from "~/services/mail/worker.js";
import { OrganizationService } from "~/services/organizations/index.js";
import { ProductService } from "~/services/products/service.js";
import type { PaymentProcessingQueueType } from "~/services/products/worker.js";
import { UserService } from "~/services/users/service.js";

export function makeTestServices(
	overrides?: Partial<Services>,
): Services & { openIdClient: ReturnType<typeof newMockOpenIdClient> } {
	const openIdClient = newMockOpenIdClient();
	const database = prisma;

	const cabinRepository = new CabinRepository(database);
	const userRepository = new UserRepository(database);
	const memberRepository = new MemberRepository(database);
	const organizationRepository = new OrganizationRepository(database);
	const eventRepository = new EventRepository(database);
	const listingRepository = new ListingRepository(database);
	const productRepository = new ProductRepository(database);

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
	const cabinService = new CabinService(
		cabinRepository,
		mailService,
		organizationService.permissions,
	);

	const products = ProductService({
		vippsFactory: mockDeep<typeof Client>(),
		paymentProcessingQueue: mockDeep<PaymentProcessingQueueType>(),
		productRepository,
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

	const services: Services = {
		users: userService,
		auth: authService,
		organizations: organizationService,
		events: eventService,
		listings: listingService,
		cabins: cabinService,
		products,
	};

	return {
		openIdClient,
		...services,
		...overrides,
	};
}
