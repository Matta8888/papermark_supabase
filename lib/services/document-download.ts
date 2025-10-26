import { NextApiRequest, NextApiResponse } from 'next'
import { storageService } from '@/lib/storage/supabase-storage'
import prisma from '@/lib/prisma'

export interface DocumentDownloadOptions {
  signedUrl?: boolean
  expiresIn?: number
}

export class DocumentDownloadService {
  /**
   * Get document download URL with access checks
   */
  async getDocumentUrl(
    documentId: string,
    options: DocumentDownloadOptions = {}
  ): Promise<{ url: string; filename: string; contentType: string }> {
    const { signedUrl = false, expiresIn = 3600 } = options

    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        name: true,
        file: true,
        type: true,
        storageType: true,
        teamId: true,
        team: {
          select: {
            name: true
          }
        }
      }
    })

    if (!document) {
      throw new Error('Document not found')
    }

    // Check if document is stored in Supabase
    if (document.storageType === 'S3_PATH' && document.file.startsWith('documents/')) {
      try {
        let url: string
        
        if (signedUrl) {
          // Create signed URL for private access
          url = await storageService.createSignedUrl(document.file, expiresIn)
        } else {
          // Get public URL
          const { data } = await import('@supabase/supabase-js').then(m => 
            m.createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )
          )
          const { data: publicData } = data.storage
            .from('documents')
            .getPublicUrl(document.file)
          url = publicData.publicUrl
        }

        return {
          url,
          filename: document.name,
          contentType: this.getContentType(document.type || 'application/pdf')
        }
      } catch (error) {
        console.error('Error getting Supabase document URL:', error)
        throw new Error('Failed to get document URL')
      }
    }

    // Fallback for other storage types
    return {
      url: document.file,
      filename: document.name,
      contentType: this.getContentType(document.type || 'application/pdf')
    }
  }

  /**
   * Stream document download with proper headers
   */
  async streamDocument(
    documentId: string,
    req: NextApiRequest,
    res: NextApiResponse,
    options: DocumentDownloadOptions = {}
  ): Promise<void> {
    try {
      const { url, filename, contentType } = await this.getDocumentUrl(
        documentId,
        options
      )

      // Set appropriate headers
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Cache-Control', 'public, max-age=3600')

      // For Supabase URLs, redirect to the signed/public URL
      if (url.startsWith('http')) {
        res.redirect(302, url)
        return
      }

      // For local files or other storage, handle differently
      res.status(404).json({ error: 'Document not accessible' })
    } catch (error) {
      console.error('Document download error:', error)
      res.status(500).json({ error: 'Failed to download document' })
    }
  }

  /**
   * Check if user has access to document
   */
  async checkDocumentAccess(
    documentId: string,
    userId?: string,
    linkId?: string
  ): Promise<boolean> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          teamId: true,
          team: {
            select: {
              users: {
                select: { userId: true }
              }
            }
          },
          links: {
            select: { id: true }
          }
        }
      })

      if (!document) {
        return false
      }

      // Check if user is team member
      if (userId) {
        const isTeamMember = document.team.users.some(
          user => user.userId === userId
        )
        if (isTeamMember) {
          return true
        }
      }

      // Check if document is accessible via link
      if (linkId) {
        const isAccessibleViaLink = document.links.some(
          link => link.id === linkId
        )
        if (isAccessibleViaLink) {
          return true
        }
      }

      return false
    } catch (error) {
      console.error('Document access check error:', error)
      return false
    }
  }

  /**
   * Get content type from file type
   */
  private getContentType(fileType: string): string {
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      zip: 'application/zip'
    }

    return mimeTypes[fileType.toLowerCase()] || 'application/octet-stream'
  }
}

// Export singleton instance
export const documentDownloadService = new DocumentDownloadService()
