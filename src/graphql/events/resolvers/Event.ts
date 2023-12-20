import { AuthenticationError } from "@/domain/errors.js";
import { isEventWithSignUps } from "@/domain/events.js";
import { assertIsAuthenticated } from "@/graphql/auth.js";
import type { EventResolvers } from "./../../types.generated.js";
export const Event: EventResolvers = {
	/* Implement Event resolver logic here */
	canSignUp: (parent, _args, ctx) => {
		try {
			assertIsAuthenticated(ctx);
			const canSignUp = ctx.eventService.canSignUpForEvent(
				ctx.user.id,
				parent.id,
			);
			return canSignUp;
		} catch (err) {
			if (err instanceof AuthenticationError) return false;
			throw err;
		}
	},

	signUpAvailability: async (event, _args, ctx) => {
		const signUpAvailability = await ctx.eventService.getSignUpAvailability(
			ctx.user?.id,
			event.id,
		);
		return signUpAvailability;
	},

	organization: async (event, _args, ctx) => {
		if (!event.organizationId) return null;
		const organization = await ctx.organizationService.get(
			event.organizationId,
		);
		return organization;
	},

	signUpDetails: (event) => {
		if (!isEventWithSignUps(event)) return null;
		return event.signUpDetails;
	},
	contactEmail: () => {
		/* Event.contactEmail resolver is required because Event.contactEmail exists but EventMapper.contactEmail does not */
	},
	description: () => {
		/* Event.description resolver is required because Event.description exists but EventMapper.description does not */
	},
	endAt: () => {
		/* Event.endAt resolver is required because Event.endAt exists but EventMapper.endAt does not */
	},
	id: () => {
		/* Event.id resolver is required because Event.id exists but EventMapper.id does not */
	},
	location: () => {
		/* Event.location resolver is required because Event.location exists but EventMapper.location does not */
	},
	name: () => {
		/* Event.name resolver is required because Event.name exists but EventMapper.name does not */
	},
	signUpsEnabled: () => {
		/* Event.signUpsEnabled resolver is required because Event.signUpsEnabled exists but EventMapper.signUpsEnabled does not */
	},
	startAt: () => {
		/* Event.startAt resolver is required because Event.startAt exists but EventMapper.startAt does not */
	},
};
