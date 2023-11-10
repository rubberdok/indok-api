import type { UsersResponseResolvers } from "./../../types.generated.js";
export const UsersResponse: UsersResponseResolvers = {
  /* Implement UsersResponse resolver logic here */
  total: (parent) => {
    return parent.users.length;
  },
};
