import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  getCourseAnalytics,
  getOrderAnalytics,
  getUserAnalytics,
} from "../controllers/analytics.controller";

const analyticsRouter = express.Router();

analyticsRouter.get(
  "/user-analytics",
  isAuthenticated,
  authorizeRoles("admin"),
  getUserAnalytics
);
analyticsRouter.get(
  "/course-analytics",
  isAuthenticated,
  authorizeRoles("admin"),
  getCourseAnalytics
);
analyticsRouter.get(
  "/order-analytics",
  isAuthenticated,
  authorizeRoles("admin"),
  getOrderAnalytics
);

export default analyticsRouter;
