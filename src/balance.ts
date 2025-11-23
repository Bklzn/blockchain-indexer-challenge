import type { FastifyInstance } from "fastify";
import { Pool } from "pg";

export default async function balanceRoutes(
  fastify: FastifyInstance,
  opts: { pool: Pool }
) {
  const pool = opts.pool;
  fastify.get("/balance/:address", async (request, reply) => {
    try {
      const address = (request.params as { address: string }).address;
      if (!address) {
        return reply.code(400).send({ error: "Missing address" });
      }
      const { rows } = await pool
        .query<{ balance: string }>(
          `
        SELECT COALESCE(SUM(o.value), 0) AS balance
        FROM outputs o
        WHERE o.address = $1
          AND NOT EXISTS (
            SELECT 1
            FROM inputs i
            WHERE i.prevtxid = o.txid
              AND i.previndex = o.index
          )`,
          [address]
        )
        .catch((err) => {
          console.error(err);
          return reply.code(400).send({ error: "Invalid query" });
        });
      return reply.code(200).send({ balance: rows[0].balance });
    } catch (err) {
      console.error(err);
      return reply.code(400).send({ error: "Invalid address" });
    }
  });
}
