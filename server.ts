import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  created_at: string;
}

interface ServerLog {
  timestamp: string;
  method: string;
  url: string;
  status: number;
  bodyBefore?: any;
  responseBody?: any;
  ip: string;
}

// In-memory Database with initial values representing a small food shop
let products: Product[] = [
  { id: "1", name: "Rice", quantity: 50, price: 1.20, created_at: "2026-05-22T08:00:00.000Z" },
  { id: "2", name: "Beans", quantity: 40, price: 1.50, created_at: "2026-05-22T08:15:00.000Z" },
  { id: "3", name: "Maize Flour", quantity: 30, price: 0.90, created_at: "2026-05-22T08:30:00.000Z" },
  { id: "4", name: "Cassava Flour", quantity: 25, price: 0.85, created_at: "2026-05-22T08:45:00.000Z" }
];

let nextId = 5;
const serverLogs: ServerLog[] = [];

function addLog(log: Omit<ServerLog, "timestamp">) {
  serverLogs.push({
    timestamp: new Date().toLocaleTimeString(),
    ...log,
  });
  if (serverLogs.length > 50) {
    serverLogs.shift();
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // CORS middleware manually to avoid installing cors package or handling headers gracefully
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Track and Intercept responses for logging
  app.use((req, res, next) => {
    const originalSend = res.send;
    let bodySent: any = null;

    res.send = function (chunk) {
      bodySent = chunk;
      return originalSend.apply(res, arguments as any);
    };

    res.on("finish", () => {
      let parsedResponse: any = null;
      try {
        if (bodySent) {
          if (typeof bodySent === "string") {
            parsedResponse = JSON.parse(bodySent);
          } else {
            parsedResponse = bodySent;
          }
        }
      } catch (e) {
        parsedResponse = "[Non-JSON or Text response]";
      }

      addLog({
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        bodyBefore: Object.keys(req.body).length > 0 ? req.body : undefined,
        responseBody: parsedResponse,
        ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1",
      });
    });

    next();
  });

  // API router / endpoints (Support /api/products AND /products for maximum compliance)

  // 1. Core Sandbox Helper Endpoints
  app.get("/api/server-logs", (req: Request, res: Response) => {
    res.json(serverLogs);
  });

  app.post("/api/reset", (req: Request, res: Response) => {
    products = [
      { id: "1", name: "Rice", quantity: 50, price: 1.20, created_at: "2026-05-22T08:00:00.000Z" },
      { id: "2", name: "Beans", quantity: 40, price: 1.50, created_at: "2026-05-22T08:15:00.000Z" },
      { id: "3", name: "Maize Flour", quantity: 30, price: 0.90, created_at: "2026-05-22T08:30:00.000Z" },
      { id: "4", name: "Cassava Flour", quantity: 25, price: 0.85, created_at: "2026-05-22T08:45:00.000Z" }
    ];
    nextId = 5;
    res.json({ message: "Database reset to initial template data.", products });
  });

  // Router functions or middlewares to register endpoints
  const registerRoutes = (router: express.Router) => {
    // GET /products -> Retrieve all products
    router.get("/products", (req: Request, res: Response) => {
      res.status(200).json(products);
    });

    // GET /products/:id -> Retrieve a single product
    router.get("/products/:id", (req: Request, res: Response) => {
      const product = products.find((p) => p.id === req.params.id);
      if (!product) {
        res.status(404).json({
          error: "Product Not Found",
          message: `The product with ID "${req.params.id}" does not exist in the inventory.`
        });
        return;
      }
      res.status(200).json(product);
    });

    // POST /products -> Create a new product
    router.post("/products", (req: Request, res: Response) => {
      const { name, quantity, price } = req.body;

      // Validation
      if (!name || name.trim() === "") {
        res.status(400).json({ error: "Validation Failed", message: "Product name is required." });
        return;
      }
      if (quantity === undefined || quantity === null || isNaN(Number(quantity))) {
        res.status(400).json({ error: "Validation Failed", message: "Product quantity is required and must be a number." });
        return;
      }
      if (Number(quantity) < 0) {
        res.status(400).json({ error: "Validation Failed", message: "Quantity cannot be less than zero." });
        return;
      }
      if (price === undefined || price === null || isNaN(Number(price))) {
        res.status(400).json({ error: "Validation Failed", message: "Product price is required and must be a number." });
        return;
      }
      if (Number(price) < 0) {
        res.status(400).json({ error: "Validation Failed", message: "Price cannot be less than zero." });
        return;
      }

      const newProduct: Product = {
        id: String(nextId++),
        name: String(name),
        quantity: Math.floor(Number(quantity)),
        price: Number(price),
        created_at: new Date().toISOString()
      };

      products.push(newProduct);
      res.status(201).json({
        message: "Product created successfully",
        product: newProduct
      });
    });

    // PUT /products/:id -> Update a product
    router.put("/products/:id", (req: Request, res: Response) => {
      const productIndex = products.findIndex((p) => p.id === req.params.id);
      if (productIndex === -1) {
        res.status(404).json({
          error: "Product Not Found",
          message: `Cannot update product. Product with ID "${req.params.id}" does not exist.`
        });
        return;
      }

      const { name, quantity, price } = req.body;

      // Partial / Complete update validation
      if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
        res.status(400).json({ error: "Validation Failed", message: "Product name cannot be empty." });
        return;
      }
      if (quantity !== undefined) {
        if (isNaN(Number(quantity)) || Number(quantity) < 0) {
          res.status(400).json({ error: "Validation Failed", message: "Quantity must be a valid non-negative number." });
          return;
        }
      }
      if (price !== undefined) {
        if (isNaN(Number(price)) || Number(price) < 0) {
          res.status(400).json({ error: "Validation Failed", message: "Price must be a valid non-negative number." });
          return;
        }
      }

      const updatedProduct = {
        ...products[productIndex],
        ...(name !== undefined && { name: String(name) }),
        ...(quantity !== undefined && { quantity: Math.floor(Number(quantity)) }),
        ...(price !== undefined && { price: Number(price) })
      };

      products[productIndex] = updatedProduct;

      res.status(200).json({
        message: "Product updated successfully",
        product: updatedProduct
      });
    });

    // DELETE /products/:id -> Delete a product
    router.delete("/products/:id", (req: Request, res: Response) => {
      const productIndex = products.findIndex((p) => p.id === req.params.id);
      if (productIndex === -1) {
        res.status(404).json({
          error: "Product Not Found",
          message: `Cannot delete product. Product with ID "${req.params.id}" does not exist.`
        });
        return;
      }

      const deletedProduct = products[productIndex];
      products.splice(productIndex, 1);

      res.status(200).json({
        message: "Product deleted successfully",
        product: deletedProduct
      });
    });

    // POST /stock-in -> Increase product quantity
    router.post("/stock-in", (req: Request, res: Response) => {
      const { id, quantity } = req.body;

      if (!id) {
        res.status(400).json({ error: "Validation Failed", message: "Product ID (id) is required." });
        return;
      }

      if (quantity === undefined || quantity === null || isNaN(Number(quantity))) {
        res.status(400).json({ error: "Validation Failed", message: "Stock-in quantity is required and must be a number." });
        return;
      }

      const stockQty = Number(quantity);
      if (stockQty <= 0) {
        res.status(400).json({ error: "Validation Failed", message: "Stock-in quantity must be a positive number greater than zero." });
        return;
      }

      const product = products.find((p) => p.id === String(id));
      if (!product) {
        res.status(404).json({
          error: "Product Not Found",
          message: `Cannot increase stock. Product with ID "${id}" does not exist.`
        });
        return;
      }

      product.quantity += Math.floor(stockQty);

      res.status(200).json({
        message: `Successfully added ${Math.floor(stockQty)} units to stock.`,
        product
      });
    });

    // POST /stock-out -> Decrease product quantity
    router.post("/stock-out", (req: Request, res: Response) => {
      const { id, quantity } = req.body;

      if (!id) {
        res.status(400).json({ error: "Validation Failed", message: "Product ID (id) is required." });
        return;
      }

      if (quantity === undefined || quantity === null || isNaN(Number(quantity))) {
        res.status(400).json({ error: "Validation Failed", message: "Stock-out quantity is required and must be a number." });
        return;
      }

      const stockQty = Number(quantity);
      if (stockQty <= 0) {
        res.status(400).json({ error: "Validation Failed", message: "Stock-out quantity must be a positive number greater than zero." });
        return;
      }

      const product = products.find((p) => p.id === String(id));
      if (!product) {
        res.status(404).json({
          error: "Product Not Found",
          message: `Cannot decrease stock. Product with ID "${id}" does not exist.`
        });
        return;
      }

      if (product.quantity - Math.floor(stockQty) < 0) {
        res.status(400).json({
          error: "Insufficient Stock",
          message: `Cannot stock-out ${Math.floor(stockQty)} units. Current stock for "${product.name}" is ${product.quantity} units, and stock cannot go below zero.`
        });
        return;
      }

      product.quantity -= Math.floor(stockQty);

      res.status(200).json({
        message: `Successfully dispatched ${Math.floor(stockQty)} units from stock.`,
        product
      });
    });
  };

  // Mount API Endpoints on BOTH standard base path (as per Task 3) and "/api" prefix
  const apiRouter = express.Router();
  registerRoutes(apiRouter);
  app.use("/api", apiRouter);

  // Fallback direct paths for students using traditional direct /products relative requests
  const rootRouter = express.Router();
  registerRoutes(rootRouter);
  app.use("/", rootRouter);

  // Vite middleware or static files for frontend serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Handle errors elegantly
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Express Error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message || "An unexpected error occurred on the Node.js backend."
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
