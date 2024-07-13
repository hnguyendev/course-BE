import { NextFunction, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import courseModel from "../models/course.model";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";

export const createCourse = CatchAsyncError(
  async (data: any, res: Response, next: NextFunction) => {
    try {
      const course = await courseModel.create(data);
      res.status(201).json({
        succes: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const getAllCoursesService = async (res: Response) => {
  const courses = await courseModel.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    courses,
  });
};
