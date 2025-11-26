import { afterAll, beforeAll, expect, test } from "bun:test";
import { cleanupData } from "./cleanup";
import { testPool } from "./setup";
import type { Block, Transaction } from "../src/schema";
import { createHash } from "crypto";

const checkDeletedData: () => Promise<Transaction> = async () =>
  await testPool
    .query<Transaction>(`SELECT * FROM transactions WHERE id = 'tx3'`)
    .then((res) => res.rows[0])
    .catch((err) => {
      throw new Error(err);
    });

beforeAll(async () => {
  const block1Height = 1;
  const block1Transactions: Transaction[] = [
    {
      id: "tx1",
      inputs: [],
      outputs: [
        {
          address: "addr1",
          value: 10,
        },
      ],
    },
  ];
  const block1HashString =
    String(block1Height) + block1Transactions.map((tx) => tx.id).join("");

  const block2Height = 2;
  const block2Transactions: Transaction[] = [
    {
      id: "tx2",
      inputs: [
        {
          txId: "tx1",
          index: 0,
        },
      ],
      outputs: [
        {
          address: "addr2",
          value: 4,
        },
        {
          address: "addr3",
          value: 6,
        },
      ],
    },
  ];
  const block2HashString =
    String(block2Height) + block2Transactions.map((tx) => tx.id).join("");
  const block3Height = 3;
  const block3Transactions: Transaction[] = [
    {
      id: "tx3",
      inputs: [
        {
          txId: "tx2",
          index: 1,
        },
      ],
      outputs: [
        {
          address: "addr4",
          value: 2,
        },
        {
          address: "addr5",
          value: 2,
        },
        {
          address: "addr6",
          value: 2,
        },
      ],
    },
  ];
  const block3HashString =
    String(block3Height) + block3Transactions.map((tx) => tx.id).join("");

  const res = await fetch("http://localhost:3001/blocks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: createHash("sha256").update(block1HashString).digest("hex"),
      height: block1Height,
      transactions: block1Transactions,
    }),
  });
  const res2 = await fetch("http://localhost:3001/blocks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: createHash("sha256").update(block2HashString).digest("hex"),
      height: block2Height,
      transactions: block2Transactions,
    }),
  });
  const res3 = await fetch("http://localhost:3001/blocks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: createHash("sha256").update(block3HashString).digest("hex"),
      height: block3Height,
      transactions: block3Transactions,
    }),
  });

  if (res.status !== 200 || res2.status !== 200 || res3.status !== 200) {
    console.log(await res.text());
    console.log(await res2.text());
    console.log(await res3.text());
    throw new Error("Failed to setup data");
  } else console.log("Setup data - rollback");
});
afterAll(async () => {
  await cleanupData("rollback");
});

test("test /rollback?height=2", async () => {
  const checkDataBeforeDelete = await checkDeletedData();
  expect(checkDataBeforeDelete).toBeDefined();
  const res = await fetch("http://localhost:3001/rollback?height=2");
  expect(res.status).toBe(200);

  const blocks = await testPool
    .query<Block>(`SELECT * FROM blocks ORDER BY height DESC;`)
    .then((res) => res.rows)
    .catch((err) => {
      throw new Error(err);
    });
  expect(blocks[0].height).toBe(2);

  const dataAfterRollback = await checkDeletedData();
  expect(dataAfterRollback).toBeUndefined();
});
