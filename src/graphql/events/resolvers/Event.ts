import { Event as DomainEvent } from "~/domain/events/index.js";
import type { EventResolvers } from "./../../types.generated.js";
export const Event: EventResolvers = {
	/* Implement Event resolver logic here */
	canSignUp: (parent, _args, ctx) => {
		const canSignUp = ctx.events.canSignUpForEvent(ctx, {
			eventId: parent.id,
		});
		return canSignUp;
	},

	signUpAvailability: async (event, _args, ctx) => {
		const signUpAvailability = await ctx.events.getSignUpAvailability(ctx, {
			eventId: event.id,
		});
		return signUpAvailability;
	},

	organization: async (event, _args, ctx) => {
		if (!event.organizationId) return null;
		const organization = await ctx.organizations.organizations.get(
			event.organizationId,
		);
		return organization;
	},

	signUpDetails: (event) => {
		if (!DomainEvent.isSignUpEvent(event)) return null;
		return {
			capacity: event.capacity,
			remainingCapacity: event.remainingCapacity,
			signUpsStartAt: event.signUpsStartAt,
			signUpsEndAt: event.signUpsEndAt,
		};
	},
	categories: (event, _args, ctx) => {
		return ctx.events.getCategories(ctx, { eventId: event.id });
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
	user: (_parent, _args, ctx) => {
		if (!ctx.user) return null;
		return {
			id: ctx.user.id,
			eventId: _parent.id,
		};
	},
	ticketInformation: (parent) => {
		if (parent.type !== "TICKETS") return null;
		return parent;
	},
	signUpsRequireUserProvidedInformation: (parent) => {
		return parent.signUpsRequireUserProvidedInformation ?? false;
	},
	signUpsRetractable: (parent) => {
		return parent.signUpsRetractable ?? false;
	},
	signUps: (parent) => {
		return parent;
	},
	signUp: async (event, _args, ctx) => {
		const getSignUpResult = await ctx.events.getSignUp(ctx, {
			eventId: event.id,
			userId: ctx.user?.id,
		});
		if (!getSignUpResult.ok) {
			switch (getSignUpResult.error.name) {
				case "UnauthorizedError":
				case "NotFoundError":
					return null;
				case "InternalServerError":
					throw getSignUpResult.error;
			}
		}
		return getSignUpResult.data.signUp;
	},
	shortDescription: ({ shortDescription }) => {
		return shortDescription;
	},
};
