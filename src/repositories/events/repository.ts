import {
	type Event as PrismaEvent,
	type EventSignUp,
	type EventSlot,
	ParticipationStatus,
	type Prisma,
	type PrismaClient,
} from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import { pick } from "lodash-es";
import {
	InternalServerError,
	InvalidArgumentError,
	KnownDomainError,
	NotFoundError,
} from "~/domain/errors.js";
import type { CategoryType } from "~/domain/events/category.js";
import { AlreadySignedUpError, Event } from "~/domain/events/event.js";
import {
	type EventType,
	type EventUpdateFn,
	Slot,
	type SlotType,
} from "~/domain/events/index.js";
import type { Context } from "~/lib/context.js";
import { prismaKnownErrorCodes } from "~/lib/prisma.js";
import type { ResultAsync } from "~/lib/result.js";

export class EventRepository {
	constructor(private db: PrismaClient) {}

	/**
	 * Create a new event.
	 */
	async create(
		_ctx: Context,
		params: {
			event: EventType;
			slots?: SlotType[];
			categories?: { id: string }[];
		},
	): ResultAsync<
		{ event: EventType; slots: SlotType[]; categories: CategoryType[] },
		InternalServerError | InvalidArgumentError
	> {
		const {
			event: eventData,
			slots: slotsData,
			categories: categoriesData,
		} = params;

		let createManySlots:
			| Prisma.EventSlotCreateManyEventInputEnvelope
			| undefined = undefined;
		if (slotsData) {
			createManySlots = {
				data: slotsData.map((slot) => ({
					id: slot.id,
					version: slot.version,
					remainingCapacity: slot.remainingCapacity,
					capacity: slot.capacity,
					gradeYears: slot.gradeYears,
				})),
			};
		}

		const createFields = pick(eventData, [
			"name",
			"description",
			"contactEmail",
			"endAt",
			"location",
			"organizationId",
			"signUpsEnabled",
			"startAt",
			"type",
			"capacity",
			"productId",
			"remainingCapacity",
			"signUpsEndAt",
			"signUpsStartAt",
			"signUpsRetractable",
			"signUpsRequireUserProvidedInformation",
		]);
		try {
			const {
				slots: dbSlots,
				categories: dbCategories,
				...dbEvent
			} = await this.db.event.create({
				include: {
					slots: true,
					categories: true,
				},
				data: {
					...createFields,
					categories: {
						connect: categoriesData?.map((category) => ({
							id: category.id,
						})),
					},
					slots: {
						createMany: createManySlots,
					},
				},
			});

			const eventResult = Event.fromDataStorage(dbEvent);
			if (!eventResult.ok) {
				return {
					ok: false,
					error: new InternalServerError(
						"Failed to convert event from data storage",
					),
				};
			}
			const slotResults = dbSlots.map((slot) => Slot.fromDataStorage(slot));
			const slots: SlotType[] = [];
			for (const slotResult of slotResults) {
				if (!slotResult.ok) {
					return {
						ok: false,
						error: new InternalServerError(
							"Failed to convert slot from data storage",
						),
					};
				}
				slots.push(slotResult.data.slot);
			}
			const categories = dbCategories;
			return {
				ok: true,
				data: {
					event: eventResult.data.event,
					slots,
					categories,
				},
			};
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND) {
					return {
						ok: false,
						error: new InvalidArgumentError(
							"Related entity not found when creating a new event",
							err,
						),
					};
				}
			}
			return {
				ok: false,
				error: new InternalServerError(
					"Unexpected error when creating a new event",
					err,
				),
			};
		}
	}

	/**
	 * Update an event
	 *
	 * Values that are undefined will be left unchanged.
	 * @param _ctx - The context
	 * @param id - The ID of the event to update
	 * @param updateFn - A function that takes the current event, with the slots and categories, and returns the updated event, with the slots and categories
	 * @returns The updated event
	 */
	async update<TError extends Error>(
		_ctx: Context,
		id: string,
		updateFn: EventUpdateFn<TError>,
	): ResultAsync<
		{ event: EventType; slots: SlotType[]; categories: CategoryType[] },
		InternalServerError | TError
	> {
		try {
			const event = await this.db.$transaction(async (tx) => {
				const getEventResult = await this.getWithSlotsAndCategories({ id });

				if (!getEventResult.ok) {
					throw getEventResult.error;
				}

				const { event, slots, categories } = getEventResult.data;

				const updateEventResult = await updateFn({ event, slots, categories });
				if (!updateEventResult.ok) {
					throw updateEventResult.error;
				}

				const {
					event: newEvent,
					slots: newSlots,
					categories: newCategories,
				} = updateEventResult.data;
				const { id: _, ...data } = newEvent;
				let createManySlots:
					| Prisma.EventSlotCreateManyEventInputEnvelope
					| undefined = undefined;
				if (newSlots?.create) {
					createManySlots = {
						data: newSlots.create.map((slot) => ({
							remainingCapacity: slot.remainingCapacity,
							capacity: slot.capacity,
							gradeYears: slot.gradeYears,
						})),
					};
				}

				const updateFields = pick(data, [
					"capacity",
					"name",
					"description",
					"location",
					"contactEmail",
					"startAt",
					"endAt",
					"signUpsEnabled",
					"signUpsStartAt",
					"signUpsEndAt",
					"signUpsRetractable",
					"remainingCapacity",
				]);

				const updatedEvent = await tx.event.update({
					include: {
						slots: true,
						categories: true,
					},
					where: {
						id,
						version: event.version,
					},
					data: {
						...updateFields,
						categories: {
							set: newCategories?.map((category) => ({
								id: category.id,
							})),
						},
						slots: {
							createMany: createManySlots,
							deleteMany: newSlots?.delete?.map((slot) => ({
								id: slot.id,
								version: slot.version,
							})),
							updateMany: newSlots?.update?.map((slot) => ({
								where: {
									id: slot.id,
									version: slot.version,
								},
								data: {
									remainingCapacity: slot.remainingCapacity,
									capacity: slot.capacity,
									gradeYears: slot.gradeYears,
									version: {
										increment: 1,
									},
								},
							})),
						},
					},
				});
				return updatedEvent;
			});
			const {
				slots: updatedSlots,
				categories: updatedCategories,
				...updatedEvent
			} = event;
			const eventResult = Event.fromDataStorage(updatedEvent);
			const slots: SlotType[] = [];
			for (const slot of updatedSlots) {
				const slotResult = Slot.fromDataStorage(slot);
				if (!slotResult.ok) {
					return slotResult;
				}
				slots.push(slotResult.data.slot);
			}
			const categories: CategoryType[] = [];
			for (const category of updatedCategories) {
				categories.push(category);
			}
			if (!eventResult.ok) {
				return eventResult;
			}

			return {
				ok: true,
				data: {
					event: eventResult.data.event,
					categories,
					slots,
				},
			};
		} catch (err) {
			if (err instanceof KnownDomainError) {
				return {
					ok: false,
					error: err,
				};
			}
			return {
				ok: false,
				error: new InternalServerError(
					"Unexpected error when updating an event",
					err,
				),
			};
		}
	}

	/**
	 * getSlotWithRemainingCapacity returns the slot with the greatest number of remaining capacity for the given event.
	 *
	 * @param eventId - The ID of the event to get a slot for
	 * @param gradeYear - The grade year for which the slot should be available
	 * @returns The slot with the greatest number of remaining capacity for the given event
	 */
	async getSlotWithRemainingCapacity(
		eventId: string,
		gradeYear?: number,
	): Promise<EventSlot | null> {
		if (gradeYear !== undefined) {
			const slot = await this.db.eventSlot.findFirst({
				where: {
					eventId,
					gradeYears: {
						has: gradeYear,
					},
					remainingCapacity: {
						gt: 0,
					},
				},
				orderBy: {
					remainingCapacity: "desc",
				},
			});
			return slot;
		}
		const slot = await this.db.eventSlot.findFirst({
			where: {
				eventId,
				gradeYears: {
					hasEvery: [1, 2, 3, 4, 5],
				},
				remainingCapacity: {
					gt: 0,
				},
			},
			orderBy: {
				remainingCapacity: "desc",
			},
		});

		return slot;
	}

	/**
	 * get returns the event with the given ID.
	 *
	 * @throws {NotFoundError} If an event with the given ID does not exist
	 */
	async get(id: string): Promise<EventType & { slots?: SlotType[] }> {
		const findEventResult = await this.db.event.findUnique({
			where: {
				id,
			},
		});

		if (findEventResult === null) {
			throw new NotFoundError(`Event { id: ${id} } not found`);
		}

		const res = Event.fromDataStorage(findEventResult);
		if (res.ok) {
			return res.data.event;
		}
		throw new InternalServerError("Failed to convert event from data storage");
	}

	/**
	 * getWithSlotsAndCategories returns the event with the given ID, with its slots and categories.
	 */
	async getWithSlotsAndCategories({ id }: { id: string }): ResultAsync<
		{
			event: EventType;
			slots?: SlotType[];
			categories?: CategoryType[];
		},
		InternalServerError | NotFoundError
	> {
		const findEventResult = await this.db.event.findUnique({
			include: {
				slots: true,
				categories: true,
			},
			where: {
				id,
			},
		});

		if (findEventResult === null) {
			return {
				ok: false,
				error: new NotFoundError(`Event { id: ${id} } not found`),
			};
		}

		const { slots, categories, ...eventFromDSO } = findEventResult;

		const res = Event.fromDataStorage(eventFromDSO);
		if (!res.ok) {
			return {
				ok: false,
				error: new InternalServerError(
					"Failed to convert event from data storage",
				),
			};
		}

		return {
			ok: true,
			data: {
				event: res.data.event,
				slots,
				categories,
			},
		};
	}

	/**
	 * getCategories returns a list of all event categories
	 */
	getCategories(by?: { eventId?: string }): Promise<CategoryType[]> {
		let where: Prisma.EventCategoryWhereInput | undefined;
		if (by?.eventId) {
			where = {
				events: {
					some: {
						id: by.eventId,
					},
				},
			};
		}
		return this.db.eventCategory.findMany({
			where,
		});
	}

	/**
	 * findMany returns a list of events.
	 * @param data.endAtGte - Only return events that end after this date
	 * @returns A list of events
	 */
	async findMany(data?: { endAtGte?: Date; organizationId?: string }): Promise<
		EventType[]
	> {
		if (data) {
			const { endAtGte, organizationId } = data;
			const events = await this.db.event.findMany({
				where: {
					organizationId,
					endAt: {
						gte: endAtGte,
					},
				},
			});

			return events
				.map((event) => Event.fromDataStorage(event))
				.map((res) => {
					if (res.ok) {
						return res.data.event;
					}
					throw new InternalServerError(
						"Failed to convert event from data storage",
					);
				});
		}

		const events = await this.db.event.findMany();
		return events
			.map((event) => Event.fromDataStorage(event))
			.map((res) => {
				if (res.ok) {
					return res.data.event;
				}
				throw new InternalServerError(
					"Failed to convert event from data storage",
				);
			});
	}

	/**
	 * findManySignUps returns a list of event sign ups with the given status for the event, ordered by the time they were created.
	 *
	 * @param eventId - The ID of the event to get sign ups for
	 * @param status - The status of the sign ups to get
	 * @returns A list of event sign ups
	 */
	async findManySignUps(data: {
		eventId: string;
		status?: ParticipationStatus;
	}): ResultAsync<
		{ signUps: EventSignUp[]; total: number },
		NotFoundError | InternalServerError
	> {
		const { eventId, status } = data;
		const totalPromise = this.db.eventSignUp.count({
			where: {
				eventId,
				participationStatus: status,
			},
		});
		const findManyPromise = this.db.eventSignUp.findMany({
			where: {
				eventId,
				participationStatus: status,
			},
			orderBy: {
				createdAt: "asc",
			},
		});
		try {
			const [total, signUps] = await this.db.$transaction([
				totalPromise,
				findManyPromise,
			]);
			return {
				ok: true,
				data: {
					signUps,
					total,
				},
			};
		} catch (err) {
			return {
				ok: false,
				error: new InternalServerError(
					"Unexpected error when finding many event sign ups",
					err,
				),
			};
		}
	}

	/**
	 * Create a new sign up for the event the given participation status. All newly created events are set as active,
	 * which is either `ON_WAITLIST` or `CONFIRMED`. While creating the sign up, the remaining capacity of the event and slot
	 * is decremented by 1.
	 *
	 * @throws {AlreadySignedUpError} If the user has an active sign up for the event, i.e. a sign up with status `ON_WAITLIST` or `CONFIRMED`
	 * @throws {NotFoundError} If the event or event slot does not exist, or if the event or event slot does not fulfill the capacity requirements.
	 * @param data.userId - The ID of the user to sign up for the event
	 * @param data.participationStatus - The participation status of the sign up
	 * @param data.eventId - The ID of the event to sign up for
	 * @param data.slotId - The ID of the slot to sign up for
	 * @returns The created sign up, and the updated event and slot
	 */
	public async createSignUp(
		data: CreateConfirmedSignUpData,
	): Promise<{ event: EventType; signUp: EventSignUp; slot: EventSlot }>;
	/**
	 * Create a new sign up for the event the given participation status. All newly created events are set as active,
	 * which is either `ON_WAITLIST` or `CONFIRMED`. Leaves the remaining capacity of the event and slot unchanged.
	 *
	 * @throws {AlreadySignedUpError} If the user has an active sign up for the event, i.e. a sign up with status `ON_WAITLIST` or `CONFIRMED`
	 * @throws {NotFoundError} If the event or event slot does not exist, or if the event or event slot does not fulfill the capacity requirements.
	 * @param data.userId - The ID of the user to sign up for the event
	 * @param data.participationStatus - The participation status of the sign up
	 * @param data.eventId - The ID of the event to sign up for
	 * @returns The created sign up, and the updated event and slot
	 */
	public async createSignUp(
		data: CreateOnWaitlistSignUpData,
	): Promise<{ event: EventType; signUp: EventSignUp }>;

	/**
	 * Create a new sign up for the event the given participation status. All newly created events are set as active,
	 * which is either `ON_WAITLIST` or `CONFIRMED`. If the participation status is `CONFIRMED`, then the remaining capacity of the event and slot
	 * is decremented by 1. If the participation status is `ON_WAITLIST`, then the remaining capacity of the event and slot is left unchanged.
	 *
	 * @throws {AlreadySignedUpError} If the user has an active sign up for the event, i.e. a sign up with status `ON_WAITLIST` or `CONFIRMED`
	 * @throws {NotFoundError} If the event or event slot does not exist, or if the event or event slot does not fulfill the capacity requirements.
	 * @param data.userId - The ID of the user to sign up for the event
	 * @param data.participationStatus - The participation status of the sign up
	 * @param data.eventId - The ID of the event to sign up for
	 * @param data.slotId - The ID of the slot to sign up for
	 * @returns The created sign up, and the updated event and slot
	 */
	public async createSignUp(data: CreateSignUpParams): Promise<{
		event: EventType;
		signUp: EventSignUp;
		slot?: EventSlot;
	}> {
		try {
			if ("slotId" in data) {
				const { event, signUp, slot } = await this.createConfirmedSignUp(data);
				return { event, signUp, slot };
			}
			const { event, signUp } = await this.createOnWaitlistSignUp(data);
			return { event, signUp };
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === "P2002") throw new AlreadySignedUpError(err.message);
				if (err.code === "P2025") throw new NotFoundError(err.message);
			}
			throw err;
		}
	}

	private async createConfirmedSignUp(data: CreateConfirmedSignUpData) {
		const {
			eventId,
			userId,
			participationStatus,
			slotId,
			userProvidedInformation,
		} = data;
		const updatedEvent = await this.db.event.update({
			include: {
				slots: {
					where: {
						id: slotId,
					},
				},
				signUps: {
					where: {
						userId,
						eventId,
						active: true,
					},
				},
			},
			where: {
				id: eventId,
				remainingCapacity: {
					gt: 0,
				},
			},
			data: {
				version: {
					increment: 1,
				},
				remainingCapacity: {
					decrement: 1,
				},
				slots: {
					update: {
						where: {
							id: slotId,
							remainingCapacity: {
								gt: 0,
							},
						},
						data: {
							version: {
								increment: 1,
							},
							remainingCapacity: {
								decrement: 1,
							},
						},
					},
				},
				signUps: {
					create: {
						userProvidedInformation,
						slotId,
						userId,
						active: true,
						participationStatus,
					},
				},
			},
		});

		const { slots, signUps } = updatedEvent;
		const [slot] = slots;
		const [signUp] = signUps;
		if (slot === undefined)
			throw new InternalServerError("Expected exactly one slot to be updated");
		if (signUp === undefined)
			throw new InternalServerError(
				"Expected exactly one sign up to be created",
			);

		const res = Event.fromDataStorage(updatedEvent);
		if (!res.ok) {
			throw new InternalServerError(
				"Failed to convert event from data storage",
			);
		}
		return { event: res.data.event, slot, signUp };
	}

	private async createOnWaitlistSignUp(data: CreateOnWaitlistSignUpData) {
		const { eventId, userId, participationStatus, userProvidedInformation } =
			data;
		const updatedEvent = await this.db.event.update({
			include: {
				signUps: {
					where: {
						userId,
						eventId,
						active: true,
					},
				},
			},
			where: {
				id: eventId,
			},
			data: {
				version: {
					increment: 1,
				},
				signUps: {
					create: {
						user: {
							connect: {
								id: userId,
							},
						},
						userProvidedInformation,
						active: true,
						participationStatus,
					},
				},
			},
		});

		const { signUps } = updatedEvent;
		const [signUp] = signUps;
		if (signUp === undefined)
			throw new InternalServerError(
				"Expected exactly one sign up to be created",
			);

		const res = Event.fromDataStorage(updatedEvent);
		if (!res.ok) {
			throw new InternalServerError(
				"Failed to convert event from data storage",
			);
		}

		return { event: res.data.event, signUp };
	}

	/**
	 * updateSignUp - updates the participation status for the active sign up for the given user and event,
	 * confirming it and adding it to the slot. Updating a sign up from the wait list to confirmed decrements
	 * the remaining capacity of the event and slot by 1.
	 *
	 * @throws {InvalidArgumentError} - if no active sign ups are found
	 * @throws {InvalidArgumentError} - if the current participation status is not ON_WAITLIST
	 * @param data.userId - The ID of the user to update the sign up for
	 * @param data.eventId - The ID of the event to update the sign up for
	 * @param data.slotId - The ID of the slot to update the sign up for
	 * @returns The updated sign up, event and slot
	 */
	public async updateSignUp(
		data: UpdateToConfirmedSignUpData,
	): Promise<{ event: EventType; signUp: EventSignUp; slot: EventSlot }>;
	/**
	 * updateSignUp - updates the participation status for the active sign up for the given user and event to
	 * one of the inactive statuses. If the current participation status CONFIRMED, the sign up is removed from the slot
	 * and the remaining capacity of the event and slot is incremented by 1. If the current participation status is ON_WAITLIST,
	 * the remaining capacity of the event and slot is left unchanged.
	 *
	 * @throws {InvalidArgumentError} - if no active sign ups are found
	 * @throws {InvalidArgumentError} - if the current participation status is not ON_WAITLIST or CONFIRMED
	 * @param data.userId - The ID of the user to update the sign up for
	 * @param data.eventId - The ID of the event to update the sign up for
	 * @param data.newParticipationStatus - The new participation status of the sign up
	 * @returns The updated sign up and event
	 */
	public async updateSignUp(
		data: UpdateToInactiveSignUpData,
	): Promise<{ event: EventType; signUp: EventSignUp; slot: undefined }>;
	/**
	 * updateSignUp - updates the participation status for the active sign up for the given user and event to
	 * to data.newParticipationStatus.
	 * - If the current participation status is CONFIRMED, and the new participation status
	 * is REMOVED or RETRACTED, the sign up is removed from the slot and the remaining capacity of the event and slot is incremented by 1.
	 *
	 * - If the current participation status is ON_WAITLIST, and the new participation status is REMOVED or RETRACTED,
	 * the remaining capacity of the event and slot is left unchanged.
	 *
	 * - If the current participation status is ON_WAITLIST, and the new participation status is CONFIRMED,
	 * the sign up is promoted from the wait list to confirmed, and the remaining capacity of the event and slot is decremented by 1.
	 *
	 * - Otherwise, an InvalidArgumentError is thrown.
	 *
	 * @throws {InvalidArgumentError} - if no active sign ups are found
	 * @throws {InvalidArgumentError} - if the current participation status is not ON_WAITLIST or CONFIRMED
	 * @param data.userId - The ID of the user to update the sign up for
	 * @param data.eventId - The ID of the event to update the sign up for
	 * @param data.slotId - The ID of the slot to update the sign up for
	 * @param data.newParticipationStatus - The new participation status of the sign up
	 * @returns The updated sign up, event and slot
	 */
	public async updateSignUp(data: UpdateSignUpParams): Promise<{
		event: EventType;
		signUp: EventSignUp;
		slot?: EventSlot | null;
	}> {
		const currentSignUp = await this.db.eventSignUp.findUnique({
			include: {
				event: true,
				slot: true,
			},
			where: {
				userId_eventId_active: {
					userId: data.userId,
					eventId: data.eventId,
					active: true,
				},
			},
		});

		if (currentSignUp === null) {
			throw new InvalidArgumentError(
				"Can only change the status of an active sign up, and none were found",
			);
		}

		const currentParticipationStatus = currentSignUp.participationStatus;
		const { newParticipationStatus } = data;

		if (currentParticipationStatus === newParticipationStatus) {
			// No change, we can just return.
			const { event, slot, ...signUp } = currentSignUp;
			const res = Event.fromDataStorage(event);
			if (!res.ok) {
				throw new InternalServerError(
					"Failed to convert event from data storage",
				);
			}
			return { event: res.data.event, slot, signUp };
		}

		if (newParticipationStatus === ParticipationStatus.CONFIRMED) {
			const { event, slot, signUp } =
				await this.newParticipationStatusConfirmedHandler({
					currentSignUp,
					eventId: data.eventId,
					slotId: data.slotId,
				});
			const res = Event.fromDataStorage(event);
			if (!res.ok) {
				throw new InternalServerError(
					"Failed to convert event from data storage",
				);
			}
			return { event: res.data.event, slot, signUp };
		}

		const { event, signUp } = await this.newParticipationStatusInactiveHandler({
			currentSignUp,
			userId: data.userId,
			eventId: data.eventId,
			newParticipationStatus,
		});
		const res = Event.fromDataStorage(event);
		if (!res.ok) {
			throw new InternalServerError(
				"Failed to convert event from data storage",
			);
		}
		return { event: res.data.event, signUp };
	}

	private async newParticipationStatusConfirmedHandler(data: {
		eventId: string;
		slotId: string;
		currentSignUp: {
			id: string;
			version: number;
			participationStatus: ParticipationStatus;
		};
	}) {
		const { currentSignUp, eventId, slotId } = data;
		switch (currentSignUp.participationStatus) {
			case ParticipationStatus.ON_WAITLIST: {
				try {
					// Promote from wait list to confirmed
					return await this.makeOnWaitlistSignUpConfirmed({
						signUp: {
							id: currentSignUp.id,
							version: currentSignUp.version,
							participationSatus: currentSignUp.participationStatus,
						},
						eventId,
						slotId,
					});
				} catch (err) {
					if (err instanceof PrismaClientKnownRequestError) {
						if (err.code === "P2002")
							throw new AlreadySignedUpError(err.message);
						if (err.code === "P2025") throw new NotFoundError(err.message);
					}
					throw err;
				}
			}
			case ParticipationStatus.REMOVED:
			// fallthrough
			case ParticipationStatus.RETRACTED:
			// fallthrough
			case ParticipationStatus.CONFIRMED: {
				throw new InvalidArgumentError(
					"Only sign ups on the wait list can be changed to confirmed",
				);
			}
		}
	}

	private async newParticipationStatusInactiveHandler(data: {
		newParticipationStatus: Extract<
			ParticipationStatus,
			"REMOVED" | "RETRACTED"
		>;
		userId: string;
		eventId: string;
		currentSignUp: {
			id: string;
			version: number;
			participationStatus: ParticipationStatus;
		};
	}) {
		const { currentSignUp, userId, eventId, newParticipationStatus } = data;
		switch (currentSignUp.participationStatus) {
			case ParticipationStatus.CONFIRMED:
			// fallthrough
			case ParticipationStatus.ON_WAITLIST: {
				try {
					// Demote from wait list or confirmed to removed or retracted
					// Don't need to check active here, as we already did that above
					return await this.makeActiveSignUpInactive({
						currentSignUp: {
							id: currentSignUp.id,
							version: currentSignUp.version,
							participationStatus: currentSignUp.participationStatus,
						},
						userId,
						eventId,
						newParticipationStatus,
					});
				} catch (err) {
					if (err instanceof PrismaClientKnownRequestError) {
						// This would occur if we fail to delete an existing inactive sign up, which should not happen
						if (err.code === "P2002")
							throw new InternalServerError("Failed to demote sign up");
						if (err.code === "P2025") throw new NotFoundError(err.message);
					}
					throw err;
				}
			}
			case ParticipationStatus.REMOVED:
			// fallthrough
			case ParticipationStatus.RETRACTED: {
				throw new InvalidArgumentError(
					"Only sign ups on the wait list or confirmed can be changed to removed or retracted",
				);
			}
		}
	}

	/**
	 * makeOnWaitlistSignUpConfirmed changes a sign up from being on the wait list to being confirmed,
	 * and decrements the remaining capacity of the slot and event by 1.
	 * @param data
	 * @returns
	 */
	private async makeOnWaitlistSignUpConfirmed(data: {
		signUp: {
			id: string;
			version: number;
			participationSatus: Extract<ParticipationStatus, "ON_WAITLIST">;
		};
		eventId: string;
		slotId: string;
	}) {
		const { eventId, slotId, signUp } = data;

		const { event, slot, ...updatedSignUp } = await this.db.eventSignUp.update({
			include: {
				event: true,
				slot: true,
			},
			where: {
				id: signUp.id,
				version: signUp.version,
			},
			data: {
				participationStatus: ParticipationStatus.CONFIRMED,
				version: {
					increment: 1,
				},
				slot: {
					connect: {
						id: slotId,
					},
					update: {
						where: {
							id: slotId,
							remainingCapacity: {
								gt: 0,
							},
						},
						data: {
							remainingCapacity: {
								decrement: 1,
							},
							version: {
								increment: 1,
							},
						},
					},
				},
				event: {
					update: {
						where: {
							id: eventId,
							remainingCapacity: {
								gt: 0,
							},
						},
						data: {
							remainingCapacity: {
								decrement: 1,
							},
							version: {
								increment: 1,
							},
						},
					},
				},
			},
		});
		return { event, slot, signUp: updatedSignUp };
	}

	private async makeActiveSignUpInactive(data: {
		currentSignUp: {
			id: string;
			version: number;
			participationStatus: Extract<
				ParticipationStatus,
				"ON_WAITLIST" | "CONFIRMED"
			>;
		};
		userId: string;
		eventId: string;
		newParticipationStatus: Extract<
			ParticipationStatus,
			"REMOVED" | "RETRACTED"
		>;
	}) {
		const { userId, eventId, currentSignUp, newParticipationStatus } = data;

		let result: {
			event: PrismaEvent;
		} & EventSignUp;

		switch (currentSignUp.participationStatus) {
			case ParticipationStatus.ON_WAITLIST: {
				[, result] = await this.db.$transaction([
					this.db.eventSignUp.deleteMany({
						where: {
							userId,
							eventId,
							active: false,
						},
					}),
					this.db.eventSignUp.update({
						include: {
							event: true,
						},
						where: {
							id: currentSignUp.id,
							version: currentSignUp.version,
						},
						data: {
							version: {
								increment: 1,
							},
							participationStatus: newParticipationStatus,
							active: false,
						},
					}),
				]);
				break;
			}
			case ParticipationStatus.CONFIRMED: {
				[, result] = await this.db.$transaction([
					this.db.eventSignUp.deleteMany({
						where: {
							userId,
							eventId,
							active: false,
						},
					}),
					this.db.eventSignUp.update({
						include: {
							event: true,
						},
						where: {
							id: currentSignUp.id,
							version: currentSignUp.version,
						},
						data: {
							version: {
								increment: 1,
							},
							participationStatus: newParticipationStatus,
							active: false,
							slot: {
								disconnect: true,
								update: {
									data: {
										remainingCapacity: {
											increment: 1,
										},
										version: {
											increment: 1,
										},
									},
								},
							},
							event: {
								update: {
									data: {
										remainingCapacity: {
											increment: 1,
										},
										version: {
											increment: 1,
										},
									},
								},
							},
						},
					}),
				]);
				break;
			}
			default: {
				throw new InternalServerError("Unexpected participation status");
			}
		}

		const { event, ...updatedSignUp } = result;
		return { event, signUp: updatedSignUp };
	}

	/**
	 * getSignUp returns the sign up for the user on the event.
	 * @throws {NotFoundError} If a sign up with the given ID does not exist
	 * @param userId - The ID of the user to get the sign up for
	 * @param eventId - The ID of the event to get the sign up for
	 * @returns the sign up that matches the given user and event IDs
	 */
	async getSignUp(userId: string, eventId: string): Promise<EventSignUp> {
		const signUp = await this.db.eventSignUp.findUnique({
			where: {
				userId_eventId_active: {
					userId,
					eventId,
					active: true,
				},
			},
		});

		if (signUp === null) {
			throw new NotFoundError(
				`Event sign up { userId: ${userId}, eventId: ${eventId} } not found`,
			);
		}

		return signUp;
	}

	findManySlots(data: { gradeYear?: number; eventId: string }): Promise<
		EventSlot[]
	> {
		const { gradeYear, eventId } = data;
		if (gradeYear !== undefined) {
			return this.db.eventSlot.findMany({
				where: {
					eventId,
					gradeYears: {
						has: gradeYear,
					},
				},
			});
		}
		return this.db.eventSlot.findMany({
			where: {
				eventId,
				gradeYears: {
					hasEvery: [1, 2, 3, 4, 5],
				},
			},
		});
	}

	/**
	 * createCategory creates a new event category
	 * @throws {InvalidArgumentError} If a category with the given name already exists
	 */
	async createCategory(data: { name: string }): Promise<CategoryType> {
		const { name } = data;
		try {
			return await this.db.eventCategory.create({
				data: {
					name,
				},
			});
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (
					err.code === prismaKnownErrorCodes.ERR_UNIQUE_CONSTRAINT_VIOLATION
				) {
					throw new InvalidArgumentError(err.message);
				}
			}
			throw err;
		}
	}

	/**
	 * updateCategory updates an event category
	 * @throws {NotFoundError} If a category with the given ID does not exist
	 * @throws {InvalidArgumentError} If a category with the given name already exists
	 */
	async updateCategory(category: CategoryType): Promise<CategoryType> {
		try {
			return await this.db.eventCategory.update({
				where: {
					id: category.id,
				},
				data: {
					name: category.name,
				},
			});
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (
					err.code === prismaKnownErrorCodes.ERR_UNIQUE_CONSTRAINT_VIOLATION
				) {
					throw new InvalidArgumentError(err.message);
				}
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND) {
					throw new NotFoundError(err.message);
				}
			}
			throw err;
		}
	}

	public async deleteCategory(category: { id: string }): Promise<CategoryType> {
		try {
			return await this.db.eventCategory.delete({ where: { id: category.id } });
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND) {
					throw new NotFoundError(err.message);
				}
			}
			throw err;
		}
	}

	public async addOrderToSignUp(params: {
		orderId: string;
		signUpId: string;
	}): ResultAsync<
		{ signUp: EventSignUp },
		NotFoundError | InternalServerError
	> {
		const { orderId, signUpId } = params;
		try {
			const signUp = await this.db.eventSignUp.update({
				where: {
					id: signUpId,
				},
				data: {
					orderId,
				},
			});
			return {
				ok: true,
				data: {
					signUp,
				},
			};
		} catch (err) {
			if (err instanceof PrismaClientKnownRequestError) {
				if (err.code === prismaKnownErrorCodes.ERR_NOT_FOUND) {
					return {
						ok: false,
						error: new NotFoundError("Sign up or order not found", err),
					};
				}
			}
			return {
				ok: false,
				error: new InternalServerError("Failed to add order to sign up", err),
			};
		}
	}
}

interface CreateConfirmedSignUpData {
	eventId: string;
	userId: string;
	slotId: string;
	participationStatus: Extract<ParticipationStatus, "CONFIRMED">;
	userProvidedInformation?: string;
}

interface CreateOnWaitlistSignUpData {
	eventId: string;
	userId: string;
	participationStatus: Extract<ParticipationStatus, "ON_WAITLIST">;
	userProvidedInformation?: string;
}

type CreateSignUpParams =
	| CreateConfirmedSignUpData
	| CreateOnWaitlistSignUpData;

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
type UpdateSignUpParams =
	| UpdateToConfirmedSignUpData
	| UpdateToInactiveSignUpData;

type UpdateEvent<TError extends Error> = (
	_ctx: Context,
	id: string,
	updateFn: EventUpdateFn<TError>,
) => ResultAsync<
	{ event: EventType; slots: SlotType[]; categories: CategoryType[] },
	InternalServerError | TError
>;

export type { CreateSignUpParams, UpdateSignUpParams, UpdateEvent };
