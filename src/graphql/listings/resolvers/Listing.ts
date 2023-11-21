import type { ListingResolvers } from "./../../types.generated.js";
export const Listing: ListingResolvers = {
  /* Implement Listing resolver logic here */
  closesAt: ({ closesAt }) => {
    /* Listing.closesAt resolver is required because Listing.closesAt and ListingMapper.closesAt are not compatible */
    return closesAt;
  },
};
