import {
	Queue as BullMqQueue,
	type QueueOptions,
	type RedisConnection,
} from "bullmq";
import type { BaseLogger } from "pino";

export class Queue<
	// biome-ignore lint/suspicious/noExplicitAny: DataType can be literally anything
	DataType = any,
	// biome-ignore lint/suspicious/noExplicitAny: ResultType can be literally anything
	ResultType = any,
	NameType extends string = string,
> extends BullMqQueue<DataType, ResultType, NameType> {
	constructor(
		name: string,
		opts?: QueueOptions,
		Connection?: typeof RedisConnection,
		log?: BaseLogger,
	) {
		super(name, opts, Connection);

		this.on("error", (err) => {
			log?.error({ err }, "queue error");
		});
	}
}
