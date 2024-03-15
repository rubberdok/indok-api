import type { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import { NotFoundError } from "~/domain/errors.js";
import { Listing } from "~/domain/listings.js";

export class ListingRepository {
	constructor(private db: PrismaClient) {}

	/**
	 * create creates a new listing. Undefined fields are omitted.
	 * @param data - the data to create a listing
	 * @returns the created listing
	 */
	create(data: {
		name: string;
		closesAt: Date;
		organizationId: string;
		description?: string;
		applicationUrl?: string;
	}): Promise<Listing> {
		return this.db.listing.create({
			data,
		});
	}

	/**
	 * update updates a listing. Undefined fields are omitted.
	 * @param id - the id of the listing
	 * @param data - the data to update a listing
	 * @returns the updated listing
	 */
	async update(
		id: string,
		data: Partial<{
			name: string;
			closesAt: Date;
			description: string;
			applicationUrl: string;
		}>,
	): Promise<Listing> {
		try {
			return new Listing(
				await this.db.listing.update({
					where: {
						id,
					},
					data,
				}),
			);
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === "P2025") {
					throw new NotFoundError(`Listing with id ${id} not found`);
				}
			}
			throw err;
		}
	}

	/**
	 * delete deletes a listing
	 * @throws {NotFoundError} if the listing is not found
	 * @param id - the id of the listing to delete
	 * @returns the deleted listing
	 */
	async delete(id: string): Promise<Listing> {
		try {
			return new Listing(
				await this.db.listing.delete({
					where: {
						id,
					},
				}),
			);
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === "P2025") {
					throw new NotFoundError(`Listing with id ${id} not found`);
				}
			}
			throw err;
		}
	}

	/**
	 * get returns a listing by id
	 * @throws {NotFoundError} if the listing is not found
	 * @param id - the id of the listing
	 * @returns the listing
	 */
	async get(id: string): Promise<Listing> {
		const listing = await this.db.listing.findUnique({
			where: {
				id,
			},
		});
		if (listing === null)
			throw new NotFoundError(`Listing with id ${id} not found`);
		return new Listing(listing);
	}

	/**
	 * findMany returns all listings
	 * @returns all listings
	 */
	async findMany(params?: { organizationId?: string }): Promise<Listing[]> {
		if (params?.organizationId) {
			const listings = await this.db.listing.findMany({
				where: {
					organizationId: params.organizationId,
				},
			});
			return listings.map((listing) => new Listing(listing));
		}
		const listings = await this.db.listing.findMany();
		return listings.map((listing) => new Listing(listing));
	}
}
