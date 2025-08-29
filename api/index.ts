// api/index.ts
import serverless from "serverless-http";
import { createServer } from "../server";

const app = createServer();

export default async function handler(req: any, res: any) {
  const wrapped = serverless(app);
  // @ts-ignore
  return wrapped(req, res);
}
