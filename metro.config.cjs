const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

const WEB_EXTS = [".web.tsx", ".web.ts", ".web.js", ".web.jsx"];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "zustand" || moduleName.startsWith("zustand/")) {
    return {
      type: "sourceFile",
      filePath: require.resolve(moduleName),
    };
  }

  if (
    platform === "web" &&
    !path.extname(moduleName) &&
    (moduleName.startsWith("./") || moduleName.startsWith("../"))
  ) {
    const base = path.resolve(path.dirname(context.originModulePath), moduleName);
    for (const ext of WEB_EXTS) {
      const candidate = base + ext;
      if (fs.existsSync(candidate)) {
        return { type: "sourceFile", filePath: candidate };
      }
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
