import type { FastifyInstance } from "fastify";
import type { Block } from "./schema";
import { isBlockIdValid, isHeightValid, isValuesSumEqual } from "./utils";
import { Pool } from "pg";

export default async function blocksRoutes(fastify: FastifyInstance) {
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
