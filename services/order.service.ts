import { NextFunction, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import orderModel from "../models/order.model";

export const newOrder = CatchAsyncError(
  async (data: any, res: Response, next: NextFunction) => {
    try {
      const order = await orderModel.create(data);
      res.status(201).json({
        success: true,
        order,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const getAllOrdersService = async (res: Response) => {
  const orders = await orderModel.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    orders,
  });
};
