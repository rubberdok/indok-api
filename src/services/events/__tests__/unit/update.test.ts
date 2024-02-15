import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mock } from "jest-mock-extended";
import { InvalidArgumentError, NotFoundError } from "~/domain/errors.js";
import type { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import type {
	EventRepository,
	EventService,
	PermissionService,
	ProductService,
	UserService,
} from "../../service.js";
import { makeSignUpEvent } from "../dependencies.js";
import { makeDependencies } from "./dependencies.js";

describe("EventService", () => {
	let service: EventService;
	let eventsRepository: DeepMockProxy<EventRepository>;
	let permissionService: DeepMockProxy<PermissionService>;
	let userService: DeepMockProxy<UserService>;
	let productService: DeepMockProxy<ProductService>;

	beforeAll(() => {
		({
			eventsRepository,
			service,
			permissionService,
			productService,
			userService,
		} = makeDependencies());
		eventsRepository.update.mockImplementation(async (_ctx, id, updateFn) => {
			const res = await updateFn({
				event: makeSignUpEvent(),
				slots: [
					{
						id: faker.string.uuid(),
						capacity: 10,
						remainingCapacity: 10,
						version: 0,
					},
				],
			});
			if (res.ok) {
				return {
					ok: true,
					data: {
						event: makeSignUpEvent(),
						slots: [
							{
								id: faker.string.uuid(),
								capacity: 10,
								remainingCapacity: 10,
								version: 0,
							},
						],
						categories: [],
					},
				};
			}
			return res;
		});
	});

	describe("#update", () => {
		it("should return InvalidArgumentError if the new slot data is invalid", async () => {
			const ctx = makeMockContext(mock<User>());
			permissionService.hasRole.mockResolvedValue(true);

			const result = await service.update(ctx, {
				event: {
					id: faker.string.uuid(),
				},
				slots: {
					create: [{ capacity: -1 }],
				},
			});

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: InvalidArgumentError.name,
					description: expect.stringContaining("slot"),
					cause: expect.any(InvalidArgumentError),
				}),
			});
		});

		it("should return NotFoundError if a slot to update does not exist", async () => {
			const ctx = makeMockContext(mock<User>());
			permissionService.hasRole.mockResolvedValue(true);

			const result = await service.update(ctx, {
				event: {
					id: faker.string.uuid(),
				},
				slots: {
					update: [{ capacity: 10, id: faker.string.uuid() }],
				},
			});

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: NotFoundError.name,
					description: expect.stringContaining("Slot"),
				}),
			});
		});

		it("should return NotFoundError if a slot to update does not exist", async () => {
			const ctx = makeMockContext(mock<User>());
			permissionService.hasRole.mockResolvedValue(true);

			const result = await service.update(ctx, {
				event: {
					id: faker.string.uuid(),
				},
				slots: {
					update: [{ capacity: 10, id: faker.string.uuid() }],
				},
			});

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: NotFoundError.name,
					description: expect.stringContaining("Slot"),
				}),
			});
		});

		it("should return NotFoundError if a slot to delete does not exist", async () => {
			const ctx = makeMockContext(mock<User>());
			permissionService.hasRole.mockResolvedValue(true);

			const result = await service.update(ctx, {
				event: {
					id: faker.string.uuid(),
				},
				slots: {
					delete: [{ id: faker.string.uuid() }],
				},
			});

			expect(result).toEqual({
				ok: false,
				error: expect.objectContaining({
					name: NotFoundError.name,
					description: expect.stringContaining("Slot"),
				}),
			});
		});
	});
});
