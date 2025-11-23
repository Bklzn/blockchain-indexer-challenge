import type { FastifyInstance } from "fastify";
import type { Block } from "./schema";
import { isBlockIdValid, isHeightValid, isValuesSumEqual } from "./utils";
import { Pool } from "pg";

export default async function blocksRoutes(
  fastify: FastifyInstance,
  opts: { pool: Pool }
) {
  const pool = opts.pool;
  const saveBlock = async (block: Block, errCallback: (err: any) => void) => {
    await pool.query("BEGIN");
    await pool
      .query("INSERT INTO blocks (id, height) VALUES ($1, $2)", [
        block.id,
        block.height,
      ])
      .catch(errCallback);
    for (const tx of block.transactions) {
      await pool
        .query("INSERT INTO transactions (id, blockid) VALUES ($1, $2)", [
          tx.id,
          block.id,
        ])
        .catch(errCallback);
      for (let i = 0; i < tx.outputs.length; i++) {
        await pool
          .query(
            "INSERT INTO outputs (txid, index, address, value) VALUES ($1, $2, $3, $4)",
            [tx.id, i, tx.outputs[i].address, tx.outputs[i].value]
          )
          .catch(errCallback);
      }
      for (const input of tx.inputs) {
        await pool
          .query(
            "INSERT INTO inputs (txid, prevtxid, previndex) VALUES ($1, $2, $3)",
            [tx.id, input.txId, input.index]
          )
          .catch(errCallback);
      }
    }
    await pool.query("COMMIT").catch(errCallback);
    return true;
  };
  fastify.post<{ Body: Block }>("/blocks", async (request, reply) => {
    const block = request.body;
    if (!block) {
      return reply.status(400).send({ error: "Block is required" });
    }
    try {
      const checkHeight = await isHeightValid(block.height, pool);
      if (!checkHeight) {
        return reply.status(400).send({ error: "Invalid height" });
      }
      const checkSums = await isValuesSumEqual(block.transactions, pool);
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

    try {
      await saveBlock(block, (err) => {
        reply.status(400).send({ error: "Invalid query" });
        throw new Error(err);
      });
      return reply.status(200).send({ message: "Block saved" });
    } catch (err) {
      console.error(err);
      return reply.status(400).send({ error: "Invalid block" });
    }
  });
}
