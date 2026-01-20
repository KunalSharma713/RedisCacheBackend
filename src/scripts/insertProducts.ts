import dotenv from "dotenv";
dotenv.config();

import Product from "../models/Product";
import connectDB from "../config/db";

const generateRandomProducts = () => {
  const products = [];
  const categories = [
    "Electronics",
    "Clothing",
    "Books",
    "Home",
    "Sports",
    "Toys",
  ];
  const adjectives = [
    "Premium",
    "Deluxe",
    "Basic",
    "Professional",
    "Smart",
    "Classic",
    "Modern",
    "Vintage",
  ];
  const items = [
    "Laptop",
    "Phone",
    "Tablet",
    "Watch",
    "Headphones",
    "Camera",
    "Speaker",
    "Mouse",
    "Keyboard",
    "Monitor",
    "Chair",
    "Desk",
    "Book",
    "Shirt",
    "Pants",
    "Shoes",
    "Bag",
    "Bottle",
    "Cup",
    "Pen",
    "Notebook",
    "Lamp",
    "Clock",
    "Mirror",
    "Ball",
    "Bat",
    "Racket",
    "Gloves",
    "Helmet",
    "Bike",
    "Skateboard",
    "Game",
  ];

  const itemCategoryMap = {
    Laptop: "Electronics",
    Phone: "Electronics",
    Tablet: "Electronics",
    Watch: "Electronics",
    Headphones: "Electronics",
    Camera: "Electronics",
    Speaker: "Electronics",
    Mouse: "Electronics",
    Keyboard: "Electronics",
    Monitor: "Electronics",
    Chair: "Home",
    Desk: "Home",
    Book: "Books",
    Shirt: "Clothing",
    Pants: "Clothing",
    Shoes: "Clothing",
    Bag: "Clothing",
    Bottle: "Home",
    Cup: "Home",
    Pen: "Books",
    Notebook: "Books",
    Lamp: "Home",
    Clock: "Home",
    Mirror: "Home",
    Ball: "Sports",
    Bat: "Sports",
    Racket: "Sports",
    Gloves: "Sports",
    Helmet: "Sports",
    Bike: "Sports",
    Skateboard: "Sports",
    Game: "Toys"
  };

  for (let i = 1; i <= 100; i++) {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const item = items[Math.floor(Math.random() * items.length)];
    const price = Math.floor(Math.random() * 900) + 10; // Price between 10-909
    const category = itemCategoryMap[item as keyof typeof itemCategoryMap] || "Misc";

    products.push({
      name: `${adjective} ${item}`,
      price: price,
      category: category,
    });
  }

  return products;
};

const insertProducts = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    // Clear existing products
    await Product.deleteMany({});
    console.log("Cleared existing products");

    // Generate and insert new products
    const products = generateRandomProducts();
    const insertedProducts = await Product.insertMany(products);

    console.log(`Successfully inserted ${insertedProducts.length} products`);
    console.log("Sample products:");
    insertedProducts.slice(0, 5).forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - $${product.price}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error inserting products:", error);
    process.exit(1);
  }
};

insertProducts();
