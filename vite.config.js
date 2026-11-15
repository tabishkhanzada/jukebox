// vite.config.js — build settings for the static site and the vitest test runner.
// base './' makes the built site work from any folder (GitHub Pages, Netlify).
// The small plugin preloads the 4 Latin font files used on the first screen, so text does not jump when fonts load.
import { defineConfig } from 'vite';

const preloadFonts = {
  name: 'preload-fonts',
  transformIndexHtml(html, ctx) {
    if (!ctx.bundle) return html; // dev server: nothing to do
    const want = /(inter-latin-(400|600)|space-grotesk-latin-(500|700))-normal-[\w-]+\.woff2$/;
    const tags = Object.keys(ctx.bundle).filter((f) => want.test(f)).map((f) => ({
      tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: './' + f, crossorigin: '' }, injectTo: 'head',
    }));
    return tags;
  },
};

export default defineConfig({
  base: './',
  plugins: [preloadFonts],
  test: { include: ['tests/**/*.test.js'], testTimeout: 120000, hookTimeout: 180000, passWithNoTests: true },
});
