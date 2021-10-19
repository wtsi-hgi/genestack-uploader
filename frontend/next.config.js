var host = process.env.NEXT_PUBLIC_HOST.split("/")

module.exports = {
  reactStrictMode: false,
  basePath: "/" + host[host.length - 1]
}
