// @ts-check
const { defineConfig } = require("@eddeee888/gcg-typescript-resolver-files");

const generatedPrefix = `
// biome-ignore

/**
 * This file was automatically generated by 'graphql-codegen'.
 * Please do not edit this file directly.
 * To regenerate this file, run \`pnpm generate:gql\`
 */
`;

const generatedPrefixGraphQL = `
"""
This file was automatically generated by 'graphql-codegen'.
Please do not edit this file directly.
To regenerate this file, run \`npm run generate:gql\`
"""
`;

/** @type {import("@graphql-codegen/cli").CodegenConfig} */
const config = {
  overwrite: true,
  schema: "src/graphql/**/schema.graphql",
  emitLegacyCommonJSImports: false,
  hooks: {
    afterAllFileWrite: ["pnpm exec biome check --apply"],
  },
  ignoreNoDocuments: true,
  generates: {
    /**
     * Generate typed document nodes for operations that are used for
     * integration tests. Unfortunately, we can't use the same preset as
     * for the unit tests because the integration tests require the queries to
     * be passed as strings.
     */
    "src/graphql/test-clients/integration/": {
      /* Only generate documents for integration tests */
      documents: ["src/graphql/**/__tests__/integration/*.ts", "src/graphql/**/*.integration.test.ts"],
      /* Client preset is a sensible default, see https://the-guild.dev/graphql/codegen/plugins/presets/preset-client */
      preset: "client-preset",
      config: {
        /**
         * By default, the return value of the `graphql(...)` function is a JavaScript object,
         * but for integration tests, we need to pass a string instead.
         * See https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#documentmode
         */
        documentMode: "string",
        enumsAsTypes: true,
      },
      presetConfig: {
        useTypeImports: true,
        /* Fragment masking is only useful for actual clients, and it's not relevant for testing */
        fragmentMasking: false,
      },
      plugins: [
        {
          add: {
            content: generatedPrefix,
          },
        },
      ],
    },
    /**
     * Generate typed document nodes for operations that are used for unit tests.
     */
    "src/graphql/test-clients/unit/": {
      /* Only generate documents for unit tests */
      documents: ["src/graphql/**/__tests__/unit/*.ts", "src/graphql/**/*.unit.test.ts"],
      /* Client preset is a sensible default, see https://the-guild.dev/graphql/codegen/plugins/presets/preset-client */
      preset: "client-preset",
      config: {
        enumsAsTypes: true,
      },
      presetConfig: {
        /* Fragment masking is only useful for actual clients, and it's not relevant for testing */
        fragmentMasking: false,
      },
      plugins: [
        {
          add: {
            content: generatedPrefix,
          },
        },
      ],
    },
    "schema.graphql": {
      plugins: [
        {
          add: {
            content: generatedPrefixGraphQL,
          },
        },
        "schema-ast",
      ],
    },
    /**
     * Generate resolvers and types for the GraphQL schema in
     * a modular way.
     * Docs: https://the-guild.dev/graphql/codegen/docs/guides/graphql-server-apollo-yoga-with-server-preset
     */
    "src/graphql": defineConfig(
      {
        mode: "modules",
        emitLegacyCommonJSImports: false,
        typeDefsFilePath: "./type-defs.generated.ts",
        add: {
          "./types.generated.ts": { content: generatedPrefix },
        },
        typesPluginsConfig: {
          contextType: "~/lib/apollo-server.js#ApolloContext",
        },
      },
      { schema: "src/graphql/**/*.{graphql}" },
    ),
  },
};

module.exports = config;
