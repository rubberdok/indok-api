import { DateTimeResolver } from "graphql-scalars";

import { Resolvers } from "../generated/types.js";

export { typeDefs } from "./type-defs.js";

export const resolvers: Resolvers = {
  DateTime: DateTimeResolver,
};
