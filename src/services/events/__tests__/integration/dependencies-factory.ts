import { faker } from "@faker-js/faker";
import type { Organization, User } from "@prisma/client";
import { mockDeep } from "jest-mock-extended";
import prisma from "~/lib/prisma.js";
import { EventRepository } from "~/repositories/events/repository.js";
import { MemberRepository } from "~/repositories/organizations/members.js";
import { OrganizationRepository } from "~/repositories/organizations/organizations.js";
import { UserRepository } from "~/repositories/users/index.js";
import type { MailQueue } from "~/services/mail/worker.js";
import { PermissionService } from "~/services/permissions/service.js";
import { UserService } from "~/services/users/service.js";
import { EventService } from "../../service.js";

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
	const userService = new UserService(
		userRepository,
		permissionService,
		mockDeep<MailQueue>(),
	);
	const eventService = new EventService(
		eventRepository,
		permissionService,
		userService,
	);
	return { eventService };
}

export async function makeUserWithOrganizationMembership(
	userData: Partial<User> = {},
): Promise<{ user: User; organization: Organization }> {
	const user = await prisma.user.create({
		data: {
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			username: faker.string.sample(30),
			feideId: faker.string.uuid(),
			email: faker.internet.exampleEmail({ firstName: faker.string.uuid() }),
			...userData,
		},
	});
	const organization = await prisma.organization.create({
		data: {
			name: faker.string.sample(20),
		},
	});
	await prisma.member.create({
		data: {
			organizationId: organization.id,
			userId: user.id,
			role: "MEMBER",
		},
	});
	return { user, organization };
}
