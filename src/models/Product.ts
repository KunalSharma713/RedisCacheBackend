import { Schema, model, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  price: number;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

export default model<IProduct>("Product", productSchema);
