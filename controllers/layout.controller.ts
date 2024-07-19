import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import layoutModel, { Category, FaqItem } from "../models/layout.model";
import cloudinary from "cloudinary";

export const createLayout = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;

      const existingType = await layoutModel.findOne({ type });

      if (existingType) {
        return next(new ErrorHandler(`${type} already exist`, 400));
      }

      if (type === "Banner") {
        const { image, title, subTitle } = req.body;

        const cloudData = await cloudinary.v2.uploader.upload(image, {
          folder: "layout",
        });

        const banner = {
          image: { public_id: cloudData.public_id, url: cloudData.secure_url },
          title,
          subTitle,
        };

        await layoutModel.create({ type: "Banner", banner });
      }

      if (type === "FAQ") {
        const { faq } = req.body;

        const faqItems = await Promise.all(
          faq.map(async (item: FaqItem) => {
            return {
              question: item.question,
              answer: item.answer,
            };
          })
        );

        await layoutModel.create({
          type: "FAQ",
          faq: faqItems,
        });
      }

      if (type === "Categories") {
        const { categories } = req.body;

        const categoriesItems = await Promise.all(
          categories.map(async (category: Category) => {
            return {
              title: category.title,
            };
          })
        );

        await layoutModel.create({
          type: "Categories",
          categories: categoriesItems,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Layout created successfully!",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
