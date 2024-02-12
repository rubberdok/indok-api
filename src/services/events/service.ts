import {
	type EventSignUp,
	type EventSlot,
	type FeaturePermission,
	ParticipationStatus,
} from "@prisma/client";
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
	EventUpdateFn,
	NewEventReturnType,
} from "~/domain/events/event.js";
import {
	Event,
	type EventType,
	EventTypeEnum,
	type SignUpAvailability,
	Slot,
	type SlotType,
	signUpAvailability,
} from "~/domain/events/index.js";
import type { NewSlotParams, UpdateSlotFields } from "~/domain/events/slot.js";
import { Role } from "~/domain/organizations.js";
import type { OrderType, ProductType } from "~/domain/products.js";
import type { User } from "~/domain/users.js";
import type { ResultAsync } from "~/lib/result.js";
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

interface CreateConfirmedSignUpData {
	userId: string;
	eventId: string;
	slotId: string;
	participationStatus: Extract<ParticipationStatus, "CONFIRMED">;
	orderId?: string;
}

interface CreateOnWaitlistSignUpData {
	userId: string;
	eventId: string;
	participationStatus: Extract<ParticipationStatus, "ON_WAITLIST">;
}

interface UpdateToConfirmedSignUpData {
	userId: string;
	eventId: string;
	slotId: string;
	newParticipationStatus: Extract<ParticipationStatus, "CONFIRMED">;
}

interface UpdateToInactiveSignUpData {
	userId: string;
	eventId: string;
	newParticipationStatus: Extract<ParticipationStatus, "REMOVED" | "RETRACTED">;
}

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
	update(
		ctx: Context,
		id: string,
		updateFn: EventUpdateFn<
			EventType,
			InternalServerError | InvalidArgumentError | PermissionDeniedError
		>,
	): ResultAsync<
		{ event: EventType; slots: SlotType[]; categories: CategoryType[] },
		InternalServerError | InvalidArgumentError | PermissionDeniedError
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
	): Promise<EventSlot | null>;
	findMany(data?: { endAtGte?: Date | null }): Promise<EventType[]>;
	findManySignUps(data: {
		eventId: string;
		status: ParticipationStatus;
	}): Promise<EventSignUp[]>;
	getSignUp(userId: string, eventId: string): Promise<EventSignUp>;
	createSignUp(
		data: CreateConfirmedSignUpData | CreateOnWaitlistSignUpData,
	): Promise<{
		signUp: EventSignUp;
		slot?: EventSlot;
		event: EventType;
	}>;
	updateSignUp(
		data: UpdateToConfirmedSignUpData | UpdateToInactiveSignUpData,
	): Promise<{
		signUp: EventSignUp;
		slot?: EventSlot;
		event: EventType;
	}>;
	addOrderToSignUp(params: {
		orderId: string;
		signUpId: string;
	}): Promise<
		ResultAsync<{ signUp: EventSignUp }, NotFoundError | InternalServerError>
	>;
	findManySlots(data: { gradeYear?: number; eventId: string }): Promise<
		EventSlot[]
	>;
	getCategories(by?: { eventId?: string }): Promise<CategoryType[]>;
	createCategory(data: { name: string }): Promise<CategoryType>;
	updateCategory(data: CategoryType): Promise<CategoryType>;
	deleteCategory(data: { id: string }): Promise<CategoryType>;
}

interface UserService {
	get(id: string): Promise<User>;
}

interface PermissionService {
	hasRole(data: {
		userId?: string;
		organizationId: string;
		role: Role;
	}): Promise<boolean>;
	hasFeaturePermission(data: {
		userId: string;
		featurePermission: FeaturePermission;
	}): Promise<boolean>;
	isSuperUser(userId: string | undefined): Promise<{ isSuperUser: boolean }>;
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
	};
}

type BaseCreateEventFields = {
	name: string;
	description?: string | null;
	startAt: Date;
	endAt?: Date | null;
	contactEmail?: string | null;
	location?: string | null;
	organizationId: string;
	capacity?: number | null;
	signUpsStartAt?: Date | null;
	signUpsEndAt?: Date | null;
	signUpsEnabled?: boolean | null;
};

