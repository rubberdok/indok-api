import type { UsersResponseResolvers } from "./../../types.generated.js";
export const UsersResponse: UsersResponseResolvers = {
  /* Implement UsersResponse resolver logic here */
  total: (parent) => {
    return parent.users.length;
  },
  users: ({ users }) => {
    /* UsersResponse.users resolver is required because UsersResponse.users and UsersResponseMapper.users are not compatible */
    return users;
  },
};
