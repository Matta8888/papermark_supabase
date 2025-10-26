import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth";

import { errorhandler } from "@/lib/errorHandler";
// import prisma from "@/lib/prisma"; // Temporarily disabled due to connection issues
import { CustomUser } from "@/lib/types";
import { log } from "@/lib/utils";

import { authOptions } from "../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // GET /api/teams
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const user = session.user as CustomUser;

    try {
      // Temporarily return a mock team until database connection is fixed
      const mockTeam = {
        id: "admin-team-001",
        name: "Admin Team",
        plan: "pro",
        createdAt: new Date(),
        enableExcelAdvancedMode: false,
        replicateDataroomFolders: true,
      };

      return res.status(200).json([mockTeam]);
    } catch (error) {
      log({
        message: `Failed to find team for user: _${user.id}_ \n\n ${error}`,
        type: "error",
      });
      errorhandler(error, res);
    }
  } else if (req.method === "POST") {
    // POST /api/teams
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const { team } = req.body;

    const user = session.user as CustomUser;

    try {
      // Temporarily return a mock team creation
      const mockTeam = {
        id: "admin-team-001",
        name: team || "New Team",
        plan: "free",
        createdAt: new Date(),
        users: [{ userId: user.id, role: "ADMIN" }],
      };

      return res.status(201).json(mockTeam);
    } catch (error) {
      log({
        message: `Failed to create team "${team}" for user: _${user.id}_. \n\n*Error*: \n\n ${error}`,
        type: "error",
      });
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
