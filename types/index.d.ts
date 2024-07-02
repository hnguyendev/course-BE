import express from "express";
import { IUser } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

import { Request } from "express";

// declare module "express" {
//   interface Request {
//     user?: any; // Define the type of `user` here, e.g., `User` if you have a User type/interface
//   }
// }
