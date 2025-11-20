import { expect, test } from "bun:test";
import type { Block, Transaction } from "../src/schema";
import { createHash } from "crypto";
import { isBlockIdValid, isValuesSumEqual, isHeightValid } from "../src/utils";
import { testPool } from "./setup";

test("test isHeightValid()", async () => {
  let height = 1;
  const validHeight = await isHeightValid(height, testPool);
  expect(validHeight).toBe(true);
  await testPool
    .query(`INSERT INTO blocks (id,height) VALUES ('block1',1);`)
    .catch((err) => {
      throw new Error(err);
    });
  const invalidHeight = await isHeightValid(height, testPool);
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
  await testPool
    .query(
      `
    INSERT INTO blocks (id,height) VALUES ('block2',2);
    INSERT INTO transactions (id, blockid) VALUES ('tx1', 'block2');
    INSERT INTO outputs (txid,index,address,value) VALUES ('tx1',0,'addr1',100);
    `
    )
    .catch((err) => {
      throw new Error(err);
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

// test("test /blocks", async () => {});
