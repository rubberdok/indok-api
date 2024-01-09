import { faker } from "@faker-js/faker";
import type { Organization } from "@prisma/client";
import { NotFoundError } from "~/domain/errors.js";
import prisma from "~/lib/prisma.js";
import { ListingRepository } from "../../repository.js";

describe("ListingRepository", () => {
	let listingRepository: ListingRepository;
	let organization: Organization;

	beforeAll(async () => {
		listingRepository = new ListingRepository(prisma);
		/**
		 * All listings need an organization, but it affects nothing else.
		 */
		organization = await prisma.organization.create({
			data: {
				name: faker.string.sample(20),
			},
		});
	});

	describe("create", () => {
		it("creates a listing", async () => {
			const actual = await listingRepository.create({
				name: faker.word.adjective(),
				closesAt: faker.date.future(),
				organizationId: organization.id,
			});

			expect(actual).toBeDefined();
		});

		it("raises an error if organization ID is not valid", () => {
			const actual = listingRepository.create({
				name: faker.word.adjective(),
				closesAt: faker.date.future(),
				organizationId: faker.string.uuid(),
			});

			expect(actual).rejects.toThrow();
		});
	});

	describe("update", () => {
		it("updates the listing", async () => {
			/**
			 * Arrange
			 *
			 * Create a listing to update.
			 */
			const listing = await makeListing({ organizationId: organization.id });

			const actual = await listingRepository.update(listing.id, {
				name: "new name",
				closesAt: faker.date.future(),
				description: undefined,
			});

			expect(actual).toBeDefined();
			expect(actual.name).toEqual("new name");
			expect(actual.closesAt).not.toEqual(listing.closesAt);
			expect(actual.closesAt).toEqual(expect.any(Date));
			expect(actual.description).toEqual(listing.description);
		});

		it("raises a NotFoundError if the listing does not exist", async () => {
			const actual = listingRepository.update(faker.string.uuid(), {
				name: faker.word.adjective(),
			});
			await expect(actual).rejects.toThrow(NotFoundError);
		});
	});

	describe("get", () => {
		it("gets the listing", async () => {
			/**
			 * Arrange
			 *
			 * Create a listing to get
			 */
			const listing = await makeListing({ organizationId: organization.id });

			const actual = await listingRepository.get(listing.id);

			expect(actual).toBeDefined();
			expect(actual).toEqual(listing);
		});

		it("raises a NotFoundError if the listing does not exist", async () => {
			const actual = listingRepository.get(faker.string.uuid());
			await expect(actual).rejects.toThrow(NotFoundError);
		});
	});

	describe("delete", () => {
		it("deletes the listing", async () => {
			/**
			 * Arrange
			 *
			 * Create a listing to get
			 */
			const listing = await makeListing({ organizationId: organization.id });

			const actual = await listingRepository.delete(listing.id);

			expect(actual).toBeDefined();
			expect(actual).toEqual(listing);
		});

		it("raises a NotFoundError if the listing does not exist", async () => {
			const actual = listingRepository.delete(faker.string.uuid());
			await expect(actual).rejects.toThrow(NotFoundError);
		});
	});

	describe("findMany", () => {
		it("retrieves all listings", async () => {
			/**
			 * Arrange
			 *
			 * Create 3 listings
			 */
			const listing1 = await makeListing({ organizationId: organization.id });
			const listing2 = await makeListing({ organizationId: organization.id });
			const listing3 = await makeListing({ organizationId: organization.id });

			// Act
			const actual = await listingRepository.findMany();

			/**
			 * Assert
			 *
			 * All three listings should be present in the response
			 */
			expect(actual).toBeDefined();
			expect(actual.length).toBeGreaterThanOrEqual(3);
			expect(actual).toContainEqual(listing1);
			expect(actual).toContainEqual(listing2);
			expect(actual).toContainEqual(listing3);
		});
	});
});

function makeListing(data: { organizationId: string }) {
	const { organizationId } = data;
	return prisma.listing.create({
		data: {
			name: faker.word.adjective(),
			closesAt: faker.date.future(),
			organizationId: organizationId,
			description: faker.word.adverb(),
		},
	});
}
