import http from "http";

const HOST = "localhost";
const PORT = 3000;
const BASE = `http://${HOST}:${PORT}`;

function doRequest(path, method = "GET", body = null, cookieHeader = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };
    if (cookieHeader) options.headers["Cookie"] = cookieHeader;

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function extractCookies(setCookieHeaders, jar = {}) {
  if (!setCookieHeaders) return jar;
  const arr = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : [setCookieHeaders];
  for (const cookieStr of arr) {
    const [pair] = cookieStr.split(";");
    const [name, ...rest] = pair.split("=");
    jar[name.trim()] = rest.join("=");
  }
  return jar;
}

function jarToHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

(async () => {
  try {
    console.log("Starting auth flow test against", BASE);

    const jar = {};

    console.log("\n1) Signup");
    const signupPayload = {
      fullName: "Test User",
      email: "test+autotest@example.com",
      password: "password123",
    };
    const signup = await doRequest("/api/auth/signup", "POST", signupPayload);
    console.log("Status:", signup.statusCode);
    console.log("Body:", signup.body);
    extractCookies(signup.headers["set-cookie"], jar);
    console.log("Cookies after signup:", jar);

    console.log("\n2) Login");
    const loginPayload = {
      email: "test+autotest@example.com",
      password: "password123",
    };
    const login = await doRequest("/api/auth/login", "POST", loginPayload);
    console.log("Status:", login.statusCode);
    console.log("Body:", login.body);
    extractCookies(login.headers["set-cookie"], jar);
    console.log("Cookies after login:", jar);

    console.log("\n3) Refresh");
    const cookieHeader = jarToHeader(jar);
    const refresh = await doRequest(
      "/api/auth/refresh",
      "POST",
      null,
      cookieHeader
    );
    console.log("Status:", refresh.statusCode);
    console.log("Body:", refresh.body);
    extractCookies(refresh.headers["set-cookie"], jar);
    console.log("Cookies after refresh:", jar);

    console.log("\n4) Logout");
    const logout = await doRequest(
      "/api/auth/logout",
      "POST",
      null,
      jarToHeader(jar)
    );
    console.log("Status:", logout.statusCode);
    console.log("Body:", logout.body);
    console.log("Final cookies:", jar);

    console.log("\nAuth flow test completed");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(2);
  }
})();
