import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        welcome: resolve(__dirname, "index.html"),
        second: resolve(__dirname, "second.html"),
        third: resolve(__dirname, "third.html"),
        fourth: resolve(__dirname, "fourth.html"),
        fifth: resolve(__dirname, "fifth.html"),
        courses: resolve(__dirname, "courses.html"),
        customization: resolve(__dirname, "customization.html"),
        profile: resolve(__dirname, "profile.html"),
        settings: resolve(__dirname, "settings.html"),
        audio: resolve(__dirname, "audio.html"),
        translation: resolve(__dirname, "translation.html"),
        authCallback: resolve(__dirname, "auth-callback.html"),
        exerciseWord: resolve(__dirname, "exercise-word.html"),
        exerciseSpeak: resolve(__dirname, "exercise-speak.html"),
        exerciseGap: resolve(__dirname, "exercise-gap.html"),
        exerciseBuild: resolve(__dirname, "exercise-build.html"),
        exerciseMatch: resolve(__dirname, "exercise-match.html"),
        premiumHome: resolve(__dirname, "premium-home.html"),
      },
    },
  },
});
