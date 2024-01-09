import type { FastifyHelmetOptions } from "@fastify/helmet/types";
import type { env } from "~/config.js";

export const helmetOptionsByEnv: Record<
	typeof env.NODE_ENV,
	FastifyHelmetOptions
> = {
	development: {
		contentSecurityPolicy: false,
	},
	test: {
		contentSecurityPolicy: false,
	},
	production: {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				styleSrc: ["'self'"],
				imgSrc: ["'self'"],
				scriptSrc: ["'self'"],
			},
		},
	},
};
