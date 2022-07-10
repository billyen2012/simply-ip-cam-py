const express = require("express");
const fs = require("fs");
const { createProxyMiddleware } = require("http-proxy-middleware");
const app = express();

let target = null;
const getTarget = () => target;

const wsProxy = createProxyMiddleware({
  changeOrigin: false,
  target,
  secure: false,
  ws: true,
  router: () => {
    return target;
  },
});

app.post("/target-ip", express.json(), (req, res) => {
  const { ip } = req.body;
  console.log(ip);
  if (!ip) return res.send("ip is not defiend");
  target = `https://${ip}:3000`;
  console.log(target);
  res.status(200).send("OK");
});

// wait for target ip be updated from the proxy target
app.use((req, res, next) => {
  console.log("target:", getTarget());
  if (!target)
    return res.status(200).send("Waiting for target ip be available");
  next();
});

app.use(wsProxy);

app.listen(process.env.PORT || 5001);
