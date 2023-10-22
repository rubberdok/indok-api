import { mergeTypeDefs } from "@graphql-tools/merge";

import { typeDefs as authTypes } from "./auth/type-defs.js";
import { typeDefs as cabinTypes } from "./cabins/type-defs.js";
import { typeDefs as scalarTypes } from "./scalars/type-defs.js";
import { typeDefs as userTypes } from "./users/type-defs.js";
import { typeDefs as organizationTypes } from "./organizations/type-defs.js";

export const typeDefs = mergeTypeDefs([userTypes, cabinTypes, scalarTypes, authTypes, organizationTypes]);

export default typeDefs;
