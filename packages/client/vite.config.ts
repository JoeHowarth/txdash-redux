import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
		preserveSymlinks: true,
	},
	server: {
		proxy: {
			"/api": "http://localhost:3000",
		},
		fs: {
			// allow importing workspace packages like @stressnet/core during dev
			allow: [path.resolve(__dirname, "..", "..")],
		},
	},
});
