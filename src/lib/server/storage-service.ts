import { getSupabaseAdminClient, isSupabaseConfigured } from './supabase';

export interface StorageUploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  signedUrl?: string;
  error?: string;
}

const PRIVATE_DOCUMENTS_BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET || 'private-documents';

export class DocumentStorageService {
  /**
   * Check if hosted Supabase Storage is configured
   */
  static isHostedStorageConfigured(): boolean {
    return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  }

  /**
   * Upload private PDF / NDA document to Supabase Storage
   * Path pattern: private-documents/{userId}/{filename}
   */
  static async uploadPrivateDocument(
    userId: string,
    fileName: string,
    fileBuffer: Buffer | ArrayBuffer,
    contentType = 'application/pdf'
  ): Promise<StorageUploadResult> {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return {
        success: false,
        error: 'Hosted storage (Supabase) is not configured. Falling back to local/in-memory session.',
      };
    }

    try {
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${userId}/${Date.now()}_${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from(PRIVATE_DOCUMENTS_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        path: data.path,
      };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Generate time-limited signed URL for private document download
   * Only accessible by authorized user
   */
  static async createSignedDownloadUrl(
    userId: string,
    storagePath: string,
    expiresInSeconds = 300 // 5 minutes
  ): Promise<{ signedUrl?: string; error?: string }> {
    // Verify path ownership: user can only access their own prefix
    if (!storagePath.startsWith(`${userId}/`)) {
      return { error: 'Unauthorized: Cannot access documents belonging to another user.' };
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return { error: 'Hosted storage (Supabase) not configured.' };
    }

    try {
      const { data, error } = await supabase.storage
        .from(PRIVATE_DOCUMENTS_BUCKET)
        .createSignedUrl(storagePath, expiresInSeconds);

      if (error) {
        return { error: error.message };
      }

      return { signedUrl: data.signedUrl };
    } catch (err: unknown) {
      return { error: (err as Error).message };
    }
  }

  /**
   * Delete private document from Supabase Storage
   */
  static async deletePrivateDocument(
    userId: string,
    storagePath: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!storagePath.startsWith(`${userId}/`)) {
      return { success: false, error: 'Unauthorized: Cannot delete document belonging to another user.' };
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return { success: false, error: 'Hosted storage (Supabase) not configured.' };
    }

    try {
      const { error } = await supabase.storage
        .from(PRIVATE_DOCUMENTS_BUCKET)
        .remove([storagePath]);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }
}
