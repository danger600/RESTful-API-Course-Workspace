import { PresetRequest, TaskStatus } from "./types";

export const initialTasks: TaskStatus[] = [
  {
    id: 1,
    title: "Task 1: Project Setup",
    description: "Initialize Node.js workspace, configure dependency manifests, and set up the Express full-stack framework binded to port 3000.",
    marks: 10,
    completed: true,
    codeSnippet: `// Inside package.json
{
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts",
    "start": "node dist/server.cjs"
  },
  "dependencies": {
    "express": "^4.21.2",
    "dotenv": "^17.2.3"
  }
}`
  },
  {
    id: 2,
    title: "Task 2: Database Design",
    description: "Design and implement the Products entity collection. Schema defines unique IDs, product names, quantities, unit prices, and creation timestamps.",
    marks: 10,
    completed: true,
    codeSnippet: `interface Product {
  id: string;        // Unique identifier (sequential string)
  name: string;      // Product name (e.g., Rice, Beans)
  quantity: number;  // Current stock volume (integer)
  price: number;     // Unit price (decimal float)
  created_at: string;// Timestamp metadata (ISO-8601 string)
}`
  },
  {
    id: 3,
    title: "Task 3: API Development (CRUD)",
    description: "Construct Express route handlers covering standard CRUD pathways: GET /products, GET /products/:id, POST /products, PUT /products/:id, and DELETE /products/:id.",
    marks: 30,
    completed: true,
    codeSnippet: `app.get("/products", (req, res) => {
  res.status(200).json(products);
});

app.get("/products/:id", (req, res) => {
  const p = products.find(x => x.id === req.params.id);
  p ? res.json(p) : res.status(404).json({ error: "Product Not Found" });
});`
  },
  {
    id: 4,
    title: "Task 4: Stock Management",
    description: "Build POST /stock-in and POST /stock-out routes. Implements stock increments or decrements with strict floor bounds (quantity can never drop below zero).",
    marks: 20,
    completed: true,
    codeSnippet: `// Stock decrease (stock-out) constraint protection
if (product.quantity - Math.floor(quantity) < 0) {
  return res.status(400).json({
    error: "Insufficient Stock",
    message: "Stock cannot go below zero."
  });
}`
  },
  {
    id: 5,
    title: "Task 5: API Testing & Verification",
    description: "Verify all endpoints using an API testing explorer. Generates and exports a fully standard Postman v2.1 importable testing collection for classroom submissions.",
    marks: 10,
    completed: true,
    codeSnippet: `// Postman-compatiable API Test Export JSON representation
{
  "info": {
    "name": "Food Shop Inventory Management API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [...]
}`
  },
  {
    id: 6,
    title: "Task 6: Validate & Handle Errors",
    description: "Gracefully intercept bad client requests, e.g., non-existent item queries (404), negative price or volume assignments (400), and empty parameters.",
    marks: 10,
    completed: true,
    codeSnippet: `// Strict dynamic request filters
if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
  res.status(400).json({
    error: "Validation Failed",
    message: "Product price must be a valid non-negative float."
  });
}`
  },
  {
    id: 7,
    title: "Task 7: Interactive Documentation",
    description: "Construct interactive reference materials documenting precise HTTP methods, body requirements, parameters, expected status codes, and JSON outputs.",
    marks: 10,
    completed: true,
    codeSnippet: `/**
 * HTTP Specifications:
 * POST /products: 201 Created on successes.
 * POST /stock-out: 200 OK or 400 bad requests if stock exceeds boundary.
 */`
  }
];

