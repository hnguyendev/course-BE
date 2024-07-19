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

// edit layout
export const editLayout = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;

      const existingType = await layoutModel.findOne({ type });
      if (!existingType) {
        return next(new ErrorHandler(`${type} does not exist`, 400));
      }

      if (type === "Banner") {
        const bannerData = await layoutModel.findOne({ type: "Banner" });
        if (bannerData) {
          await cloudinary.v2.uploader.destroy(
            bannerData.banner.image?.public_id
          );
        }
        const { image, title, subTitle } = req.body;

        const cloudData = await cloudinary.v2.uploader.upload(image, {
          folder: "layout",
        });

        const banner = {
          image: { public_id: cloudData.public_id, url: cloudData.secure_url },
          title,
          subTitle,
        };

        await layoutModel.findByIdAndUpdate(bannerData?._id, { banner });
      }

      if (type === "FAQ") {
        const { faq } = req.body;
        const faqData = await layoutModel.findOne({ type: "FAQ" });

        const faqItems = await Promise.all(
          faq.map(async (item: FaqItem) => {
            return {
              question: item.question,
              answer: item.answer,
            };
          })
        );

        await layoutModel.findByIdAndUpdate(faqData?._id, {
          faq: faqItems,
        });
      }

      if (type === "Categories") {
        const { categories } = req.body;
        const categoriesData = await layoutModel.findOne({
          type: "Categories",
        });

        const categoriesItems = await Promise.all(
          categories.map(async (category: Category) => {
            return {
              title: category.title,
            };
          })
        );

        await layoutModel.findByIdAndUpdate(categoriesData?._id, {
          categories: categoriesItems,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Layout updated successfully!",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const getLayoutByType = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;

      const layout = await layoutModel.findOne({ type });

      return res.status(200).json({
        success: true,
        layout,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
