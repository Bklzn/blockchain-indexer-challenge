import { expect, test } from "bun:test";
import type { Block, Transaction } from "../src/schema";
import { createHash } from "crypto";
import { isBlockIdValid, isValuesSumEqual, isHeightValid } from "../src/utils";

test("test isHeightValid()", async () => {
  let height = 1;
  const validHeight = await isHeightValid(height);
  expect(validHeight).toBe(true);
  height = 2;
  const invalidHeight = await isHeightValid(height);
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
  const validSums = await isValuesSumEqual(block.transactions);
  expect(validSums).toBe(true);

  const invalidBlock = { ...block, height: 2 };
  invalidBlock.transactions.push({
    id: "tx4",
    inputs: [],
    outputs: [{ address: "addr1", value: 1 }],
  });
  const invalidSums = await isValuesSumEqual(invalidBlock.transactions);
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

test("test /blocks", async () => {});
