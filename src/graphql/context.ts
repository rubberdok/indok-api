import { ExpressContextFunctionArgument } from "@apollo/server/express4";

import { IAuthService, ICabinService, IUserService } from "@/services/index.js";

export interface IContextProvider {
  userService: IUserService;
  cabinService: ICabinService;
  authService: IAuthService;
}

export interface IContext extends ExpressContextFunctionArgument {
  userService: IUserService;
  cabinService: ICabinService;
  authService: IAuthService;
}
