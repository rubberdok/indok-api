import assert from "node:assert";
import { faker } from "@faker-js/faker";
import { QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { range } from "lodash-es";
import { DateTime } from "luxon";
import type { Logger } from "pino";
import type { ServerClient } from "postmark";
import { env } from "~/config.js";
import { Queue } from "~/lib/bullmq/queue.js";
import { Worker } from "~/lib/bullmq/worker.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import type { IOrganizationService } from "~/lib/server.js";
import { EventRepository } from "~/repositories/events/index.js";
import { MemberRepository } from "~/repositories/organizations/members.js";
import { OrganizationRepository } from "~/repositories/organizations/organizations.js";
import { UserRepository } from "~/repositories/users/index.js";
import { buildMailService } from "~/services/mail/index.js";
import {
	type CabinService,
	type EmailQueueType,
	type EmailWorkerType,
	getEmailHandler,
} from "~/services/mail/worker.js";
import { OrganizationService } from "~/services/organizations/service.js";
import { UserService } from "~/services/users/service.js";
import { EventService, type ProductService } from "../../service.js";
import {
	type SignUpQueueType,
	type SignUpWorkerType,
	getSignUpWorkerHandler,
} from "../../worker.js";

describe("EventService", () => {
	let redis: Redis;
	let emailQueue: EmailQueueType;
	let signUpQueue: SignUpQueueType;
	let eventService: EventService;
	let userService: UserService;
	let signUpWorker: SignUpWorkerType;
	let emailWorker: EmailWorkerType;
	let organizationService: IOrganizationService;
	let queueEventsRedis: Redis;
	let signUpQueueEvents: QueueEvents;
	let emailQueueEvents: QueueEvents;
	let mailClient: DeepMockProxy<ServerClient>;

	beforeAll(async () => {
		redis = new Redis(env.REDIS_CONNECTION_STRING, {
			maxRetriesPerRequest: 0,
		});
		queueEventsRedis = new Redis(env.REDIS_CONNECTION_STRING, {
			maxRetriesPerRequest: 0,
		});

		const emailQueueName = faker.string.uuid();
		const signUpQueueName = faker.string.uuid();

		emailQueue = new Queue(emailQueueName, { connection: redis });
		signUpQueue = new Queue(signUpQueueName, { connection: redis });

		mailClient = mockDeep<ServerClient>();
		const mailService = buildMailService(
			{
				emailQueue,
				emailClient: mailClient,
			},
			{
				companyName: "test",
				contactMail: faker.internet.email(),
				noReplyEmail: env.NO_REPLY_EMAIL,
				productName: "test",
				parentCompany: "test",
				websiteUrl: env.CLIENT_URL,
			},
		);
		const userRepository = new UserRepository(prisma);
		const organizationRepository = new OrganizationRepository(prisma);
		const memberRepository = new MemberRepository(prisma);
		const eventRepository = new EventRepository(prisma);
		userService = new UserService(userRepository, mailService);
		organizationService = OrganizationService({
			memberRepository,
			organizationRepository,
			userService,
		});
		const permissionService = organizationService.permissions;
		const productService = mockDeep<ProductService>();
		eventService = new EventService(
			eventRepository,
			permissionService,
			userService,
			productService,
			signUpQueue,
		);

		const emailWorkerHandler = getEmailHandler({
			eventService,
			userService,
			mailService,
			cabinService: mockDeep<CabinService>(),
			productService: mock(),
			fileService: mock(),
			logger: mock(),
		});

		const signUpWorkerHandler = getSignUpWorkerHandler({
			events: eventService,
			mailService,
			log: mockDeep<Logger>(),
		});

		emailWorker = new Worker(emailQueueName, emailWorkerHandler.handler, {
			connection: redis,
		});
		signUpWorker = new Worker(signUpQueueName, signUpWorkerHandler.handler, {
			connection: redis,
		});
		signUpQueueEvents = new QueueEvents(signUpQueueName, {
			connection: queueEventsRedis,
		});
		emailQueueEvents = new QueueEvents(emailQueueName, {
			connection: queueEventsRedis,
		});
		await emailWorker.waitUntilReady();
		await signUpWorker.waitUntilReady();
		await signUpQueue.waitUntilReady();
		await emailQueue.waitUntilReady();
		await signUpQueueEvents.waitUntilReady();
		await emailQueueEvents.waitUntilReady();
	});

	afterAll(async () => {
		await emailQueue.close();
		await signUpQueue.close();
		await signUpWorker.close(true);
		await emailWorker.close(true);
		await signUpQueueEvents.close();
		await emailQueueEvents.close();
		redis.disconnect();
		queueEventsRedis.disconnect();
	});

	describe("#retractSignUp", () => {
		it("should promote the first user on the wait list, and send them an email", async () => {
			/**
			 * Create two users, one event, and sign up both users for the event.
			 * The first should be CONFIRMED, the second should be WAIT_LIST.
			 */
			const eventOwner = await userService.create({
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				username: faker.string.uuid(),
				email: faker.internet.email({ firstName: faker.string.uuid() }),
				feideId: faker.string.uuid(),
			});
			const confirmedUser = await userService.create({
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				username: faker.string.uuid(),
				email: faker.internet.email({ firstName: faker.string.uuid() }),
				feideId: faker.string.uuid(),
				graduationYear: DateTime.now().year + 2,
			});
			const waitListUser = await userService.create({
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				username: faker.string.uuid(),
				email: faker.internet.email({ firstName: faker.string.uuid() }),
				feideId: faker.string.uuid(),
				graduationYear: DateTime.now().year + 2,
			});

			const organization = await organizationService.organizations.create(
				makeMockContext(eventOwner),
				{
					name: faker.string.sample(20),
				},
			);

			const createEvent = await eventService.create(
				makeMockContext(eventOwner),
				{
					event: {
						organizationId: organization.id,
						name: faker.string.sample(20),
						startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
						signUpsEnabled: true,
						capacity: 1,
						signUpsStartAt: faker.date.past(),
						signUpsEndAt: faker.date.future(),
						signUpsRetractable: true,
					},
					slots: [{ capacity: 1, gradeYears: [1, 2, 3, 4, 5] }],
					type: "SIGN_UPS",
				},
			);

			if (!createEvent.ok) throw createEvent.error;
			let event = createEvent.data.event;

			const ctx = makeMockContext(confirmedUser);
			const confirmedSignUp = await eventService.signUp(ctx, {
				userId: confirmedUser.id,
				eventId: event.id,
			});
			if (!confirmedSignUp.ok) throw confirmedSignUp.error;
			const waitListSignUp = await eventService.signUp(
				makeMockContext(waitListUser),
				{
					userId: waitListUser.id,
					eventId: event.id,
				},
			);
			if (!waitListSignUp.ok) throw waitListSignUp.error;

			expect(confirmedSignUp.data.signUp.participationStatus).toBe("CONFIRMED");
			expect(waitListSignUp.data.signUp.participationStatus).toBe(
				"ON_WAITLIST",
			);
			event = await eventService.get(event.id);
			assert(event.type === "SIGN_UPS");
			expect(event.remainingCapacity).toBe(0);

			/**
			 * Act
			 *
			 * Retract the confirmed user's sign up, and wait for jobs to finish
			 */
			await eventService.retractSignUp(makeMockContext(confirmedUser), {
				eventId: event.id,
			});
			const signUpJobs = await signUpQueue.getJobs();
			await Promise.all(
				signUpJobs.map((job) =>
					job
						.waitUntilFinished(signUpQueueEvents)
						.then((res) => expect(res.ok).toBe(true)),
				),
			);
			const emailJobs = await emailQueue.getJobs();
			await Promise.all(
				emailJobs.map((job) => job.waitUntilFinished(emailQueueEvents)),
			);

			event = await eventService.get(event.id);
			assert(event.type === "SIGN_UPS");
			expect(event.remainingCapacity).toBe(0);

			/**
			 * Assert
			 *
			 * The confirmed user's sign up should be cancelled, and the wait list user should be promoted
			 * to confirmed.
			 * The promoted user should receive an email.
			 */
			const retractedSignUp = await eventService.getSignUpAvailability(
				makeMockContext(confirmedUser),
				{
					eventId: event.id,
				},
			);
			expect(retractedSignUp).toBe("WAITLIST_AVAILABLE");
			const promotedSignUp = await eventService.getSignUpAvailability(
				makeMockContext(waitListUser),
				{ eventId: event.id },
			);
			expect(promotedSignUp).toBe("CONFIRMED");
			expect(mailClient.sendEmailWithTemplate).toHaveBeenCalledWith(
				expect.objectContaining({
					To: waitListUser.email,
					From: env.NO_REPLY_EMAIL,
					TemplateAlias: "event-wait-list",
					TemplateModel: expect.objectContaining({
						event: expect.objectContaining({
							name: event.name,
							startAt: expect.any(String),
						}),
						actionUrl: `${env.CLIENT_URL}/events/${event.id}`,
					}),
				}),
			);
		});

		it("stress test", async () => {
			/**
			 * Create two users, one event, and sign up both users for the event.
			 * The first should be CONFIRMED, the second should be WAIT_LIST.
			 */
			const eventOwner = await userService.create({
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				username: faker.string.uuid(),
				email: faker.internet.email({ firstName: faker.string.uuid() }),
				feideId: faker.string.uuid(),
			});
			const confirmedUsers = await Promise.all(
				range(0, 20).map(
					async () =>
						await userService.create({
							firstName: faker.person.firstName(),
							lastName: faker.person.lastName(),
							username: faker.string.uuid(),
							email: faker.internet.email({ firstName: faker.string.uuid() }),
							feideId: faker.string.uuid(),
							graduationYear: DateTime.now().year + 2,
						}),
				),
			);
			const waitListUsers = await Promise.all(
				range(0, 20).map(
					async () =>
						await userService.create({
							firstName: faker.person.firstName(),
							lastName: faker.person.lastName(),
							username: faker.string.uuid(),
							email: faker.internet.email({ firstName: faker.string.uuid() }),
							feideId: faker.string.uuid(),
							graduationYear: DateTime.now().year + 2,
						}),
				),
			);

			const shouldRemainOnWaitListUsers = await Promise.all(
				range(0, 20).map(
					async () =>
						await userService.create({
							firstName: faker.person.firstName(),
							lastName: faker.person.lastName(),
							username: faker.string.uuid(),
							email: faker.internet.email({ firstName: faker.string.uuid() }),
							feideId: faker.string.uuid(),
							graduationYear: DateTime.now().year + 2,
						}),
				),
			);

			const organization = await organizationService.organizations.create(
				makeMockContext(eventOwner),
				{
					name: faker.string.sample(20),
				},
			);

			const createEvent = await eventService.create(
				makeMockContext(eventOwner),
				{
					event: {
						organizationId: organization.id,
						name: faker.string.sample(20),
						startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
						signUpsEnabled: true,

						capacity: 20,
						signUpsStartAt: faker.date.past(),
						signUpsEndAt: faker.date.future(),
						signUpsRetractable: true,
					},
					slots: [
						{ capacity: 10, gradeYears: [1, 2, 3, 4, 5] },
						{ capacity: 10, gradeYears: [1, 2, 3, 4, 5] },
					],
					type: "SIGN_UPS",
				},
			);

			assert(createEvent.ok);
			let event = createEvent.data.event;

			for (const user of confirmedUsers) {
				const ctx = makeMockContext(user);
				const confirmedSignUp = await eventService.signUp(ctx, {
					userId: user.id,
					eventId: event.id,
				});
				if (!confirmedSignUp.ok) throw confirmedSignUp.error;
				expect(confirmedSignUp.data.signUp.participationStatus).toBe(
					"CONFIRMED",
				);
			}

			for (const user of waitListUsers) {
				const ctx = makeMockContext(user);
				const waitListSignUp = await eventService.signUp(ctx, {
					userId: user.id,
					eventId: event.id,
				});
				if (!waitListSignUp.ok) throw waitListSignUp.error;
				expect(waitListSignUp.data.signUp.participationStatus).toBe(
					"ON_WAITLIST",
				);
			}

			for (const user of shouldRemainOnWaitListUsers) {
				const ctx = makeMockContext(user);
				const waitListSignUp = await eventService.signUp(ctx, {
					userId: user.id,
					eventId: event.id,
				});
				if (!waitListSignUp.ok) throw waitListSignUp.error;
				expect(waitListSignUp.data.signUp.participationStatus).toBe(
					"ON_WAITLIST",
				);
			}

			event = await eventService.get(event.id);
			assert(event.type === "SIGN_UPS");
			expect(event.remainingCapacity).toBe(0);

			/**
			 * Act
			 *
			 * Retract the confirmed user's sign up, and wait for jobs to finish
			 */
			await Promise.all(
				confirmedUsers.map((user) =>
					eventService.retractSignUp(makeMockContext(user), {
						eventId: event.id,
					}),
				),
			);
			const signUpJobs = await signUpQueue.getJobs();
			await Promise.all(
				signUpJobs.map((job) =>
					job
						.waitUntilFinished(signUpQueueEvents)
						.then((res) => expect(res.ok).toBe(true)),
				),
			);
			const emailJobs = await emailQueue.getJobs();
			await Promise.all(
				emailJobs.map((job) => job.waitUntilFinished(emailQueueEvents)),
			);

			event = await eventService.get(event.id);
			assert(event.type === "SIGN_UPS");
			expect(event.remainingCapacity).toBe(0);

			/**
			 * Assert
			 *
			 * The confirmed user's sign up should be cancelled, and the wait list user should be promoted
			 * to confirmed.
			 * The promoted user should receive an email.
			 */
			for (const user of confirmedUsers) {
				const retractedSignUp = await eventService.getSignUpAvailability(
					makeMockContext(user),
					{ eventId: event.id },
				);
				expect(retractedSignUp).toBe("WAITLIST_AVAILABLE");
			}
			for (const user of waitListUsers) {
				const promotedSignUp = await eventService.getSignUpAvailability(
					makeMockContext(user),
					{ eventId: event.id },
				);
				expect(promotedSignUp).toBe("CONFIRMED");
				expect(mailClient.sendEmailWithTemplate).toHaveBeenCalledWith(
					expect.objectContaining({
						To: user.email,
						From: env.NO_REPLY_EMAIL,
						TemplateAlias: "event-wait-list",
						TemplateModel: expect.objectContaining({
							event: expect.objectContaining({
								name: event.name,
								startAt: expect.any(String),
							}),
							actionUrl: `${env.CLIENT_URL}/events/${event.id}`,
						}),
					}),
				);
			}

			for (const user of shouldRemainOnWaitListUsers) {
				const signUpAvailability = await eventService.getSignUpAvailability(
					makeMockContext(user),
					{ eventId: event.id },
				);
				expect(signUpAvailability).toBe("ON_WAITLIST");
			}
		}, 10_000);
	});
});
