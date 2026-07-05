import tailwindcss from "@tailwindcss/postcss";

const isStorybook = process.env.STORYBOOK === "true" || 
  (process.env.npm_lifecycle_event && process.env.npm_lifecycle_event.includes("storybook")) ||
  (process.argv && process.argv.some(arg => arg.includes("storybook") || arg.includes("sb")));

const config = {
  plugins: isStorybook ? [tailwindcss()] : ["@tailwindcss/postcss"],
};

export default config;
