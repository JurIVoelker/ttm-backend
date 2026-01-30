import { Hono } from "hono"
import { access, jwtMiddleware } from "../lib/auth"
import { validateJSON } from "../lib/validate"
import { AdminService } from "../service/admin-service"
import { ADD_ADMIN_SCHEMA } from "../validation/admin-schema"
import logger from "../lib/logger"

// Config
export const adminController = new Hono()
adminController.use(jwtMiddleware)

// Services
const adminService = new AdminService()

// Routes

adminController.get("/admins", access("admin"), async (c) => {
  const admins = await adminService.findMany();
  return c.json(admins);
})

adminController.post("/admin", access("admin"), validateJSON(ADD_ADMIN_SCHEMA), async (c) => {
  const { email, fullName } = c.get("json")

  const adminExists = await adminService.exists(email);
  if (adminExists) {
    logger.warn({ email }, "Admin with this email already exists");
    return c.json({ message: "Admin already exists" }, 400);
  }

  const admin = await adminService.create({ email, fullName });

  logger.info({ email, fullName }, "Created new admin");
  return c.json(admin);
})

