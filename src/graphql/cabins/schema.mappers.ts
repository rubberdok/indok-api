export type {
	Cabin as CabinMapper,
	BookingSemester as BookingSemesterMapper,
} from "@prisma/client";

// biome-ignore lint/complexity/noBannedTypes: this is intentionally empty as we want the field resolvers to return the two semesters
type BookingSemestersResponseMapper = {};

export type { BookingType as BookingMapper } from "~/domain/cabins.js";

export type { BookingSemestersResponseMapper };
