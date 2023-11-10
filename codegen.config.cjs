// @ts-check
const { defineConfig } = require("@eddeee888/gcg-typescript-resolver-files");

const generatedPrefix = `
/* eslint-disable */
/* prettier-ignore */

/**
 * This file was automatically generated by 'graphql-codegen'.
 * Please do not edit this file directly.
 * To regenerate this file, run \`npm run generate:gql\`
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
    afterAllFileWrite: ["prettier --write"],
  },
  generates: {
    /**
     * Generate typed document nodes for operations that are used for
     * integration tests. Unfortunately, we can't use the same preset as
     * for the unit tests because the integration tests require the queries to
     * be passed as strings.
     */
    "src/graphql/test-clients/integration/": {
      /* Only generate documents for integration tests */
      documents: "src/graphql/**/__tests__/integration/*.ts",
      /* Client preset is a sensible default, see https://the-guild.dev/graphql/codegen/plugins/presets/preset-client */
      preset: "client-preset",
      config: {
        /**
         * By default, the return value of the `graphql(...)` function is a JavaScript object,
         * but for integration tests, we need to pass a string instead.
         * See https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#documentmode
         */
        documentMode: "string",
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
    /**
     * Generate typed document nodes for operations that are used for unit tests.
     */
    "src/graphql/test-clients/unit/": {
      /* Only generate documents for unit tests */
      documents: "src/graphql/**/__tests__/unit/*.ts",
      /* Client preset is a sensible default, see https://the-guild.dev/graphql/codegen/plugins/presets/preset-client */
      preset: "client-preset",
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
    "src/graphql": defineConfig(
      {
        mode: "modules",
        emitLegacyCommonJSImports: false,
        typesPluginsConfig: {
          contextType: "@/lib/apolloServer.js#IContext",
        },
      },
      { schema: "src/graphql/**/*.{graphql}" }
    ),
  },
};

module.exports = config;
