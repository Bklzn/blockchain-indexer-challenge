import { setupTestEnv } from "./setup";
import { cleanupTestEnv } from "./cleanup";
import { beforeAll, afterAll } from "bun:test";

beforeAll(async () => {
  await setupTestEnv();
});

afterAll(async () => {
  await cleanupTestEnv();
});
