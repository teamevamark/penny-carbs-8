import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useActiveStorageProvider, StorageProvider } from '@/hooks/useStorageProviders';

interface ImageUploadProps {
  bucket: string;
  folder?: string;
  currentImageUrl?: string | null;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
  className?: string;
}

const uploadToCloudinary = async (file: File, provider: StorageProvider): Promise<string> => {
  const { cloud_name, upload_preset } = provider.credentials as Record<string, string>;
  if (!cloud_name || !upload_preset) {
    throw new Error('Cloudinary cloud_name and upload_preset are required');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', upload_preset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Cloudinary upload failed');
  }

  const data = await response.json();
  return data.secure_url;
};

const uploadToCustomEndpoint = async (file: File, provider: StorageProvider): Promise<string> => {
  const { endpoint_url, auth_header, response_url_path } = provider.credentials as Record<string, string>;
  if (!endpoint_url) throw new Error('Custom endpoint URL is required');

  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (auth_header) headers['Authorization'] = auth_header;

  const response = await fetch(endpoint_url, { method: 'POST', body: formData, headers });
  if (!response.ok) throw new Error('Custom endpoint upload failed');

  const data = await response.json();

  // Navigate the JSON path to get URL
  const path = response_url_path || 'url';
  const url = path.split('.').reduce((obj: any, key: string) => obj?.[key], data);
  if (typeof url !== 'string') throw new Error('Could not extract URL from custom endpoint response');
  return url;
};

const uploadToExternalProvider = async (file: File, provider: StorageProvider): Promise<string> => {
  switch (provider.provider_name) {
    case 'cloudinary':
      return uploadToCloudinary(file, provider);
    case 'custom':
      return uploadToCustomEndpoint(file, provider);
    default:
      throw new Error(`Upload not implemented for provider: ${provider.provider_name}. Configure Cloudinary or Custom for client-side uploads.`);
  }
};

const ImageUpload: React.FC<ImageUploadProps> = ({
  bucket,
  folder = '',
  currentImageUrl,
  onUploadComplete,
  onRemove,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: activeProvider } = useActiveStorageProvider();

  const uploadToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please select an image under 5MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    try {
      let publicUrl: string;

      if (activeProvider) {
        try {
          publicUrl = await uploadToExternalProvider(file, activeProvider);
        } catch (extError) {
          console.warn('External provider upload failed, falling back to Supabase:', extError);
          publicUrl = await uploadToSupabase(file);
        }
      } else {
        publicUrl = await uploadToSupabase(file);
      }

      setPreview(publicUrl);
      onUploadComplete(publicUrl);
      toast({ title: 'Image uploaded', description: 'Image uploaded successfully' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: 'Failed to upload image. Please try again.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onRemove?.();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="Preview" className="h-24 w-24 rounded-lg object-cover border" />
          <Button type="button" variant="destructive" size="icon" className="absolute -right-2 -top-2 h-6 w-6" onClick={handleRemove}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isUploading} className="h-24 w-24 flex-col gap-2">
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <span className="text-xs">Upload</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default ImageUpload;
