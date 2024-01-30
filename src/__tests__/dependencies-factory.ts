import type { Client } from "@vippsmobilepay/sdk";
import { mockDeep } from "jest-mock-extended";
import { newMockOpenIdClient } from "~/__tests__/mocks/openIdClient.js";
import { env } from "~/config.js";
import postmark from "~/lib/postmark.js";
import prisma from "~/lib/prisma.js";
import type { Services } from "~/lib/server.js";
import { CabinRepository } from "~/repositories/cabins/repository.js";
import { EventRepository } from "~/repositories/events/repository.js";
import { ListingRepository } from "~/repositories/listings/repository.js";
import { MemberRepository } from "~/repositories/organizations/members.js";
import { OrganizationRepository } from "~/repositories/organizations/organizations.js";
import { ProductRepository } from "~/repositories/products/repository.js";
import { UserRepository } from "~/repositories/users/index.js";
import { AuthService } from "~/services/auth/service.js";
import { CabinService } from "~/services/cabins/service.js";
import { EventService } from "~/services/events/service.js";
import type { SignUpQueueType } from "~/services/events/worker.js";
import { ListingService } from "~/services/listings/service.js";
import { MailService } from "~/services/mail/index.js";
import type { EmailQueueType } from "~/services/mail/worker.js";
import { OrganizationService } from "~/services/organizations/service.js";
import { PermissionService } from "~/services/permissions/service.js";
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

	const mailService = new MailService(postmark, {
		noReplyEmail: env.NO_REPLY_EMAIL,
		contactMail: env.CONTACT_EMAIL,
		companyName: env.COMPANY_NAME,
		parentCompany: env.PARENT_COMPANY,
		productName: env.PRODUCT_NAME,
		websiteUrl: env.CLIENT_URL,
	});
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
	const cabinService = new CabinService(
		cabinRepository,
		mailService,
		permissionService,
	);

	const userService = new UserService(
		userRepository,
		permissionService,
		mockDeep<EmailQueueType>(),
	);
	const eventService = new EventService(
		eventRepository,
		permissionService,
		userService,
		mockDeep<SignUpQueueType>(),
	);
	const authService = new AuthService(userService, openIdClient);
	const products = new ProductService(
		mockDeep<typeof Client>(),
		mockDeep<PaymentProcessingQueueType>(),
		productRepository,
		{
			useTestMode: true,
		},
	);
	const services: Services = {
		users: userService,
		auth: authService,
		organizations: organizationService,
		permissions: permissionService,
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
