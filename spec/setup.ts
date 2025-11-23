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

async function createTestData() {
  await testPool
    .query(
      `
    INSERT INTO blocks (id,height) 
    VALUES ('block1',1), ('block2',2);
    `
    )
    .catch((err) => {
      throw new Error(err);
    });
  await testPool
    .query(
      `
      INSERT INTO transactions (id, blockid)
      VALUES ('tx1','block1'), ('tx2','block1'), ('tx3','block2')`
    )
    .catch((err) => {
      throw new Error(err);
    });
  await testPool
    .query(
      `
    INSERT INTO outputs (txid,index,address,value)
    VALUES 
    ('tx1',0,'addr1',90),
    ('tx1',1,'addr2',80), 
    ('tx2',0,'addr3',70), 
    ('tx2',1,'addr4',60),
    ('tx3',0,'addr1',50),
    ('tx3',1,'addr3',40)
    `
    )
    .catch((err) => {
      throw new Error(err);
    });
  await testPool
    .query(
      `
    INSERT INTO inputs (id, txid, previndex, prevtxid)
    VALUES 
    (0,'tx3',0,'tx1'),
    (1,'tx3',0,'tx2')
    `
    )
    .catch((err) => {
      throw new Error(err);
    });
}

export async function setupTestEnv() {
  await createTestDatabase();
  await createTables(testPool);
  await createTestData();
}
