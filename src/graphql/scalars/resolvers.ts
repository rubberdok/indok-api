import { DateTimeResolver } from "graphql-scalars";

import { Resolvers } from "../__types__.js";

export const resolvers: Resolvers = {
  DateTime: DateTimeResolver,
};
