require("dotenv").config();
import { Response } from "express";
import { IUser } from "../models/user.model";
import { redis } from "./redis";
import { RedisKey } from "ioredis";
import jwt, { JwtPayload } from "jsonwebtoken";

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}

// pass env variables to integrates with fallback values
const accessTokenExpire = parseInt(
  process.env.ACCESS_TOKEN_EXPIRE || "300",
  10
);
const refreshTokenExpire = parseInt(
  process.env.REFRESH_TOKEN_EXPIRE || "1200",
  10
);

// cookie options
export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 1000 * 60),
  maxAge: accessTokenExpire * 1000 * 60,
  httpOnly: true,
  sameSite: "lax",
};
export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 3600 * 1000),
  maxAge: refreshTokenExpire * 24 * 3600 * 1000,
  httpOnly: true,
  sameSite: "lax",
};

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessToken = user.signAccessToken();
  const refreshToken = user.signRefreshToken();

  // upload session to redis
  redis.set(user._id as RedisKey, JSON.stringify(user));

  // blacklist expire token
  redis.set(`rt-${user._id}`, refreshToken, "EX", 3 * 24 * 3600);

  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true;
  }

  res.cookie("access_token", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);

  return res.status(statusCode).json({
    success: true,
    user,
    accessToken,
  });
};

export const verifyRefreshToken = async (token: string) => {
  const decoded = jwt.verify(
    token,
    process.env.REFRESH_TOKEN || ""
  ) as JwtPayload;
  if (!decoded) {
    throw new Error("Refresh token expired");
  }

  const session = await redis.get(`rt-${decoded.id}`);
  if (session !== token) {
    throw new Error("Refresh token expired");
  }

  return decoded;
};
