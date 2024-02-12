import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import type { Services } from "~/lib/server.js";
import { makeUserWithOrganizationMembership } from "./dependencies-factory.js";
import { makeMockContext } from "~/lib/context.js";
import type {
	EventType,
	SlotType,
	CategoryType,
} from "~/domain/events/index.js";
import type { CreateEventParams } from "../../service.js";
import type { Result } from "~/lib/result.js";
import { DateTime } from "luxon";

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
			expected: Result<{
				event: EventType;
				slots?: SlotType[];
				categories?: CategoryType[];
			}>;
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
	});
});
