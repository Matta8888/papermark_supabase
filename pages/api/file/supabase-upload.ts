import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import formidable from "formidable";
import fs from "fs";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { storageService } from "@/lib/storage/supabase-storage";
import { getPagesCount } from "@/lib/utils/get-page-number-count";
import { CustomUser } from "@/lib/types";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = session.user as CustomUser;
    const { teamId } = req.query as { teamId: string };

    if (!teamId) {
      return res.status(400).json({ error: "Team ID is required" });
    }

    // Parse the form data
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // 100MB limit
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = file.originalFilename || "unknown";
    const contentType = file.mimetype || "application/octet-stream";

    // Create a File-like object for the storage service
    const fileObj = new File([fileBuffer], fileName, { type: contentType });

    // Generate unique file path
    const filePath = storageService.generateFilePath(fileName, teamId);

    // Upload file to Supabase Storage
    const uploadResult = await storageService.uploadFile(fileObj, filePath, {
      makePublic: true,
    });

    // Get page count for PDFs
    let numPages = 1;
    if (contentType === "application/pdf") {
      try {
        numPages = await getPagesCount(fileBuffer.buffer);
      } catch (error) {
        console.warn("Failed to get PDF page count:", error);
        // Default to 1 page if PDF processing fails
        numPages = 1;
      }
    }

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      success: true,
      data: {
        path: uploadResult.path,
        publicUrl: uploadResult.publicUrl,
        fileName: fileName,
        contentType: contentType,
        fileSize: fileBuffer.length,
        numPages: numPages,
      },
    });

  } catch (error) {
    console.error("Supabase upload error:", error);
    return res.status(500).json({ 
      error: "Upload failed", 
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}
