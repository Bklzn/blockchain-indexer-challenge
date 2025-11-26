import { Pool } from "pg";
import { TEST_DB_NAME, testPool } from "./setup";

export async function cleanupData(testName: string) {
  if (testPool) {
    await testPool.query(`DELETE FROM blocks;`);
    await testPool.query(`DELETE FROM transactions;`);
    await testPool.query(`DELETE FROM outputs;`);
    await testPool.query(`DELETE FROM inputs;`);
    console.log("Cleanup data - ", testName);
  }
}

export async function cleanupTestEnv() {
  if (testPool) {
    await testPool.end();
  }
  const { DB_USER, DB_PASSWD, DB_NAME, DB_HOST } = process.env;
  const admin = new Pool({
    connectionString: `postgres://${DB_USER}:${DB_PASSWD}@${DB_HOST}/${DB_NAME}`,
  });

  await admin
    .query(
      `
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${TEST_DB_NAME}'
  `
    )
    .then(() => console.log(`Terminated ${TEST_DB_NAME}`))
    .catch((err) => {
      throw new Error(err);
    });

  await admin
    .query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`)
    .then(() => console.log(`Dropped ${TEST_DB_NAME}`))
    .catch((err) => {
      throw new Error(err);
    });
  await admin.end();
}
