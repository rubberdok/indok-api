import { AuthenticationError } from "~/domain/errors.js";
import { isSignUpEvent } from "~/domain/events/event.js";
import { assertIsAuthenticated } from "~/graphql/auth.js";
import type { EventResolvers } from "./../../types.generated.js";
export const Event: EventResolvers = {
	/* Implement Event resolver logic here */
	canSignUp: (parent, _args, ctx) => {
		try {
			assertIsAuthenticated(ctx);
			const canSignUp = ctx.events.canSignUpForEvent(ctx.user.id, parent.id);
			return canSignUp;
		} catch (err) {
			if (err instanceof AuthenticationError) return false;
			throw err;
		}
	},

	signUpAvailability: async (event, _args, ctx) => {
		const signUpAvailability = await ctx.events.getSignUpAvailability(
			ctx.user?.id,
			event.id,
		);
		return signUpAvailability;
	},

	organization: async (event, _args, ctx) => {
		if (!event.organizationId) return null;
		const organization = await ctx.organizations.get(event.organizationId);
		return organization;
	},

	signUpDetails: (event) => {
		if (!isSignUpEvent(event)) return null;
		return event.signUpDetails;
	},
	categories: (event) => {
		return event.categories;
	},
	contactEmail: ({ contactEmail }) => {
		return contactEmail;
	},
	description: ({ description }) => {
		return description;
	},
	endAt: ({ endAt }) => {
		return endAt;
	},
	id: ({ id }) => {
		return id;
	},
	location: ({ location }) => {
		return location;
	},
	name: ({ name }) => {
		return name;
	},
	signUpsEnabled: ({ signUpsEnabled }) => {
		return signUpsEnabled;
	},
	startAt: ({ startAt }) => {
		return startAt;
	},
	type: ({ type }) => {
		return type;
	},
};
