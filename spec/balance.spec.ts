import { expect, test } from "bun:test";

test("test /balance/:address", async () => {
  const res1 = await fetch("http://localhost:3001/balance/addr1");
  const res2 = await fetch("http://localhost:3001/balance/addr2");
  const res3 = await fetch("http://localhost:3001/balance/nonExistingAddr");
  const dat1 = await res1.json();
  const dat2 = await res2.json();
  const dat3 = await res3.json();
  expect(res1.status).toBe(200);
  expect(res2.status).toBe(200);
  expect(res3.status).toBe(200);
  expect(dat1.balance).toBe("50");
  expect(dat2.balance).toBe("80");
  expect(dat3.balance).toBe("0");
});