type CreateBasicEventParams = {
	type: typeof EventTypeEnum.BASIC;
	event: BaseCreateEventFields;
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

		const isMember = await this.permissionService.hasRole({
			userId: ctx.user?.id,
			organizationId: eventData.organizationId,
			role: Role.MEMBER,
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
					if (createProductResult.error.name === "InvalidArgumentError") {
						return {
							ok: false,
							error: new InvalidArgumentError(
								"Could not create product for event",
								createProductResult.error,
							),
						};
					}
					return {
						ok: false,
						error: new InternalServerError(
							"Unexpected error when creating product for event",
							createProductResult.error,
						),
					};
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
			const { error } = result;
			if (error.name === "InvalidArgumentError") {
				return {
					ok: false,
					error: new InvalidArgumentError(
						`Event constructor for ${type}`,
						error,
					),
				};
			}
			return {
				ok: false,
				error: new InternalServerError(
					"Unexpected error in event constructor",
					error,
				),
			};
		}

		const { event } = result.data;
		const createEventResult = await this.eventRepository.create(ctx, {
			event,
			slots,
		});
		if (!createEventResult.ok) {
			const { error } = createEventResult;
			if (error.name === "InvalidArgumentError") {
				return {
					ok: false,
					error: new InvalidArgumentError(
						`Could not create event in repository for ${type}`,
						error,
					),
				};
			}
			return {
				ok: false,
				error: new InternalServerError("Unexpected error in repository", error),
			};
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
		InvalidArgumentError | PermissionDeniedError | InternalServerError
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
				const isMember = await this.permissionService.hasRole({
					userId: ctx.user?.id,
					organizationId: event.organizationId,
					role: Role.MEMBER,
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
								error: new InvalidArgumentError("Slot to update not found"),
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
								error: new InvalidArgumentError("Slot to delete not found"),
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
		userId: string,
		eventId: string,
	): Promise<EventSignUp> {
		if (ctx.user === null) {
			throw new UnauthorizedError(
				"You must be logged in to sign up for an event",
			);
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
				throw new InvalidArgumentError("Cannot sign up for the event.");
			}

			// If there is no remaining capacity on the event, it doesn't matter if there is any remaining capacity in slots.
			if (event.remainingCapacity <= 0) {
				ctx.log.info({ event }, "Event is full, adding user to wait list.");
				const { signUp } = await this.eventRepository.createSignUp({
					userId,
					participationStatus: ParticipationStatus.ON_WAITLIST,
					eventId,
				});
				return signUp;
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
						participationStatus: ParticipationStatus.ON_WAITLIST,
						eventId,
					});
					return signUp;
				}
				let { signUp } = await this.eventRepository.createSignUp({
					userId,
					participationStatus: ParticipationStatus.CONFIRMED,
					eventId,
					slotId: slotToSignUp.id,
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
						throw orderResult.error;
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
						throw new InternalServerError(
							"failed to add order to confirmed sign up on ticket event",
							updatedSignUp.error,
						);
					}
					signUp = updatedSignUp.data.signUp;
				}
				return signUp;
			} catch (err) {
				// If there are no slots with remaining capacity, we add the user to the wait list.
				if (err instanceof NotFoundError) continue;
				throw err;
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
		throw new InternalServerError("Failed to sign up user after 20 attempts");
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
	async findMany(data?: { onlyFutureEvents?: boolean }): Promise<EventType[]> {
		if (!data) {
			return await this.eventRepository.findMany();
		}

		let endAtGte: Date | undefined;
		if (data.onlyFutureEvents) {
			endAtGte = DateTime.now().toJSDate();
		}

		return await this.eventRepository.findMany({ endAtGte });
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

		const signUpsOnWaitlist = await this.eventRepository.findManySignUps({
			eventId,
			status: ParticipationStatus.ON_WAITLIST,
		});
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
							newParticipationStatus: ParticipationStatus.CONFIRMED,
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
	private async demoteConfirmedSignUp(data: {
		userId: string;
		eventId: string;
		newParticipationStatus: Extract<
			ParticipationStatus,
			"RETRACTED" | "REMOVED"
		>;
	}): Promise<EventSignUp> {
		const { userId, eventId, newParticipationStatus } = data;

		const signUp = await this.eventRepository.getSignUp(userId, eventId);
		if (signUp.participationStatus !== ParticipationStatus.CONFIRMED) {
			throw new InvalidArgumentError(
				`Can only demote sign ups with status confirmed, got, ${signUp.participationStatus}`,
			);
		}

		if (signUp.slotId === null) {
			throw new InternalServerError(
				"Sign up is missing slot ID, but has ParticipationStatus.CONFIRMED",
			);
		}

		const { signUp: demotedSignUp } = await this.eventRepository.updateSignUp({
			newParticipationStatus,
			eventId: eventId,
			userId: userId,
		});
		await this.eventCapacityChanged(eventId);
		return demotedSignUp;
	}

	private async demoteOnWaitlistSignUp(data: {
		userId: string;
		eventId: string;
		newParticipationStatus: Exclude<
			ParticipationStatus,
			"CONFIRMED" | "ON_WAITLIST"
		>;
	}) {
		const { userId, eventId } = data;
		const signUp = await this.eventRepository.getSignUp(userId, eventId);
		if (signUp.participationStatus !== ParticipationStatus.ON_WAITLIST) {
			throw new InvalidArgumentError(
				"Can only demote sign ups with with participation status ON_WAITLIST",
			);
		}

		const { signUp: updatedSignUp } = await this.eventRepository.updateSignUp({
			userId,
			eventId,
			newParticipationStatus: data.newParticipationStatus,
		});
		return updatedSignUp;
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
	async retractSignUp(userId: string, eventId: string): Promise<EventSignUp> {
		const signUp = await this.eventRepository.getSignUp(userId, eventId);

		switch (signUp.participationStatus) {
			case ParticipationStatus.CONFIRMED:
				return await this.demoteConfirmedSignUp({
					userId,
					eventId,
					newParticipationStatus: ParticipationStatus.RETRACTED,
				});
			case ParticipationStatus.ON_WAITLIST:
				return await this.demoteOnWaitlistSignUp({
					userId,
					eventId,
					newParticipationStatus: ParticipationStatus.RETRACTED,
				});
			case ParticipationStatus.REMOVED:
			// fallthrough
			case ParticipationStatus.RETRACTED:
				return signUp;
		}
	}

	/**
	 * canSignUpForEvent returns true if the user can sign up for the event, false otherwise.
	 */
	async canSignUpForEvent(userId: string, eventId: string): Promise<boolean> {
		const event = await this.eventRepository.get(eventId);

		if (!Event.areSignUpsAvailable(event)) return false;
		if (event.remainingCapacity <= 0) return false;

		try {
			const signUp = await this.eventRepository.getSignUp(userId, eventId);
			if (signUp.active) return false;
		} catch (err) {
			const isNotFoundError = err instanceof NotFoundError;
			if (!isNotFoundError) throw err;
		}

		const user = await this.userService.get(userId);
		const slot = await this.eventRepository.getSlotWithRemainingCapacity(
			eventId,
			user.gradeYear,
		);
		return slot !== null;
	}

	async getSignUpAvailability(
		userId: string | undefined,
		eventId: string,
	): Promise<SignUpAvailability> {
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
		if (!userId) return signUpAvailability.UNAVAILABLE;
		const user = await this.userService.get(userId);

		try {
			const signUp = await this.eventRepository.getSignUp(user.id, eventId);
			if (signUp.participationStatus === ParticipationStatus.CONFIRMED)
				return signUpAvailability.CONFIRMED;
			if (signUp.participationStatus === ParticipationStatus.ON_WAITLIST)
				return signUpAvailability.ON_WAITLIST;
		} catch (err) {
			const isNotFoundError = err instanceof NotFoundError;
			if (!isNotFoundError) throw err;
		}

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
		if (!event.remainingCapacity) return signUpAvailability.WAITLIST_AVAILABLE;

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

	public async createCategory(
		ctx: Context,
		data: { name: string },
	): Promise<CategoryType> {
		const { isSuperUser } = await this.permissionService.isSuperUser(
			ctx.user?.id,
		);
		if (isSuperUser !== true) {
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

	public async updateCategory(
		ctx: Context,
		data: CategoryType,
	): Promise<CategoryType> {
		const { isSuperUser } = await this.permissionService.isSuperUser(
			ctx.user?.id,
		);
		if (isSuperUser !== true) {
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

	public async deleteCategory(
		ctx: Context,
		data: { id: string },
	): Promise<CategoryType> {
		const { isSuperUser } = await this.permissionService.isSuperUser(
			ctx.user?.id,
		);
		if (isSuperUser !== true) {
			throw new PermissionDeniedError(
				"You do not have permission to create a category.",
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
		ctx: Context,
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
}
