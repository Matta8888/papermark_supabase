import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { documentDownloadService } from '@/lib/services/document-download'
import { CustomUser } from '@/lib/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { documentId, linkId } = req.query as {
    documentId: string
    linkId?: string
  }

  if (!documentId) {
    return res.status(400).json({ error: 'Document ID is required' })
  }

  try {
    // Get user session (optional for public links)
    const session = await getServerSession(req, res, authOptions)
    const userId = session ? (session.user as CustomUser).id : undefined

    // Check document access
    const hasAccess = await documentDownloadService.checkDocumentAccess(
      documentId,
      userId,
      linkId
    )

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Stream the document
    await documentDownloadService.streamDocument(
      documentId,
      req,
      res,
      {
        signedUrl: true, // Use signed URLs for better security
        expiresIn: 3600 // 1 hour expiration
      }
    )
  } catch (error) {
    console.error('Document download API error:', error)
    res.status(500).json({ error: 'Failed to download document' })
  }
}
