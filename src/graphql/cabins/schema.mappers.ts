// biome-ignore lint/complexity/noBannedTypes: this is intentionally empty as we want the field resolvers to return the two semesters
type BookingSemestersResponseMapper = {};

export type {
	Booking as BookingMapper,
	BookingSemester as BookingSemesterMapper,
	Cabin as CabinMapper,
	CalendarMonth as CalendarMonthMapper,
	CalendarDay as CalendarDayMapper,
	BookingTerms as BookingTermsMapper,
} from "~/domain/cabins.js";

export type { BookingSemestersResponseMapper };
