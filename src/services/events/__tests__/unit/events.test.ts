import assert, { fail } from "node:assert";
import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import { merge } from "lodash-es";
import { DateTime } from "luxon";
import {
	InternalServerError,
	InvalidArgumentError,
	PermissionDeniedError,
} from "~/domain/errors.js";
import type { EventType, SlotType } from "~/domain/events/index.js";
import {
	OrganizationRole,
	type OrganizationRoleType,
} from "~/domain/organizations.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import type { TResult } from "~/lib/result.js";
import type {
	CreateBasicEventParams,
	CreateEventParams,
	CreateSignUpEventParams,
	UpdateEventParams,
} from "../../service.js";
import { makeBasicEvent, makeSignUpEvent } from "../dependencies.js";
import { makeDependencies } from "./dependencies.js";

function makeBasicEventParams(
	event?: Partial<CreateBasicEventParams["event"]>,
): CreateBasicEventParams {
	const basicEvent = merge<
		CreateBasicEventParams["event"],
		Partial<CreateBasicEventParams["event"]> | undefined
	>(
		{
			name: faker.commerce.productName(),
			description: faker.lorem.paragraph(),
			startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
			endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
			location: faker.location.streetAddress(),
			contactEmail: faker.internet.email(),
			organizationId: faker.string.uuid(),
			signUpsEnabled: false,
		},
		event,
	);
	return {
		event: basicEvent,
		type: "BASIC",
	};
}

function makeSignUpEventParams(
	event?: Partial<CreateSignUpEventParams["event"]>,
	slots?: CreateSignUpEventParams["slots"],
): CreateSignUpEventParams {
	const { capacity, signUpsStartAt, signUpsEndAt, ...basicEventData } =
		event ?? {};
	const { event: basicEvent } = makeBasicEventParams(basicEventData);
	const signUpEvent = {
		...basicEvent,
		signUpsEnabled: true,
		signUpsStartAt:
			signUpsStartAt ?? DateTime.now().plus({ days: 1 }).toJSDate(),
		signUpsEndAt: signUpsEndAt ?? DateTime.now().plus({ days: 2 }).toJSDate(),
		capacity: 1,
	};
	const slotData = slots ?? [{ capacity: 1 }];

	return {
		type: "SIGN_UPS",
		event: merge<
			CreateSignUpEventParams["event"],
			Partial<CreateSignUpEventParams["event"]> | undefined
		>(signUpEvent, event),
		slots: slotData,
	};
}

function makeReturnType<T extends Record<string, unknown>>(
	result: { data: T } | { error: InvalidArgumentError | InternalServerError },
): TResult<T, InvalidArgumentError | InternalServerError> {
	if ("data" in result) {
		return {
			ok: true,
			data: result.data,
		};
	}
	return {
		ok: false,
		error: result.error,
	};
}

function makeUser(user?: Partial<User>): User {
	return mock<User>(user ?? { id: faker.string.uuid() });
}

