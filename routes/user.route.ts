import express from "express";
import {
  activateUser,
  getAllUsers,
  getUserInfo,
  loginUser,
  logoutUser,
  registerUser,
  socialAuth,
  updateAccessToken,
  updateProfilePicture,
  updateUserInfo,
  updateUserPassword,
} from "../controllers/user.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";

const userRouter = express.Router();

userRouter.get(
  "/get-users",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllUsers
);

userRouter.post("/register", registerUser);
userRouter.post("/activate-user", activateUser);
userRouter.post("/login", loginUser);
userRouter.post("/logout", isAuthenticated, logoutUser);
userRouter.get("/refresh", updateAccessToken);
userRouter.get("/me", isAuthenticated, getUserInfo);
userRouter.post("/social-auth", socialAuth);
userRouter.put("/update-info", isAuthenticated, updateUserInfo);
userRouter.put("/update-password", isAuthenticated, updateUserPassword);
userRouter.put("/update-avatar", isAuthenticated, updateProfilePicture);

export default userRouter;
