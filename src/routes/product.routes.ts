import { Router, Request, Response } from "express";
import Product from "../models/Product";
import cache from "../middleware/cache";
import redisClient from "../config/redis";

const router = Router();

/** DEBUG: View all Redis cache keys */
router.get("/debug/cache", async (_req: Request, res: Response) => {
  try {
    const keys = await redisClient.keys("*");
    const cacheData: Record<string, any> = {};
    
    for (const key of keys) {
      const value = await redisClient.get(key);
      const ttl = await redisClient.ttl(key);
      cacheData[key] = {
        value: value ? JSON.parse(value) : null,
        ttl: ttl,
        size: value ? value.length : 0
      };
    }
    
    res.json({
      totalKeys: keys.length,
      keys: keys,
      cacheData: cacheData
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cache data" });
  }
});

/** GET PAGINATED PRODUCTS (CACHED) */
router.get(
  "/paginated",
  cache("products_paginated", 300),
  async (req: Request, res: Response) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Querying MongoDB for paginated products`);
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = (req.query.search as string) || "";
      const sort = (req.query.sort as string) || "name";
      const order = (req.query.order as string) || "asc";
      
      const skip = (page - 1) * limit;
      
      // Build match stage for search
      const matchStage: any = {};
      if (search) {
        matchStage.name = { $regex: search, $options: "i" };
      }
      
      // Build sort stage
      const sortStage: any = {};
      sortStage[sort] = order === "asc" ? 1 : -1;
      
      // Complex aggregation pipeline with pagination
      const pipeline = [
        { $match: matchStage },
        {
          $addFields: {
            priceWithTax: {
              $multiply: [
                { $ifNull: ["$price", 0] },
                1.2
              ]
            },
            nameLength: { $strLenCP: { $ifNull: ["$name", ""] } },
            priceCategory: {
              $switch: {
                branches: [
                  { case: { $lt: ["$price", 10] }, then: "Budget" },
                  { case: { $lt: ["$price", 50] }, then: "Mid-range" },
                  { case: { $lt: ["$price", 100] }, then: "Premium" }
                ],
                default: "Luxury"
              }
            }
          }
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "selfReference"
          }
        },
        {
          $project: {
            name: 1,
            price: 1,
            category: 1,
            priceWithTax: 1,
            nameLength: 1,
            priceCategory: 1,
            createdAt: 1,
            updatedAt: 1,
            computedField: {
              $add: [
                { $multiply: [{ $ifNull: ["$price", 0] }, 0.1] },
                { $mod: [{ $strLenCP: { $ifNull: ["$name", ""] } }, 10] }
              ]
            }
          }
        },
        {
          $group: {
            _id: "$priceCategory",
            products: {
              $push: {
                _id: "$_id",
                name: "$name",
                price: "$price",
                category: "$category",
                priceWithTax: "$priceWithTax",
                nameLength: "$nameLength",
                computedField: "$computedField",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt"
              }
            },
            avgPrice: { $avg: "$price" },
            count: { $sum: 1 }
          }
        },
        {
          $unwind: "$products"
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                "$products",
                {
                  categoryInfo: {
                    category: "$_id",
                    avgPrice: "$avgPrice",
                    categoryCount: "$count"
                  }
                }
              ]
            }
          }
        },
        { $sort: sortStage }
      ];
      
      // Get total count
      const countPipeline = [...pipeline, { $count: "total" }];
      const countResult = await Product.aggregate(countPipeline);
      const totalItems = countResult.length > 0 ? countResult[0].total : 0;
      
      // Get paginated results
      const paginatedPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];
      const products = await Product.aggregate(paginatedPipeline);
      
      const totalPages = Math.ceil(totalItems / limit);
      
      console.log(`[${timestamp}] Found ${products.length} products (page ${page} of ${totalPages})`);
      
      res.json({
        products,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error(`[${timestamp}] Error in paginated query:`, error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  }
);

/** GET ALL PRODUCTS (CACHED) */
router.get(
  "/",
  cache("products", 600),
  async (_req: Request, res: Response) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Querying MongoDB for all products with complex operations`);
    
    // Complex query with multiple operations to increase execution time
    const products = await Product.aggregate([
      {
        $match: {
          $or: [
            { price: { $gte: 0 } },
            { name: { $exists: true } }
          ]
        }
      },
      {
        $addFields: {
          priceWithTax: {
            $multiply: [
              { $ifNull: ["$price", 0] },
              1.2
            ]
          },
          nameLength: { $strLenCP: { $ifNull: ["$name", ""] } },
          priceCategory: {
            $switch: {
              branches: [
                { case: { $lt: ["$price", 10] }, then: "Budget" },
                { case: { $lt: ["$price", 50] }, then: "Mid-range" },
                { case: { $lt: ["$price", 100] }, then: "Premium" }
              ],
              default: "Luxury"
            }
          }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "selfReference"
        }
      },
      {
        $project: {
          name: 1,
          price: 1,
          category: 1,
          priceWithTax: 1,
          nameLength: 1,
          priceCategory: 1,
          createdAt: 1,
          updatedAt: 1,
          computedField: {
            $add: [
              { $multiply: [{ $ifNull: ["$price", 0] }, 0.1] },
              { $mod: [{ $strLenCP: { $ifNull: ["$name", ""] } }, 10] }
            ]
          }
        }
      },
      {
        $sort: {
          priceWithTax: -1,
          nameLength: 1
        }
      },
      {
        $group: {
          _id: "$priceCategory",
          products: {
            $push: {
              _id: "$_id",
              name: "$name",
              price: "$price",
              category: "$category",
              priceWithTax: "$priceWithTax",
              nameLength: "$nameLength",
              computedField: "$computedField",
              createdAt: "$createdAt",
              updatedAt: "$updatedAt"
            }
          },
          avgPrice: { $avg: "$price" },
          count: { $sum: 1 }
        }
      },
      {
        $unwind: "$products"
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$products",
              {
                categoryInfo: {
                  category: "$_id",
                  avgPrice: "$avgPrice",
                  categoryCount: "$count"
                }
              }
            ]
          }
        }
      }
    ]);
    
    console.log(`[${timestamp}] Found ${products.length} products after complex aggregation`);
    res.json(products);
  }
);

/** GET SINGLE PRODUCT (CACHED) */
router.get(
  "/:id",
  cache("product", 300),
  async (req: Request<{ id: string }>, res: Response) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Querying MongoDB for product with ID: ${req.params.id}`);
    const product = await Product.findById(req.params.id);
    console.log(`[${timestamp}] Product found: ${product ? product.name : 'Not found'}`);
    res.json(product);
  }
);

/** CREATE PRODUCT (INVALIDATES CACHE) */
router.post("/", async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Creating new product: ${req.body.name}`);
  
  const product = await Product.create(req.body);
  console.log(`[${timestamp}] Product created with ID: ${product._id}`);

  const keys = await redisClient.keys("products*");
  if (keys.length) {
    await redisClient.del(keys);
    console.log(`[${timestamp}] Invalidated ${keys.length} cache keys:`, keys);
  } else {
    console.log(`[${timestamp}] No cache keys to invalidate`);
  }

  res.status(201).json(product);
});

export default router;