export const presetRequests: PresetRequest[] = [
  {
    name: "GET All Products",
    method: "GET",
    path: "/products",
    description: "Fetch all available inventory products formatted as a JSON array under HTTP status 200.",
    taskRelation: "Task 3: CRUD API"
  },
  {
    name: "GET Single Product (Rice)",
    method: "GET",
    path: "/products/1",
    description: "Retrieve complete specification metadata for Product ID 1 (Rice). Throws 404 error if missing.",
    taskRelation: "Task 3: CRUD API"
  },
  {
    name: "POST Create Product",
    method: "POST",
    path: "/products",
    bodyBefore: JSON.stringify({ name: "Sweet Potatoes", quantity: 35, price: 1.15 }, null, 2),
    description: "Incorporate a brand-new food crop. Validates fields against negative values and returns a status 201 on success.",
    taskRelation: "Task 3: CRUD API"
  },
  {
    name: "PUT Update Product price",
    method: "PUT",
    path: "/products/3",
    bodyBefore: JSON.stringify({ price: 1.05 }, null, 2),
    description: "Update individual price or details of Product ID 3. Merges changes gracefully.",
    taskRelation: "Task 3: CRUD API"
  },
  {
    name: "DELETE Product (Cassava Flour)",
    method: "DELETE",
    path: "/products/4",
    description: "Expunge Product ID 4 permanently from shop records. Returns the details of deleted item.",
    taskRelation: "Task 3: CRUD API"
  },
  {
    name: "POST Stock In (Rice)",
    method: "POST",
    path: "/stock-in",
    bodyBefore: JSON.stringify({ id: "1", quantity: 20 }, null, 2),
    description: "Log incoming shipment. Adds 20 units securely into Rice stock holdings.",
    taskRelation: "Task 4: Stock management"
  },
  {
    name: "POST Stock Out (Beans)",
    method: "POST",
    path: "/stock-out",
    bodyBefore: JSON.stringify({ id: "2", quantity: 15 }, null, 2),
    description: "Fulfill food item checkout. Decrements stock level by 15 units.",
    taskRelation: "Task 4: Stock management"
  },
  {
    name: "POST Stock Out Overdraft Trigger (Rice)",
    method: "POST",
    path: "/stock-out",
    bodyBefore: JSON.stringify({ id: "1", quantity: 999 }, null, 2),
    description: "Verify business validation rule. Intentionally request a stock reduction larger than current reserves, demonstrating status 400 error prevention.",
    taskRelation: "Task 6: Error validations"
  },
  {
    name: "GET Missing Product (404 Test)",
    method: "GET",
    path: "/products/99",
    description: "Test 404 response handler by attempting to retrieve a non-existent item representation.",
    taskRelation: "Task 6: Error validations"
  }
];

