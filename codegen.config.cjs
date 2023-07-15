// @ts-check

/** @type {import("@graphql-codegen/cli").CodegenConfig} */
const config = {
  overwrite: true,
  schema: "./src/graphql/type-defs.ts",
  emitLegacyCommonJSImports: false,
  generates: {
    "src/graphql/__types__.ts": {
      config: {
        useIndexSignature: true,
        showUnusedMappers: true,
        immutableTypes: true,
        strictScalars: true,

        scalars: {
          DateTime: "Date",
        },

        contextType: "@/graphql/context#IContext",

        mapperTypeSuffix: "Model",

        mappers: {
          User: "@prisma/client#User",
          Cabin: "@prisma/client#Cabin",
          Booking: "@prisma/client#Booking",
        },
      },
      plugins: ["typescript", "typescript-resolvers"],
    },
    "schema.graphql": {
      plugins: ["schema-ast"],
    },
  },
};

module.exports = config;
