import Fastify from "fastify";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import blocksRoutes from "./blocks";

const fastify = Fastify({ logger: true });
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

fastify.get("/", async (request, reply) => {
  return { hello: "world" };
});
fastify.register(blocksRoutes);

async function testPostgres(pool: Pool) {
  const id = randomUUID();
  const name = "Satoshi";
  const email = "Nakamoto";

  await pool.query(`DELETE FROM users;`);

  await pool.query(
    `
    INSERT INTO users (id, name, email)
    VALUES ($1, $2, $3);
  `,
    [id, name, email]
  );

  const { rows } = await pool.query(`
    SELECT * FROM users;
  `);

  console.log("USERS", rows);
}

async function createTables(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      height INTEGER NOT NULL UNIQUE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      blockId TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS outputs (
      txId TEXT NOT NULL,
      index INTEGER NOT NULL,
      address TEXT NOT NULL,
      value INTEGER NOT NULL,
      PRIMARY KEY (txId, index),
      FOREIGN KEY (txId) REFERENCES transactions(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inputs (
      id SERIAL PRIMARY KEY,
      txId TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      prevTxId TEXT NOT NULL,
      prevIndex INTEGER NOT NULL,
      FOREIGN KEY (prevTxId, prevIndex) REFERENCES outputs(txId, index)
    );
  `);
}

async function bootstrap() {
  console.log("Bootstrapping...");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  await createTables(pool);
  await testPostgres(pool);
}

try {
  await bootstrap();
  await fastify.listen({
    port: 3000,
    host: "0.0.0.0",
  });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
