const allSdks = [
  "@adobe/uix-core",
  "@adobe/uix-guest",
  "@adobe/uix-host",
  "@adobe/uix-host-react",
];
export default function commonExampleConfig() {
  /** @type {import('vite').UserConfig} */
  const commonConfig = {
    logLevel: "warn",
    clearScreen: false,
    optimizeDeps: {
      include: [...allSdks, "react"],
    },
    build: {
      commonjsOptions: {
        include: allSdks,
      },
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
  return commonConfig;
}
