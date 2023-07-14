import { mergeTypeDefs } from "@graphql-tools/merge";

import { typeDefs as authTypes } from "./auth/index.js";
import { typeDefs as cabinTypes } from "./cabins/index.js";
import { typeDefs as scalarTypes } from "./scalars/index.js";
import { typeDefs as userTypes } from "./users/index.js";

export const typeDefs = mergeTypeDefs([userTypes, cabinTypes, scalarTypes, authTypes]);
