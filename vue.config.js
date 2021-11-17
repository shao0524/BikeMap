module.exports = {
  publicPath: "./",
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
