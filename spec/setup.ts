import { Pool } from "pg";
import { createTables } from "../src";

export const TEST_DB_NAME = `testdb`;
export let testPool: Pool;

async function createTestDatabase() {
  const { DB_USER, DB_PASSWD, DB_NAME, DB_HOST } = process.env;
  const admin = new Pool({
    connectionString: `postgres://${DB_USER}:${DB_PASSWD}@${DB_HOST}/${DB_NAME}`,
  });

  await admin
    .query(`CREATE DATABASE ${TEST_DB_NAME}`)
    .then(() => console.log(`Created ${TEST_DB_NAME}`))
    .catch((err) => {
      throw new Error(err);
    });
  await admin.end();

  testPool = new Pool({
    connectionString: `postgres://${DB_USER}:${DB_PASSWD}@${DB_HOST}/${TEST_DB_NAME}`,
  });

  return testPool;
}

export async function setupTestEnv() {
  await createTestDatabase();
  await createTables(testPool);
}
