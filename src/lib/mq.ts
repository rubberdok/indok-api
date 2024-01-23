import {
	type Processor,
	Queue as BullMqQueue,
	type QueueOptions,
	type RedisConnection,
	Worker as BullMqWorker,
	type WorkerOptions,
} from "bullmq";
import type pino from "pino";

export class Worker<
	// biome-ignore lint/suspicious/noExplicitAny: DataType can be literally anything
	DataType = any,
	// biome-ignore lint/suspicious/noExplicitAny: ResultType can be literally anything
	ResultType = any,
	NameType extends string = string,
> extends BullMqWorker<DataType, ResultType, NameType> {
	constructor(
		name: string,
		processor?: Processor<DataType, ResultType, NameType>,
		opts?: WorkerOptions,
		Connection?: typeof RedisConnection,
		private logger?: pino.BaseLogger,
	) {
		super(name, processor, opts, Connection);
		logger?.info(`${name} worker created`);

		this.on("ready", () => {
			this.logger?.info(`${name} worker listening`);
		});
		this.on("closing", () => {
			this.logger?.info(`${name} worker closing`);
		});
		this.on("error", (error) => {
			this.logger?.error({ error }, `${name} worker error`);
		});
		this.on("failed", (job, error) => {
			this.logger?.error({ error, job }, `${name} job failed`);
		});
		this.on("active", (job) => {
			this.logger?.info({ job }, `${name} job started`);
		});
		this.on("completed", (job) => {
			this.logger?.info({ job }, `${name} job completed`);
		});
	}
}

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
		logger?: pino.BaseLogger,
	) {
		super(name, opts, Connection);

		this.on("error", (err) => {
			logger?.error({ err }, "queue error");
		});
	}
}
