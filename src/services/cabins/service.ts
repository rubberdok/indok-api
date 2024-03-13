import { randomUUID } from "node:crypto";
import {
	type BookingSemester,
	type Cabin,
	FeaturePermission,
	type BookingContact as PrismaBookingContact,
	Semester,
} from "@prisma/client";
import { compact, range, sumBy } from "lodash-es";
import { DateTime, Interval } from "luxon";
import { z } from "zod";
import {
	Booking,
	BookingStatus,
	type BookingType,
	type CalendarDay,
	type CalendarMonth,
} from "~/domain/cabins.js";
import {
	InternalServerError,
	InvalidArgumentError,
	type InvalidArugmentErrorType,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
	newInvalidArgumentError,
} from "~/domain/errors.js";
import type { Context } from "~/lib/context.js";
import { Result, type ResultAsync, type TResult } from "~/lib/result.js";
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
			return Result.error(
				new PermissionDeniedError(
					"You do not have permission to view the bookings.",
				),
			);
		}

		const findManyBookingsResult = await this.cabinRepository.findManyBookings(
			ctx,
			{
				bookingStatus: params?.bookingStatus ?? undefined,
			},
		);
		if (!findManyBookingsResult.ok) {
			return Result.error(
				new InternalServerError(
					"Failed to find bookings",
					findManyBookingsResult.error,
				),
			);
		}

		return {
			ok: true,
			data: {
				bookings: findManyBookingsResult.data.bookings,
				total: findManyBookingsResult.data.total,
			},
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
		ctx: Context,
		params: NewBookingParams,
	): ResultAsync<
		{
			booking: BookingType;
		},
		InvalidArugmentErrorType | InternalServerError
	> {
		const bookingSemesters = await this.getBookingSemesters();
		if (!bookingSemesters.ok) {
			return bookingSemesters;
		}
		const cabins = await Promise.all(
			params.cabins.map((cabin) => this.cabinRepository.getCabinById(cabin.id)),
		);

		const occupiedDateIntervalsResult = await this.getOccupiedDateIntervals(
			ctx,
			{ cabins },
		);
		const bookableDateIntervalsResult = this.getBookableDateIntervals(ctx, {
			bookingSemesters: bookingSemesters.data.semesters,
		});
		if (!occupiedDateIntervalsResult.ok) {
			return occupiedDateIntervalsResult;
		}
		if (!bookableDateIntervalsResult.ok) {
			return bookableDateIntervalsResult;
		}

		const validateResult = this.validateBooking(ctx, {
			bookableDateIntervals: bookableDateIntervalsResult.data.intervals,
			occupiedDateIntervals: occupiedDateIntervalsResult.data.intervals,
			cabins,
			data: params,
		});
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
		const totalCostResult = await this.totalCost(ctx, {
			cabins: params.cabins,
			startDate,
			endDate,
			guests: {
				internal: internalParticipantsCount,
				external: externalParticipantsCount,
			},
		});
		if (!totalCostResult.ok) {
			switch (totalCostResult.error.name) {
				case "NotFoundError": {
					return Result.error(
						newInvalidArgumentError({
							message: "The cabin you tried to book does not exist",
							reason: {
								cabins: ["The cabin you tried to book does not exist"],
							},
							cause: totalCostResult.error,
						}),
					);
				}
				case "InvalidArgumentError": {
					return Result.error(
						newInvalidArgumentError({
							message: "Failed to calculate the total cost of the booking",
							cause: totalCostResult.error,
						}),
					);
				}
				case "InternalServerError": {
					return Result.error(
						new InternalServerError(
							"An unknown error occurred when calculating the total cost of the booking",
							totalCostResult.error,
						),
					);
				}
			}
		}

		const newBooking = new Booking(
			new Booking({
				...validatedData,
				createdAt: new Date(),
				totalCost: totalCostResult.data.totalCost,
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
					return Result.error(
						newInvalidArgumentError({
							message: "The cabin you tried to book does not exist",
							cause: createBookingResult.error,
						}),
					);
				case "InternalServerError":
					return Result.error(
						new InternalServerError(
							"An unknown error occurred",
							createBookingResult.error,
						),
					);
			}
		}
		const { booking } = createBookingResult.data;
		await this.sendBookingConfirmation(booking);
		return Result.success({ booking });
	}

	getCabinByBookingId(bookingId: string): Promise<Cabin> {
		return this.cabinRepository.getCabinByBookingId(bookingId);
	}

	getCabin(id: string): Promise<Cabin> {
		return this.cabinRepository.getCabinById(id);
	}

	private validateBooking(
		ctx: Context,
		params: {
			data: NewBookingParams;
			bookableDateIntervals: Interval[];
			occupiedDateIntervals: Interval[];
			cabins: Cabin[];
		},
	): TResult<
		{
			validated: Omit<
				BookingType,
				"id" | "status" | "totalCost" | "createdAt" | "feedback"
			>;
		},
		InvalidArugmentErrorType
	> {
		const { bookableDateIntervals, occupiedDateIntervals } = params;

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
			.refine(
				(obj) => {
					const checkIn = DateTime.fromJSDate(obj.startDate);
					const checkOut = DateTime.fromJSDate(obj.endDate);
					return this.isBookingMinimumLength(ctx, { checkIn, checkOut });
				},
				{
					message: "the booking must be at least 1 day long",
					path: ["startDate", "endDate"],
				},
			)
			.refine(
				(booking) => {
					const isAvailableForCheckIn = this.isAvailableForCheckIn(ctx, {
						bookableDateIntervals,
						occupiedDateIntervals,
						date: DateTime.fromJSDate(booking.startDate),
					});
					return isAvailableForCheckIn;
				},
				{
					message: "cabin is not available for check-in at the selected date",
					path: ["startDate"],
				},
			)
			.refine(
				(booking) => {
					const isAvailableForCheckOut = this.isAvailableForCheckOut(ctx, {
						bookableDateIntervals,
						occupiedDateIntervals,
						date: DateTime.fromJSDate(booking.endDate),
					});
					return isAvailableForCheckOut;
				},
				{
					message: "cabin is not available for check-out at the selected date",
					path: ["endDate"],
				},
			)
			.refine(
				(booking) => {
					const checkIn = DateTime.fromJSDate(booking.startDate);
					const checkOut = DateTime.fromJSDate(booking.endDate);
					const isBookingIntervalAvailable = this.isBookingIntervalAvailable(
						ctx,
						{
							bookableDateIntervals,
							occupiedDateIntervals,
							checkIn,
							checkOut,
						},
					);
					return isBookingIntervalAvailable;
				},
				{
					message: "selected cabins are not available for the selected dates",
					path: ["startDate"],
				},
			)
			.refine(
				(obj) => {
					const maximumParticipants = sumBy(params.cabins, "capacity");
					const totalParticipants =
						obj.internalParticipantsCount + obj.externalParticipantsCount;
					return totalParticipants <= maximumParticipants;
				},
				{
					message: "too many participants for the selected cabins",
					path: ["internalParticipantsCount", "externalParticipantsCount"],
				},
			);
		const parseResult = bookingSchema.safeParse(params.data);
		if (!parseResult.success) {
			return Result.error(
				newInvalidArgumentError({
					message: "invalid booking data",
					reason: parseResult.error.flatten().fieldErrors,
					cause: parseResult.error,
				}),
			);
		}
		return Result.success({ validated: parseResult.data });
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

			const getOccupiedDateIntervalsResult =
				await this.getOccupiedDateIntervals(ctx, { cabins: booking.cabins });
			if (!getOccupiedDateIntervalsResult.ok) {
				return getOccupiedDateIntervalsResult;
			}
			const getBookingSemestersResult = await this.getBookingSemesters();
			if (!getBookingSemestersResult.ok) {
				return getBookingSemestersResult;
			}
			const getBookableDateIntervalsResult = this.getBookableDateIntervals(
				ctx,
				{
					bookingSemesters: getBookingSemestersResult.data.semesters,
				},
			);
			if (!getBookableDateIntervalsResult.ok) {
				return getBookableDateIntervalsResult;
			}

			const isAvailableForBooking = this.isBookingIntervalAvailable(ctx, {
				bookableDateIntervals: getBookableDateIntervalsResult.data.intervals,
				occupiedDateIntervals: getOccupiedDateIntervalsResult.data.intervals,
				checkIn: DateTime.fromJSDate(booking.startDate),
				checkOut: DateTime.fromJSDate(booking.endDate),
			});

			if (!isAvailableForBooking) {
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

	private async getBookingSemesters(): ResultAsync<
		{ semesters: BookingSemester[] },
		InternalServerError
	> {
		try {
			const semesters = await Promise.all([
				this.getBookingSemester("SPRING"),
				this.getBookingSemester("FALL"),
			]);
			return {
				ok: true,
				data: {
					semesters: compact(semesters),
				},
			};
		} catch (err) {
			return {
				ok: false,
				error: new InternalServerError(
					"An unknown error occurred when fetching booking semesters",
					err,
				),
			};
		}
	}

	private isBookingMinimumLength(
		_ctx: Context,
		params: {
			checkIn: DateTime;
			checkOut: DateTime;
			minimumDays?: number;
		},
	): boolean {
		const { checkIn, checkOut, minimumDays = 1 } = params;
		return minimumDays <= checkOut.diff(checkIn, "days").as("days");
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
	async totalCost(
		ctx: Context,
		data: {
			startDate: Date;
			endDate: Date;
			guests: {
				internal: number;
				external: number;
			};
			cabins: { id: string }[];
		},
	): ResultAsync<
		{ totalCost: number },
		InternalServerError | NotFoundError | InvalidArgumentError
	> {
		const { startDate, endDate, guests } = data;
		const cabins = await Promise.all(
			data.cabins.map((cabin) => this.cabinRepository.getCabinById(cabin.id)),
		);

		const interval = DateTime.fromJSDate(startDate).until(
			DateTime.fromJSDate(endDate),
		);
		let totalCost = 0;
		if (interval.isValid) {
			for (const day of interval.splitBy({ days: 1 })) {
				const date = day.start;
				if (date) {
					const getPriceResult = this.getPrice(ctx, {
						cabins,
						date,
						guests,
					});
					if (!getPriceResult.ok) {
						return getPriceResult;
					}
					totalCost += getPriceResult.data.price;
				}
			}
		} else {
			return {
				ok: false,
				error: new InvalidArgumentError("Invalid date interval"),
			};
		}
		return { ok: true, data: { totalCost } };
	}

	/**
	 * getAvailabilityCalendar returns `count` months from `month` and `year` for the given cabins and guests,
	 * with the availability and pricing of each day in each month. The result of this method is intended to be
	 * used to display a calendar of availability and pricing for the given cabins and guests.
	 */
	async getAvailabilityCalendar(
		ctx: Context,
		params: {
			month: number;
			year: number;
			count: number;
			cabins: { id: string }[];
			guests: {
				internal: number;
				external: number;
			};
		},
	): ResultAsync<
		{
			calendarMonths: CalendarMonth[];
		},
		InternalServerError
	> {
		const cabins = await Promise.all(
			params.cabins.map((cabin) => this.cabinRepository.getCabinById(cabin.id)),
		);
		const getOccupiedDateIntervalsResult = await this.getOccupiedDateIntervals(
			ctx,
			{ cabins },
		);
		if (!getOccupiedDateIntervalsResult.ok) {
			return getOccupiedDateIntervalsResult;
		}
		const getBookingSemestersResult = await this.getBookingSemesters();
		if (!getBookingSemestersResult.ok) {
			return getBookingSemestersResult;
		}

		const getBookableDateIntervalsResult = this.getBookableDateIntervals(ctx, {
			bookingSemesters: getBookingSemestersResult.data.semesters,
		});
		if (!getBookableDateIntervalsResult.ok) {
			return getBookableDateIntervalsResult;
		}

		const getCalendarMonthsResult = this.getCalendarMonths(ctx, params);
		if (!getCalendarMonthsResult.ok) {
			return getCalendarMonthsResult;
		}
		const { months: calendarMonths } = getCalendarMonthsResult.data;

		for (const calendarMonth of calendarMonths) {
			const getAvailabilityForMonthResult = this.getAvailabilityForMonth(ctx, {
				calendarMonth,
				bookableDateIntervals: getBookableDateIntervalsResult.data.intervals,
				occupiedDateIntervals: getOccupiedDateIntervalsResult.data.intervals,
				cabins,
				guests: params.guests,
			});
			if (!getAvailabilityForMonthResult.ok) {
				return getAvailabilityForMonthResult;
			}
		}
		return Result.success({ calendarMonths });
	}

	private isInternalPrice(
		_ctx: Context,
		params: { guests: { internal: number; external: number } },
	): boolean {
		return params.guests.internal >= params.guests.external;
	}

	private isAvailableForCheckIn(
		_ctx: Context,
		params: {
			date: DateTime;
			occupiedDateIntervals: Interval[];
			bookableDateIntervals: Interval[];
		},
	): boolean {
		const { date, occupiedDateIntervals, bookableDateIntervals } = params;
		const minimumCheckInInterval = Interval.fromDateTimes(
			date.startOf("day"),
			date.plus({ days: 1 }).endOf("day"),
		);

		const isAvailableForCheckIn =
			occupiedDateIntervals.every(
				(interval) => !interval.overlaps(minimumCheckInInterval),
			) &&
			bookableDateIntervals.some((interval) =>
				interval.engulfs(minimumCheckInInterval),
			);
		return isAvailableForCheckIn;
	}

	/**
	 * isAvailableForCheckOut returns true if the given date is available for check-out, otherwise false.
	 *
	 * Being available for check out means that the date is preceded by at least one day where bookings are enabled,
	 * and the date is not occupied by any other booking.
	 */
	private isAvailableForCheckOut(
		_ctx: Context,
		params: {
			date: DateTime;
			occupiedDateIntervals: Interval[];
			bookableDateIntervals: Interval[];
		},
	): boolean {
		const { date } = params;
		const minimumCheckOutInterval = Interval.fromDateTimes(
			date.minus({ days: 1 }).startOf("day"),
			date.endOf("day"),
		);
		const isAvailableForCheckOut =
			params.occupiedDateIntervals.every(
				(interval) => !interval.overlaps(minimumCheckOutInterval),
			) &&
			params.bookableDateIntervals.some((interval) =>
				interval.engulfs(minimumCheckOutInterval),
			);
		return isAvailableForCheckOut;
	}

	/**
	 * isDateBookable is true if the date is today or in the future, and is within a bookable date interval.
	 */
	private isDateBookable(
		_ctx: Context,
		params: { date: DateTime; bookableDateIntervals: Interval[] },
	): boolean {
		const { date, bookableDateIntervals } = params;
		const isFutureDate = date >= DateTime.now().startOf("day");
		return (
			isFutureDate &&
			bookableDateIntervals.some((interval) => interval.contains(date))
		);
	}

	/**
	 * isDateAvailable returns true if the date is not occupied by any other booking, otherwise false.
	 */
	private isDateAvailable(
		_ctx: Context,
		params: { date: DateTime; occupiedDateIntervals: Interval[] },
	): boolean {
		const { date, occupiedDateIntervals } = params;
		return occupiedDateIntervals.every((interval) => !interval.contains(date));
	}

	private isBookingIntervalAvailable(
		_ctx: Context,
		params: {
			checkIn: DateTime;
			checkOut: DateTime;
			occupiedDateIntervals: Interval[];
			bookableDateIntervals: Interval[];
		},
	): boolean {
		const { checkIn, checkOut, occupiedDateIntervals, bookableDateIntervals } =
			params;
		const bookingInterval = Interval.fromDateTimes(checkIn, checkOut);
		// the interval has to be available for the entire duration, there can be no overlap with occupied intervals
		const isOccupied = occupiedDateIntervals.some((interval) =>
			interval.overlaps(bookingInterval),
		);
		// the interval has to be engulfed by bookable intervals
		const isBookable = bookableDateIntervals.some((interval) =>
			interval.engulfs(bookingInterval),
		);
		return isBookable && !isOccupied;
	}

	private getAvailabilityForMonth(
		ctx: Context,
		params: {
			calendarMonth: CalendarMonth;
			occupiedDateIntervals: Interval[];
			bookableDateIntervals: Interval[];
			guests: {
				internal: number;
				external: number;
			};
			cabins: Cabin[];
		},
	): TResult<{ calendarMonth: CalendarMonth }, InternalServerError> {
		const {
			calendarMonth,
			occupiedDateIntervals,
			bookableDateIntervals,
			guests,
		} = params;
		for (const calendarDay of calendarMonth.days) {
			const isBookable = this.isDateBookable(ctx, {
				date: calendarDay.calendarDate,
				bookableDateIntervals,
			});
			const isAvailable = this.isDateAvailable(ctx, {
				date: calendarDay.calendarDate,
				occupiedDateIntervals,
			});

			const availableForCheckIn = this.isAvailableForCheckIn(ctx, {
				date: calendarDay.calendarDate,
				occupiedDateIntervals,
				bookableDateIntervals,
			});
			const availableForCheckOut = this.isAvailableForCheckOut(ctx, {
				date: calendarDay.calendarDate,
				occupiedDateIntervals,
				bookableDateIntervals,
			});
			const price = this.getPrice(ctx, {
				date: calendarDay.calendarDate,
				guests,
				cabins: params.cabins,
			});
			if (!price.ok) {
				return price;
			}

			calendarDay.price = price.data.price;
			calendarDay.available = isAvailable;
			calendarDay.bookable = isBookable;
			calendarDay.availableForCheckIn = availableForCheckIn;
			calendarDay.availableForCheckOut = availableForCheckOut;
		}
		return {
			ok: true,
			data: { calendarMonth: calendarMonth },
		};
	}

	/**
	 * utility for generating a range of months with their days.
	 */
	private getCalendarMonths(
		_ctx: Context,
		params: { month: number; year: number; count: number },
	): TResult<{ months: CalendarMonth[] }, InternalServerError> {
		const { month, year, count } = params;
		const calendarMonths: CalendarMonth[] = [];
		for (const offset of range(0, count)) {
			const start = DateTime.fromObject({ month, year })
				.startOf("month")
				.plus({ months: offset });
			const end = start.endOf("month");
			const interval = Interval.fromDateTimes(start, end).splitBy({ days: 1 });
			const daysInMonth = interval.map((interval) => interval.start);
			if (!areDaysValid(daysInMonth)) {
				return {
					ok: false,
					error: new InternalServerError("Failed to generate calendar"),
				};
			}
			const calendarDays: CalendarDay[] = [];
			for (const day of daysInMonth) {
				calendarDays.push({
					calendarDate: day,
					available: false,
					bookable: false,
					price: 0,
					availableForCheckIn: false,
					availableForCheckOut: false,
				});
			}
			const calendarMonth: CalendarMonth = {
				month: start.get("month"),
				year: start.get("year"),
				days: calendarDays,
			};
			calendarMonths.push(calendarMonth);
		}

		return {
			ok: true,
			data: { months: calendarMonths },
		};
	}

	private getBookableDateIntervals(
		_ctx: Context,
		params: {
			bookingSemesters: BookingSemester[];
		},
	): TResult<{ intervals: Interval[] }, InternalServerError> {
		const { bookingSemesters } = params;
		const intervals: Interval[] = [];

		for (const bookingSemester of bookingSemesters) {
			if (bookingSemester.bookingsEnabled) {
				const startAt = DateTime.fromJSDate(bookingSemester.startAt).startOf(
					"day",
				);
				const endAt = DateTime.fromJSDate(bookingSemester.endAt).endOf("day");
				const interval = Interval.fromDateTimes(startAt, endAt);
				if (!interval.isValid) {
					return {
						ok: false,
						error: new InternalServerError(
							`Invalid booking semester interval: ${interval.invalidReason}`,
						),
					};
				}
				intervals.push(interval);
			}
		}

		const mergedIntervals = Interval.merge(intervals);
		return {
			ok: true,
			data: { intervals: mergedIntervals },
		};
	}

	private async getOccupiedDateIntervals(
		ctx: Context,
		params: { cabins: { id: string }[] },
	): ResultAsync<{ intervals: Interval[] }, InternalServerError> {
		const { cabins } = params;
		const intervals: Interval[] = [];

		for (const cabin of cabins) {
			const bookings = await this.cabinRepository.findManyBookings(ctx, {
				cabinId: cabin.id,
				bookingStatus: "CONFIRMED",
			});
			if (!bookings.ok) {
				return {
					ok: false,
					error: new InternalServerError("Failed to get occupied dates"),
				};
			}
			for (const booking of bookings.data.bookings) {
				const startAt = DateTime.fromJSDate(booking.startDate).startOf("day");
				const endAt = DateTime.fromJSDate(booking.endDate).endOf("day");
				intervals.push(Interval.fromDateTimes(startAt, endAt));
			}
		}
		return {
			ok: true,
			data: { intervals },
		};
	}

	private getPrice(
		ctx: Context,
		params: {
			cabins: Cabin[];
			guests: { internal: number; external: number };
			date: DateTime;
		},
	): TResult<{ price: number }, InternalServerError> {
		const { guests, cabins } = params;

		if (cabins.length === 0) {
			return {
				ok: true,
				data: {
					price: 0,
				},
			};
		}

		const internalPriceWeekday = sumBy(cabins, "internalPrice");
		const internalPriceWeekend = sumBy(cabins, "internalPriceWeekend");
		const externalPriceWeekday = sumBy(cabins, "externalPrice");
		const externalPriceWeekend = sumBy(cabins, "externalPriceWeekend");

		const isWeekendNight =
			params.date.weekday === 5 || params.date.weekday === 6;

		const isInternalPrice = this.isInternalPrice(ctx, { guests });
		let price: number | undefined = undefined;
		if (isInternalPrice && isWeekendNight) {
			price = internalPriceWeekend;
		} else if (isInternalPrice && !isWeekendNight) {
			price = internalPriceWeekday;
		} else if (isWeekendNight) {
			price = externalPriceWeekend;
		} else {
			price = externalPriceWeekday;
		}
		return {
			ok: true,
			data: {
				price,
			},
		};
	}
}

function areDaysValid(days: (DateTime | null)[]): days is DateTime[] {
	return days.every((day) => day !== null);
}
