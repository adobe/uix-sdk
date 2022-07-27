export default function commonExampleConfig() {
  return {
    clearScreen: false,
    optimizeDeps: {
      include: ["react"],
    },
    server: {
      strictPort: true,
      port: process.env.MULTI_SERVER_PORT,
    },
    preview: {
      port: process.env.MULTI_SERVER_PORT,
      strictPort: true,
    },
    define: {
      REGISTRY_URL: JSON.stringify(
        process.env.REGISTRY_URL || "http://localhost:3000/"
      ),
    },
  };
}
