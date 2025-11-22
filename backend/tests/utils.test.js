import assert from "assert";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../src/lib/utils.js";

export default async function run() {
  console.log("Running utils tests...");

  // createAccessToken
  const token = createAccessToken("user123", {
    secret: "testsecret",
    expiresIn: "1h",
  });
  assert(
    typeof token === "string" && token.length > 0,
    "createAccessToken should return a token string"
  );

  // refresh tokens
  const r1 = createRefreshToken();
  const r2 = createRefreshToken();
  assert(r1 !== r2, "createRefreshToken should return unique tokens");

  const h = hashToken(r1);
  assert(
    typeof h === "string" && h.length > 0,
    "hashToken should return a string"
  );

  // cookie helpers with mock res
  const mockRes = {
    cookies: {},
    cookie(name, value, opts) {
      this.cookies[name] = { value, opts };
    },
    clearCookie(name) {
      delete this.cookies[name];
    },
  };

  setAccessTokenCookie(mockRes, "access-token-123", {
    name: "jwt_test",
    maxAge: 1000,
  });
  assert(
    mockRes.cookies["jwt_test"] &&
      mockRes.cookies["jwt_test"].value === "access-token-123",
    "setAccessTokenCookie should set a cookie"
  );

  setRefreshTokenCookie(mockRes, "refresh-token-123", {
    name: "refresh_test",
    maxAge: 2000,
  });
  assert(
    mockRes.cookies["refresh_test"] &&
      mockRes.cookies["refresh_test"].value === "refresh-token-123",
    "setRefreshTokenCookie should set a cookie"
  );

  clearRefreshTokenCookie(mockRes, { name: "refresh_test" });
  assert(
    !mockRes.cookies["refresh_test"],
    "clearRefreshTokenCookie should clear the cookie"
  );

  console.log("utils tests passed");
}
