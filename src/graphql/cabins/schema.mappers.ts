export {
  Booking as BookingMapper,
  Cabin as CabinMapper,
  BookingSemester as BookingSemesterMapper,
} from "@prisma/client";

// biome-ignore lint/complexity/noBannedTypes: this is intentionally empty as we want the field resolvers to return the two semesters
type BookingSemestersResponseMapper = {};

export { BookingSemestersResponseMapper };
