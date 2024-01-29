import { initWorkers } from "~/lib/bullmq/worker.js";

const { worker } = await initWorkers();

worker.start();
