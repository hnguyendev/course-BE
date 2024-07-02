require("dotenv").config();
import mongoose, { Document, Model, Schema } from "mongoose";

interface IComment extends Document {
  user: object;
  comment: string;
  commentReplies?: IComment[];
}

interface IReview extends Document {
  user: object;
  rating: number;
  comment: string;
  commentReplies?: IComment[];
}

interface ILink extends Document {
  title: string;
  url: string;
}

interface ICourseData extends Document {
  title: string;
  desciption: string;
  videoUrl: string;
  videoSection: string;
  videoLength: number;
  videoPlayer: string;
  links: ILink[];
  suggestion: string;
  questions: IComment[];
}

interface ICourse extends Document {
  name: string;
  description?: string;
  price: number;
  estimatedPrice?: number;
  thumbnail: object;
  tags: string;
  level: string;
  demoUrl: string;
  benefits: { title: string }[];
  prerequisites: { title: string }[];
  reviews: IReview[];
  courseData: ICourseData[];
  ratings?: number;
  purchased?: number;
}

const reviewSchema: Schema<IReview> = new mongoose.Schema({
  user: Object,
  rating: {
    type: Number,
    default: 0,
  },
  comment: {
    type: String,
  },
  commentReplies: [Object],
});

const linkSchema: Schema<ILink> = new mongoose.Schema({
  title: String,
  url: String,
});

const commentSchema: Schema<IComment> = new mongoose.Schema({
  user: Object,
  comment: String,
  commentReplies: [Object],
});

const courseDataSchema: Schema<ICourseData> = new mongoose.Schema({
  title: String,
  desciption: String,
  videoUrl: String,
  videoSection: String,
  videoLength: Number,
  videoPlayer: String,
  links: [linkSchema],
  suggestion: String,
  questions: [commentSchema],
});

const courseSchema: Schema<ICourse> = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
  },
  estimatedPrice: { type: Number },
  thumbnail: {
    public_id: {
      type: String,
      // required: true,
    },
    url: {
      type: String,
      // required: true,
    },
  },
  tags: { type: String, required: true },
  level: { type: String, required: true },
  demoUrl: { type: String, required: true },
  benefits: [{ title: String }],
  prerequisites: [{ title: String }],
  reviews: [reviewSchema],
  courseData: [courseDataSchema],
  ratings: { type: Number, default: 0 },
  purchased: { type: Number, default: 0 },
});

// const reviewModel: Model<IReview> = mongoose.model("review", reviewSchema);
// const linkModel: Model<ILink> = mongoose.model("link", linkSchema);
// const commentModel: Model<IComment> = mongoose.model("comment", commentSchema);
// const courseDataModel: Model<ICourseData> = mongoose.model(
//   "courseData",
//   courseDataSchema
// );
const courseModel: Model<ICourse> = mongoose.model("course", courseSchema);
export default courseModel;
