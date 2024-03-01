import { randomUUID } from "crypto";
import { faker } from "@faker-js/faker";
import type { Semester } from "@prisma/client";
import dayjs from "dayjs";
import { type DeepMockProxy, mockDeep } from "jest-mock-extended";
import { DateTime } from "luxon";
import { BookingStatus } from "~/domain/cabins.js";
import { makeMockContext } from "~/lib/context.js";
import type { NewBookingParams } from "~/lib/server.js";
import {
	CabinService,
	type ICabinRepository,
	type MailService,
	type PermissionService,
} from "../../service.js";

const validBooking: NewBookingParams = {
	cabins: [{ id: faker.string.uuid() }],
	startDate: dayjs().add(1, "day").toDate(),
	endDate: dayjs().add(2, "day").toDate(),
	phoneNumber: "40000000",
	email: "exapmle@example.com",
	firstName: "test",
	lastName: "test",
	externalParticipantsCount: 1,
	internalParticipantsCount: 1,
};

let repo: DeepMockProxy<ICabinRepository>;
let mockMailService: DeepMockProxy<MailService>;
let cabinService: CabinService;
let permissionService: DeepMockProxy<PermissionService>;

beforeAll(() => {
	repo = mockDeep<ICabinRepository>();
	mockMailService = mockDeep<MailService>();
	permissionService = mockDeep<PermissionService>();
	cabinService = new CabinService(repo, mockMailService, permissionService);
});

describe("newBooking", () => {
	interface TestCase {
		name: string;
		input: NewBookingParams;
	}

	const testCase: TestCase[] = [
		{
			name: "should send a booking confirmation email",
			input: validBooking,
		},
	];

	test.each(testCase)("$name", async ({ input }) => {
		repo.getBookingSemester.mockImplementation((semester: Semester) => {
			return Promise.resolve({
				bookingsEnabled: true,
				semester: semester,
				startAt: DateTime.fromObject({ year: 0 }).toJSDate(),
				endAt: DateTime.now().plus({ years: 3000 }).toJSDate(),
				createdAt: new Date(),
				updatedAt: new Date(),
				id: randomUUID(),
			});
		});

		repo.createBooking.mockResolvedValueOnce({
			ok: true,
			data: {
				booking: {
					...input,
					startDate: new Date(input.startDate),
					endDate: new Date(input.endDate),
					id: randomUUID(),
					status: BookingStatus.PENDING,
					cabins: [{ id: faker.string.uuid() }],
					totalCost: 250,
				},
			},
		});

		repo.getCabinById.mockResolvedValue({
			id: faker.string.uuid(),
			name: "test",
			capacity: 100,
			internalPrice: 100,
			externalPrice: 200,
			internalPriceWeekend: 150,
			externalPriceWeekend: 250,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const newBookingResult = await cabinService.newBooking(
			makeMockContext({ id: faker.string.uuid() }),
			input,
		);
		if (!newBookingResult.ok) throw newBookingResult.error;
		expect(repo.createBooking).toHaveBeenCalledWith(
			expect.objectContaining({ ...input, totalCost: 250 }),
		);
		expect(mockMailService.sendAsync).toHaveBeenCalledWith({
			type: "cabin-booking-receipt",
			bookingId: expect.any(String),
		});
	});
});
