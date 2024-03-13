import type { CalendarMonthResolvers } from "./../../types.generated.js";
export const CalendarMonth: CalendarMonthResolvers = {
	/* Implement CalendarMonth resolver logic here */
	days: ({ days }) => {
		/* CalendarMonth.days resolver is required because CalendarMonth.days and CalendarMonthMapper.days are not compatible */
		return days;
	},
};
