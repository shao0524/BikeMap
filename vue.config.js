module.exports = {
  publicPath: "./",
  pages: {
    index: {
      entry: "src/main.js",
      template: "public/index.html",
      filename: "index.html",
      title: "自行車租借站與車道地圖",
    },
  },
  configureWebpack: {
    resolve: {
      alias: {
        node: "/node_modules",
        image: "@/assets/image",
        helper: "@/assets/helper",
        scss: "@/assets/scss",
      },
    },
  },
};
