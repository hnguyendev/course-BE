require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import { sendMail } from "../utils/sendMail";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";
import cloudinary from "cloudinary";
import { RedisKey } from "ioredis";
import { getAllUsersService, getUserById } from "../services/user.service";

interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registerUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      const existingEmail = await userModel.findOne({ email });
      if (existingEmail) {
        return next(new ErrorHandler("Email already exists", 400));
      }

      const user: IRegistrationBody = {
        name,
        email,
        password,
      };

      const activationToken = createActivationToken(user);
      const activationCode = activationToken.activationCode;

      const data = { user: { name: user.name }, activationCode };
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account",
          template: "activation-mail.ejs",
          data,
        });

        return res.status(201).json({
          success: true,
          message: `Please check your ${user.email} to activate account!`,
          activationToken: activationToken.token,
        });
      } catch (error) {
        return next(
          new ErrorHandler("Cannot send email, please try again!", 400)
        );
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Activate user
interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequest;

      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code!", 400));
      }

      const { name, email, password } = newUser.user;
      const existingUser = await userModel.findOne({ email });

      if (existingUser) {
        return next(new ErrorHandler("User already exists!", 400));
      }

      const user = await userModel.create({
        name,
        email,
        password,
      });

      // await userModel.findByIdAndUpdate(user.id, { isVerified: true });

      return res.status(201).json({
        success: true,
        message: "Activate account successfully!",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Login
interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;

      if (!email || !password) {
        return next(new ErrorHandler("Please enter email and password", 400));
      }

      const user = await userModel.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("Invalid credentials!", 400));
      }

      const matchPassword = await user.comparePassword(password);

      if (!matchPassword) {
        return next(new ErrorHandler("Invalid credentials!", 400));
      }

      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });
      const userId = (req.user?._id as string) || "";
      redis.del(userId);

      return res.status(200).json({
        success: true,
        message: "Logged out successfully!",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get user info
export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id as string;
      await getUserById(userId, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface ISocialAuthBody {
  name: string;
  email: string;
  avatar: string;
}

// social auth
export const socialAuth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, avatar } = req.body as ISocialAuthBody;

      const existingUser = await userModel.findOne({ email });
      if (!existingUser) {
        const newUser = await userModel.create({
          name,
          email,
          avatar,
        });
        sendToken(newUser, 200, res);
      } else {
        sendToken(existingUser, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IUpdateUserInfo {
  name?: string;
  email?: string;
}

// update user info
export const updateUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email } = req.body as IUpdateUserInfo;

      const userId = req.user?._id;
      const existingUser = await userModel.findById(userId);

      if (existingUser) {
        if (email) {
          const existingEmail = await userModel.findOne({ email });
          if (existingEmail) {
            return next(new ErrorHandler("Email already exists!", 400));
          }
          existingUser.email = email;
        }

        if (name) {
          existingUser.name = name;
        }

        await existingUser?.save();

        await redis.set(
          existingUser._id as RedisKey,
          JSON.stringify(existingUser)
        );

        return res.status(200).json({
          success: true,
          existingUser,
        });
      } else {
        return next(new ErrorHandler("User not found!", 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

// update password
export const updateUserPassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdatePassword;
      const userId = req.user?._id;
      const existingUser = await userModel.findById(userId).select("+password");

      if (!oldPassword || !newPassword) {
        return next(
          new ErrorHandler("Please enter old and new password!", 400)
        );
      }

      if (existingUser) {
        // social auth
        if (existingUser.password === undefined) {
          return next(new ErrorHandler("Invalid user", 400));
        }

        const matchPassword = await existingUser.comparePassword(oldPassword);

        if (!matchPassword) {
          return next(new ErrorHandler("Password does not match!", 400));
        }

        existingUser.password = newPassword;
        await existingUser.save();

        await redis.set(
          existingUser._id as RedisKey,
          JSON.stringify(existingUser)
        );

        return res.status(200).json({
          success: true,
          existingUser,
        });
      } else {
        return next(new ErrorHandler("User not found!", 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IUpdateProfilePicture {
  avatar: string;
}

export const updateProfilePicture = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body as IUpdateProfilePicture;
      const existingUser = await userModel.findById(req.user?._id);

      if (avatar && existingUser) {
        if (existingUser.avatar.public_id) {
          // if already have avatar then delete and upload
          await cloudinary.v2.uploader.destroy(existingUser.avatar.public_id);
          const cloudData = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150,
          });
          existingUser.avatar = {
            public_id: cloudData.public_id,
            url: cloudData.secure_url,
          };
        } else {
          //
          const cloudData = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150,
          });
          existingUser.avatar = {
            public_id: cloudData.public_id,
            url: cloudData.secure_url,
          };
        }

        await existingUser?.save();
        redis.set(existingUser?._id as RedisKey, JSON.stringify(existingUser));

        return res.status(200).json({
          success: true,
          existingUser,
        });
      } else {
        return next(new ErrorHandler("User not found!", 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

// token
export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET as Secret,
    { expiresIn: "5m" }
  );

  return { token, activationCode };
};

// update access token
export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token;
      if (!refresh_token) {
        return next(new ErrorHandler("Could not refresh token", 400));
      }

      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;
      if (!decoded) {
        return next(new ErrorHandler("Could not refresh token", 400));
      }

      const session = await redis.get(decoded.id);
      if (!session) {
        return next(new ErrorHandler("Could not refresh token", 400));
      }

      const user = JSON.parse(session);
      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        { expiresIn: "5m" }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        {
          expiresIn: "3d",
        }
      );

      // redis.set(user._id as RedisKey, JSON.stringify(user));

      req.user = user;

      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);

      return res.status(200).json({
        success: true,
        accessToken,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get all users --admin
export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllUsersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
