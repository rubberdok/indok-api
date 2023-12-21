import { AuthenticationError } from "~/domain/errors.js";
import { isEventWithSignUps } from "~/domain/events.js";
import { assertIsAuthenticated } from "~/graphql/auth.js";
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
};
