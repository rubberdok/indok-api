import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mockDeep } from "jest-mock-extended";
import {
	InvalidArgumentError,
	PermissionDeniedError,
} from "~/domain/errors.js";
import { Role } from "~/domain/organizations.js";
import { makeMockContext } from "~/lib/context.js";
import {
	type ListingRepository,
	ListingService,
	type PermissionService,
} from "../../service.js";

describe("ListingService", () => {
	let listingService: ListingService;
	let listingRepository: DeepMockProxy<ListingRepository>;
	let permissionService: DeepMockProxy<PermissionService>;

	beforeAll(() => {
		listingRepository = mockDeep<ListingRepository>();
		permissionService = mockDeep<PermissionService>();
		listingService = new ListingService(listingRepository, permissionService);
	});

	describe("create", () => {
		describe("should raise InvalidArgumentError when", () => {
			interface TestCase {
				name: string;
				data: {
					name: string;
					description?: string | null;
					closesAt: Date;
					applicationUrl?: string | null;
					organizationId: string;
				};
			}
			const testCases: TestCase[] = [
				{
					name: "name is empty",
					data: {
						name: "",
						closesAt: faker.date.future(),
						organizationId: faker.string.uuid(),
					},
				},
				{
					name: "name is too long",
					data: {
						name: faker.string.sample(101),
						closesAt: faker.date.future(),
						organizationId: faker.string.uuid(),
					},
				},
				{
					name: "closesAt is in the past",
					data: {
						name: faker.word.adjective(),
						closesAt: faker.date.recent(),
						organizationId: faker.string.uuid(),
					},
				},
				{
					name: "organizationId is not a UUID",
					data: {
						name: faker.word.adjective(),
						closesAt: faker.date.recent(),
						organizationId: faker.string.sample(10),
					},
				},
				{
					name: "applicationUrl is not a valid URL",
					data: {
						name: faker.word.adjective(),
						closesAt: faker.date.recent(),
						organizationId: faker.string.uuid(),
						applicationUrl: faker.lorem.word(),
					},
				},
			];

			test.each(testCases)("$name", async ({ data }) => {
				/**
				 * Arrange
				 *
				 * Mock hasRole to return true
				 */
				permissionService.hasRole.mockResolvedValue(true);

				await expect(
					listingService.create(makeMockContext(), data),
				).rejects.toThrow(InvalidArgumentError);
			});
		});

		describe("should create when", () => {
			interface TestCase {
				name: string;
				data: {
					name: string;
					description?: string | null;
					closesAt: Date;
					applicationUrl?: string | null;
					organizationId: string;
				};
				expected: {
					name: string;
					closesAt: Date;
					organizationId: string;
					description?: string;
					applicationUrl?: string;
				};
			}
			const testCases: TestCase[] = [
				{
					name: "required fields are present",
					data: {
						name: "test listing",
						closesAt: faker.date.future(),
						organizationId: faker.string.uuid(),
					},
					expected: {
						name: "test listing",
						closesAt: expect.any(Date),
						organizationId: expect.any(String),
					},
				},
				{
					name: "applicationUrl and description are set",
					data: {
						name: "test listing",
						closesAt: faker.date.future(),
						organizationId: faker.string.uuid(),
						description: "test description",
						applicationUrl: "https://example.com",
					},
					expected: {
						name: "test listing",
						closesAt: expect.any(Date),
						organizationId: expect.any(String),
						description: "test description",
						applicationUrl: "https://example.com",
					},
				},
				{
					name: "description is null",
					data: {
						name: "test listing",
						closesAt: faker.date.future(),
						organizationId: faker.string.uuid(),
						description: null,
					},
					expected: {
						name: "test listing",
						closesAt: expect.any(Date),
						organizationId: expect.any(String),
					},
				},
				{
					name: "applicationUrl is null",
					data: {
						name: "test listing",
						closesAt: faker.date.future(),
						organizationId: faker.string.uuid(),
						applicationUrl: null,
					},
					expected: {
						name: "test listing",
						closesAt: expect.any(Date),
						organizationId: expect.any(String),
					},
				},
			];

			test.each(testCases)("$name", async ({ data, expected }) => {
				/**
				 * Arrange
				 *
				 * Mock the permission check to true
				 */
				permissionService.hasRole.mockResolvedValue(true);

				await expect(
					listingService.create(makeMockContext(), data),
				).resolves.not.toThrow();
				expect(listingRepository.create).toHaveBeenCalledWith(expected);
			});
		});

		describe("permissions", () => {
			it("should pass the correct arguments to hasRole", async () => {
				/**
				 * Arrange
				 *
				 * Mock the permission check to true
				 */
				const userId = faker.string.uuid();
				const organizationId = faker.string.uuid();
				const data = {
					name: faker.word.adjective(),
					closesAt: faker.date.future(),
					organizationId,
				};
				permissionService.hasRole.mockResolvedValue(true);

				/**
				 * Act
				 *
				 * Call create
				 */
				await expect(
					listingService.create(makeMockContext({ id: userId }), data),
				).resolves.not.toThrow();

				/**
				 * Assert
				 *
				 * Has role should have been called with userId and organizationId
				 */
				expect(permissionService.hasRole).toHaveBeenCalledWith(
					expect.anything(),
					{
						organizationId,
						role: Role.MEMBER,
					},
				);
			});

			it("should raise PermissionDeniedError if the user does not have the role", async () => {
				/**
				 * Arrange
				 *
				 * Mock the permission check to true
				 */
				const userId = faker.string.uuid();
				const organizationId = faker.string.uuid();
				const data = {
					name: faker.word.adjective(),
					closesAt: faker.date.future(),
					organizationId,
				};
				permissionService.hasRole.mockResolvedValue(false);

				/**
				 * Act
				 *
				 * Call create
				 */
				await expect(
					listingService.create(makeMockContext({ id: userId }), data),
				).rejects.toThrow(PermissionDeniedError);

				/**
				 * Assert
				 *
				 * Create should now have been called
				 */
				expect(listingRepository.create).not.toHaveBeenCalled();
			});
		});
	});
});
