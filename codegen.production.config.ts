import { defineConfig } from "@eddeee888/gcg-typescript-resolver-files";
import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
	schema: "src/graphql/**/schema.graphql",
	emitLegacyCommonJSImports: false,
	ignoreNoDocuments: true,
	generates: {
		/**
		 * Generate resolvers and types for the GraphQL schema in
		 * a modular way.
		 * Docs: https://the-guild.dev/graphql/codegen/docs/guides/graphql-server-apollo-yoga-with-server-preset
		 */
		"src/graphql": defineConfig(
			{
				mode: "modules",
				emitLegacyCommonJSImports: false,
				resolverGeneration: "minimal",
				typeDefsFilePath: "./type-defs.generated.ts",
				typesPluginsConfig: {
					contextType: "~/lib/apollo-server.js#ApolloContext",
					useTypeImports: true,
				},
				scalarsOverrides: {
					DateTime: {
						type: "Date",
					},
					Date: {
						type: "Date",
					},
				},
			},
			{ schema: "src/graphql/**/*.{graphql}" },
		),
	},
};

module.exports = config;
