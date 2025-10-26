import { supabaseAdmin, DOCUMENTS_BUCKET } from '@/lib/supabase'

export interface UploadResult {
  path: string
  publicUrl: string
  signedUrl?: string
}

export interface UploadOptions {
  bucket?: string
  makePublic?: boolean
  expiresIn?: number
}

export class SupabaseStorageService {
  private bucket: string

  constructor(bucket: string = DOCUMENTS_BUCKET) {
    this.bucket = bucket
  }

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    file: File | Buffer,
    path: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized. Check environment variables.')
    }

    const { bucket = this.bucket, makePublic = true } = options

    try {
      // Upload the file
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(path, file, {
          upsert: true,
          contentType: this.getContentType(path)
        })

      if (error) {
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: publicData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(data.path)

      const result: UploadResult = {
        path: data.path,
        publicUrl: publicData.publicUrl
      }

      // Create signed URL if not public
      if (!makePublic && options.expiresIn) {
        result.signedUrl = await this.createSignedUrl(data.path, options.expiresIn)
      }

      return result
    } catch (error) {
      console.error('Supabase upload error:', error)
      throw error
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(path: string, bucket: string = this.bucket): Promise<void> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized. Check environment variables.')
    }

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path])

    if (error) {
      throw new Error(`Delete failed: ${error.message}`)
    }
  }

  /**
   * Create a signed URL for private file access
   */
  async createSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized. Check environment variables.')
    }

    const { data, error } = await supabaseAdmin.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    return data.signedUrl
  }

  /**
   * Get file metadata
   */
  async getFileInfo(path: string, bucket: string = this.bucket) {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized. Check environment variables.')
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        search: path.split('/').pop()
      })

    if (error) {
      throw new Error(`Failed to get file info: ${error.message}`)
    }

    return data[0]
  }

  /**
   * Generate a unique file path
   */
  generateFilePath(originalName: string, userId: string): string {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const extension = originalName.split('.').pop()
    return `${userId}/${timestamp}-${randomId}.${extension}`
  }

  /**
   * Get content type from file path
   */
  private getContentType(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase()
    
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp4: 'video/mp4',
      avi: 'video/x-msvideo'
    }

    return mimeTypes[extension || ''] || 'application/octet-stream'
  }
}

// Export singleton instance
export const storageService = new SupabaseStorageService()
