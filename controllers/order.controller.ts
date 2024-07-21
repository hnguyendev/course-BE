require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import { IOrder } from "../models/order.model";
import courseModel from "../models/course.model";
import ejs from "ejs";
import { getAllOrdersService, newOrder } from "../services/order.service";
import path from "path";
import { sendMail } from "../utils/sendMail";
import notificationModel from "../models/notification.model";
import userModel from "../models/user.model";
import { redis } from "../utils/redis";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, payment_info } = req.body as IOrder;

      if (payment_info) {
        if ("id" in payment_info) {
          const paymentIntentId = payment_info.id;
          const paymentIntent = await stripe.paymentIntents.retrieve(
            paymentIntentId
          );

          if (paymentIntent.status !== "succeeded") {
            return next(new ErrorHandler("Payment not authorized!", 400));
          }
        }
      }

      const user = await userModel.findById(req.user?._id);

      if (!user) {
        return next(
          new ErrorHandler("Not allowed to access this resource!", 400)
        );
      }

      const course = await courseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found!", 404));
      }

      const existingCourse = user.courses.find((course: any) =>
        course._id.equals(courseId)
      );

      if (existingCourse) {
        return next(new ErrorHandler("You already bought this course!", 400));
      }

      const mailData = {
        order: {
          _id: course._id?.toString().slice(0, 6),
          name: course.name,
          price: course.price,
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      };

      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/order-confirmation.ejs"),
        { order: mailData }
      );
      try {
        if (user) {
          await sendMail({
            email: user.email,
            subject: "Order Confirmation",
            template: "order-confirmation.ejs",
            data: mailData,
          });
        }
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }

      const newCourse = course?._id as any;

      user?.courses.push(newCourse);

      await redis.set(user?._id as string, JSON.stringify(user));
      await user.save();

      await notificationModel.create({
        userId: user.id,
        title: "New Order",
        message: `You have a new order from ${course.name}`,
      });

      typeof course.purchased === "number"
        ? (course.purchased += 1)
        : course.purchased;

      await course.save();

      const data: any = {
        courseId: course._id,
        userId: user._id,
        payment_info,
      };

      newOrder(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get all orders --admin
export const getAllOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllOrdersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// send Stripe publishable key
export const sendStripePublishableKey = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// new payment
export const newPayment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const newPayment = await stripe.paymentIntents.create({
        amount: req.body.amount,
        currency: "USD",
        metadata: {
          company: "XDD",
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.status(201).json({
        success: true,
        client_secret: newPayment.client_secret,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
