import assert from "node:assert";
import { faker } from "@faker-js/faker";
import { mockDeep } from "jest-mock-extended";
import { DateTime } from "luxon";
import type { ServerClient } from "postmark";
import { env } from "~/config.js";
import type { Organization } from "~/domain/organizations.js";
import type { IUser, User } from "~/domain/users.js";
import { type Context, makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import { EventRepository } from "~/repositories/events/index.js";
import { MemberRepository } from "~/repositories/organizations/members.js";
import { OrganizationRepository } from "~/repositories/organizations/organizations.js";
import { ProductRepository } from "~/repositories/products/repository.js";
import { UserRepository } from "~/repositories/users/index.js";
import { buildMailService } from "~/services/mail/index.js";
import type { EmailQueueType } from "~/services/mail/worker.js";
import { OrganizationService } from "~/services/organizations/service.js";
import { MockVippsClientFactory } from "~/services/products/__tests__/mock-vipps-client.js";
import { ProductService } from "~/services/products/service.js";
import type { PaymentProcessingQueueType } from "~/services/products/worker.js";
import { UserService } from "~/services/users/service.js";
import { EventService } from "../../service.js";
import type { SignUpQueueType } from "../../worker.js";

export function makeServices() {
	const eventRepository = new EventRepository(prisma);
	const organizationRepository = new OrganizationRepository(prisma);
	const memberRepository = new MemberRepository(prisma);
	const userRepository = new UserRepository(prisma);
	const productRepository = new ProductRepository(prisma);

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
		organizationRepository,
		memberRepository,
		userService,
	});
	const permissionService = organizationService.permissions;

	const vipps = MockVippsClientFactory();
	const productService = ProductService({
		productRepository,
		mailService,
		paymentProcessingQueue: mockDeep<PaymentProcessingQueueType>(),
		vippsFactory: vipps.factory,
		config: {
			returnUrl: "https://example.com",
			useTestMode: true,
		},
	});
	const eventService = new EventService(
		eventRepository,
		permissionService,
		userService,
		productService,
		mockDeep<SignUpQueueType>(),
	);
	return { eventService, userService, organizationService, productService };
}

export async function makeUserWithOrganizationMembership(
	userData: Partial<Omit<IUser, "enrolledStudyPrograms">> = {},
): Promise<{ user: User; organization: Organization }> {
	const { userService, organizationService } = makeServices();
	const user = await userService.create({
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		username: faker.string.sample(30),
		feideId: faker.string.uuid(),
		email: faker.internet.exampleEmail({ firstName: faker.string.uuid() }),
		...userData,
	});

	const organization = await organizationService.organizations.create(
		makeMockContext(user),
		{
			name: faker.string.sample(20),
		},
	);
	return { user, organization };
}

async function makeDependencies(
	params: {
		capacity: number;
		retractable?: boolean;
		signUpsEndAt?: Date;
		signUpsStartAt?: Date;
		signUpsEnabled?: boolean;
		slots?: { capacity: number; gradeYears?: number[] | null }[];
	},
	userParams?: Partial<User> | null,
) {
	const { eventService, ...rest } = makeServices();
	const { user, organization } = await makeUserWithOrganizationMembership(
		userParams ?? undefined,
	);
	const ctx = makeMockContext(user);
	const createEvent = await eventService.create(ctx, {
		type: "SIGN_UPS",
		event: {
			organizationId: organization.id,
			name: faker.word.adjective(),
			startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
			endAt: DateTime.now().plus({ days: 2 }).toJSDate(),
			signUpsEnabled: params.signUpsEnabled ?? true,
			capacity: params.capacity,
			signUpsEndAt:
				params.signUpsEndAt ?? DateTime.now().plus({ days: 1 }).toJSDate(),
			signUpsStartAt:
				params.signUpsStartAt ?? DateTime.now().minus({ days: 1 }).toJSDate(),
			signUpsRetractable: params.retractable ?? true,
		},
		slots: params.slots ?? [
			{
				capacity: params.capacity,
			},
		],
	});

	if (!createEvent.ok) throw createEvent.error;
	const { event } = createEvent.data;

	return { ctx, user, event, organization, eventService, ...rest };
}

async function makeSignUp(
	ctx: Context,
	params: { userId?: string; eventId: string },
) {
	const { eventService } = makeServices();
	const { userId, eventId } = params;
	const signUp = await eventService.signUp(ctx, {
		userId,
		eventId,
	});
	if (!signUp.ok) throw signUp.error;
	return signUp.data.signUp;
}

async function mustGetEvent(id: string) {
	const { eventService } = makeServices();
	const event = await eventService.get(id);
	return event;
}

async function mustGetSlot(ctx: Context, eventId: string) {
	const { eventService } = makeServices();
	const slotsResult = await eventService.getSlots(ctx, {
		eventId,
	});
	if (!slotsResult.ok) throw slotsResult.error;
	const slot = slotsResult.data.slots[0];
	assert(slot !== undefined);
	return slot;
}

export { makeDependencies, makeSignUp, mustGetEvent, mustGetSlot };
