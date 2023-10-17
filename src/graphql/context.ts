import { FastifyReply, FastifyRequest } from "fastify";

import { IAuthService, ICabinService, IUserService } from "@/services/index.js";

export interface IContext {
  res: FastifyReply;
  req: FastifyRequest;
  userService: IUserService;
  cabinService: ICabinService;
  authService: IAuthService;
}