describe("EventsService", () => {
	describe("#create", () => {
		describe("should return", () => {
			interface TestCase {
				name: string;
				act: {
					createEventParams: CreateEventParams;
					user: User | null;
					role?: OrganizationRoleType | null;
					repository?: TResult<
						{ event: EventType },
						InvalidArgumentError | InternalServerError
					>;
				};
				assertion: {
					return: TResult<
						{ event: EventType },
						InternalServerError | InvalidArgumentError | PermissionDeniedError
					>;
				};
			}

			const testCases: TestCase[] = [
				{
					name: "if name is empty",
					act: {
						user: makeUser(),
						role: OrganizationRole.MEMBER,
						createEventParams: makeBasicEventParams({ name: "" }),
					},
					assertion: {
						return: makeReturnType({
							error: expect.objectContaining({
								name: InvalidArgumentError.name,
							}),
						}),
					},
				},
				{
					name: "if startAt is in the past",
					act: {
						user: makeUser(),
						role: OrganizationRole.MEMBER,
						createEventParams: makeBasicEventParams({
							startAt: DateTime.now().minus({ days: 1 }).toJSDate(),
						}),
					},
					assertion: {
						return: makeReturnType({
							error: expect.objectContaining({
								name: InvalidArgumentError.name,
							}),
						}),
					},
				},
				{
					name: "if endAt is in the past and earlier than startAt",
					act: {
						user: makeUser(),
						role: OrganizationRole.MEMBER,
						createEventParams: makeBasicEventParams({
							startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
							endAt: DateTime.now().minus({ days: 2 }).toJSDate(),
						}),
					},
					assertion: {
						return: makeReturnType({
							error: expect.objectContaining({
								name: InvalidArgumentError.name,
							}),
						}),
					},
				},
				{
					name: "if endAt is in the future and earlier than startAt",
					act: {
						user: makeUser(),
						role: OrganizationRole.MEMBER,
						createEventParams: makeBasicEventParams({
							startAt: DateTime.now().plus({ days: 2 }).toJSDate(),
							endAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						}),
					},
					assertion: {
						return: makeReturnType({
							error: expect.objectContaining({
								name: InvalidArgumentError.name,
							}),
						}),
					},
				},
				{
					name: "if the description is too long",
					act: {
						user: makeUser(),
						role: OrganizationRole.MEMBER,
						createEventParams: makeBasicEventParams({
							description: faker.string.sample(10_001),
						}),
					},
					assertion: {
						return: makeReturnType({
							error: expect.objectContaining({
								name: InvalidArgumentError.name,
							}),
						}),
					},
				},
				{
					name: "if the name is too long",
					act: {
						user: makeUser(),
						role: OrganizationRole.MEMBER,
						createEventParams: makeBasicEventParams({
							name: faker.string.sample(201),
						}),
					},
					assertion: {
						return: makeReturnType({
							error: expect.objectContaining({
								name: InvalidArgumentError.name,
							}),
						}),
					},
				},
				{
					name: "if signUpDetails have negative capacity",
					act: {
						user: makeUser(),
						role: OrganizationRole.MEMBER,
						createEventParams: makeSignUpEventParams(
							{
								signUpsEnabled: true,
								capacity: -1,
								signUpsStartAt: DateTime.now().plus({ days: 1 }).toJSDate(),
								signUpsEndAt: DateTime.now()
									.plus({ days: 1, hours: 2 })
									.toJSDate(),
							},
							[{ capacity: 1 }],
						),
					},
					assertion: {
						return: makeReturnType({
							error: expect.objectContaining({
								name: InvalidArgumentError.name,
							}),
						}),
					},
				},
				{
					name: "if signUpDetails have a slot with negative capacity",
					act: {
						user: makeUser(),
						role: OrganizationRole.MEMBER,
						createEventParams: makeSignUpEventParams(
							{
								signUpsEnabled: true,
								capacity: 1,
								signUpsStartAt: DateTime.now().plus({ days: 1 }).toJSDate(),
								signUpsEndAt: DateTime.now()
									.plus({ days: 1, hours: 2 })
									.toJSDate(),
							},
							[{ capacity: -1 }],
						),
					},
					assertion: {
						return: makeReturnType({
							error: expect.objectContaining({
								name: InvalidArgumentError.name,
							}),
						}),
					},
				},
				{
					name: "if signUpsEndAt is earlier than signUpsStartAt",
					act: {
						user: makeUser(),
						role: OrganizationRole.MEMBER,
						createEventParams: makeSignUpEventParams(
							{
								signUpsEnabled: true,
								capacity: 1,

								signUpsStartAt: DateTime.now()
									.plus({ days: 1, hours: 2 })
									.toJSDate(),
								signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
							},
							[{ capacity: 1 }],
						),
					},
					assertion: {
						return: makeReturnType({
							error: expect.objectContaining({
								name: InvalidArgumentError.name,
							}),
						}),
					},
				},
				{
					name: "if the user does not have a role in the organization",
					act: {
						user: makeUser(),
						role: null,
						createEventParams: makeBasicEventParams(),
					},
					assertion: {
						return: makeReturnType({
							error: expect.objectContaining({
								name: PermissionDeniedError.name,
							}),
						}),
					},
				},
				{
					name: "if the user is not logged in",
					act: {
						user: makeUser(),
						role: null,
						createEventParams: makeBasicEventParams(),
					},
					assertion: {
						return: makeReturnType({
							error: expect.objectContaining({
								name: PermissionDeniedError.name,
							}),
						}),
					},
				},
				{
					name: "and an event is created",
					act: {
						user: makeUser(),
						role: OrganizationRole.MEMBER,
						createEventParams: makeBasicEventParams(),
						repository: makeReturnType({
							data: { event: makeBasicEvent() },
						}),
					},
					assertion: {
						return: {
							ok: true,
							data: expect.any(Object),
						},
					},
				},
			];

			test.each(testCases)(
				"ok: $assertion.return.ok $name",
				async ({ act, assertion }) => {
					const { service, permissionService, eventsRepository } =
						makeDependencies();
					eventsRepository.create.mockResolvedValueOnce(
						act.repository ?? {
							ok: false,
							error: new InternalServerError("No return value expected"),
						},
					);
					/**
					 * Arrange
					 * 1. Set up the mock repository to handle the create method
					 */
					permissionService.hasRole.mockResolvedValueOnce(
						act.role !== null && act.role !== undefined,
					);

					/**
					 * Act
					 */
					const result = await service.create(
						makeMockContext(mock<User>({ id: faker.string.uuid() })),
						act.createEventParams,
					);

					/**
					 * assertion that the expected error is thrown
					 */
					expect(result).toEqual(assertion.return);
				},
			);
		});
	});

	describe("#update, should return", () => {
		interface TestCase {
			name: string;
			arrange: {
				hasRole: boolean;
				event: EventType;
				slots?: SlotType[];
			};
			act: {
				updateEventParams: UpdateEventParams;
			};
			assertion: {
				result: TResult<
					{ event: EventType },
					InvalidArgumentError | InternalServerError
				>;
			};
		}
		const startAt = faker.date.soon();
		const endAt = faker.date.future({ refDate: startAt });

		const testCases: TestCase[] = [
			{
				name: "update name to empty string",
				arrange: {
					hasRole: true,
					event: makeBasicEvent(),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							name: "",
						},
					},
				},
				assertion: {
					result: makeReturnType({
						error: expect.objectContaining({
							name: InvalidArgumentError.name,
						}),
					}),
				},
			},
			{
				name: "Date.now() < endAt < startAt, changing endAt",
				arrange: {
					hasRole: true,
					event: makeBasicEvent({ startAt, endAt }),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							endAt: faker.date.recent({ refDate: startAt }),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						error: expect.objectContaining({
							name: InvalidArgumentError.name,
						}),
					}),
				},
			},
			{
				name: "Date.now() < endAt < startAt, changing endAt and startAt",
				arrange: {
					hasRole: true,
					event: makeBasicEvent({ startAt, endAt }),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							endAt: faker.date.between({ from: startAt, to: endAt }),
							startAt: faker.date.soon({ refDate: endAt, days: 2 }),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						error: expect.objectContaining({
							name: InvalidArgumentError.name,
						}),
					}),
				},
			},
			{
				name: "Date.now() < endAt < startAt, changing startAt",
				arrange: {
					hasRole: true,
					event: makeBasicEvent({ startAt, endAt }),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							startAt: faker.date.future({ refDate: endAt }),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						error: expect.objectContaining({
							name: InvalidArgumentError.name,
						}),
					}),
				},
			},
			{
				name: "startAt < Date.now() < endAt",
				arrange: {
					hasRole: true,
					event: makeBasicEvent({ startAt, endAt }),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							startAt: faker.date.recent(),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						data: expect.objectContaining({
							event: expect.anything(),
						}),
					}),
				},
			},
			{
				name: "startAt < endAt < Date.now()",
				arrange: {
					hasRole: true,
					event: makeBasicEvent({ startAt, endAt }),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							endAt: faker.date.recent(),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						error: expect.objectContaining({
							name: InvalidArgumentError.name,
						}),
					}),
				},
			},
			{
				name: "startAt < endAt < Date.now(), changing endAt",
				arrange: {
					hasRole: true,
					event: makeBasicEvent({ startAt, endAt }),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							endAt: faker.date.recent(),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						error: expect.objectContaining({
							name: InvalidArgumentError.name,
						}),
					}),
				},
			},
			{
				name: "endAt < startAt < Date.now(), changing endAt and startAt",
				arrange: {
					hasRole: true,
					event: makeBasicEvent({ startAt, endAt }),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							startAt: faker.date.recent(),
							endAt: faker.date.past(),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						error: expect.objectContaining({
							name: InvalidArgumentError.name,
						}),
					}),
				},
			},
			{
				name: "endAt < startAt < Date.now(), changing endAt and startAt",
				arrange: {
					hasRole: true,
					event: makeBasicEvent({ startAt, endAt }),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							startAt: faker.date.recent(),
							endAt: faker.date.past(),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						error: expect.objectContaining({
							name: InvalidArgumentError.name,
						}),
					}),
				},
			},
			{
				name: "signUpsEndAt < signUpsStartAt, changing signUpsStartAt",
				arrange: {
					hasRole: true,
					event: makeSignUpEvent({
						signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
					}),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							signUpsStartAt: DateTime.now().plus({ days: 2 }).toJSDate(),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						error: expect.objectContaining({
							name: InvalidArgumentError.name,
						}),
					}),
				},
			},
			{
				name: "signUpsEndAt < signUpsStartAt, changing signUpsEndAt",
				arrange: {
					hasRole: true,
					event: makeSignUpEvent({
						signUpsEndAt: DateTime.now().plus({ days: 3 }).toJSDate(),
						signUpsStartAt: DateTime.now().plus({ days: 2 }).toJSDate(),
					}),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						error: expect.objectContaining({
							name: InvalidArgumentError.name,
						}),
					}),
				},
			},
			{
				name: "signUpsEndAt in the past, changing signUpsEndAt",
				arrange: {
					hasRole: true,
					event: makeSignUpEvent({
						signUpsEndAt: DateTime.now().plus({ days: 3 }).toJSDate(),
						signUpsStartAt: DateTime.now().minus({ days: 2 }).toJSDate(),
					}),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							signUpsEndAt: DateTime.now().minus({ days: 1 }).toJSDate(),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						data: expect.objectContaining({ event: expect.anything() }),
					}),
				},
			},
			{
				name: "update name",
				arrange: {
					hasRole: true,
					event: makeBasicEvent(),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							name: faker.string.uuid(),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						data: expect.objectContaining({
							event: expect.objectContaining({
								name: expect.any(String),
							}),
						}),
					}),
				},
			},
			{
				name: "nullish fields are not updated",
				arrange: {
					hasRole: true,
					event: makeBasicEvent(),
				},
				act: {
					updateEventParams: {
						event: {
							name: null,
							description: faker.lorem.paragraph(),
							startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
							endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
							location: null,
							id: faker.string.uuid(),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						data: expect.objectContaining({
							event: expect.objectContaining({
								name: expect.any(String),
								description: expect.any(String),
								startAt: expect.any(Date),
								endAt: expect.any(Date),
								location: expect.any(String),
							}),
						}),
					}),
				},
			},
			{
				name: "update `startAt` to be in the future, before `endAt`",
				arrange: {
					hasRole: true,
					event: makeBasicEvent({ startAt, endAt }),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							startAt: faker.date.recent({ refDate: endAt }),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						data: expect.objectContaining({
							event: expect.objectContaining({
								startAt: expect.any(Date),
								endAt: expect.any(Date),
							}),
						}),
					}),
				},
			},
			{
				name: "update `endAt` to be in the future, after `startAt`",
				arrange: {
					hasRole: true,
					event: makeBasicEvent({ startAt, endAt }),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							endAt: faker.date.soon({ refDate: startAt }),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						data: expect.objectContaining({
							event: expect.objectContaining({
								startAt: expect.any(Date),
								endAt: expect.any(Date),
							}),
						}),
					}),
				},
			},
			{
				name: "update `startAt` and `endAt`, with `previousEndAt` < `startAt` < `endAt`",
				arrange: {
					hasRole: true,
					event: makeBasicEvent({ startAt, endAt }),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							startAt: faker.date.soon({ refDate: endAt }),
							endAt: faker.date.future({ refDate: endAt }),
						},
					},
				},
				assertion: {
					result: makeReturnType({
						data: expect.objectContaining({
							event: expect.objectContaining({
								startAt: expect.any(Date),
								endAt: expect.any(Date),
							}),
						}),
					}),
				},
			},
			{
				name: "update signUpDetails when signUpsEndAt is in the past",
				arrange: {
					hasRole: true,
					event: makeSignUpEvent({
						signUpsEnabled: true,
						signUpsEndAt: DateTime.now().minus({ days: 2 }).toJSDate(),
						signUpsStartAt: DateTime.now().minus({ days: 3 }).toJSDate(),
					}),
				},
				act: {
					updateEventParams: {
						event: {
							id: faker.string.uuid(),
							signUpsEnabled: false,
						},
					},
				},
				assertion: {
					result: makeReturnType({
						data: expect.objectContaining({
							event: expect.objectContaining({
								signUpsEnabled: false,
							}),
						}),
					}),
				},
			},
		];

		test.each(testCases)(
			"ok: $assertion.result.ok, $name",
			async ({ assertion, arrange, act }) => {
				const { service, eventsRepository, permissionService } =
					makeDependencies();

				/**
				 * Arrange
				 *
				 * 1. Set up the mock for `eventsRepository.get` to return the event in {arrange.event}
				 * 2. Set up the mock for `permissionService.hasRole` to return `true`
				 */
				// 1.
				eventsRepository.update.mockImplementation(
					async (_ctx, _id, updateFn) => {
						const { event, slots } = arrange;
						const result = await updateFn({ event, slots });
						if (result.ok) {
							return {
								ok: true,
								data: {
									categories: [],
									slots: [],
									event: result.data.event,
								},
							};
						}
						return result;
					},
				);
				// 2.
				permissionService.hasRole.mockResolvedValueOnce(arrange.hasRole);

				/**
				 * Act
				 */
				const result = await service.update(
					makeMockContext(mock<User>({ id: faker.string.uuid() })),
					act.updateEventParams,
				);
				expect(result.ok).toEqual(assertion.result.ok);
				assert(result.ok === assertion.result.ok);
				if (assertion.result.ok && result.ok) {
					expect(result.data).toEqual(assertion.result.data);
				} else if (!result.ok && !assertion.result.ok) {
					expect(result.error).toEqual(assertion.result.error);
				}
			},
		);
	});

	describe("#createCategory", () => {
		it("should create a category", async () => {
			const { service, eventsRepository } = makeDependencies();

			/**
			 * Act
			 */
			await service.createCategory(
				makeMockContext({ id: faker.string.uuid(), isSuperUser: true }),
				{
					name: faker.commerce.productName(),
				},
			);

			/**
			 * assertion
			 */
			expect(eventsRepository.createCategory).toHaveBeenCalled();
		});

		it("should raise PermissionDeniedError if the user is not a super user", async () => {
			const { service, eventsRepository } = makeDependencies();

			/**
			 * Act
			 */
			try {
				await service.createCategory(
					makeMockContext({ id: faker.string.uuid() }),
					{
						name: faker.commerce.productName(),
					},
				);
				fail("Expected to throw");
			} catch (err) {
				/**
				 * assertion
				 */
				expect(err).toBeInstanceOf(PermissionDeniedError);
				expect(eventsRepository.createCategory).not.toHaveBeenCalled();
			}
		});

		it("should raise InvalidArgumentError if the name is too long", async () => {
			const { service, eventsRepository } = makeDependencies();

			/**
			 * Act
			 */
			try {
				await service.createCategory(
					makeMockContext(
						mock<User>({ id: faker.string.uuid(), isSuperUser: true }),
					),
					{
						name: faker.string.sample(101),
					},
				);
				fail("Expected to throw");
			} catch (err) {
				/**
				 * assertion
				 */
				expect(err).toBeInstanceOf(InvalidArgumentError);
				expect(eventsRepository.createCategory).not.toHaveBeenCalled();
			}
		});

		it("should raise InvalidArgumentError if the name is too short", async () => {
			const { service, eventsRepository } = makeDependencies();

			/**
			 * Act
			 */
			try {
				await service.createCategory(
					makeMockContext(
						mock<User>({ id: faker.string.uuid(), isSuperUser: true }),
					),
					{
						name: "",
					},
				);
				fail("Expected to throw");
			} catch (err) {
				/**
				 * assertion
				 */
				expect(err).toBeInstanceOf(InvalidArgumentError);
				expect(eventsRepository.createCategory).not.toHaveBeenCalled();
			}
		});
	});

	describe("#updateCategory", () => {
		it("should update a category", async () => {
			const { service, eventsRepository } = makeDependencies();

			/**
			 * Act
			 */
			await service.updateCategory(
				makeMockContext(
					mock<User>({ id: faker.string.uuid(), isSuperUser: true }),
				),
				{
					id: faker.string.uuid(),
					name: faker.commerce.productName(),
				},
			);

			/**
			 * assertion
			 */
			expect(eventsRepository.updateCategory).toHaveBeenCalled();
		});

		it("should raise PermissionDeniedError if the user is not a super user", async () => {
			const { service, eventsRepository } = makeDependencies();

			/**
			 * Act
			 */
			try {
				await service.updateCategory(
					makeMockContext(mock<User>({ id: faker.string.uuid() })),
					{
						id: faker.string.uuid(),
						name: faker.commerce.productName(),
					},
				);
				fail("Expected to throw");
			} catch (err) {
				/**
				 * assertion
				 */
				expect(err).toBeInstanceOf(PermissionDeniedError);
				expect(eventsRepository.updateCategory).not.toHaveBeenCalled();
			}
		});

		it("should raise InvalidArgumentError if the name is too long", async () => {
			const { service, eventsRepository } = makeDependencies();

			/**
			 * Act
			 */
			try {
				await service.updateCategory(
					makeMockContext(
						mock<User>({ id: faker.string.uuid(), isSuperUser: true }),
					),
					{
						id: faker.string.uuid(),
						name: faker.string.sample(101),
					},
				);
				fail("Expected to throw");
			} catch (err) {
				/**
				 * assertion
				 */
				expect(err).toBeInstanceOf(InvalidArgumentError);
				expect(eventsRepository.updateCategory).not.toHaveBeenCalled();
			}
		});

		it("should raise InvalidArgumentError if the name is too short", async () => {
			const { service, eventsRepository } = makeDependencies();

			/**
			 * Act
			 */
			try {
				await service.updateCategory(
					makeMockContext(
						mock<User>({ id: faker.string.uuid(), isSuperUser: true }),
					),
					{
						id: faker.string.uuid(),
						name: "",
					},
				);
				fail("Expected to throw");
			} catch (err) {
				expect(err).toBeInstanceOf(InvalidArgumentError);
				expect(eventsRepository.updateCategory).not.toHaveBeenCalled();
			}
		});
	});

	describe("#deleteCategory", () => {
		it("should delete a category", async () => {
			const { service, eventsRepository } = makeDependencies();

			/**
			 * Act
			 */
			const result = await service.deleteCategory(
				makeMockContext({ id: faker.string.uuid(), isSuperUser: true }),
				{
					id: faker.string.uuid(),
				},
			);

			/**
			 * assertion
			 */
			expect(result).toBeUndefined();
			expect(eventsRepository.deleteCategory).toHaveBeenCalled();
		});

		it("should raise PermissionDeniedError if the user is not a super user", async () => {
			const { service } = makeDependencies();

			/**
			 * Act
			 */

			/**
			 * assertion
			 */
			try {
				await service.deleteCategory(
					makeMockContext(mock<User>({ id: faker.string.uuid() })),
					{
						id: faker.string.uuid(),
					},
				);
				fail("Expected to throw");
			} catch (err) {
				expect(err).toBeInstanceOf(PermissionDeniedError);
			}
		});
	});
});
