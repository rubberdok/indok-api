import type { Prisma, PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import { pick } from "lodash-es";
import {
	Booking,
	BookingContact,
	BookingSemester,
	type BookingSemesterEnumType,
	type BookingStatusType,
	BookingTerms,
	type BookingType,
	Cabin,
} from "~/domain/cabins.js";
import {
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
} from "~/domain/errors.js";
import type { Context } from "~/lib/context.js";
import { prismaKnownErrorCodes } from "~/lib/prisma.js";
import { Result, type ResultAsync } from "~/lib/result.js";
import type { ICabinRepository } from "~/services/cabins/service.js";

export class CabinRepository implements ICabinRepository {
	constructor(private db: PrismaClient) {}

	async getBookingTerms(
		ctx: Context,
		params: { id?: string },
	): ResultAsync<
		{ bookingTerms: BookingTerms },
		InternalServerError | NotFoundError
	> {
		if (params.id) {
			ctx.log.info({ id: params.id }, "Getting booking bookingTerms");
			const bookingTerms = await this.db.bookingTerms.findUnique({
				where: {
					id: params.id,
				},
			});
			if (bookingTerms === null) {
				return Result.error(new NotFoundError("Booking terms not found"));
			}
			return Result.success({
				bookingTerms: new BookingTerms(bookingTerms),
			});
		}

		ctx.log.info("Getting latest booking bookingTerms");
		const bookingTerms = await this.db.bookingTerms.findFirst({
			orderBy: {
				createdAt: "desc",
			},
		});
		if (bookingTerms === null) {
			return Result.error(new NotFoundError("Booking terms not found"));
		}
		return Result.success({
			bookingTerms: new BookingTerms(bookingTerms),
		});
	}

	async createBookingTerms(
		ctx: Context,
		data: { fileId: string },
	): ResultAsync<{ bookingTerms: BookingTerms }, InternalServerError> {
		ctx.log.info({ fileId: data.fileId }, "Creating bookingTerms");
		const bookingTerms = await this.db.bookingTerms.create({
			data: {
				fileId: data.fileId,
			},
		});

		return Result.success({
			bookingTerms: new BookingTerms(bookingTerms),
		});
	}

	async updateCabin(
		_ctx: Context,
		params: { id: string } & Partial<{
			name: string;
			internalPrice: number;
			externalPrice: number;
			internalPriceWeekend: number;
			externalPriceWeekend: number;
			capacity: number;
		}>,
	): ResultAsync<{ cabin: Cabin }, NotFoundError | InternalServerError> {
		const permittedFields = pick(params, [
			"capacity",
			"externalPrice",
			"externalPriceWeekend",
			"internalPrice",
			"internalPriceWeekend",
			"name",
		]);

		try {
			const updated = await this.db.cabin.update({
				where: {
					id: params.id,
				},
				data: permittedFields,
			});

			return Result.success({
				cabin: new Cabin(updated),
			});
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND) {
					return Result.error(new NotFoundError("Cabin not found", err));
				}
				if (err.code === prismaKnownErrorCodes.ERR_INCONSISTENT_COLUMN_DATA) {
					return Result.error(new NotFoundError("Cabin not found", err));
				}
			}
			return Result.error(
				new InternalServerError("Failed to update cabin", err),
			);
		}
	}

	async findManyBookings(
		ctx: Context,
		params?: {
			cabinId?: string;
			endAtGte?: Date;
			bookingStatus?: BookingStatusType;
		},
	): ResultAsync<
		{ bookings: BookingType[]; total: number },
		InternalServerError
	> {
		ctx.log.info(params, "Finding bookings for cabin");
		const where: Prisma.BookingWhereInput = {
			status: params?.bookingStatus,
			cabins: {
				some: {
					id: params?.cabinId,
				},
			},
			endDate: {
				gte: params?.endAtGte,
			},
		};

		try {
			const findManyPromise = this.db.booking.findMany({
				include: {
					cabins: {
						select: {
							id: true,
						},
					},
				},
				where,
			});
			const countPromise = this.db.booking.count({
				where,
			});
			const [bookings, total] = await this.db.$transaction([
				findManyPromise,
				countPromise,
			]);

			return {
				ok: true,
				data: {
					bookings: bookings.map((booking) => new Booking(booking)),
					total,
				},
			};
		} catch (err) {
			return {
				ok: false,
				error: new InternalServerError(
					"Failed to find bookings for cabin",
					err,
				),
			};
		}
	}

	async createCabin(params: {
		name: string;
		capacity: number;
		internalPrice: number;
		externalPrice: number;
		internalPriceWeekend: number;
		externalPriceWeekend: number;
	}): ResultAsync<
		{
			cabin: Cabin;
		},
		InternalServerError
	> {
		try {
			const cabin = await this.db.cabin.create({
				data: {
					name: params.name,
					capacity: params.capacity,
					internalPrice: params.internalPrice,
					externalPrice: params.externalPrice,
					internalPriceWeekend: params.internalPriceWeekend,
					externalPriceWeekend: params.externalPriceWeekend,
				},
			});
			return {
				ok: true,
				data: {
					cabin: new Cabin(cabin),
				},
			};
		} catch (err) {
			return {
				ok: false,
				error: new InternalServerError("Failed to create cabin", err),
			};
		}
	}

	async updateBooking(
		id: string,
		data: Partial<Pick<BookingType, "status" | "feedback">>,
	): ResultAsync<
		{ booking: BookingType },
		InternalServerError | NotFoundError
	> {
		try {
			const booking = await this.db.booking.update({
				where: {
					id,
				},
				data,
				include: {
					cabins: {
						select: {
							id: true,
						},
					},
				},
			});
			return {
				ok: true,
				data: {
					booking: new Booking(booking),
				},
			};
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND) {
					return {
						ok: false,
						error: new NotFoundError("Booking not found", err),
					};
				}
			}
			return {
				ok: false,
				error: new InternalServerError("Failed to update booking", err),
			};
		}
	}

	async createBooking(
		params: BookingType,
	): ResultAsync<
		{ booking: BookingType },
		InternalServerError | NotFoundError
	> {
		const { cabins, ...rest } = params;
		try {
			const booking = await this.db.booking.create({
				include: {
					cabins: {
						select: {
							id: true,
						},
					},
				},
				data: {
					...rest,
					cabins: {
						connect: cabins,
					},
				},
			});
			return {
				ok: true,
				data: {
					booking: new Booking(booking),
				},
			};
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND) {
					return {
						ok: false,
						error: new NotFoundError("Cabins not found", err),
					};
				}
			}
			return {
				ok: false,
				error: new InternalServerError("Failed to create booking", err),
			};
		}
	}

	async getBookingById(
		id: string,
	): ResultAsync<
		{ booking: BookingType },
		NotFoundError | InternalServerError
	> {
		try {
			const booking = await this.db.booking.findFirst({
				include: {
					cabins: {
						select: {
							id: true,
						},
					},
				},
				where: {
					id,
				},
			});
			if (booking === null) {
				return {
					ok: false,
					error: new NotFoundError("Booking not found"),
				};
			}
			return {
				ok: true,
				data: {
					booking: new Booking(booking),
				},
			};
		} catch (err) {
			return {
				ok: false,
				error: new InternalServerError("Failed to get booking", err),
			};
		}
	}

	async getOverlappingBookings(
		booking: BookingType,
		params: Pick<BookingType, "status">,
	): ResultAsync<{ bookings: BookingType[] }, InternalServerError> {
		const { id, startDate, endDate } = booking;
		const { status } = params;
		try {
			const bookings = await this.db.booking.findMany({
				include: {
					cabins: {
						select: {
							id: true,
						},
					},
				},
				where: {
					/**
					 * The conditions for overlapping bookings are:
					 * 1. The booking has at least one cabin in common with the other booking
					 * 2. The booking is not the same as the other booking
					 * 3. The booking starts before the other booking ends
					 * 4. The booking ends after the other booking starts
					 */
					AND: [
						{
							// Only consider bookings with the given status
							status,
						},
						{
							cabins: {
								some: {
									id: {
										in: booking.cabins.map((cabin) => cabin.id),
									},
								},
							},
						},
						{
							NOT: {
								id,
							},
						},

						{
							AND: [
								{
									startDate: {
										lt: endDate,
									},
								},
								{
									endDate: {
										gt: startDate,
									},
								},
							],
						},
					],
				},
			});
			return {
				ok: true,
				data: {
					bookings: bookings.map((booking) => new Booking(booking)),
				},
			};
		} catch (err) {
			return {
				ok: false,
				error: new InternalServerError(
					"Failed to get overlapping bookings",
					err,
				),
			};
		}
	}

	async getCabinById(id: string): Promise<Cabin> {
		const cabin = await this.db.cabin.findFirstOrThrow({
			where: {
				id,
			},
		});
		return new Cabin(cabin);
	}

	/**
	 * getCabinBookingById returns the cabin that has a booking with the given ID.
	 */
	async getCabinByBookingId(bookingId: string): Promise<Cabin> {
		const cabin = await this.db.cabin.findFirst({
			where: {
				bookings: {
					some: {
						id: bookingId,
					},
				},
			},
		});

		if (!cabin) throw new NotFoundError("No matching booking found");
		return new Cabin(cabin);
	}

	/**
	 * findManyCabins returns all cabins.
	 */
	async findManyCabins(): Promise<Cabin[]> {
		const cabins = await this.db.cabin.findMany();
		return cabins.map((cabin) => new Cabin(cabin));
	}

	/**
	 * updateBookingSemester updates the semester of the booking with the given ID.
	 */
	async updateBookingSemester(data: {
		semester: BookingSemesterEnumType;
		startAt?: Date;
		endAt?: Date;
		bookingsEnabled?: boolean;
	}): Promise<BookingSemester> {
		try {
			const bookingSemester = await this.db.bookingSemester.update({
				where: {
					semester: data.semester,
				},
				data: {
					startAt: data.startAt,
					endAt: data.endAt,
					bookingsEnabled: data.bookingsEnabled,
				},
			});

			return new BookingSemester(bookingSemester);
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND)
					throw new NotFoundError(
						`No booking semester for ${data.semester} found, please create one first`,
					);
			}
			throw err;
		}
	}

	/**
	 * createBookingSemester creates a new booking semester.
	 */
	async createBookingSemester(data: {
		semester: BookingSemesterEnumType;
		startAt: Date;
		endAt: Date;
		bookingsEnabled?: boolean;
	}): Promise<BookingSemester> {
		try {
			const bookingSemester = await this.db.bookingSemester.create({
				data: {
					semester: data.semester,
					startAt: data.startAt,
					endAt: data.endAt,
					bookingsEnabled: data.bookingsEnabled,
				},
			});
			return new BookingSemester(bookingSemester);
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === prismaKnownErrorCodes.ERR_UNIQUE_CONSTRAINT_VIOLATION)
					throw new InvalidArgumentError(
						`A booking semester for ${data.semester} already exists`,
					);
			}
			throw err;
		}
	}

	/**
	 * getBookingSemester returns the booking semester for the given semester, or null if it does not exist.
	 */
	async getBookingSemester(
		semester: BookingSemesterEnumType,
	): Promise<BookingSemester | null> {
		const bookingSemester = await this.db.bookingSemester.findUnique({
			where: {
				semester,
			},
		});
		if (bookingSemester === null) return null;

		return new BookingSemester(bookingSemester);
	}

	/**
	 * updateBookingContact updates the contact information of the booking with the given ID.
	 * If the booking contact does not already exist, it will be created.
	 */
	async updateBookingContact(
		data: Partial<{ name: string; email: string; phoneNumber: string }>,
	): Promise<
		Pick<BookingContact, "email" | "name" | "id" | "phoneNumber" | "updatedAt">
	> {
		return new BookingContact(
			await this.db.bookingContact.upsert({
				select: {
					id: true,
					name: true,
					email: true,
					phoneNumber: true,
					updatedAt: true,
				},
				where: {
					id: "booking-contact",
				},
				create: {
					id: "booking-contact",
					name: data.name,
					email: data.email,
					phoneNumber: data.phoneNumber,
				},
				update: data,
			}),
		);
	}

	/**
	 * getBookingContact returns the booking contact information. If it does not exist, blank strings will be returned.
	 */
	async getBookingContact(): Promise<
		Pick<BookingContact, "email" | "id" | "name" | "phoneNumber" | "updatedAt">
	> {
		const bookingContact = await this.db.bookingContact.findUnique({
			select: {
				id: true,
				name: true,
				email: true,
				phoneNumber: true,
				updatedAt: true,
			},
			where: {
				id: "booking-contact",
			},
		});

		if (bookingContact === null) {
			return new BookingContact({
				id: "booking-contact",
				name: "",
				email: "",
				phoneNumber: "",
				updatedAt: new Date(),
			});
		}

		return new BookingContact(bookingContact);
	}
}
