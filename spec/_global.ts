import { setupTestEnv, testPool } from "./setup";
import { cleanupTestEnv } from "./cleanup";
import { beforeAll, afterAll } from "bun:test";
import Fastify, { type FastifyInstance } from "fastify";
import blocksRoutes from "../src/blocks";
import balanceRoutes from "../src/balance";
import { rollbackRoute } from "../src/rollback";

let server: FastifyInstance;
async function startServer() {
  server = Fastify();
  await server.register(blocksRoutes, { pool: testPool });
  await server.register(balanceRoutes, { pool: testPool });
  await server.register(rollbackRoute, { pool: testPool });
  await server.listen({
    port: 3001,
    host: "0.0.0.0",
  });
}

beforeAll(async () => {
  await setupTestEnv();
  await startServer();
});

afterAll(async () => {
  await cleanupTestEnv();
  await server.close();
});
