require("dotenv").config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ErrorMiddleWare } from "./middleware/error";
import userRouter from "./routes/user.route";
import courseRouter from "./routes/course.route";

export const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.ORIGIN,
  })
);

//
app.use("/api/v1", userRouter);
app.use("/api/v1", courseRouter);

app.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "XDD",
  });
});

app.all("*", (req, res, next) => {
  const err = new Error(`route ${req.originalUrl} not found`);
  res.status(404);
  next(err);
});

app.use(ErrorMiddleWare);
