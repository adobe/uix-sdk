import { registryUrl } from "./examples-utils.js";
export default function commonExampleConfig() {
  return {
    logLevel: "warn",
    clearScreen: false,
    optimizeDeps: {
      include: ["@adobe/uix-sdk"],
    },
    server: {
      force: true,
      strictPort: true,
      port: process.env.VITE_PORT,
    },
    preview: {
      port: process.env.VITE_PORT,
      strictPort: true,
    },
    define: {
      REGISTRY_URL: JSON.stringify(registryUrl),
    },
  };
}
