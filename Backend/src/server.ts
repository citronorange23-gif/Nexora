import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./modules/auth/auth.routes.js";
import authTestRoutes from "./modules/auth/auth.test.routes.js";

import productRoutes from "./modules/products/product.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import saleRoutes from "./modules/sales/sale.routes.js";

import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";

import employeeRoutes from "./modules/employees/employee.routes.js";
import roleRoutes from "./modules/roles/role.routes.js";

import customerRoutes from "./modules/customers/customer.routes.js"

import paymentRoutes from "./modules/payments/payment.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js"

import { stripeWebhook } from "./modules/payments/payment.controller.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 4000;

app.use(cors());

// Webhook Stripe AVANT express.json() global —
// doit recevoir le body brut pour vérifier la signature
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook as express.RequestHandler,
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Nexora API is running",
  }); 
});

app.use("/api/auth", authRoutes);
app.use("/api/test", authTestRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sales", saleRoutes);

app.use("/api/employees", employeeRoutes);
app.use("/api/roles", roleRoutes);

app.use("/api/customers", customerRoutes);

app.use("/api/payments", paymentRoutes);
app.use("/api/settings", settingsRoutes)

app.listen(PORT, () => {
  console.log(`🚀 Nexora API running on http://localhost:${PORT}`);
});