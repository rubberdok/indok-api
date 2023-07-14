import { mergeResolvers } from "@graphql-tools/merge";

import { resolvers as authResolvers } from "./auth/index.js";
import { resolvers as cabinResolvers } from "./cabins/index.js";
import { Resolvers } from "./generated/types.js";
import { resolvers as scalarResolvers } from "./scalars/index.js";
import { resolvers as userResolvers } from "./users/index.js";

export const resolvers: Resolvers = mergeResolvers([userResolvers, cabinResolvers, scalarResolvers, authResolvers]);
