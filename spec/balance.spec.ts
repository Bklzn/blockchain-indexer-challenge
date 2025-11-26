import { afterAll, beforeAll, expect, test } from "bun:test";
import { cleanupData } from "./cleanup";
import { testPool } from "./setup";

beforeAll(async () => {
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
      INSERT INTO inputs (txid, previndex, prevtxid)
      VALUES 
      ('tx3',0,'tx1'),
      ('tx3',0,'tx2')
      `
    )
    .catch((err) => {
      throw new Error(err);
    });
  console.log("Setup data - balance");
});
afterAll(async () => {
  await cleanupData("balance");
});

test("test /balance/:address", async () => {
  const res1 = await fetch("http://localhost:3001/balance/addr1");
  const res2 = await fetch("http://localhost:3001/balance/addr2");
  const res3 = await fetch("http://localhost:3001/balance/nonExistingAddr");
  const dat1 = await res1.json();
  const dat2 = await res2.json();
  const dat3 = await res3.json();
  expect(res1.status).toBe(200);
  expect(res2.status).toBe(200);
  expect(res3.status).toBe(200);
  expect(dat1.balance).toBe("50");
  expect(dat2.balance).toBe("80");
  expect(dat3.balance).toBe("0");
});
