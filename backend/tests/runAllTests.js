import utilsTest from "./utils.test.js";

(async () => {
  try {
    await utilsTest();
    console.log("\nAll tests passed");
    process.exit(0);
  } catch (err) {
    console.error("\nTests failed:", err);
    process.exit(2);
  }
})();
