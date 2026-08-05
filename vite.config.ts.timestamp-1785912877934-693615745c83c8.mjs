// vite.config.ts
import { defineConfig } from "file:///C:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/node_modules/vite-plugin-pwa/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\vishv\\OneDrive\\Desktop\\Student-Academic-OS";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg", "manifest.json"],
      manifest: {
        name: "Student Academic OS",
        short_name: "Academic OS",
        description: "Offline-first personal academic ERP \u2014 timetable, attendance, tasks, notes, exams.",
        start_url: "/",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#0B0D12",
        theme_color: "#2563EB",
        icons: [
          // vite-plugin-pwa will serve icon.svg; for real PNG icons, add them to public/icons/
          {
            src: "/icons/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ],
        categories: ["education", "productivity"],
        lang: "en"
      },
      workbox: {
        // Cache all assets from the app shell
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // Cache Dexie-served data by default — no remote API calls needed for Phase 1
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ],
        // Prevent the service worker from swallowing navigation to external links
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//]
      },
      devOptions: {
        // Enable SW in development so offline behavior can be tested locally
        enabled: false
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    port: 3e3,
    open: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aXNodlxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFN0dWRlbnQtQWNhZGVtaWMtT1NcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHZpc2h2XFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcU3R1ZGVudC1BY2FkZW1pYy1PU1xcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvdmlzaHYvT25lRHJpdmUvRGVza3RvcC9TdHVkZW50LUFjYWRlbWljLU9TL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnaWNvbnMvaWNvbi5zdmcnLCAnbWFuaWZlc3QuanNvbiddLFxuICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgbmFtZTogJ1N0dWRlbnQgQWNhZGVtaWMgT1MnLFxuICAgICAgICBzaG9ydF9uYW1lOiAnQWNhZGVtaWMgT1MnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ09mZmxpbmUtZmlyc3QgcGVyc29uYWwgYWNhZGVtaWMgRVJQIFx1MjAxNCB0aW1ldGFibGUsIGF0dGVuZGFuY2UsIHRhc2tzLCBub3RlcywgZXhhbXMuJyxcbiAgICAgICAgc3RhcnRfdXJsOiAnLycsXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgb3JpZW50YXRpb246ICdwb3J0cmFpdC1wcmltYXJ5JyxcbiAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogJyMwQjBEMTInLFxuICAgICAgICB0aGVtZV9jb2xvcjogJyMyNTYzRUInLFxuICAgICAgICBpY29uczogW1xuICAgICAgICAgIC8vIHZpdGUtcGx1Z2luLXB3YSB3aWxsIHNlcnZlIGljb24uc3ZnOyBmb3IgcmVhbCBQTkcgaWNvbnMsIGFkZCB0aGVtIHRvIHB1YmxpYy9pY29ucy9cbiAgICAgICAgICB7XG4gICAgICAgICAgICBzcmM6ICcvaWNvbnMvaWNvbi5zdmcnLFxuICAgICAgICAgICAgc2l6ZXM6ICdhbnknLFxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3N2Zyt4bWwnLFxuICAgICAgICAgICAgcHVycG9zZTogJ2FueSBtYXNrYWJsZScsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgY2F0ZWdvcmllczogWydlZHVjYXRpb24nLCAncHJvZHVjdGl2aXR5J10sXG4gICAgICAgIGxhbmc6ICdlbicsXG4gICAgICB9LFxuICAgICAgd29ya2JveDoge1xuICAgICAgICAvLyBDYWNoZSBhbGwgYXNzZXRzIGZyb20gdGhlIGFwcCBzaGVsbFxuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsc3ZnLHBuZyxpY28sd29mZjJ9J10sXG4gICAgICAgIC8vIENhY2hlIERleGllLXNlcnZlZCBkYXRhIGJ5IGRlZmF1bHQgXHUyMDE0IG5vIHJlbW90ZSBBUEkgY2FsbHMgbmVlZGVkIGZvciBQaGFzZSAxXG4gICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLihnb29nbGVhcGlzfGdzdGF0aWMpXFwuY29tXFwvLiovaSxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnZ29vZ2xlLWZvbnRzJyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiAxMCwgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1IH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICAgIC8vIFByZXZlbnQgdGhlIHNlcnZpY2Ugd29ya2VyIGZyb20gc3dhbGxvd2luZyBuYXZpZ2F0aW9uIHRvIGV4dGVybmFsIGxpbmtzXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICdpbmRleC5odG1sJyxcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFja0RlbnlsaXN0OiBbL15cXC9hcGlcXC8vXSxcbiAgICAgIH0sXG4gICAgICBkZXZPcHRpb25zOiB7XG4gICAgICAgIC8vIEVuYWJsZSBTVyBpbiBkZXZlbG9wbWVudCBzbyBvZmZsaW5lIGJlaGF2aW9yIGNhbiBiZSB0ZXN0ZWQgbG9jYWxseVxuICAgICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfSksXG4gIF0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICB9LFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIG9wZW46IHRydWUsXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBdVYsU0FBUyxvQkFBb0I7QUFDcFgsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUN4QixPQUFPLFVBQVU7QUFIakIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsZUFBZSxDQUFDLGtCQUFrQixlQUFlO0FBQUEsTUFDakQsVUFBVTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsV0FBVztBQUFBLFFBQ1gsU0FBUztBQUFBLFFBQ1QsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsUUFDbEIsYUFBYTtBQUFBLFFBQ2IsT0FBTztBQUFBO0FBQUEsVUFFTDtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sU0FBUztBQUFBLFVBQ1g7QUFBQSxRQUNGO0FBQUEsUUFDQSxZQUFZLENBQUMsYUFBYSxjQUFjO0FBQUEsUUFDeEMsTUFBTTtBQUFBLE1BQ1I7QUFBQSxNQUNBLFNBQVM7QUFBQTtBQUFBLFFBRVAsY0FBYyxDQUFDLHNDQUFzQztBQUFBO0FBQUEsUUFFckQsZ0JBQWdCO0FBQUEsVUFDZDtBQUFBLFlBQ0UsWUFBWTtBQUFBLFlBQ1osU0FBUztBQUFBLFlBQ1QsU0FBUztBQUFBLGNBQ1AsV0FBVztBQUFBLGNBQ1gsWUFBWSxFQUFFLFlBQVksSUFBSSxlQUFlLEtBQUssS0FBSyxLQUFLLElBQUk7QUFBQSxZQUNsRTtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUE7QUFBQSxRQUVBLGtCQUFrQjtBQUFBLFFBQ2xCLDBCQUEwQixDQUFDLFVBQVU7QUFBQSxNQUN2QztBQUFBLE1BQ0EsWUFBWTtBQUFBO0FBQUEsUUFFVixTQUFTO0FBQUEsTUFDWDtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
