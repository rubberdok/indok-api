export {
  Booking as BookingMapper,
  Cabin as CabinMapper,
  BookingSemester as BookingSemesterMapper,
} from "@prisma/client";

// this is intentionally empty as we want the field resolvers to return the two semesters
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface BookingSemestersResponseMapper {}

export { BookingSemestersResponseMapper };
