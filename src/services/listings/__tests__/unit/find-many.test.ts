import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mockDeep } from "jest-mock-extended";
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

	describe("#findMany", () => {
		it("should try to fetch listings for an organization", async () => {
			/**
			 * Arrange
			 */
			const organizationId = faker.string.uuid();

			/**
			 * Act
			 */
			await listingService.findMany({ organizationId });
			expect(listingRepository.findMany).toHaveBeenCalledWith({
				organizationId,
			});
		});
	});
});
