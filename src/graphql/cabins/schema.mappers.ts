// biome-ignore lint/complexity/noBannedTypes: this is intentionally empty as we want the field resolvers to return the two semesters
type BookingSemestersResponseMapper = {};

export type {
	BookingType as BookingMapper,
	BookingSemester as BookingSemesterMapper,
	Cabin as CabinMapper,
	CalendarMonth as CalendarMonthMapper,
	CalendarDay as CalendarDayMapper,
} from "~/domain/cabins.js";
export type { BookingSemestersResponseMapper };
