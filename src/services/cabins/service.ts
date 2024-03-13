import { randomUUID } from "node:crypto";
import {
	type BookingSemester,
	type Cabin,
	FeaturePermission,
	type BookingContact as PrismaBookingContact,
	Semester,
} from "@prisma/client";
import { sumBy } from "lodash-es";
import { DateTime, Interval } from "luxon";
import { z } from "zod";
import { Booking, BookingStatus, type BookingType } from "~/domain/cabins.js";
import {
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { Context } from "~/lib/context.js";
import type { Result, ResultAsync } from "~/lib/result.js";
import type { ICabinService, NewBookingParams } from "~/lib/server.js";
import type { EmailQueueDataType } from "../mail/worker.js";

type BookingContact = Pick<
	PrismaBookingContact,
	"email" | "name" | "phoneNumber" | "id"
>;

export interface ICabinRepository {
	getCabinById(id: string): Promise<Cabin>;
	createBooking(
		params: BookingType,
	): ResultAsync<{ booking: BookingType }, InternalServerError | NotFoundError>;
	updateBooking(
		id: string,
		data: Partial<Pick<BookingType, "status" | "feedback">>,
	): ResultAsync<{ booking: BookingType }, NotFoundError | InternalServerError>;
	getBookingById(
		id: string,
	): ResultAsync<{ booking: BookingType }, NotFoundError | InternalServerError>;
	getOverlappingBookings(
		booking: BookingType,
		params: Pick<BookingType, "status">,
	): ResultAsync<{ bookings: BookingType[] }, InternalServerError>;
	getCabinByBookingId(bookingId: string): Promise<Cabin>;
	findManyCabins(): Promise<Cabin[]>;
	updateBookingSemester(data: {
		semester: Semester;
		startAt?: Date;
		endAt?: Date;
		bookingsEnabled?: boolean;
	}): Promise<BookingSemester>;
	createBookingSemester(data: {
		semester: Semester;
		startAt: Date;
		endAt: Date;
		bookingsEnabled?: boolean;
	}): Promise<BookingSemester>;
	getBookingSemester(semester: Semester): Promise<BookingSemester | null>;
	getBookingContact(): Promise<BookingContact>;
	updateBookingContact(
		data: Partial<{
			name: string | null;
			phoneNumber: string | null;
			email?: string | null;
		}>,
	): Promise<BookingContact>;
	createCabin(params: {
		name: string;
		capacity: number;
		internalPrice: number;
		externalPrice: number;
		internalPriceWeekend: number;
		externalPriceWeekend: number;
	}): ResultAsync<{ cabin: Cabin }, InternalServerError>;
	findManyBookings(
		ctx: Context,
		params: {
			cabinId?: string;
			endAtGte?: Date;
			bookingStatus?: BookingStatus;
		},
	): ResultAsync<
		{
			bookings: BookingType[];
			total: number;
		},
		InternalServerError
	>;
}

export interface PermissionService {
	hasFeaturePermission(
		ctx: Context,
		data: {
			featurePermission: FeaturePermission;
		},
	): Promise<boolean>;
}

export interface MailService {
	sendAsync(jobData: EmailQueueDataType): Promise<void>;
}

export class CabinService implements ICabinService {
	constructor(
		private cabinRepository: ICabinRepository,
		private mailService: MailService,
		private permissionService: PermissionService,
	) {}
	async findManyBookings(
		ctx: Context,
		params?: { bookingStatus?: BookingStatus | null } | null,
	): ResultAsync<
		{ bookings: BookingType[]; total: number },
		PermissionDeniedError | UnauthorizedError | InternalServerError
	> {
		ctx.log.info({ params }, "find many bookings");
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError(
					"You must be logged in to perform this action",
				),
			};
		}

		const hasPermission = await this.permissionService.hasFeaturePermission(
			ctx,
			{
				featurePermission: FeaturePermission.CABIN_ADMIN,
			},
		);

		if (!hasPermission) {
			ctx.log.warn({ params }, "permission denied");
			return {
				ok: false,
				error: new PermissionDeniedError(
					"You do not have permission to view the bookings.",
				),
			};
		}

		const findManyBookingsResult = await this.cabinRepository.findManyBookings(
			ctx,
			{
				bookingStatus: params?.bookingStatus ?? undefined,
			},
		);
		if (!findManyBookingsResult.ok) {
			return {
				ok: false,
				error: new InternalServerError(
					"Failed to find bookings",
					findManyBookingsResult.error,
				),
			};
		}

		return {
			ok: true,
			data: {
				bookings: findManyBookingsResult.data.bookings,
				total: findManyBookingsResult.data.total,
			},
		};
	}
	async getOccupiedDates(
		ctx: Context,
		params: { cabinId: string },
	): ResultAsync<{ days: Date[] }, NotFoundError | InternalServerError> {
		const findManyBookingsResult = await this.cabinRepository.findManyBookings(
			ctx,
			{
				cabinId: params.cabinId,
				endAtGte: new Date(),
				bookingStatus: "CONFIRMED",
			},
		);

		if (!findManyBookingsResult.ok) {
			return findManyBookingsResult;
		}

		const { bookings } = findManyBookingsResult.data;

		const intervals = bookings.map((booking) => {
			const startAt = DateTime.fromJSDate(booking.startDate).startOf("day");
			const endAt = DateTime.fromJSDate(booking.endDate).startOf("day");
			const interval = Interval.fromDateTimes(startAt, endAt.plus({ days: 1 }));
			return interval;
		});

		const mergedIntervals = Interval.merge(intervals);

		function isNotUndefined(date: Date | undefined): date is Date {
			return date !== null;
		}
		const days = mergedIntervals
			.flatMap((interval) => {
				if (interval.isValid) {
					const split = interval
						.splitBy({ days: 1 })
						.map((interval) => interval.start?.toJSDate());
					return split;
				}
				return [];
			})
			.filter(isNotUndefined);

		return {
			ok: true,
			data: { days },
		};
	}

	async createCabin(
		ctx: Context,
		params: {
			name: string;
			capacity: number;
			internalPrice: number;
			externalPrice: number;
			internalPriceWeekend: number;
			externalPriceWeekend: number;
		},
	): ResultAsync<
		{
			cabin: Cabin;
		},
		| PermissionDeniedError
		| UnauthorizedError
		| InvalidArgumentError
		| InternalServerError
	> {
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError(
					"You must be logged in to perform this action",
				),
			};
		}

		const hasPermission = await this.permissionService.hasFeaturePermission(
			ctx,
			{
				featurePermission: FeaturePermission.CABIN_ADMIN,
			},
		);

		if (hasPermission !== true) {
			return {
				ok: false,
				error: new PermissionDeniedError(
					"You do not have permission to create a new cabin.",
				),
			};
		}

		const createCabinResult = await this.cabinRepository.createCabin(params);

		if (!createCabinResult.ok) {
			return {
				ok: false,
				error: new InternalServerError(
					"Unexpected error occurred while creating cabin",
					createCabinResult.error,
				),
			};
		}

		return createCabinResult;
	}

	async newBooking(
		_ctx: Context,
		params: NewBookingParams,
	): ResultAsync<
		{
			booking: BookingType;
		},
		InvalidArgumentError | InternalServerError
	> {
		const bookingSemesters = await this.getBookingSemesters();
		const cabins = await Promise.all(
			params.cabins.map((cabin) => this.cabinRepository.getCabinById(cabin.id)),
		);

		const validateResult = this.validateBooking(
			params,
			bookingSemesters,
			cabins,
		);
		if (!validateResult.ok) {
			return validateResult;
		}
		const { validated: validatedData } = validateResult.data;
		const {
			startDate,
			endDate,
			internalParticipantsCount,
			externalParticipantsCount,
		} = validatedData;
		const priceResult = await this.totalCost({
			cabins: params.cabins,
			startDate,
			endDate,
			participants: {
				internal: internalParticipantsCount,
				external: externalParticipantsCount,
			},
		});
		if (!priceResult.ok) {
			switch (priceResult.error.name) {
				case "NotFoundError": {
					return {
						ok: false,
						error: new InvalidArgumentError(
							"The cabin you tried to book does not exist",
							priceResult.error,
						),
					};
				}
				case "InvalidArgumentError": {
					return {
						ok: false,
						error: new InvalidArgumentError(
							"Failed to calculate the total cost of the booking",
							priceResult.error,
						),
					};
				}
				case "InternalServerError": {
					return {
						ok: false,
						error: new InternalServerError(
							"An unknown error occurred when calculating the total cost of the booking",
							priceResult.error,
						),
					};
				}
			}
		}

		const newBooking = new Booking(
			new Booking({
				...validatedData,
				createdAt: new Date(),
				totalCost: priceResult.data.totalCost,
				status: "PENDING",
				id: randomUUID(),
				feedback: "",
			}),
		);

		const createBookingResult =
			await this.cabinRepository.createBooking(newBooking);
		if (!createBookingResult.ok) {
			switch (createBookingResult.error.name) {
				case "NotFoundError":
					return {
						ok: false,
						error: new InvalidArgumentError(
							"The cabin you tried to book does not exist",
							createBookingResult.error,
						),
					};
				case "InternalServerError":
					return {
						ok: false,
						error: new InternalServerError(
							"An unknown error occurred",
							createBookingResult.error,
						),
					};
			}
		}
		const { booking } = createBookingResult.data;
		await this.sendBookingConfirmation(booking);
		return {
			ok: true,
			data: {
				booking,
			},
		};
	}

	getCabinByBookingId(bookingId: string): Promise<Cabin> {
		return this.cabinRepository.getCabinByBookingId(bookingId);
	}

	getCabin(id: string): Promise<Cabin> {
		return this.cabinRepository.getCabinById(id);
	}

	/**
	 * isInActiveBookingSemester returns true if the booking is in the given booking semester, and bookings are enabled.
	 * @param data.startDate - The start date of the booking
	 * @param data.endDate - The end date of the booking
	 * @param bookingSemester - The booking semester to check against
	 * @returns true if the booking is in the given booking semester, and bookings are enabled, false otherwise
	 */
	private isInActiveBookingSemester(
		data: { startDate: Date; endDate: Date },
		bookingSemester: BookingSemester | null,
	) {
		if (bookingSemester === null) return false;
		if (!bookingSemester.bookingsEnabled) return false;
		return (
			data.startDate >= bookingSemester.startAt &&
			data.endDate <= bookingSemester.endAt
		);
	}

	/**
	 * isCrossSemesterBooking returns true if the booking is a valid cross-semester booking, i.e.
	 * the booking starts in one semester, and ends in the other. Requires that both semeters have bookings enabled,
	 * and that the end of one semester overlaps with the start of the other. That is, if the start of the next semester
	 * is not before, or the day after the end of the previous semester, there can be no valid cross-semester bookings.
	 * @param data.startDate - The start date of the booking
	 * @param data.endDate - The end date of the booking
	 * @param bookingSemesters.fall - The fall booking semester
	 * @param bookingSemesters.spring - The spring booking semester
	 * @returns true if the booking is a valid cross-semester booking, false otherwise
	 */
	private isCrossSemesterBooking(
		data: { startDate: Date; endDate: Date },
		bookingSemesters: {
			fall: BookingSemester | null;
			spring: BookingSemester | null;
		},
	) {
		const { fall, spring } = bookingSemesters;
		// If one of the booking semeters are disabled, there can be no valid cross-semester bookings.
		if (!fall?.bookingsEnabled || !spring?.bookingsEnabled) return false;

		const endOfAutumnOverlapsWithStartOfSpring =
			DateTime.fromJSDate(fall.endAt).plus({ days: 1 }).startOf("day") >=
			DateTime.fromJSDate(spring.startAt).startOf("day");

		const endOfSpringOverlapsWithStartOfAutumn =
			DateTime.fromJSDate(spring.endAt).plus({ days: 1 }).startOf("day") >=
			DateTime.fromJSDate(fall.startAt).startOf("day");

		// If none of the booking semesters overlap, there can be no valid cross-semester bookings.
		if (
			!endOfAutumnOverlapsWithStartOfSpring &&
			!endOfSpringOverlapsWithStartOfAutumn
		)
			return false;

		const { startDate, endDate } = data;

		/**
		 * If the booking starts in fall and ends in spring, and the end of fall overlaps with the start of spring,
		 * the booking is valid.
		 */
		const startsInAutumn = startDate >= fall.startAt && startDate <= fall.endAt;
		const endsInSpring = endDate >= spring.startAt && endDate <= spring.endAt;
		if (startsInAutumn && endsInSpring && endOfAutumnOverlapsWithStartOfSpring)
			return true;

		/**
		 * If the booking starts in spring and ends in fall, and the end of spring overlaps with the start of fall,
		 * the booking is valid.
		 */
		const startsInSpring =
			startDate >= spring.startAt && startDate <= spring.endAt;
		const endsInAutumn = endDate >= fall.startAt && endDate <= fall.endAt;
		return (
			startsInSpring && endsInAutumn && endOfSpringOverlapsWithStartOfAutumn
		);
	}

	private validateBooking(
		data: NewBookingParams,
		bookingSemesters: {
			spring: BookingSemester | null;
			fall: BookingSemester | null;
		},
		cabins: Cabin[],
	): Result<
		{
			validated: Omit<
				BookingType,
				"id" | "status" | "totalCost" | "createdAt" | "feedback"
			>;
		},
		InvalidArgumentError
	> {
		const { fall, spring } = bookingSemesters;

		if (!fall?.bookingsEnabled && !spring?.bookingsEnabled)
			return {
				ok: false,
				error: new InvalidArgumentError("Bookings are not enabled."),
			};

		const bookingSchema = z
			.object({
				firstName: z.string().min(1, "first name must be at least 1 character"),
				lastName: z.string().min(1, "last name must be at least 1 character"),
				startDate: z
					.date()
					.min(new Date(), { message: "start date must be in the future" }),
				endDate: z
					.date()
					.min(new Date(), { message: "end date must be in the future" }),
				email: z.string().email({ message: "invalid email" }),
				phoneNumber: z.string().regex(/^(0047|\+47|47)?\d{8}$/, {
					message: "invalid phone number",
				}),
				cabins: z
					.array(
						z.object({ id: z.string().uuid({ message: "invalid cabin id" }) }),
					)
					.min(1, "at least one cabin must be booked"),
				internalParticipantsCount: z
					.number()
					.min(0, "internal participants must be at least 0"),
				externalParticipantsCount: z
					.number()
					.min(0, "external participants must be at least 0"),
				questions: z
					.string()
					.nullish()
					.transform((val) => val ?? ""),
			})
			.refine((obj) => obj.endDate > obj.startDate, {
				message: "end date must be after start date",
				path: ["startDate", "endDate"],
			})
			.refine(
				(obj) => {
					const isValidAutumnBooking = this.isInActiveBookingSemester(
						obj,
						fall,
					);
					if (isValidAutumnBooking) return true;

					const isValidSpringBooking = this.isInActiveBookingSemester(
						obj,
						spring,
					);
					if (isValidSpringBooking) return true;

					const isValidCrossSemesterBooking = this.isCrossSemesterBooking(obj, {
						spring,
						fall,
					});
					return isValidCrossSemesterBooking;
				},
				{
					message:
						"booking is not in an active booking semester, and is not a valid cross-semester booking",
					path: ["startDate", "endDate"],
				},
			)
			.refine(
				(obj) => {
					const maximumParticipants = sumBy(cabins, "capacity");
					const totalParticipants =
						obj.internalParticipantsCount + obj.externalParticipantsCount;
					return totalParticipants <= maximumParticipants;
				},
				{
					message: "too many participants for the selected cabins",
					path: ["internalParticipantsCount", "externalParticipantsCount"],
				},
			);
		const parseResult = bookingSchema.safeParse(data);
		if (!parseResult.success) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"Invalid booking data",
					parseResult.error,
				),
			};
		}
		return {
			ok: true,
			data: {
				validated: parseResult.data,
			},
		};
	}

	private async sendBookingConfirmation(booking: BookingType) {
		await this.mailService.sendAsync({
			type: "cabin-booking-receipt",
			bookingId: booking.id,
		});
	}

	/**
	 * updateBookingStatus updates the status of a booking. Requires MEMBER role and CABIN_ADMIN permission.
	 *
	 * @throws {PermissionDeniedError} if the user does not have permission to update the booking
	 * @throws {InvalidArgumentError} if the new status is CONFIRMED and the booking overlaps with another booking
	 * @param userId - The id of the user performing the update
	 * @param id - The id of the booking to update
	 * @param status - The new status of the booking
	 * @returns The updated booking
	 */
	async updateBookingStatus(
		ctx: Context,
		params: {
			bookingId: string;
			status: BookingStatus;
			feedback?: string | null;
		},
	): ResultAsync<
		{ booking: BookingType },
		| InternalServerError
		| NotFoundError
		| InvalidArgumentError
		| PermissionDeniedError
		| UnauthorizedError
	> {
		const { bookingId: id, status, feedback } = params;
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError(
					"You must be logged in to perform this action",
				),
			};
		}

		const hasPermission = await this.permissionService.hasFeaturePermission(
			ctx,
			{
				featurePermission: FeaturePermission.CABIN_ADMIN,
			},
		);

		if (!hasPermission)
			return {
				ok: false,
				error: new PermissionDeniedError(
					"You do not have permission to update this booking.",
				),
			};

		if (status === BookingStatus.CONFIRMED) {
			const getBookingResult = await this.cabinRepository.getBookingById(id);
			if (!getBookingResult.ok) {
				return getBookingResult;
			}
			const { booking } = getBookingResult.data;

			const getOverlappingBookingsResult =
				await this.cabinRepository.getOverlappingBookings(booking, { status });
			if (!getOverlappingBookingsResult.ok) {
				return {
					ok: false,
					error: new InternalServerError(
						"An unknown error occurred",
						getOverlappingBookingsResult.error,
					),
				};
			}
			const { bookings } = getOverlappingBookingsResult.data;
			if (bookings.length > 0) {
				return {
					ok: false,
					error: new InvalidArgumentError(
						"this booking overlaps with another confirmed booking",
					),
				};
			}
		}
		return this.cabinRepository.updateBooking(id, {
			status,
			feedback: feedback ?? undefined,
		});
	}

	/**
	 * findManyCabins returns all cabins.
	 */
	findManyCabins(): Promise<Cabin[]> {
		return this.cabinRepository.findManyCabins();
	}

	/**
	 * updateBookingSemester updates a booking semester. If a booking semester does not already
	 * exist for the given semester, a new one will be created, with `startAt` default to the
	 * first day of the semester and `endAt` default to the last day of the semester.
	 *
	 * @requires a membership in an organization with the CABIN_ADMIN feature permission.
	 *
	 * @param userId - The id of the user performing the update
	 * @param data - The new booking semester data
	 * @returns The updated booking semester
	 */
	async updateBookingSemester(
		ctx: Context,
		data: {
			semester: Semester;
			startAt?: Date | null;
			endAt?: Date | null;
			bookingsEnabled?: boolean | null;
		},
	) {
		const hasPermission = await this.permissionService.hasFeaturePermission(
			ctx,
			{
				featurePermission: FeaturePermission.CABIN_ADMIN,
			},
		);

		if (!hasPermission)
			throw new PermissionDeniedError(
				"You do not have permission to update the booking semester.",
			);

		const schema = z.object({
			semester: z.nativeEnum(Semester),
			startAt: z
				.date()
				.nullish()
				.transform((val) => val ?? undefined),
			endAt: z
				.date()
				.nullish()
				.transform((val) => val ?? undefined),
			bookingsEnabled: z
				.boolean()
				.nullish()
				.transform((val) => val ?? undefined),
		});
		try {
			const { semester, startAt, endAt, bookingsEnabled } = schema.parse(data);

			return await this.cabinRepository.updateBookingSemester({
				semester,
				startAt,
				endAt,
				bookingsEnabled,
			});
		} catch (err) {
			if (err instanceof z.ZodError) {
				throw new InvalidArgumentError(err.message);
			}
			if (err instanceof NotFoundError) {
				/**
				 * If the booking semester does not exist, create it.
				 */
				return this.createBookingSemester(data);
			}
			throw err;
		}
	}

	/**
	 * createBookingSemester creates a new booking semester. If `startAt` or `endAt` is not provided, they will default to
	 * the first and last day of the semester respectively. If `bookingEnabled` is not provided, it will default to `false`.
	 */
	private async createBookingSemester(data: {
		semester: Semester;
		startAt?: Date | null;
		endAt?: Date | null;
		bookingsEnabled?: boolean | null;
	}) {
		try {
			const schema = z.object({
				semester: z.nativeEnum(Semester),
				startAt: z.date().default(
					DateTime.fromObject({
						month: data.semester === "SPRING" ? 1 : 8,
						day: 1,
					}).toJSDate(),
				),
				endAt: z.date().default(
					DateTime.fromObject({
						month: data.semester === "SPRING" ? 7 : 12,
						day: 31,
					}).toJSDate(),
				),
				bookingsEnabled: z.boolean().default(false),
			});

			const { semester, startAt, endAt, bookingsEnabled } = schema.parse(data);

			return await this.cabinRepository.createBookingSemester({
				semester,
				startAt: startAt,
				endAt: endAt,
				bookingsEnabled,
			});
		} catch (err) {
			if (err instanceof z.ZodError) {
				throw new InvalidArgumentError(err.message);
			}
			throw err;
		}
	}

	private async getBookingSemesters(): Promise<{
		spring: BookingSemester | null;
		fall: BookingSemester | null;
	}> {
		const [spring, fall] = await Promise.all([
			this.getBookingSemester("SPRING"),
			this.getBookingSemester("FALL"),
		]);
		return {
			spring,
			fall,
		};
	}

	/**
	 * getBookingSemester returns the booking semester for the given semester, or null if it does not exist.
	 */
	getBookingSemester(semester: Semester): Promise<BookingSemester | null> {
		return this.cabinRepository.getBookingSemester(semester);
	}

	/**
	 * updateBookingContact updates the booking contact information.
	 *
	 * @throws {PermissionDeniedError} if the user does not have permission to update the booking contact
	 * @throws {InvalidArgumentError} if the new booking contact data is invalid
	 * @param userId - The id of the user performing the update
	 * @param data - The new booking contact data
	 *
	 */
	async updateBookingContact(
		ctx: Context,
		data: Partial<{
			name: string | null;
			email: string | null;
			phoneNumber: string | null;
		}>,
	): Promise<BookingContact> {
		const hasPermission = await this.permissionService.hasFeaturePermission(
			ctx,
			{
				featurePermission: FeaturePermission.CABIN_ADMIN,
			},
		);

		if (!hasPermission)
			throw new PermissionDeniedError(
				"You do not have permission to update the booking contact.",
			);

		const schema = z.object({
			name: z
				.string()
				.nullish()
				.transform((val) => val ?? undefined),
			email: z
				.string()
				.email()
				.nullish()
				.transform((val) => val ?? undefined),
			phoneNumber: z
				.string()
				.regex(/^(0047|\+47|47)?\d{8}$/, {
					message: "invalid phone number",
				})
				.nullish()
				.transform((val) => val ?? undefined),
		});

		try {
			const { name, email, phoneNumber } = schema.parse(data);

			return await this.cabinRepository.updateBookingContact({
				name,
				email,
				phoneNumber,
			});
		} catch (err) {
			if (err instanceof z.ZodError) {
				throw new InvalidArgumentError(err.message);
			}
			throw err;
		}
	}

	/**
	 * getBookingContact returns the booking contact information.
	 */
	async getBookingContact(): Promise<BookingContact> {
		return await this.cabinRepository.getBookingContact();
	}

	async getBooking(by: { id: string }): ResultAsync<
		{ booking: BookingType },
		InternalServerError | NotFoundError
	> {
		const getBookingResult = await this.cabinRepository.getBookingById(by.id);
		return getBookingResult;
	}

	/**
	 * Sunday to Thursday use internalPrice/externalPrice
	 * Friday and Saturday use internalPriceWeekend/externalPriceWeekend
	 *
	 * If there are more internal participants than external, use internal price, else use external price
	 */
	async totalCost(data: {
		startDate: Date;
		endDate: Date;
		participants: {
			internal: number;
			external: number;
		};
		cabins: { id: string }[];
	}): ResultAsync<
		{ totalCost: number },
		InternalServerError | NotFoundError | InvalidArgumentError
	> {
		const { startDate, endDate, participants } = data;
		const cabins = await Promise.all(
			data.cabins.map((cabin) => this.cabinRepository.getCabinById(cabin.id)),
		);

		const isInternalPrice = participants.internal >= participants.external;
		// Number of week nights, i.e. nights from Sunday to Thursday
		let numberOfWeekdayNights = 0;
		// Number of weekend nights, i.e. nights from Friday to Saturday
		let numberOfWeekendNights = 0;
		const interval = DateTime.fromJSDate(startDate).until(
			DateTime.fromJSDate(endDate),
		);
		if (interval.isValid) {
			for (const day of interval.splitBy({ days: 1 })) {
				const weekday = day.start?.weekday;
				if (weekday === 5 || weekday === 6) {
					numberOfWeekendNights += 1;
				} else {
					numberOfWeekdayNights += 1;
				}
			}
		} else {
			return {
				ok: false,
				error: new InvalidArgumentError("Invalid date interval"),
			};
		}

		let weekdayPrice = 0;
		let weekendPrice = 0;

		if (isInternalPrice) {
			weekdayPrice = sumBy(cabins, "internalPrice");
			weekendPrice = sumBy(cabins, "internalPriceWeekend");
		} else {
			weekdayPrice = sumBy(cabins, "externalPrice");
			weekendPrice = sumBy(cabins, "externalPriceWeekend");
		}

		const totalCost =
			weekdayPrice * numberOfWeekdayNights +
			weekendPrice * numberOfWeekendNights;

		return { ok: true, data: { totalCost } };
	}
}
