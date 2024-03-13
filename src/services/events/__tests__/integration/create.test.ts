import assert from "node:assert";
import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import { InvalidArgumentError } from "~/domain/errors.js";
import type {
	CategoryType,
	EventType,
	SlotType,
} from "~/domain/events/index.js";
import { makeMockContext } from "~/lib/context.js";
import type { Result } from "~/lib/result.js";
import type { Services } from "~/lib/server.js";
import type { CreateEventParams } from "../../service.js";
import {
	makeServices,
	makeUserWithOrganizationMembership,
} from "./dependencies-factory.js";

describe("EventService", () => {
	let events: Services["events"];

	beforeAll(() => {
		({ events } = makeTestServices());
	});

	describe("#create", () => {
		interface TestCase {
			name: string;
			act: {
				createEventParams: CreateEventParams;
			};
			expected: Result<
				{
					event: EventType;
					slots?: SlotType[];
					categories?: CategoryType[];
				},
				Error
			>;
		}

		const testCases: TestCase[] = [
			{
				name: "should create a basic event",
				act: {
					createEventParams: {
						type: "BASIC",
						event: {
							name: "test",
							organizationId: "",
							startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
							endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
						},
					},
				},
				expected: {
					ok: true,
					data: expect.objectContaining({
						event: expect.objectContaining({
							name: "test",
						}),
					}),
				},
			},
			{
				name: "should create an event with slots",
				act: {
					createEventParams: {
						type: "SIGN_UPS",
						event: {
							name: "test",
							organizationId: "",
							startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
							endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
							capacity: 10,
							signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
							signUpsStartAt: DateTime.now().toJSDate(),
							signUpsEnabled: true,
						},
						slots: [{ capacity: 10, gradeYears: [1, 2, 3] }],
					},
				},
				expected: {
					ok: true,
					data: expect.objectContaining({
						event: expect.objectContaining({
							capacity: 10,
							remainingCapacity: 10,
							signUpsEnabled: true,
							type: "SIGN_UPS",
						}),
						slots: [
							expect.objectContaining({
								capacity: 10,
								gradeYears: [1, 2, 3],
								remainingCapacity: 10,
							}),
						],
					}),
				},
			},
			{
				name: "should create an event with retractable sign ups and require user provided information",
				act: {
					createEventParams: {
						type: "SIGN_UPS",
						event: {
							name: "test",
							organizationId: "",
							startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
							endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
							capacity: 10,
							signUpsEndAt: DateTime.now().plus({ days: 1 }).toJSDate(),
							signUpsStartAt: DateTime.now().toJSDate(),
							signUpsEnabled: true,
							signUpsRetractable: true,
							signUpsRequireUserProvidedInformation: true,
						},
						slots: [{ capacity: 10, gradeYears: [1, 2, 3] }],
					},
				},
				expected: {
					ok: true,
					data: expect.objectContaining({
						event: expect.objectContaining({
							capacity: 10,
							remainingCapacity: 10,
							signUpsEnabled: true,
							type: "SIGN_UPS",
							signUpsRetractable: true,
							signUpsRequireUserProvidedInformation: true,
						}),
						slots: [
							expect.objectContaining({
								capacity: 10,

								gradeYears: [1, 2, 3],
								remainingCapacity: 10,
							}),
						],
					}),
				},
			},
		];

		test.each(testCases)("$name", async ({ act, expected }) => {
			// Arrange
			const { user, organization } = await makeUserWithOrganizationMembership();
			const ctx = makeMockContext(user);

			let createEventParams: CreateEventParams;
			switch (act.createEventParams.type) {
				case "BASIC":
					createEventParams = {
						...act.createEventParams,
						type: act.createEventParams.type,
						event: {
							...act.createEventParams.event,
							organizationId: organization.id,
						},
					};
					break;
				case "SIGN_UPS":
					createEventParams = {
						...act.createEventParams,
						type: act.createEventParams.type,
						event: {
							...act.createEventParams.event,
							organizationId: organization.id,
						},
					};
					break;
				case "TICKETS": {
					createEventParams = {
						...act.createEventParams,
						type: act.createEventParams.type,
						event: {
							...act.createEventParams.event,
							organizationId: organization.id,
						},
					};
					break;
				}
			}

			const actual = await events.create(ctx, createEventParams);

			expect(actual).toEqual(expected);
		});

		describe("type: TICKETS", () => {
			it("should create a product for the event", async () => {
				// Arrange, set up a user and an organization
				const { user, organization } = await makeUserWithOrganizationMembership(
					{ isSuperUser: true },
				);
				const ctx = makeMockContext(user);
				const { productService } = makeServices();
				const createMerchantResult = await productService.merchants.create(
					ctx,
					{
						name: faker.string.sample(20),
						serialNumber: faker.string.uuid(),
						clientId: faker.string.uuid(),
						clientSecret: faker.string.uuid(),
						subscriptionKey: faker.string.uuid(),
					},
				);
				if (!createMerchantResult.ok) throw createMerchantResult.error;

				/**
				 * Act
				 *
				 * Create a event with type: TICKETS
				 */
				const actual = await events.create(ctx, {
					type: "TICKETS",
					event: {
						capacity: 10,
						name: faker.color.human(),
						organizationId: organization.id,
						signUpsEndAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
						signUpsStartAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
						startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						signUpsEnabled: true,
					},
					slots: [{ capacity: 10 }],
					tickets: {
						merchantId: createMerchantResult.data.merchant.id,
						price: 100 * 300,
					},
				});
				if (!actual.ok) throw actual.error;

				expect(actual.data.event.productId).toEqual(expect.any(String));
			});

			it("should set signUpsRetractable: false", async () => {
				// Arrange, set up a user and an organization
				const { user, organization } = await makeUserWithOrganizationMembership(
					{ isSuperUser: true },
				);
				const ctx = makeMockContext(user);
				const { productService } = makeServices();
				const createMerchantResult = await productService.merchants.create(
					ctx,
					{
						name: faker.string.sample(20),
						serialNumber: faker.string.uuid(),
						clientId: faker.string.uuid(),
						clientSecret: faker.string.uuid(),
						subscriptionKey: faker.string.uuid(),
					},
				);
				if (!createMerchantResult.ok) throw createMerchantResult.error;

				/**
				 * Act
				 *
				 * Create a event with type: TICKETS
				 */
				const actual = await events.create(ctx, {
					type: "TICKETS",
					event: {
						capacity: 10,
						name: faker.color.human(),
						organizationId: organization.id,
						signUpsEndAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
						signUpsStartAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
						startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						signUpsEnabled: true,
						signUpsRetractable: true,
					},
					slots: [{ capacity: 10 }],
					tickets: {
						merchantId: createMerchantResult.data.merchant.id,
						price: 100 * 300,
					},
				});
				if (!actual.ok) throw actual.error;

				expect(actual.data.event.signUpsRetractable).toBe(false);
			});

			it("should return ok: false if price is negative", async () => {
				// Arrange, set up a user and an organization
				const { user, organization } = await makeUserWithOrganizationMembership(
					{ isSuperUser: true },
				);
				const ctx = makeMockContext(user);
				const { productService } = makeServices();
				const createMerchantResult = await productService.merchants.create(
					ctx,
					{
						name: faker.string.sample(20),
						serialNumber: faker.string.uuid(),
						clientId: faker.string.uuid(),
						clientSecret: faker.string.uuid(),
						subscriptionKey: faker.string.uuid(),
					},
				);
				if (!createMerchantResult.ok) throw createMerchantResult.error;

				/**
				 * Act
				 *
				 * Create a event with type: TICKETS
				 */
				const actual = await events.create(ctx, {
					type: "TICKETS",
					event: {
						capacity: 10,
						name: faker.color.human(),
						organizationId: organization.id,
						signUpsEndAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
						signUpsStartAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						endAt: DateTime.now().plus({ days: 1, hours: 2 }).toJSDate(),
						startAt: DateTime.now().plus({ days: 1 }).toJSDate(),
						signUpsEnabled: true,
					},
					slots: [{ capacity: 10 }],
					tickets: {
						merchantId: createMerchantResult.data.merchant.id,
						price: -100 * 300,
					},
				});

				assert(
					!actual.ok,
					"Expected event creation to fail with negative price on the ticket",
				);
				expect(actual.error).toBeInstanceOf(InvalidArgumentError);
			});
		});
	});
});
