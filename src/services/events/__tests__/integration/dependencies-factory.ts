import { faker } from "@faker-js/faker";
import type { Organization } from "@prisma/client";
import { mockDeep } from "jest-mock-extended";
import type { ServerClient } from "postmark";
import { env } from "~/config.js";
import type { User } from "~/domain/users.js";
import prisma from "~/lib/prisma.js";
import { EventRepository } from "~/repositories/events/repository.js";
import { MemberRepository } from "~/repositories/organizations/members.js";
import { OrganizationRepository } from "~/repositories/organizations/organizations.js";
import { UserRepository } from "~/repositories/users/index.js";
import { buildMailService } from "~/services/mail/index.js";
import type { EmailQueueType } from "~/services/mail/worker.js";
import { PermissionService } from "~/services/permissions/service.js";
import { UserService } from "~/services/users/service.js";
import { EventService, type ProductService } from "../../service.js";
import type { SignUpQueueType } from "../../worker.js";
import { OrganizationService } from "~/services/organizations/service.js";

export function makeDependencies() {
	const eventRepository = new EventRepository(prisma);
	const organizationRepository = new OrganizationRepository(prisma);
	const memberRepository = new MemberRepository(prisma);
	const userRepository = new UserRepository(prisma);
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
	const userService = new UserService(
		userRepository,
		permissionService,
		mailService,
	);
	const eventService = new EventService(
		eventRepository,
		permissionService,
		userService,
		mockDeep<ProductService>(),
		mockDeep<SignUpQueueType>(),
	);
	return { eventService, userService, organizationService };
}

export async function makeUserWithOrganizationMembership(
	userData: Partial<User> = {},
): Promise<{ user: User; organization: Organization }> {
	const { userService, organizationService } = makeDependencies();
	const user = await userService.create({
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		username: faker.string.sample(30),
		feideId: faker.string.uuid(),
		email: faker.internet.exampleEmail({ firstName: faker.string.uuid() }),
		...userData,
	});

	const organization = await organizationService.create(user.id, {
		name: faker.string.sample(20),
	});
	return { user, organization };
}
