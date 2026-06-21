import { DEFAULT_USER_EMAIL, DEFAULT_USER_NAME } from "../config";
import { AdminService } from "../service/admin-service";

if (!DEFAULT_USER_EMAIL) {
  console.error("DEFAULT_USER_EMAIL is not set in environment variables.");
  process.exit(1);
}

const adminService = new AdminService();

(async () => {
  if (await adminService.exists(DEFAULT_USER_EMAIL)) {
    console.log(`Admin "${DEFAULT_USER_EMAIL}" already exists, skipping.`);
    process.exit(0);
  }

  await adminService.create({
    email: DEFAULT_USER_EMAIL,
    fullName: DEFAULT_USER_NAME,
  });

  console.log(`Created default admin user "${DEFAULT_USER_EMAIL}".`);
  process.exit(0);
})();
