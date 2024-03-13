import { randomUUID } from "node:crypto";
import type { EventSlot as PrismaSlot } from "@prisma/client";
import { isNil, omitBy } from "lodash-es";
import { z } from "zod";
import type { Result } from "~/lib/result.js";
import { type InternalServerError, InvalidArgumentError } from "../errors.js";

type SlotType = {
	capacity: number;
	remainingCapacity: number;
	gradeYears?: number[];
	readonly id: string;
	readonly version: number;
};

type NewSlotParams = {
	capacity: number;
	gradeYears?: number[] | null;
	id?: string | null;
	remainingCapacity?: number | null;
	version?: number | null;
};

export type UpdateSlotFields = {
	id: string;
} & Partial<{ capacity: number | null; gradeYears: number[] | null }>;

function updateSlot(params: {
	previous: SlotType;
	data: UpdateSlotFields;
}): Result<{ slot: SlotType }, InvalidArgumentError> {
	const { previous, data } = params;
	const updated = previous;

	const schema = z.object({
		capacity: z.number().int().positive().optional(),
		gradeYears: z.array(z.number().int().positive()).optional(),
		id: z.string().uuid(),
	});
	const parseResult = schema.safeParse(omitBy(data, isNil));
	if (!parseResult.success) {
		return {
			ok: false,
			error: new InvalidArgumentError(
				"Invalid slot update parameters",
				parseResult.error,
			),
		};
	}
	const { gradeYears, capacity } = parseResult.data;
	updated.gradeYears = gradeYears;

	if (capacity !== undefined) {
		const changeInCapacity = capacity - previous.capacity;
		const newRemainingCapacity = previous.remainingCapacity + changeInCapacity;
		if (newRemainingCapacity < 0) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"New capacity cannot be less than remaining capacity",
				),
			};
		}
		updated.capacity = capacity;
		updated.remainingCapacity = newRemainingCapacity;
	}
	return {
		ok: true,
		data: { slot: updated },
	};
}

const Slot = {
	new(parmas: NewSlotParams): Result<{ slot: SlotType }, InvalidArgumentError> {
		const schema = z.object({
			capacity: z.number().int().min(0),
			gradeYears: z.array(z.number().int().positive()).nullish(),
			id: z.string().nullish(),
			version: z.number().nullish(),
		});
		const parseResult = schema.safeParse(parmas);
		if (!parseResult.success) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"Invalid slot parameters",
					parseResult.error,
				),
			};
		}
		const { capacity, gradeYears, id, version } = parseResult.data;
		return {
			ok: true,
			data: {
				slot: {
					capacity,
					gradeYears: gradeYears ?? [1, 2, 3, 4, 5],
					id: id ?? randomUUID(),
					remainingCapacity: capacity,
					version: version ?? 0,
				},
			},
		};
	},
	update: updateSlot,
	fromDataStorage(
		data: PrismaSlot,
	): Result<{ slot: SlotType }, InternalServerError> {
		return {
			ok: true,
			data: {
				slot: {
					capacity: data.capacity,
					gradeYears: data.gradeYears,
					id: data.id,
					remainingCapacity: data.remainingCapacity,
					version: data.version,
				},
			},
		};
	},
};

export { Slot };
export type { SlotType, NewSlotParams };
