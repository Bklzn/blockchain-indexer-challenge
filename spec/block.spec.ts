import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Block, Transaction } from "../src/schema";
import { createHash } from "crypto";
import { isBlockIdValid, isValuesSumEqual, isHeightValid } from "../src/utils";
import { testPool } from "./setup";
import { cleanupData } from "./cleanup";

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
  console.log("Setup data - block");
});

afterAll(async () => {
  await cleanupData("block");
});

test("test isHeightValid()", async () => {
  const validHeight = await isHeightValid(3, testPool);
  expect(validHeight).toBe(true);
  const invalidHeight = await isHeightValid(2, testPool);
  expect(invalidHeight).toBe(false);
});

test("test isValuesSumEqual()", async () => {
  const tx1: Transaction = { id: "tx1", inputs: [], outputs: [] };
  const tx2: Transaction = { id: "tx2", inputs: [], outputs: [] };
  const tx3: Transaction = { id: "tx3", inputs: [], outputs: [] };
  const block: Block = {
    id: "block1",
    height: 1,
    transactions: [tx1, tx2, tx3],
  };
  const validSums = await isValuesSumEqual(block.transactions, testPool);
  expect(validSums).toBe(true);
  block.transactions.push({
    id: "tx4",
    inputs: [{ txId: "tx1", index: 0 }],
    outputs: [],
  });
  const invalidSums = await isValuesSumEqual(block.transactions, testPool);
  expect(invalidSums).toBe(false);
});

test("test isBlockIdValid()", async () => {
  const tx1: Transaction = { id: "tx1", inputs: [], outputs: [] };
  const tx2: Transaction = { id: "tx2", inputs: [], outputs: [] };
  const tx3: Transaction = { id: "tx3", inputs: [], outputs: [] };
  const sourceHash =
    String(1) + String(tx1.id) + String(tx2.id) + String(tx3.id);
  const block: Block = {
    id: createHash("sha256").update(sourceHash).digest("hex"),
    height: 1,
    transactions: [tx1, tx2, tx3],
  };
  const validBlockId = await isBlockIdValid(block);
  expect(validBlockId).toBe(true);

  block.id = "block2";
  const invalidBlockId = await isBlockIdValid(block);
  expect(invalidBlockId).toBe(false);
});

test("test /blocks", async () => {
  const height = 3;
  const transactions: Transaction[] = [
    {
      id: "tx4",
      inputs: [
        {
          txId: "tx3",
          index: 1,
        },
      ],
      outputs: [
        {
          address: "addr5",
          value: 15,
        },
        {
          address: "addr2",
          value: 25,
        },
      ],
    },
  ];
  const hashString =
    height.toString() + transactions.map((tx) => tx.id).join("");
  const testBlock__valid: Block = {
    id: createHash("sha256").update(hashString).digest("hex"),
    height,
    transactions,
  };
  const testBlock__invalidHeight: Block = {
    id: createHash("sha256").update(hashString).digest("hex"),
    height: 10,
    transactions,
  };
  const testBlock__invalidId: Block = {
    id: "block2",
    height: height + 1,
    transactions,
  };
  const invalidTransaction = structuredClone(transactions);
  invalidTransaction[0].outputs[0].value = 10;
  const testBlock__invalidSums: Block = {
    id: createHash("sha256").update(hashString).digest("hex"),
    height: height + 1,
    transactions: invalidTransaction,
  };

  const res = await fetch("http://localhost:3001/blocks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(testBlock__valid),
  });
  const res_invalidHeight = await fetch("http://localhost:3001/blocks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(testBlock__invalidHeight),
  });
  const res_invalidId = await fetch("http://localhost:3001/blocks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(testBlock__invalidId),
  });
  const res_invalidSums = await fetch("http://localhost:3001/blocks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(testBlock__invalidSums),
  });
  if (res.status !== 200) {
    console.log(await res.text());
  }
  expect(res.status).toBe(200);

  expect(res_invalidHeight.status).toBe(400);
  expect(JSON.parse(await res_invalidHeight.text()).error).toBe(
    "Invalid height"
  );

  expect(res_invalidId.status).toBe(400);
  expect(JSON.parse(await res_invalidId.text()).error).toBe("Invalid block id");

  expect(res_invalidSums.status).toBe(400);
  expect(JSON.parse(await res_invalidSums.text()).error).toBe("Invalid sums");
});
