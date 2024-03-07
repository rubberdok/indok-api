import type { CalendarDayResolvers } from "./../../types.generated.js";
export const CalendarDay: CalendarDayResolvers = {
	/* Implement CalendarDay resolver logic here */
	calendarDate: ({ calendarDate }) => {
		/* CalendarDay.calendarDate resolver is required because CalendarDay.calendarDate and CalendarDayMapper.calendarDate are not compatible */
		return calendarDate.toJSDate();
	},
	price: ({ price }) => {
		/* CalendarDay.price resolver is required because CalendarDay.price and CalendarDayMapper.price are not compatible */
		return price;
	},
};
