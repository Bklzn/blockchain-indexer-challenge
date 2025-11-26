import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";

export async function rollbackRoute(
  fastify: FastifyInstance,
  opts: { pool: Pool }
) {
  const pool = opts.pool;
  fastify.post("/rollback", async (request, reply) => {
    const { height } = request.query as { height: string };
    if (!height) return reply.code(400).send({ error: "Missing height" });
    try {
      await pool
        .query(`DELETE FROM blocks WHERE height > $1;`, [height])
        .catch((err) => {
          throw new Error(err);
        });
    } catch (err) {
      console.error(err);
      return reply.code(400).send({ error: "Invalid query" });
    }
    return reply.code(200).send({ detail: "Rollback success" });
  });
}
