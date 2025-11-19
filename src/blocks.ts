import type { FastifyInstance } from "fastify";
import type { Block, Input, Output, Transaction } from "./schema";
import { createHash } from "crypto";
import { Pool } from "pg";

export default async function blocksRoutes(fastify: FastifyInstance) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const isHeightValid = async (newHeight: number) => {
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

  const isValuesSumEqual = async (tx: Transaction[]) => {
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
      const inputsSum = trackedOutputsValues.reduce(
        (acc, o) => acc + o.value,
        0
      );
      if (outputsSum !== inputsSum) {
        return false;
      }
    }
    return true;
  };

  const isBlockIdValid = async (block: Block) => {
    const hashString =
      block.height.toString() + block.transactions.map((tx) => tx.id).join("");
    const hash = createHash("sha256").update(hashString).digest("hex");
    return hash === block.id;
  };

  fastify.post<{ Body: Block }>("/blocks", async (request, reply) => {
    const block = request.body;
    if (!block) {
      return reply.status(400).send({ error: "Block is required" });
    }
    try {
      const checkHeight = await isHeightValid(block.height);
      if (!checkHeight) {
        return reply.status(400).send({ error: "Invalid height" });
      }
      const checkSums = await isValuesSumEqual(block.transactions);
      if (!checkSums && block.height !== 1) {
        return reply.status(400).send({ error: "Invalid sums" });
      }
      const checkBlockId = await isBlockIdValid(block);
      if (!checkBlockId) {
        return reply.status(400).send({ error: "Invalid block id" });
      }
    } catch (err) {
      console.error(err);
      return reply.status(400).send({ error: "Invalid block" });
    }

    return reply.status(200).send({ status: "ok" });
  });
}
