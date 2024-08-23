import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageDisabled } from "@apollo/server/plugin/disabled";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import fastifyApollo, {
	fastifyApolloDrainPlugin,
	type ApolloFastifyContextFunction,
} from "@as-integrations/fastify";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import type { Configuration } from "~/config.js";
import { resolvers } from "~/graphql/resolvers.generated.js";
import { typeDefs } from "~/graphql/type-defs.generated.js";
import { type ApolloContext, getFormatErrorHandler } from "../apollo-server.js";
import { fastifyApolloSentryPlugin } from "../sentry.js";

const fastifyApolloServerPlugin: FastifyPluginAsync<{
	configuration: Configuration;
}> = async (fastify, options) => {
	const { configuration } = options;
	// Initialize Apollo Server
	const apollo = new ApolloServer<ApolloContext>({
		typeDefs: typeDefs,
		csrfPrevention: true,
		introspection: true,
		resolvers: resolvers,
		formatError: getFormatErrorHandler(
			fastify.log.child({ service: "apollo-server" }),
		),
		includeStacktraceInErrorResponses: configuration.NODE_ENV !== "production",
		plugins: [
			fastifyApolloDrainPlugin(fastify),
			fastifyApolloSentryPlugin(),
			configuration.NODE_ENV === "production"
				? ApolloServerPluginLandingPageDisabled()
				: ApolloServerPluginLandingPageLocalDefault({
						footer: false,
						includeCookies: true,
						embed: true,
					}),
		],
	});

	// Custom context function to inject dependencies into the Apollo Context
	const contextFunction: ApolloFastifyContextFunction<ApolloContext> = (
		req,
	) => {
		const { services } = fastify;
		return Promise.resolve({
			...services,
			user: req.user,
			log: req.log.child({ userId: req.user?.id, service: "apollo-server" }),
		});
	};
	await apollo.start();
	await fastify.register(fastifyApollo(apollo), {
		context: contextFunction,
	});
};

export default fp(fastifyApolloServerPlugin);
