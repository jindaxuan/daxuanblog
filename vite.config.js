import { defineConfig } from "vite";
const env = process.env.NODE_ENV === "development" ? "" : "/daxuanblog"

export default defineConfig({
  base: env,
});
