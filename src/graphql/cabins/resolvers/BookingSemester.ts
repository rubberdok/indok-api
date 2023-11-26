import type { BookingSemesterResolvers } from "./../../types.generated.js";
export const BookingSemester: BookingSemesterResolvers = {
  /* Implement BookingSemester resolver logic here */
  semester: ({ semester }) => {
    /* BookingSemester.semester resolver is required because BookingSemester.semester and BookingSemesterMapper.semester are not compatible */
    return semester;
  },
};
