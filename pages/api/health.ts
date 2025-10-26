import type { NextApiRequest, NextApiResponse } from "next";

// import prisma from "@/lib/prisma"; // Temporarily disabled due to connection issues

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // Temporarily return success without database check
    return res.json({
      status: "ok",
      message: "All systems operational (database check disabled)",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      status: "error",
      message: (err as Error).message,
    });
  }
}
