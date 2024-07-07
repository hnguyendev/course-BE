import { Request, Response, NextFunction } from "express";
import cloudinary from "cloudinary";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import { createCourse } from "../services/course.service";
import courseModel from "../models/course.model";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import ejs from "ejs";
import path from "path";
import { sendMail } from "../utils/sendMail";

export const uploadCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const { thumbnail } = data;

      if (thumbnail) {
        const cloudData = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });

        data.thumbnail = {
          public_id: cloudData.public_id,
          url: cloudData.secure_url,
        };
      }
      createCourse(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const editCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const { thumbnail } = data;
      const courseId = req.params.id;
      const course = await courseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found!", 400));
      }

      if (thumbnail) {
        await cloudinary.v2.uploader.destroy(thumbnail.public_id);
        const cloudData = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });

        course.thumbnail = {
          public_id: cloudData.public_id,
          url: cloudData.secure_url,
        };
      }

      const updatedCourse = await courseModel.findByIdAndUpdate(
        courseId,
        {
          $set: data,
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        updatedCourse,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get one course
export const getSingleCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const isCached = await redis.get(courseId);

      if (isCached) {
        const course = JSON.parse(isCached);
        console.log("from redis");
        return res.status(200).json({
          success: true,
          course,
        });
      } else {
        const course = await courseModel
          .findById(req.params.id)
          .select(
            "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
          );

        console.log("from db");

        await redis.set(courseId, JSON.stringify(course));

        return res.status(200).json({
          success: true,
          course,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get all courses
export const getAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isCached = await redis.get("allCourses");
      if (isCached) {
        const courses = JSON.parse(isCached);
        return res.status(200).json({
          success: true,
          courses,
        });
      } else {
        const courses = await courseModel
          .find()
          .select(
            "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
          );

        await redis.set("allCourses", JSON.stringify(courses));

        return res.status(200).json({
          success: true,
          courses,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get course content - auth users
export const getCourseByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;

      const existingCourse = userCourseList?.find(
        (course: any) => course._id.toString() === courseId
      );

      if (!existingCourse) {
        return next(
          new ErrorHandler("Not allowed to access this resource!", 400)
        );
      }

      const course = await courseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found!", 400));
      }

      const content = course?.courseData;

      return res.status(200).json({
        success: true,
        content,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, courseId, contentId } = req.body as IAddQuestionData;

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content ID", 400));
      }

      const course = await courseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found!", 400));
      }

      const courseContent = course.courseData.find((item: any) =>
        item._id.equals(contentId)
      );

      if (!courseContent) {
        return next(new ErrorHandler("Invalid content ID", 400));
      }

      const newQuestion: any = {
        user: req.user,
        question,
        questionReplies: [],
      };

      courseContent.questions.push(newQuestion);
      await course.save();

      return res.status(201).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// add answer
interface IAddAnswer {
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

export const addAnswer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, courseId, contentId, questionId } =
        req.body as IAddAnswer;

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content ID", 400));
      }
      if (!mongoose.Types.ObjectId.isValid(questionId)) {
        return next(new ErrorHandler("Invalid question ID", 400));
      }

      const course = await courseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found!", 400));
      }

      const courseData = course.courseData.find((item: any) =>
        item._id.equals(contentId)
      );

      if (!courseData) {
        return next(new ErrorHandler("Invalid content ID", 400));
      }

      const question = courseData.questions.find((question: any) =>
        question._id.equals(questionId)
      );

      if (!question) {
        return next(new ErrorHandler("Question not found", 400));
      }

      const newAnswer: any = {
        user: req.user,
        answer,
      };
      question.questionReplies?.push(newAnswer);
      await course.save();

      if (req.user?._id === question.user._id) {
        // create notification
      } else {
        const data = {
          name: question.user.name,
          title: courseData.title,
        };
        const html = await ejs.renderFile(
          path.join(__dirname, "../mails/question-reply.ejs"),
          data
        );

        try {
          await sendMail({
            email: question.user.email,
            subject: "Question reply",
            template: "question-reply.ejs",
            data,
          });
        } catch (error: any) {
          return next(new ErrorHandler(error.message, 400));
        }
      }

      return res.status(201).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// add review
interface IAddReview {
  review: string;
  rating: number;
  userId: string;
}

export const addReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { review, rating } = req.body;

      const userCourseList = req.user?.courses;

      const courseId = req.params.id;
      const course = await courseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found!", 400));
      }

      const existingCourse = userCourseList?.find(
        (course: any) => course._id.toString() === courseId
      );

      if (!existingCourse) {
        return next(new ErrorHandler("Not allowed to access this course", 400));
      }

      const newReview: any = {
        user: req.user,
        comment: review,
        rating,
      };
      course.reviews.push(newReview);

      let avg = 0;
      course.reviews.forEach((review: any) => (avg += review.rating));
      course.ratings = avg / course.reviews.length;

      await course.save();

      // notification for new review
      const notification = {
        title: "New Review Received",
        message: `${req.user?.name} has given a review in ${course.name}`,
      };

      return res.status(201).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// add review replies
interface IAddReviewReply {
  comment: string;
  courseId: string;
  reviewId: string;
}

export const addReviewReply = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId } = req.body as IAddReviewReply;

      const course = await courseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found!", 400));
      }

      if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return next(new ErrorHandler("Invalid review id!", 400));
      }

      const review = course.reviews.find((rev: any) =>
        rev._id.equals(reviewId)
      );

      if (!review) {
        return next(new ErrorHandler("Review not found!", 400));
      }

      const newReviewReply: any = {
        user: req.user,
        comment,
      };
      if (!review.commentReplies) {
        review.commentReplies = [];
      }
      review.commentReplies?.push(newReviewReply);

      await course.save();

      return res.status(201).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
