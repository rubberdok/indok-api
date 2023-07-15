import { User } from "@prisma/client";

import { FeideResponses } from "@/services/auth/__tests__/__mocks__/feide.js";

export interface OAuthCase {
  name: string;
  responses: FeideResponses;
  expected: User;
}
