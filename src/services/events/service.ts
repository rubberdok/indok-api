import { DateTime } from "luxon";
import { z } from "zod";
import {
	InternalServerError,
	InvalidArgumentError,
	NotFoundError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { CategoryType } from "~/domain/events/category.js";
import type {
	EventUpdateFields,
	NewEventReturnType,
	SignUpEvent,
	TicketEvent,
} from "~/domain/events/event.js";
import {
	Event,
	EventParticipationStatus,
	type EventParticipationStatusType,
	type EventSignUp,
	type EventType,
	EventTypeEnum,
	type SignUpAvailability,
	Slot,
	type SlotType,
	signUpAvailability,
} from "~/domain/events/index.js";
import type { NewSlotParams, UpdateSlotFields } from "~/domain/events/slot.js";
import {
	type FeaturePermissionType,
	OrganizationRole,
	type OrganizationRoleType,
} from "~/domain/organizations.js";
import type { OrderType, ProductType } from "~/domain/products.js";
import type { User } from "~/domain/users.js";
import type { ResultAsync } from "~/lib/result.js";
import type {
	CreateSignUpParams,
	UpdateEvent,
	UpdateSignUpParams,
} from "~/repositories/events/index.js";
import type { Context } from "../../lib/context.js";
import type { SignUpQueueType } from "./worker.js";

export { EventService };
export type {
	EventRepository,
	UserService,
	PermissionService,
	ProductService,
	CreateEventParams,
	CreateBasicEventParams,
	CreateSignUpEventParams,
	CreateTicketEventParams,
	UpdateEventParams,
};

interface EventRepository {
	create(
		ctx: Context,
		params: {
			event: EventType;
			slots?: SlotType[];
			categories?: { id: string }[];
		},
	): ResultAsync<
		{ event: EventType; slots?: SlotType[]; categories?: CategoryType[] },
		InternalServerError | InvalidArgumentError
	>;
	update: UpdateEvent<
		PermissionDeniedError | InvalidArgumentError | NotFoundError
	>;
	get(id: string): Promise<EventType>;
	getWithSlotsAndCategories(params: { id: string }): ResultAsync<
		{
			event: EventType;
			slots?: SlotType[];
			categories?: CategoryType[];
		},
		InternalServerError | NotFoundError
	>;
	getSlotWithRemainingCapacity(
		eventId: string,
		gradeYear?: number,
	): Promise<SlotType | null>;
	findMany(data?: {
		endAtGte?: Date | null;
		organizationId?: string;
		organizations?: { id: string }[];
		categories?: { id: string }[];
		startAfter?: Date;
		endBefore?: Date;
	}): Promise<EventType[]>;
	findManySignUps(data: {
		eventId?: string;
		status?: EventParticipationStatusType;
		userId?: string;
		orderBy?: "asc" | "desc";
	}): ResultAsync<
		{ signUps: EventSignUp[]; total: number },
		NotFoundError | InternalServerError
	>;
	getActiveSignUp(
		_ctx: Context,
		params: { userId: string; eventId: string },
	): ResultAsync<{ signUp: EventSignUp }, NotFoundError | InternalServerError>;
	getSignUpById(params: { id: string }): ResultAsync<
		{ signUp: EventSignUp },
		NotFoundError | InternalServerError
	>;
	createSignUp(data: CreateSignUpParams): Promise<{
		signUp: EventSignUp;
		slot?: SlotType;
		event: EventType;
	}>;
	updateSignUp(data: UpdateSignUpParams): Promise<{
		signUp: EventSignUp;
		slot?: SlotType;
		event: EventType;
	}>;
	addOrderToSignUp(params: {
		orderId: string;
		signUpId: string;
	}): ResultAsync<{ signUp: EventSignUp }, NotFoundError | InternalServerError>;
	findManySlots(data: { gradeYear?: number; eventId: string }): Promise<
		SlotType[]
	>;
	getCategories(by?: { eventId?: string }): Promise<CategoryType[]>;
	createCategory(data: { name: string }): Promise<CategoryType>;
	updateCategory(data: CategoryType): Promise<CategoryType>;
	deleteCategory(data: { id: string }): Promise<CategoryType>;
	getEarlierSignUpsOnWaitList(data: {
		eventId: string;
		createdAt: Date;
	}): ResultAsync<
		{ count: number },
		InvalidArgumentError | InternalServerError
	>;
}

interface UserService {
	get(id: string): Promise<User>;
}

interface PermissionService {
	hasRole(
		ctx: Context,
		data: {
			organizationId: string;
			role: OrganizationRoleType;
		},
	): Promise<boolean>;
	hasFeaturePermission(
		ctx: Context,
		data: {
			userId: string;
			featurePermission: FeaturePermissionType;
		},
	): Promise<boolean>;
}

interface ProductService {
	products: {
		create(
			ctx: Context,
			data: Pick<ProductType, "price" | "description" | "name"> & {
				merchantId: string;
			},
		): ResultAsync<
			{ product: ProductType },
			UnauthorizedError | InvalidArgumentError
		>;
	};
	orders: {
		create(
			ctx: Context,
			data: Pick<OrderType, "productId">,
		): ResultAsync<{ order: OrderType }, UnauthorizedError | NotFoundError>;
		get(
			ctx: Context,
			params: { id: string },
		): ResultAsync<
			{ order: OrderType },
			| NotFoundError
			| UnauthorizedError
			| PermissionDeniedError
			| InternalServerError
		>;
	};
}

type BaseCreateEventFields = {
	name: string;
	description?: string | null;
	shortDescription?: string | null;
	startAt: Date;
	endAt?: Date | null;
	contactEmail?: string | null;
	location?: string | null;
	organizationId: string;
	capacity?: number | null;
	signUpsStartAt?: Date | null;
	signUpsEndAt?: Date | null;
	signUpsEnabled?: boolean | null;
	signUpsRetractable?: boolean | null;
	signUpsRequireUserProvidedInformation?: boolean | null;
};

type CreateBasicEventParams = {
	type: typeof EventTypeEnum.BASIC;
	event: BaseCreateEventFields;
	categories?: { id: string }[] | null;
	slots?: never;
	tickets?: never;
};

type CreateSignUpEventParams = {
	type: typeof EventTypeEnum.SIGN_UPS;
	event: BaseCreateEventFields & {
		capacity: number;
		signUpsStartAt: Date;
		signUpsEndAt: Date;
	};
	categories?: { id: string }[] | null;
	slots: { capacity: number; gradeYears?: number[] | null }[];
	tickets?: never;
};

type CreateTicketEventParams = {
	type: typeof EventTypeEnum.TICKETS;
	event: BaseCreateEventFields & {
		capacity: number;
		signUpsStartAt: Date;
		signUpsEndAt: Date;
	};
	categories?: { id: string }[] | null;
	slots: { capacity: number; gradeYears?: number[] | null }[];
	tickets: { price: number; merchantId: string };
};

type CreateEventParams =
	| CreateBasicEventParams
	| CreateSignUpEventParams
	| CreateTicketEventParams;

type UpdateEventParams = {
	event: EventUpdateFields & { id: string };
	slots?: {
		create?: NewSlotParams[] | null;
		update?: UpdateSlotFields[] | null;
		delete?: { id: string }[] | null;
	} | null;
	categories?: { id: string }[] | null;
};

class EventService {
	constructor(
		private eventRepository: EventRepository,
		private permissionService: PermissionService,
		private userService: UserService,
		private productService: ProductService,
		private signUpQueue: SignUpQueueType,
	) {}

	async create(
		ctx: Context,
		params: CreateEventParams,
	): ResultAsync<
		{ event: EventType; slots?: SlotType[]; categories?: CategoryType[] },
		InternalServerError | InvalidArgumentError | PermissionDeniedError
	> {
		const { event: eventData, slots: slotData, tickets, type } = params;

		const isMember = await this.permissionService.hasRole(ctx, {
			organizationId: eventData.organizationId,
			role: OrganizationRole.MEMBER,
		});

		if (isMember !== true) {
			return {
				ok: false,
				error: new PermissionDeniedError(
					"You do not have permission to create an event for this organization.",
				),
			};
		}
		const slots: SlotType[] = [];
		if (slotData) {
			for (const data of slotData) {
				const slotResult = Slot.new(data);
				if (!slotResult.ok) {
					return {
						ok: false,
						error: new InvalidArgumentError(
							"Invalid slot parameters",
							slotResult.error,
						),
					};
				}
				slots.push(slotResult.data.slot);
			}
		}

		let result: NewEventReturnType;
		switch (type) {
			case "BASIC":
				result = Event.new({ type: "BASIC", event: eventData });
				break;
			case "SIGN_UPS":
				result = Event.new({ type: "SIGN_UPS", event: eventData });
				break;
			case "TICKETS": {
				const createProductResult = await this.productService.products.create(
					ctx,
					{
						price: tickets.price,
						merchantId: tickets.merchantId,
						name: eventData.name,
						description: `Billetter til ${eventData.name}`,
					},
				);
				if (!createProductResult.ok) {
					switch (createProductResult.error.name) {
						case "InvalidArgumentError":
							return {
								ok: false,
								error: new InvalidArgumentError(
									"Could not create product for event",
									createProductResult.error,
								),
							};
						case "UnauthorizedError": {
							return {
								ok: false,
								error: new InternalServerError(
									"Failed to create product",
									createProductResult.error,
								),
							};
						}
					}
				}
				result = Event.new({
					type: "TICKETS",
					event: {
						...eventData,
						productId: createProductResult.data.product.id,
					},
				});
				break;
			}
		}

		if (!result.ok) {
			switch (result.error.name) {
				case "InvalidArgumentError":
					ctx.log.error(result.error);
					return {
						ok: false,
						error: new InvalidArgumentError(
							`Invalid event data ${type}`,
							result.error,
						),
					};
			}
		}

		const { event } = result.data;
		const createEventResult = await this.eventRepository.create(ctx, {
			event,
			slots,
			categories: params.categories ?? undefined,
		});
		if (!createEventResult.ok) {
			switch (createEventResult.error.name) {
				case "InternalServerError": {
					return {
						ok: false,
						error: new InternalServerError(
							"Unexpected error in repository",
							createEventResult.error,
						),
					};
				}
				case "InvalidArgumentError": {
					return {
						ok: false,
						error: new InvalidArgumentError(
							`Could not create event in repository for ${type}`,
							createEventResult.error,
						),
					};
				}
			}
		}
		const {
			event: createdEvent,
			slots: createdSlots,
			categories,
		} = createEventResult.data;
		return {
			ok: true,
			data: { event: createdEvent, slots: createdSlots, categories },
		};
	}

	/**
	 * update updates an event with the given data.
	 * If capacity is changed, the remaining capacity of the event will be updated to reflect the change.
	 *
	 * @throws {InvalidCapacityError} if the new capacity is less than the number of confirmed sign ups
	 * @param ctx - The context of the request
	 * @param params - The event to update, and the slots to create, update, and delete
	 * @returns the updated event
	 */
	async update(
		ctx: Context,
		params: UpdateEventParams,
	): ResultAsync<
		{ event: EventType; slots: SlotType[]; categories: CategoryType[] },
		| InvalidArgumentError
		| PermissionDeniedError
		| InternalServerError
		| NotFoundError
	> {
		const updateResult = await this.eventRepository.update(
			ctx,
			params.event.id,
			async ({ event, slots }) => {
				if (event.organizationId === null) {
					return {
						ok: false,
						error: new InvalidArgumentError(
							"Event must belong to an organization",
						),
					};
				}

				// Updating an event requires that the user is a member of the organization
				const isMember = await this.permissionService.hasRole(ctx, {
					organizationId: event.organizationId,
					role: OrganizationRole.MEMBER,
				});

				if (isMember !== true) {
					return {
						ok: false,
						error: new PermissionDeniedError(
							"You do not have permission to update this event",
						),
					};
				}

				const updateEventResult = Event.update({
					previous: { event },
					data: params,
				});
				if (!updateEventResult.ok) {
					return {
						ok: false,
						error: new InvalidArgumentError(
							"Invalid event update parameters",
							updateEventResult.error,
						),
					};
				}

				const updatedEvent = updateEventResult.data.event;
				const slotsToUpdate: SlotType[] = [];
				const slotsToDelete: SlotType[] = [];
				const slotsToCreate: SlotType[] = [];
				const existingSlotsById = Object.fromEntries(
					slots?.map((s) => [s.id, s]) ?? [],
				);

				if (params.slots?.create) {
					for (const slotData of params.slots.create) {
						const slotResult = Slot.new(slotData);
						if (!slotResult.ok) {
							return {
								ok: false,
								error: new InvalidArgumentError(
									"Invalid slot parameters",
									slotResult.error,
								),
							};
						}
						slotsToCreate.push(slotResult.data.slot);
					}
				}

				if (params.slots?.update) {
					for (const slotData of params.slots.update) {
						const previousSlot = existingSlotsById[slotData.id];
						if (!previousSlot) {
							return {
								ok: false,
								error: new NotFoundError("Slot to update not found"),
							};
						}
						const slotResult = Slot.update({
							previous: previousSlot,
							data: slotData,
						});
						if (!slotResult.ok) {
							return {
								ok: false,
								error: new InvalidArgumentError(
									"Invalid slot update parameters",
									slotResult.error,
								),
							};
						}
						slotsToUpdate.push(slotResult.data.slot);
					}
				}

				if (params.slots?.delete) {
					for (const slot of params.slots.delete) {
						const slotToDelete = existingSlotsById[slot.id];
						/**
						 * If we try to delete a slot which doesn't exist, we abort early.
						 */
						if (!slotToDelete) {
							return {
								ok: false,
								error: new NotFoundError("Slot to delete not found"),
							};
						}
						/**
						 * If remaining capacity does not match the total capacity, then we have a slot
						 * where users have active sign ups. To limit the complexity of handling those cases,
						 * we simply do not permit deleting those slots.
						 */
						if (slotToDelete.remainingCapacity !== slotToDelete.capacity) {
							return {
								ok: false,
								error: new InvalidArgumentError(
									"Cannot delete a slot with existing sign ups",
								),
							};
						}

						slotsToDelete.push(slotToDelete);
					}
				}

				return {
					ok: true,
					data: {
						event: updatedEvent,
						slots: {
							create: slotsToCreate,
							update: slotsToUpdate,
							delete: slotsToDelete,
						},
						categories: params.categories ?? undefined,
					},
				};
			},
		);

		return updateResult;
	}

	/**
	 * Sign up a user for an event. If there is no remaining capacity on the event, either because all avilable slots are
	 * full, or because the event itself is full, the user will be added to the wait list.
	 * This method will attempt a maximum of 20 times to sign up the user. If it fails, an InternalServerError is thrown.
	 * If this happens, it is likely due to a high number of concurrent requests, and the user can try again.
	 *
	 * @throws {InvalidArgumentError} If the event does not have sign ups
	 * @throws {InternalServerError} If the user could not be signed up after 20 attempts
	 * @param userId - The ID of the user that is signing up
	 * @param eventId - The ID of the event to sign up for
	 * @returns The event sign up. If there is no remaining capacity on the event, either because all avilable slots are
	 * full, or because the event itself is full, the user will be added to the wait list. The returned sign up will
	 * either have a status of `CONFIRMED` or `WAIT_LIST`.
	 */
	async signUp(
		ctx: Context,
		params: {
			userId?: string | null;
			eventId: string;
			userProvidedInformation?: string | null;
		},
	): ResultAsync<
		{ signUp: EventSignUp },
		UnauthorizedError | InvalidArgumentError | InternalServerError
	> {
		if (ctx.user === null) {
			return {
				ok: false,
				error: new UnauthorizedError(
					"You must be logged in to sign up for an event",
				),
			};
		}
		let userId = ctx.user.id;
		const { eventId, userProvidedInformation } = params;
		const event = await this.eventRepository.get(eventId);
		if (!event.organizationId) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"Cannot sign up to events that do not belong to an organization",
				),
			};
		}
		if (
			event.signUpsRequireUserProvidedInformation &&
			!userProvidedInformation
		) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"User provided information is required for this event",
				),
			};
		}

		const isMember = await this.permissionService.hasRole(ctx, {
			organizationId: event.organizationId,
			role: OrganizationRole.MEMBER,
		});
		if (isMember === true && params.userId) {
			userId = params.userId;
		}

		const maxAttempts = 20;
		const user = await this.userService.get(userId);

		/**
		 * We may need to retry this multiple times, as we rely on optimistic concurrency control
		 * to ensure that that the event and slot have not been updated since we last fetched them.
		 * This is to avoid overfilling the event or slot during periods with a high number of concurrent requests.
		 *
		 * This number may need to be tweaked.
		 */
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			ctx.log.info(
				{ userId, eventId, attempt },
				"Attempting to sign up user for event.",
			);
			// Fetch the event to check if it has available slots or not
			const event = await this.eventRepository.get(eventId);
			if (!Event.areSignUpsAvailable(event)) {
				return {
					ok: false,
					error: new InvalidArgumentError("Cannot sign up for the event."),
				};
			}

			// If there is no remaining capacity on the event, it doesn't matter if there is any remaining capacity in slots.
			if (event.remainingCapacity <= 0) {
				ctx.log.info({ event }, "Event is full, adding user to wait list.");
				const { signUp } = await this.eventRepository.createSignUp({
					userId,
					participationStatus: EventParticipationStatus.ON_WAITLIST,
					eventId,
					userProvidedInformation: userProvidedInformation ?? "",
				});
				return { ok: true, data: { signUp } };
			}

			try {
				const slotToSignUp =
					await this.eventRepository.getSlotWithRemainingCapacity(
						eventId,
						user.gradeYear,
					);

				if (slotToSignUp === null) {
					ctx.log.info({ event }, "Event is full, adding user to wait list.");
					const { signUp } = await this.eventRepository.createSignUp({
						userId,
						participationStatus: EventParticipationStatus.ON_WAITLIST,
						eventId,
						userProvidedInformation: userProvidedInformation ?? "",
					});
					return {
						ok: true,
						data: { signUp },
					};
				}

				let { signUp } = await this.eventRepository.createSignUp({
					userId,
					participationStatus: EventParticipationStatus.CONFIRMED,
					eventId,
					slotId: slotToSignUp.id,
					userProvidedInformation: userProvidedInformation ?? "",
				});
				ctx.log.info(
					{ signUp, attempt },
					"Successfully signed up user for event.",
				);
				if (event.type === "TICKETS") {
					ctx.log.info("Creating order for event");
					const orderResult = await this.productService.orders.create(ctx, {
						productId: event.productId,
					});
					if (!orderResult.ok) {
						ctx.log.error(
							{ error: orderResult.error },
							"Failed to create order for event",
						);
						return {
							ok: false,
							error: new InternalServerError(
								"Failed to create order for the event",
								orderResult.error,
							),
						};
					}
					const { order } = orderResult.data;
					const updatedSignUp = await this.eventRepository.addOrderToSignUp({
						orderId: order.id,
						signUpId: signUp.id,
					});
					if (!updatedSignUp.ok) {
						ctx.log.error(
							{ error: updatedSignUp.error },
							"Failed to add order to sign up",
						);
						return {
							ok: false,
							error: new InternalServerError(
								"failed to add order to confirmed sign up on ticket event",
								updatedSignUp.error,
							),
						};
					}
					signUp = updatedSignUp.data.signUp;
				}
				return { ok: true, data: { signUp } };
			} catch (err) {
				// If there are no slots with remaining capacity, we add the user to the wait list.
				if (err instanceof NotFoundError) continue;
				return {
					ok: false,
					error: new InternalServerError(
						"Failed to sign up user for event",
						err,
					),
				};
			}
		}

		/**
		 * If we reach this point, we have tried to sign up the user 20 times, and failed every time.
		 * Since the user hasn't been added to the wait list, there is likely still remaining capacity on the event,
		 * but we have to abort at some point to avoid stalling the request.
		 */
		ctx.log.error(
			"Failed to sign up user after 20 attempts. If this happens often, consider increasing the number of attempts.",
		);
		return {
			ok: false,
			error: new InternalServerError(
				"Failed to sign up user after 20 attempts",
			),
		};
	}

	/**
	 * get returns an event with the specified ID.
	 *
	 * @throws {NotFoundError} If an event with the specified ID does not exist
	 * @param id - The ID of the event to get
	 * @returns The event with the specified ID
	 */
	async get(id: string): Promise<EventType> {
		return await this.eventRepository.get(id);
	}

	/**
	 * findMany returns all events.
	 *
	 * @params data.onlyFutureEvents - If true, only future events that have an `endAt` in the future will be returned
	 * @returns All events
	 */
	async findMany(data?: {
		onlyFutureEvents?: boolean;
		organizationId?: string | null;
		organizations?: { id: string }[] | null;
		categories?: { id: string }[] | null;
		startAfter?: Date | null;
		endBefore?: Date | null;
	}): Promise<EventType[]> {
		if (!data) {
			return await this.eventRepository.findMany();
		}

		let endAtGte: Date | undefined = undefined;
		if (data.onlyFutureEvents) {
			endAtGte = DateTime.now().toJSDate();
		}

		let organizationId: string | undefined = undefined;
		if (data.organizationId) {
			organizationId = data.organizationId;
		}

		const { organizations, categories, startAfter, endBefore } = data;

		return await this.eventRepository.findMany({
			endAtGte,
			organizationId,
			organizations: organizations ?? undefined,
			categories: categories ?? undefined,
			startAfter: startAfter ?? undefined,
			endBefore: endBefore ?? undefined,
		});
	}

	/**
	 * promoteFromWaitList promotes the first available user on the wait list for the specified event to a confirmed sign up.
	 *
	 * @param ctx - The context of the request
	 * @param eventId - The ID of the event to promote a user from the wait list for
	 * @returns The confirmed sign up, or null if there are no users on the wait list, or if there is no remaining capacity
	 * on the event, or no available slots for the users on the wait list.
	 */
	async promoteFromWaitList(
		ctx: Context,
		eventId: string,
	): Promise<EventSignUp | null> {
		const event = await this.eventRepository.get(eventId);
		if (event.type === EventTypeEnum.BASIC) {
			throw new InvalidArgumentError("This event does does not have sign ups.");
		}

		if (event.remainingCapacity <= 0) {
			throw new InvalidArgumentError("This event is full.");
		}

		const findManySignUpsResult = await this.eventRepository.findManySignUps({
			eventId,
			status: EventParticipationStatus.ON_WAITLIST,
		});
		if (!findManySignUpsResult.ok) throw findManySignUpsResult.error;
		const { signUps: signUpsOnWaitlist } = findManySignUpsResult.data;

		for (const waitlistSignUp of signUpsOnWaitlist) {
			try {
				const slot =
					await this.eventRepository.getSlotWithRemainingCapacity(eventId);
				if (slot !== null) {
					const { signUp: confirmedSignUp } =
						await this.eventRepository.updateSignUp({
							userId: waitlistSignUp.userId,
							eventId,
							slotId: slot.id,
							newParticipationStatus: EventParticipationStatus.CONFIRMED,
						});

					ctx.log.info(
						{ confirmedSignUp },
						"Promoted from waitlist to confirmed sign up.",
					);
					return confirmedSignUp;
				}
			} catch (err) {
				if (err instanceof NotFoundError) continue;
				throw err;
			}
		}
		ctx.log.info(
			{ eventId },
			"Found no valid sign ups to promote from wait list",
		);
		return null;
	}

	/**
	 * demoteConfirmedSignUp demotes a confirmed sign up to one of the non-attending statuses, incrementing
	 * the remaining capacity of the event and slot.
	 *
	 * @throws {InvalidArgumentError} If the sign up does not have status CONFIRMED
	 * @throws {InternalServerError} If the sign up is missing a slot ID, but has status CONFIRMED
	 * @throws {NotFoundError} If the sign up does not exist
	 * @param data.signUpId - The ID of the sign up to demote
	 * @param data.newParticipationStatus - The new participation status, must be one of the non-attending statuses
	 * @returns The updated sign up
	 */
	private async demoteConfirmedSignUp(
		ctx: Context,
		data: {
			userId: string;
			event: TicketEvent | SignUpEvent;
			signUp: EventSignUp;
			newParticipationStatus: Extract<
				EventParticipationStatusType,
				"RETRACTED" | "REMOVED"
			>;
		},
	): ResultAsync<
		{ signUp: EventSignUp },
		InvalidArgumentError | InternalServerError
	> {
		const { userId, event, signUp, newParticipationStatus } = data;

		if (signUp.participationStatus !== EventParticipationStatus.CONFIRMED) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"Can only demote sign ups with status CONFIRMED",
				),
			};
		}

		if (signUp.slotId === null) {
			return {
				ok: false,
				error: new InternalServerError(
					"Sign up is missing slot ID, but has EventParticipationStatus.CONFIRMED",
				),
			};
		}

		ctx.log.info({ signUp }, "Demoting sign up");
		const { signUp: demotedSignUp } = await this.eventRepository.updateSignUp({
			newParticipationStatus,
			eventId: event.id,
			userId,
		});
		await this.eventCapacityChanged(event.id);
		return {
			ok: true,
			data: { signUp: demotedSignUp },
		};
	}

	private async demoteOnWaitlistSignUp(
		ctx: Context,
		data: {
			userId: string;
			event: TicketEvent | SignUpEvent;
			signUp: EventSignUp;
			newParticipationStatus: Exclude<
				EventParticipationStatusType,
				"CONFIRMED" | "ON_WAITLIST"
			>;
		},
	): ResultAsync<{ signUp: EventSignUp }, InvalidArgumentError> {
		const { userId, event, signUp } = data;
		if (signUp.participationStatus !== EventParticipationStatus.ON_WAITLIST) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"Can only demote sign ups with status ON_WAITLIST",
				),
			};
		}

		ctx.log.info({ signUp }, "Demoting sign up");
		const { signUp: updatedSignUp } = await this.eventRepository.updateSignUp({
			userId,
			eventId: event.id,
			newParticipationStatus: data.newParticipationStatus,
		});
		return { ok: true, data: { signUp: updatedSignUp } };
	}

	/**
	 * retractSignUp retracts a sign up, incrementing the remaining capacity of the event and slot
	 * if the sign up was assigned to a slot.
	 * This should be used when a user cancels their sign up.
	 *
	 * @param userId - The ID of the user that is retracting their sign up
	 * @param eventId - The ID of the event to retract the sign up for
	 * @returns The updated sign up
	 */
	async retractSignUp(
		ctx: Context,
		params: { eventId: string },
	): ResultAsync<
		{ signUp: EventSignUp },
		| NotFoundError
		| UnauthorizedError
		| InvalidArgumentError
		| InternalServerError
	> {
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError(
					"You must be logged in to retract a sign up",
				),
			};
		}
		const userId = ctx.user.id;
		const { eventId } = params;
		const event = await this.eventRepository.get(eventId);
		if (
			event.type !== EventTypeEnum.SIGN_UPS &&
			event.type !== EventTypeEnum.TICKETS
		) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"Sign ups are not available for this event",
				),
			};
		}

		const getSignUpResult = await this.eventRepository.getActiveSignUp(ctx, {
			userId,
			eventId,
		});
		if (!getSignUpResult.ok) {
			switch (getSignUpResult.error.name) {
				case "NotFoundError":
					return {
						ok: false,
						error: new NotFoundError(
							"Sign up with the specified ID does not exist",
							getSignUpResult.error,
						),
					};
				case "InternalServerError":
					return {
						ok: false,
						error: new InternalServerError(
							"Failed to get sign up",
							getSignUpResult.error,
						),
					};
			}
		}
		const { signUp } = getSignUpResult.data;

		switch (signUp.participationStatus) {
			case EventParticipationStatus.CONFIRMED: {
				if (DateTime.fromJSDate(event.signUpsEndAt) < DateTime.now()) {
					return {
						ok: false,
						error: new InvalidArgumentError(
							"Sign ups are closed for this event",
						),
					};
				}
				if (!event.signUpsRetractable) {
					return {
						ok: false,
						error: new InvalidArgumentError(
							"Sign ups are not retractable for this event",
						),
					};
				}

				return await this.demoteConfirmedSignUp(ctx, {
					userId: ctx.user.id,
					event,
					signUp,
					newParticipationStatus: EventParticipationStatus.RETRACTED,
				});
			}
			case EventParticipationStatus.ON_WAITLIST:
				return await this.demoteOnWaitlistSignUp(ctx, {
					userId: ctx.user.id,
					event,
					signUp,
					newParticipationStatus: EventParticipationStatus.RETRACTED,
				});
			case EventParticipationStatus.REMOVED:
			// fallthrough
			case EventParticipationStatus.RETRACTED:
				return {
					ok: true,
					data: { signUp },
				};
		}
	}

	/**
	 * removeSignUp removes a sign up, incrementing the remaining capacity of the event and slot
	 * if the sign up was assigned to a slot.
	 * This should be used when a member of the organization removes a sign up.
	 *
	 * @param signUpId - The ID of the sign up to remove.
	 * @returns The updated sign up
	 */
	async removeSignUp(
		ctx: Context,
		params: { signUpId: string },
	): ResultAsync<
		{ signUp: EventSignUp },
		| UnauthorizedError
		| PermissionDeniedError
		| InternalServerError
		| InvalidArgumentError
		| NotFoundError
	> {
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError(
					"You must be logged in to remove a sign up",
				),
			};
		}

		const getSignUpResult = await this.eventRepository.getSignUpById({
			id: params.signUpId,
		});
		if (!getSignUpResult.ok) {
			switch (getSignUpResult.error.name) {
				case "NotFoundError":
					return {
						ok: false,
						error: new NotFoundError(
							"Sign up with the specified ID does not exist",
							getSignUpResult.error,
						),
					};
				case "InternalServerError":
					return {
						ok: false,
						error: new InternalServerError(
							"Failed to get sign up",
							getSignUpResult.error,
						),
					};
			}
		}
		const { signUp } = getSignUpResult.data;

		const event = await this.eventRepository.get(signUp.eventId);
		if (
			event.type !== EventTypeEnum.SIGN_UPS &&
			event.type !== EventTypeEnum.TICKETS
		) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"Sign ups are not available for this event",
				),
			};
		}

		if (event.organizationId === null) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"Event does not belong to an organization",
				),
			};
		}

		const hasPermission = await this.permissionService.hasRole(ctx, {
			organizationId: event.organizationId,
			role: OrganizationRole.MEMBER,
		});
		if (hasPermission !== true) {
			return {
				ok: false,
				error: new PermissionDeniedError(
					"You do not have permission to remove this sign up",
				),
			};
		}

		switch (signUp.participationStatus) {
			case EventParticipationStatus.CONFIRMED: {
				return await this.demoteConfirmedSignUp(ctx, {
					userId: signUp.userId,
					event: event,
					signUp,
					newParticipationStatus: EventParticipationStatus.REMOVED,
				});
			}
			case EventParticipationStatus.ON_WAITLIST: {
				return await this.demoteOnWaitlistSignUp(ctx, {
					userId: signUp.userId,
					event: event,
					signUp,
					newParticipationStatus: EventParticipationStatus.REMOVED,
				});
			}
			case EventParticipationStatus.REMOVED:
			// fallthrough
			case EventParticipationStatus.RETRACTED:
				return {
					ok: true,
					data: { signUp },
				};
		}
	}

	/**
	 * canSignUpForEvent returns true if the user can sign up for the event, false otherwise.
	 */
	async canSignUpForEvent(
		ctx: Context,
		params: { eventId: string },
	): Promise<boolean> {
		if (!ctx.user) return false;

		const userId = ctx.user.id;
		const { eventId } = params;
		const event = await this.eventRepository.get(eventId);

		if (!Event.areSignUpsAvailable(event)) return false;
		if (event.remainingCapacity <= 0) return false;

		const getSignUpResult = await this.eventRepository.getActiveSignUp(ctx, {
			userId,
			eventId,
		});
		if (!getSignUpResult.ok) {
			switch (getSignUpResult.error.name) {
				case "InternalServerError": {
					throw getSignUpResult.error;
				}
				case "NotFoundError": {
					const user = await this.userService.get(userId);
					const slot = await this.eventRepository.getSlotWithRemainingCapacity(
						eventId,
						user.gradeYear,
					);
					return slot !== null;
				}
			}
		}
		const { signUp } = getSignUpResult.data;
		return !signUp.active;
	}

	async getSignUpAvailability(
		ctx: Context,
		params: {
			eventId: string;
		},
	): Promise<SignUpAvailability> {
		const { eventId } = params;

		const getEventResult = await this.eventRepository.getWithSlotsAndCategories(
			{
				id: eventId,
			},
		);
		if (!getEventResult.ok) return signUpAvailability.UNAVAILABLE;
		const { event } = getEventResult.data;
		if (!Event.isSignUpEvent(event)) return signUpAvailability.DISABLED;

		/**
		 * User is not signed in
		 */
		if (!ctx.user) return signUpAvailability.UNAVAILABLE;
		const { user } = ctx;

		const getSignUpResult = await this.eventRepository.getActiveSignUp(ctx, {
			userId: user.id,
			eventId,
		});
		if (!getSignUpResult.ok) {
			switch (getSignUpResult.error.name) {
				case "InternalServerError": {
					throw getSignUpResult.error;
				}
				case "NotFoundError": {
					const slots = await this.eventRepository.findManySlots({
						gradeYear: user.gradeYear,
						eventId,
					});
					/**
					 * There are no slots on the event for this user's grade year, so they cannot sign up
					 */
					if (slots.length === 0) return signUpAvailability.UNAVAILABLE;
					/**
					 * Event sign ups have not opened yet
					 */
					if (event.signUpsStartAt > DateTime.now().toJSDate())
						return signUpAvailability.NOT_OPEN;
					/**
					 * Event sign ups have closed
					 */
					if (event.signUpsEndAt < DateTime.now().toJSDate())
						return signUpAvailability.CLOSED;

					/**
					 * The event is full
					 */
					if (!event.remainingCapacity)
						return signUpAvailability.WAITLIST_AVAILABLE;

					const slotWithRemainingCapacity =
						await this.eventRepository.getSlotWithRemainingCapacity(
							eventId,
							user.gradeYear,
						);
					/**
					 * The slots for the user's grade year are full
					 */
					if (slotWithRemainingCapacity === null)
						return signUpAvailability.WAITLIST_AVAILABLE;

					/**
					 * The user can sign up for the event
					 */
					return signUpAvailability.AVAILABLE;
				}
			}
		}

		const { signUp } = getSignUpResult.data;

		if (signUp.participationStatus === EventParticipationStatus.CONFIRMED)
			return signUpAvailability.CONFIRMED;
		if (signUp.participationStatus === EventParticipationStatus.ON_WAITLIST)
			return signUpAvailability.ON_WAITLIST;

		throw new InternalServerError("Unexpected participation status on sign up");
	}

	public createCategory(
		ctx: Context,
		data: { name: string },
	): Promise<CategoryType> {
		if (ctx.user?.isSuperUser !== true) {
			throw new PermissionDeniedError(
				"You do not have permission to create a category.",
			);
		}

		const schema = z.object({
			name: z.string().min(1).max(100),
		});
		try {
			const category = schema.parse(data);
			return this.eventRepository.createCategory(category);
		} catch (err) {
			if (err instanceof z.ZodError)
				throw new InvalidArgumentError(err.message);
			throw err;
		}
	}

	public updateCategory(
		ctx: Context,
		data: CategoryType,
	): Promise<CategoryType> {
		if (ctx.user?.isSuperUser !== true) {
			throw new PermissionDeniedError(
				"You do not have permission to create a category.",
			);
		}

		const schema = z.object({
			id: z.string().uuid(),
			name: z.string().min(1).max(100),
		});
		try {
			const category = schema.parse(data);
			return this.eventRepository.updateCategory(category);
		} catch (err) {
			if (err instanceof z.ZodError)
				throw new InvalidArgumentError(err.message);
			throw err;
		}
	}

	public deleteCategory(
		ctx: Context,
		data: { id: string },
	): Promise<CategoryType> {
		if (ctx.user?.isSuperUser !== true) {
			throw new PermissionDeniedError(
				"You do not have permission to delete a category.",
			);
		}

		const schema = z.object({
			id: z.string().uuid(),
		});
		try {
			const category = schema.parse(data);
			return this.eventRepository.deleteCategory(category);
		} catch (err) {
			if (err instanceof z.ZodError)
				throw new InvalidArgumentError(err.message);
			throw err;
		}
	}

	public getCategories(
		_ctx: Context,
		by?: { eventId?: string },
	): Promise<CategoryType[]> {
		return this.eventRepository.getCategories(by);
	}

	public async getSlots(
		_ctx: Context,
		params: { eventId: string },
	): ResultAsync<{ slots: SlotType[] }, never> {
		const { eventId } = params;
		const slots = await this.eventRepository.findManySlots({
			eventId,
		});
		return { ok: true, data: { slots } };
	}

	private async eventCapacityChanged(eventId: string): Promise<void> {
		await this.signUpQueue.add("event-capacity-increased", {
			eventId,
		});
	}

	/**
	 * getOrderForSignUp returns the order for the sign up for the specified user and event.
	 * If the user is a super user, they can get the order for any user.
	 * If the user is not a super user, they can only get their own order.
	 */
	async getOrderForSignUp(
		ctx: Context,
		params: { eventId: string; userId?: string },
	): ResultAsync<
		{ order: OrderType },
		| NotFoundError
		| InternalServerError
		| InvalidArgumentError
		| UnauthorizedError
		| PermissionDeniedError
	> {
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError(
					"You must be logged in to get an order for a sign up",
				),
			};
		}
		let userId = ctx.user.id;
		if (ctx.user.isSuperUser && params.userId) {
			userId = params.userId;
		}

		const { eventId } = params;
		const getSignUpResult = await this.eventRepository.getActiveSignUp(ctx, {
			userId,
			eventId,
		});
		if (!getSignUpResult.ok) {
			switch (getSignUpResult.error.name) {
				case "NotFoundError":
					return {
						ok: false,
						error: new NotFoundError(
							"Sign up not found",
							getSignUpResult.error,
						),
					};
				case "InternalServerError":
					return {
						ok: false,
						error: new InternalServerError(
							"Failed to get sign up",
							getSignUpResult.error,
						),
					};
			}
		}
		const { signUp } = getSignUpResult.data;

		if (signUp.participationStatus !== "CONFIRMED") {
			return {
				ok: false,
				error: new NotFoundError(
					"Cannot get order for sign up with status other than CONFIRMED",
				),
			};
		}
		if (signUp.orderId === null) {
			return {
				ok: false,
				error: new NotFoundError("Sign up does not have an order"),
			};
		}
		const getOrderResult = await this.productService.orders.get(ctx, {
			id: signUp.orderId,
		});
		if (!getOrderResult.ok) {
			return {
				ok: false,
				error: getOrderResult.error,
			};
		}
		return {
			ok: true,
			data: { order: getOrderResult.data.order },
		};
	}

	/**
	 * getSignUp returns the sign up for the specified user and event.
	 * If the user is a super user, they can get the sign up for any user.
	 * If the user is not a super user, they can only get their own sign up.
	 */
	async getSignUp(
		ctx: Context,
		params: { userId?: string; eventId: string },
	): ResultAsync<
		{ signUp: EventSignUp },
		NotFoundError | UnauthorizedError | InternalServerError
	> {
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError("You must be logged in to get a sign up"),
			};
		}
		let userId = ctx.user.id;
		if (ctx.user.isSuperUser && params.userId) {
			userId = params.userId;
		}

		const { eventId } = params;
		return await this.eventRepository.getActiveSignUp(ctx, { userId, eventId });
	}

	/**
	 * findManySignUps returns all sign ups for the specified event, optionally filtered by
	 * participation status.
	 *
	 * Requires the user to be a member of the organization that the event belongs to.
	 * Errors:
	 * 	- UnauthorizedError: If the user is not logged in
	 * 	- PermissionDeniedError: If the user is not a member of the organization that the event belongs to
	 * 	- InvalidArgumentError: If the event does not belong to an organization
	 * 	- NotFoundError: If the event does not exist
	 * 	- InternalServerError: If an unexpected error occurs
	 */
	async findManySignUps(
		ctx: Context,
		params: {
			eventId: string;
			participationStatus?: EventParticipationStatusType | null;
		},
	): ResultAsync<
		{ signUps: EventSignUp[]; total: number },
		| UnauthorizedError
		| PermissionDeniedError
		| InvalidArgumentError
		| NotFoundError
		| InternalServerError
	> {
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError(
					"You must be logged in to get sign ups for an event",
				),
			};
		}

		const { eventId, participationStatus } = params;
		let event: EventType;
		try {
			event = await this.eventRepository.get(eventId);
		} catch (err) {
			if (err instanceof NotFoundError) {
				return {
					ok: false,
					error: new NotFoundError("Event not found", err),
				};
			}
			return {
				ok: false,
				error: new InternalServerError("Failed to get event", err),
			};
		}
		if (!event.organizationId) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"Cannot get sign ups for events that do not belong to an organization",
				),
			};
		}

		const isMember = await this.permissionService.hasRole(ctx, {
			organizationId: event.organizationId,
			role: OrganizationRole.MEMBER,
		});

		if (isMember !== true) {
			return {
				ok: false,
				error: new PermissionDeniedError(
					"You do not have permission to get sign ups for this event",
				),
			};
		}

		const findManySignUpsResult = await this.eventRepository.findManySignUps({
			eventId,
			status: participationStatus ?? undefined,
		});
		if (!findManySignUpsResult.ok) {
			switch (findManySignUpsResult.error.name) {
				case "NotFoundError":
					return {
						ok: false,
						error: new NotFoundError(
							"Could not find sign ups for event",
							findManySignUpsResult.error,
						),
					};
				case "InternalServerError":
					return {
						ok: false,
						error: new InternalServerError(
							"Unexpected error in repository",
							findManySignUpsResult.error,
						),
					};
			}
		}

		return findManySignUpsResult;
	}

	/**
	 * getApproximatePositionOnWaitingList returns the approximate position of the user on the wait list for the specified event.
	 * Requires the user to be logged in.
	 *
	 * The position is a naive estimate, and may not be accurate as the exact position depends on
	 * which slots the user could be assigned to.
	 */
	async getApproximatePositionOnWaitingList(
		ctx: Context,
		params: { eventId: string },
	): ResultAsync<
		{ position: number },
		| NotFoundError
		| InternalServerError
		| UnauthorizedError
		| InvalidArgumentError
	> {
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError("You must be logged in to get a position"),
			};
		}

		const { eventId } = params;
		const { user } = ctx;

		const getSignUpResult = await this.getSignUp(ctx, {
			eventId,
			userId: user.id,
		});

		if (!getSignUpResult.ok) {
			return {
				ok: false,
				error: getSignUpResult.error,
			};
		}

		const { signUp } = getSignUpResult.data;
		if (signUp.participationStatus !== EventParticipationStatus.ON_WAITLIST) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"User is not on the wait list for this event",
				),
			};
		}

		const getEarlierSignUpsResult =
			await this.eventRepository.getEarlierSignUpsOnWaitList({
				eventId,
				createdAt: signUp.createdAt,
			});
		if (!getEarlierSignUpsResult.ok) {
			return {
				ok: false,
				error: getEarlierSignUpsResult.error,
			};
		}

		const { count } = getEarlierSignUpsResult.data;

		return { ok: true, data: { position: count + 1 } };
	}

	/**
	 * findManySignUpsForUser returns all sign ups for the authenticated user.
	 * @param ctx the context of the request
	 */
	async findManySignUpsForUser(
		ctx: Context,
		params: {
			userId: string;
			orderBy?: "asc" | "desc" | null;
			participationStatus?: EventParticipationStatusType | null;
		},
	): ResultAsync<
		{ signUps: EventSignUp[]; total: number },
		UnauthorizedError | InternalServerError
	> {
		if (!ctx.user) {
			return {
				ok: false,
				error: new UnauthorizedError(
					"You must be logged in to get sign ups for an event",
				),
			};
		}
		if (ctx.user.id !== params.userId) {
			return {
				ok: false,
				error: new UnauthorizedError("You can only view your own sign ups"),
			};
		}

		const orderBy = params?.orderBy ?? "desc";
		const participationStatus = params?.participationStatus ?? undefined;

		const findManySignUpsResult = await this.eventRepository.findManySignUps({
			userId: ctx.user.id,
			orderBy,
			status: participationStatus,
		});
		if (!findManySignUpsResult.ok) {
			return {
				ok: false,
				error: new InternalServerError(
					"Failed to get sign ups",
					findManySignUpsResult.error,
				),
			};
		}

		return findManySignUpsResult;
	}
}
