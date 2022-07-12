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
    define: {
      REGISTRY_URL: JSON.stringify(process.env.REGISTRY_URL),
    },
  };
}
