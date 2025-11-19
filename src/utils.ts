import type { Block, Input, Output, Transaction } from "./schema";
import { createHash } from "crypto";
import { pool } from "./index";

export const isHeightValid = async (newHeight: number) => {
  let height = 0;
  await pool
    .query<Block>(`SELECT height FROM blocks ORDER BY height DESC LIMIT 1;`)
    .then((res) => {
      height = res.rows[0] ? res.rows[0].height : 0;
    })
    .catch((err) => {
      throw new Error(err);
    });
  return newHeight === height + 1;
};

export const isValuesSumEqual = async (tx: Transaction[]) => {
  for (const t of tx) {
    const outputs: Output[] = t.outputs;
    const inputs: Input[] = t.inputs;
    const outputsSum = outputs.reduce((acc, output) => acc + output.value, 0);
    const prevTxIds = inputs.map((i) => i.txId);
    const prevIndexes = inputs.map((i) => i.index);
    const trackedOutputsValues = await pool
      .query<{ value: Output["value"] }>(
        `SELECT o.value 
          FROM unnest($1::text[], $2::int[]) 
          AS u(txId, idx) 
          JOIN outputs o 
          ON o.txId = u.txId AND o.index = u.idx;`,
        [prevTxIds, prevIndexes]
      )
      .then((res) => res.rows)
      .catch((err) => {
        throw new Error(err);
      });
    const inputsSum = trackedOutputsValues.reduce((acc, o) => acc + o.value, 0);
    if (outputsSum !== inputsSum) {
      return false;
    }
  }
  return true;
};

export const isBlockIdValid = async (block: Block) => {
  const hashString =
    block.height.toString() + block.transactions.map((tx) => tx.id).join("");
  const hash = createHash("sha256").update(hashString).digest("hex");
  return hash === block.id;
};
