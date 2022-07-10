import "dotenv/config";
import { publicIpv4 } from "public-ip";
import fetch from "node-fetch";

const PROXY_SERVICE_URL = process.env.PROXY_SERVICE_URL;
const UPDATE_INTERVAL = process.env.UPDATE_INTERVAL || 60 * 60 * 1000;

if (!PROXY_SERVICE_URL) {
  console.log(
    "\x1b[31mError: PROXY_SERVICE_URL is not deifned in the .env\x1b[0m"
  );
  process.exit(0);
}

const updateProxyIp = async () => {
  const IpV4 = await publicIpv4();
  const result = await fetch(`${PROXY_SERVICE_URL}/target-ip`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ip: IpV4,
    }),
  }).catch((err) => {
    if (err.message.includes("ECONNREFUSED")) {
      return { error: "ECONNREFUSED" };
    }
  });
  return result;
};

const serviceStart = async () => {
  console.log("\x1b[33mService Started\x1b[0m");
  console.log(`\x1b[33mUpdate Interval is: ${UPDATE_INTERVAL}s  \x1b[0m`);
  console.log("Proxy Server Url is: \x1b[34m", PROXY_SERVICE_URL, "\x1b[0m");
  // initial update right after service start
  const initialUpdateResponse = await updateProxyIp();
  console.log("waiting for initial update");

  // if connection is refused, give error message but not breaking the app to allow app to
  // try again in next cycle
  if (initialUpdateResponse.error === "ECONNREFUSED") {
    console.log(
      `\x1b[31mError: ${PROXY_SERVICE_URL} refused to connect, please check if the proxy service is alive \x1b[0m`
    );
    console.log("\x1b[33mwill try again during next cycle\x1b[0m");
  }
  // check if status code is 200, if not, exit the app
  else if (initialUpdateResponse.status == 200) {
    console.log("initial ip update success");
  } else {
    console.log(
      `\x1b[31mError: Initial ip update failed, received status code ${initialUpdateResponse}, please check if the Proxy Service is working properly \x1b[0m`
    );
    process.exit(0);
  }
  setInterval(updateProxyIp, UPDATE_INTERVAL);
  console.log("Service Initialization Complete");
};

serviceStart();