export const documentations = [
  {
    id: "doc-get-all",
    endpoint: "/products",
    method: "GET",
    description: "Retrieve the list of all active products within the small food shop.",
    parameters: "None",
    requestBody: "None",
    responses: [
      {
        code: 200,
        desc: "Success - Returns a complete array of product records.",
        body: `[
  {
    "id": "1",
    "name": "Rice",
    "quantity": 50,
    "price": 1.20,
    "created_at": "2026-05-22T08:00:00.000Z"
  }
]`
      }
    ]
  },
  {
    id: "doc-get-single",
    endpoint: "/products/:id",
    method: "GET",
    description: "Retrieve detailed description for a distinct product by string ID.",
    parameters: "id (String, required) - The unique index of the product.",
    requestBody: "None",
    responses: [
      {
        code: 200,
        desc: "Success - Returns the exact product matching ID.",
        body: `{
  "id": "1",
  "name": "Rice",
  "quantity": 50,
  "price": 1.20,
  "created_at": "2026-05-22T08:00:00.000Z"
}`
      },
      {
        code: 404,
        desc: "Not Found - If the given item ID does not currently exist.",
        body: `{
  "error": "Product Not Found",
  "message": "The product with ID \\"99\\" does not exist in the inventory."
}`
      }
    ]
  },
  {
    id: "doc-post-create",
    endpoint: "/products",
    method: "POST",
    description: "Registers and seeds a brand new product in the store inventory catalog.",
    parameters: "None",
    requestBody: `{
  "name": "Beans",      // required, non-empty String
  "quantity": 40,      // required, integer >= 0
  "price": 1.50        // required, float >= 0
}`,
    responses: [
      {
        code: 201,
        desc: "Created - If validation criteria succeeds.",
        body: `{
  "message": "Product created successfully",
  "product": {
    "id": "5",
    "name": "Sweet Potatoes",
    "quantity": 35,
    "price": 1.15,
    "created_at": "2026-05-22T19:10:00.000Z"
  }
}`
      },
      {
        code: 400,
        desc: "Bad Request - Received when schema parameters are negative, missing, or corrupt.",
        body: `{
  "error": "Validation Failed",
  "message": "Product price is required and must be a number."
}`
      }
    ]
  },
  {
    id: "doc-put-update",
    endpoint: "/products/:id",
    method: "PUT",
    description: "Perform partial or complete metadata edits on a target product.",
    parameters: "id (String, required)",
    requestBody: `{
  "name": "Updated Rich Rice", // optional, non-empty String
  "price": 1.35                // optional, float >= 0
}`,
    responses: [
      {
        code: 200,
        desc: "Success - Product changes written and updated object returned.",
        body: `{
  "message": "Product updated successfully",
  "product": {
    "id": "1",
    "name": "Rice",
    "quantity": 50,
    "price": 1.35,
    "created_at": "2026-05-22T08:00:00.000Z"
  }
}`
      },
      {
        code: 404,
        desc: "Not Found - If index is missing.",
        body: `{
  "error": "Product Not Found",
  "message": "Cannot update product. Product with ID \\"99\\" does not exist."
}`
      }
    ]
  },
  {
    id: "doc-delete",
    endpoint: "/products/:id",
    method: "DELETE",
    description: "Permanently purge a product model index representation from database.",
    parameters: "id (String, required)",
    requestBody: "None",
    responses: [
      {
        code: 200,
        desc: "Success - Item matches and is successfully removed.",
        body: `{
  "message": "Product deleted successfully",
  "product": {
    "id": "4",
    "name": "Cassava Flour",
    "quantity": 25,
    "price": 0.85,
    "created_at": "2026-05-22T08:45:00.000Z"
  }
}`
      }
    ]
  },
  {
    id: "doc-stock-in",
    endpoint: "/stock-in",
    method: "POST",
    description: "Stock up or increase product volume manually (e.g. following wholesale arrivals).",
    parameters: "None",
    requestBody: `{
  "id": "1",           // required, string matching existing id
  "quantity": 20       // required, integer greater than 0
}`,
    responses: [
      {
        code: 200,
        desc: "Success - Stock incremented successfully.",
        body: `{
  "message": "Successfully added 20 units to stock.",
  "product": {
    "id": "1",
    "name": "Rice",
    "quantity": 70,
    "price": 1.20,
    "created_at": "2026-05-22T08:00:00.000Z"
  }
}`
      },
      {
        code: 400,
        desc: "Bad Request - Received when input integer is <= 0 or parameter is malformed.",
        body: `{
  "error": "Validation Failed",
  "message": "Stock-in quantity must be a positive number greater than zero."
}`
      }
    ]
  },
  {
    id: "doc-stock-out",
    endpoint: "/stock-out",
    method: "POST",
    description: "Reduce or release product volume manually (e.g. storefront transactions, sales dispatch). Checks bounds and blocks negative outputs.",
    parameters: "None",
    requestBody: `{
  "id": "2",           // required, string matching existing id
  "quantity": 15       // required, integer greater than 0
}`,
    responses: [
      {
        code: 200,
        desc: "Success - Stock quantity decremented successfully.",
        body: `{
  "message": "Successfully dispatched 15 units from stock.",
  "product": {
    "id": "2",
    "name": "Beans",
    "quantity": 25,
    "price": 1.50,
    "created_at": "2026-05-22T08:15:00.000Z"
  }
}`
      },
      {
        code: 400,
        desc: "Bad Request / Insufficient stock - Blocked when requested amount exceeds current on-hand quantities.",
        body: `{
  "error": "Insufficient Stock",
  "message": "Cannot stock-out 999 units. Current stock for \\"Rice\\" is 50 units, and stock cannot go below zero."
}`
      }
    ]
  }
];
