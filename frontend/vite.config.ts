import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: path.resolve(__dirname, '..', 'public'),
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        cart: path.resolve(__dirname, 'cart.html'),
        blog: path.resolve(__dirname, 'blog.html'),
        post: path.resolve(__dirname, 'post.html'),
        tracking: path.resolve(__dirname, 'tracking.html'),
        checkout: path.resolve(__dirname, 'checkout.html'),
        product: path.resolve(__dirname, 'product.html'),
        login: path.resolve(__dirname, 'login.html'),
        register: path.resolve(__dirname, 'register.html'),
        account: path.resolve(__dirname, 'account.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/admin': 'http://localhost:3001',
      '/sw.js': 'http://localhost:3001',
    },
  },
});
