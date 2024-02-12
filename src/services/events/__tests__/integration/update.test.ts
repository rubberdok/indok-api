import assert from "assert";
import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import {
	InvalidArgumentError,
	PermissionDeniedError,
} from "~/domain/errors.js";
import type { Event, EventType } from "~/domain/events/index.js";
import { makeMockContext } from "~/lib/context.js";
import prisma from "~/lib/prisma.js";
import type { Services } from "~/lib/server.js";
import type { CreateEventParams, UpdateEventParams } from "../../service.js";
import { makeBasicEvent, makeSignUpEvent } from "../dependencies.js";
import { makeUserWithOrganizationMembership } from "./dependencies-factory.js";

describe("EventService", () => {
	let events: Services["events"];

	beforeAll(() => {
		({ events } = makeTestServices());
	});

	describe("#update", () => {
		interface TestCase {
			name: string;
			arrange: {
				existingTickets?: {
					price: number;
					merchantId: string;
				};
				existingSlots?: { capacity: number; gradeYears?: number[] | null }[];
				existingEvent: EventType;
			};
			act: {
				// We fetch the ID based on the event created
				updateEventParams: Omit<UpdateEventParams, "event"> & {
					event: Omit<UpdateEventParams["event"], "id">;
				};
			};
			assertion: {
				result: ReturnType<typeof Event.update>;
			};
		}

		const testCases: TestCase[] = [
			{
				name: "should update basic event information",
				arrange: {
					existingEvent: makeBasicEvent(),
				},
				act: {
					updateEventParams: {
						event: {
							name: "new name",
							description: "new description",
							location: "new location",
							contactEmail: "example@example.com",
						},
					},
				},
				assertion: {
					result: {
						ok: true,
						data: expect.objectContaining({
							event: expect.objectContaining({
								name: "new name",
								description: "new description",
								location: "new location",
								contactEmail: "example@example.com",
							}),
						}),
					},
				},
			},
			{
				name: "should increment remaining capacity when increasing the capacity",
				arrange: {
					existingEvent: makeSignUpEvent({ capacity: 10 }),
					existingSlots: [
						{
							capacity: 10,
						},
					],
				},
				act: {
					updateEventParams: {
						event: {
							capacity: 20,
						},
					},
				},
				assertion: {
					result: {
						ok: true,
						data: expect.objectContaining({
							event: expect.objectContaining({
								capacity: 20,
								remainingCapacity: 20,
							}),
						}),
					},
				},
			},
			{
				name: "should decrement remaining capacity when decreasing the capacity",
				arrange: {
					existingEvent: makeSignUpEvent({ capacity: 10 }),
					existingSlots: [
						{
							capacity: 10,
						},
					],
				},
				act: {
					updateEventParams: {
						event: {
							capacity: 5,
						},
					},
				},
				assertion: {
					result: {
						ok: true,
						data: expect.objectContaining({
							event: expect.objectContaining({
								capacity: 5,
								remainingCapacity: 5,
							}),
						}),
					},
				},
			},
			{
				name: "should not permit negative capacities",
				arrange: {
					existingEvent: makeSignUpEvent({ capacity: 10 }),
					existingSlots: [
						{
							capacity: 10,
						},
					],
				},
				act: {
					updateEventParams: {
						event: {
							capacity: -5,
						},
					},
				},
				assertion: {
					result: {
						ok: false,
						error: expect.any(InvalidArgumentError),
					},
				},
			},
		];

		test.each(testCases)("$name", async ({ arrange, act, assertion }) => {
			// Arrange
			const { user, organization } = await makeUserWithOrganizationMembership();
			const ctx = makeMockContext(user);
			let createEventParams: CreateEventParams;
			switch (arrange.existingEvent.type) {
				case "BASIC":
					createEventParams = {
						type: arrange.existingEvent.type,
						event: {
							...arrange.existingEvent,
							organizationId: organization.id,
						},
					};
					break;
				case "SIGN_UPS":
					createEventParams = {
						type: arrange.existingEvent.type,
						event: {
							...arrange.existingEvent,
							organizationId: organization.id,
						},
						slots: arrange.existingSlots ?? [],
					};
					break;
				case "TICKETS": {
					const { existingTickets } = arrange;
					if (!existingTickets)
						throw new Error(
							"existingTickets is required for TICKETS event type",
						);
					createEventParams = {
						type: arrange.existingEvent.type,
						event: {
							...arrange.existingEvent,
							organizationId: organization.id,
						},
						slots: arrange.existingSlots ?? [],
						tickets: existingTickets,
					};
					break;
				}
			}

			const createEventResult = await events.create(ctx, createEventParams);
			if (!createEventResult.ok) throw createEventResult.error;

			// Act
			const result = await events.update(ctx, {
				...act.updateEventParams,
				event: {
					...act.updateEventParams.event,
					id: createEventResult.data.event.id,
				},
			});

			// Assert
			if (assertion.result.ok && !result.ok) throw result.error;
			expect(result).toEqual(assertion.result);
		});

		describe("type: SIGN_UPS", () => {
			it("should return ok: false when decreasing event capacity to the point where remaining capacity is below 0", async () => {
				const { user, organization } =
					await makeUserWithOrganizationMembership();
				const ctx = makeMockContext(user);
				const existingEvent = makeSignUpEvent({
					capacity: 10,
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					signUpsEnabled: true,
				});
				const createEventResult = await events.create(ctx, {
					event: { ...existingEvent, organizationId: organization.id },
					type: "SIGN_UPS",
					slots: [{ capacity: 10 }],
				});

				if (!createEventResult.ok) throw createEventResult.error;
				// Sign up a user for the event so that remaining capacity != capacity
				await events.signUp(ctx, user.id, createEventResult.data.event.id);

				// Set capacity to 0 with a user signed up
				const updateEventResult = await events.update(ctx, {
					event: {
						id: createEventResult.data.event.id,
						capacity: 0,
					},
				});

				assert(
					!updateEventResult.ok,
					"expected update event to fail as remaining capacity is below 0",
				);

				expect(updateEventResult.error).toBeInstanceOf(InvalidArgumentError);
				expect(updateEventResult.error.cause).toEqual(
					expect.objectContaining({
						description: expect.stringContaining("negative remaining capacity"),
					}),
				);
			});

			it("should create, update, and delete slots", async () => {
				const { user, organization } =
					await makeUserWithOrganizationMembership();
				const ctx = makeMockContext(user);
				const existingEvent = makeSignUpEvent({
					capacity: 10,
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					signUpsEnabled: true,
				});
				const createEventResult = await events.create(ctx, {
					event: { ...existingEvent, organizationId: organization.id },
					type: "SIGN_UPS",
					slots: [{ capacity: 10 }, { capacity: 5 }],
				});

				if (!createEventResult.ok) throw createEventResult.error;
				const [existingSlot1, existingSlot2] =
					createEventResult.data.slots ?? [];
				assert(
					existingSlot1 !== undefined && existingSlot2 !== undefined,
					"should have been created with at least two slots",
				);

				// Sign up a user for the event so that remaining capacity != capacity
				await events.signUp(ctx, user.id, createEventResult.data.event.id);

				// Set capacity to 0 with a user signed up
				const updateEventResult = await events.update(ctx, {
					event: {
						id: createEventResult.data.event.id,
					},
					slots: {
						create: [{ capacity: 15 }],
						update: [
							{
								id: existingSlot1.id,
								capacity: 100,
								gradeYears: [1, 2, 3],
							},
						],
						delete: [{ id: existingSlot2.id }],
					},
				});

				if (!updateEventResult.ok) throw updateEventResult.error;

				assert(updateEventResult.data.slots !== undefined);
				const { slots: actualSlots } = updateEventResult.data;
				const actualSlotIds = actualSlots.map((slot) => slot.id);
				expect(actualSlotIds).not.toContainEqual(existingSlot2.id);
				expect(actualSlots).toContainEqual(
					expect.objectContaining({
						id: existingSlot1.id,
						capacity: 100,
						remainingCapacity: 99,
						gradeYears: [1, 2, 3],
					}),
				);
				expect(actualSlots).toContainEqual(
					expect.objectContaining({
						id: expect.not.stringMatching(existingSlot1.id),
						capacity: 15,
						remainingCapacity: 15,
					}),
				);
			});

			it("should return ok: false when slot capacity to the point where remaining capacity is below 0", async () => {
				const { user, organization } =
					await makeUserWithOrganizationMembership();
				const ctx = makeMockContext(user);
				const existingEvent = makeSignUpEvent({
					capacity: 10,
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					signUpsEnabled: true,
				});
				const createEventResult = await events.create(ctx, {
					event: { ...existingEvent, organizationId: organization.id },
					type: "SIGN_UPS",
					slots: [{ capacity: 10 }],
				});

				if (!createEventResult.ok) throw createEventResult.error;
				// Sign up a user for the event so that remaining capacity != capacity
				await events.signUp(ctx, user.id, createEventResult.data.event.id);
				const existingSlot = createEventResult.data.slots?.[0];
				assert(
					existingSlot !== undefined,
					"should have been created with at least one slot",
				);
				// Set capacity to 0 with a user signed up
				const updateEventResult = await events.update(ctx, {
					event: {
						id: createEventResult.data.event.id,
					},
					slots: {
						update: [
							{
								id: existingSlot?.id,
								capacity: 0,
							},
						],
					},
				});

				assert(
					!updateEventResult.ok,
					"expected update event to fail as remaining capacity is below 0",
				);

				expect(updateEventResult.error).toBeInstanceOf(InvalidArgumentError);
				expect(updateEventResult.error.cause).toEqual(
					expect.objectContaining({
						description: expect.stringContaining("slot"),
					}),
				);
			});

			it("should return ok: false trying to delete a slots with existing sing ups", async () => {
				const { user, organization } =
					await makeUserWithOrganizationMembership();
				const ctx = makeMockContext(user);
				const existingEvent = makeSignUpEvent({
					capacity: 10,
					signUpsStartAt: DateTime.now().minus({ days: 1 }).toJSDate(),
					signUpsEnabled: true,
				});
				const createEventResult = await events.create(ctx, {
					event: { ...existingEvent, organizationId: organization.id },
					type: "SIGN_UPS",
					slots: [{ capacity: 10 }],
				});

				if (!createEventResult.ok) throw createEventResult.error;
				// Sign up a user for the event so that remaining capacity != capacity
				await events.signUp(ctx, user.id, createEventResult.data.event.id);
				const existingSlot = createEventResult.data.slots?.[0];
				assert(
					existingSlot !== undefined,
					"should have been created with at least one slot",
				);
				// Set capacity to 0 with a user signed up
				const updateEventResult = await events.update(ctx, {
					event: {
						id: createEventResult.data.event.id,
					},
					slots: {
						delete: [{ id: existingSlot.id }],
					},
				});

				assert(
					!updateEventResult.ok,
					"expected update event to fail and prevent deleting a slot with existing sign ups",
				);

				expect(updateEventResult.error).toBeInstanceOf(InvalidArgumentError);
				expect(updateEventResult.error).toEqual(
					expect.objectContaining({
						description: expect.stringContaining("existing sign ups"),
					}),
				);
			});
		});

		it("should set new categories", async () => {
			const { user, organization } = await makeUserWithOrganizationMembership({
				isSuperUser: true,
			});
			const ctx = makeMockContext(user);
			const existingEvent = makeBasicEvent();
			const createEventResult = await events.create(ctx, {
				event: { ...existingEvent, organizationId: organization.id },
				type: "BASIC",
			});
			if (!createEventResult.ok) throw createEventResult.error;
			const category = await events.createCategory(ctx, {
				name: faker.string.sample(20),
			});

			// Set capacity to 0 with a user signed up
			const updateEventResult = await events.update(ctx, {
				event: {
					id: createEventResult.data.event.id,
				},
				categories: [{ id: category.id }],
			});

			if (!updateEventResult.ok) throw updateEventResult.error;
			const { categories } = updateEventResult.data;
			expect(categories).toContainEqual(
				expect.objectContaining({
					id: category.id,
					name: category.name,
				}),
			);
		});

		it("should return PermissionDeniedError if not logged in", async () => {
			const { user, organization } = await makeUserWithOrganizationMembership();
			const createEventResult = await events.create(makeMockContext(user), {
				event: { ...makeBasicEvent(), organizationId: organization.id },
				type: "BASIC",
			});
			if (!createEventResult.ok) throw createEventResult.error;

			const updateEventResult = await events.update(makeMockContext(null), {
				event: {
					id: createEventResult.data.event.id,
					name: faker.word.adjective(),
				},
			});

			assert(!updateEventResult.ok, "expected update event to fail");
			expect(updateEventResult.error).toBeInstanceOf(PermissionDeniedError);
		});

		it("should return ok: false if the organization has been deleted", async () => {
			const { user, organization } = await makeUserWithOrganizationMembership();
			const createEventResult = await events.create(makeMockContext(user), {
				event: { ...makeBasicEvent(), organizationId: organization.id },
				type: "BASIC",
			});
			if (!createEventResult.ok) throw createEventResult.error;
			await prisma.organization.delete({
				where: {
					id: organization.id,
				},
			});

			const updateEventResult = await events.update(makeMockContext(null), {
				event: {
					id: createEventResult.data.event.id,
					name: faker.word.adjective(),
				},
			});

			assert(!updateEventResult.ok, "expected update event to fail");
			expect(updateEventResult.error).toBeInstanceOf(InvalidArgumentError);
		});
	});
});
