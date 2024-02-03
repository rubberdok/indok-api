import { z } from "zod";
import type { Result } from "~/lib/result.js";
import { InvalidArgumentError } from "../errors.js";
import { randomUUID } from "crypto";
import { isNil, omitBy } from "lodash-es";

type SlotType = {
	capacity: number;
	remainingCapacity: number;
	gradeYears?: number[];
	id: string;
	version: number;
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
	const updated = { ...previous };

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
	const validatedUpdateFields = parseResult.data;
	if (validatedUpdateFields.capacity) {
		const changeInCapacity = validatedUpdateFields.capacity - previous.capacity;
		const newRemainingCapacity = previous.remainingCapacity + changeInCapacity;
		if (newRemainingCapacity < 0) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"New capacity cannot be less than remaining capacity",
				),
			};
		}
		updated.capacity = validatedUpdateFields.capacity;
		updated.remainingCapacity = newRemainingCapacity;
		updated.version += 1;
	}
	return {
		ok: true,
		data: { slot: updated },
	};
}

const Slot = {
	new(parmas: NewSlotParams): Result<{ slot: SlotType }, InvalidArgumentError> {
		const schema = z.object({
			capacity: z.number().int().positive(),
			remainingCapacity: z.number().int().positive(),
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
		const { capacity, gradeYears, id, remainingCapacity, version } =
			parseResult.data;
		return {
			ok: true,
			data: {
				slot: {
					capacity,
					gradeYears: gradeYears ?? [1, 2, 3, 4, 5],
					id: id ?? randomUUID(),
					remainingCapacity: remainingCapacity ?? capacity,
					version: version ?? 0,
				},
			},
		};
	},
	update: updateSlot,
};

export { Slot };
export type { SlotType, NewSlotParams };
