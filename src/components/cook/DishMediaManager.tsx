import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Upload, Loader2, X, ChevronDown, Image as ImageIcon, Video } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useActiveStorageProvider, fetchActiveStorageProvider, StorageProvider } from '@/hooks/useStorageProviders';

interface DishImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface DishMediaManagerProps {
  cookDishId: string;
  images: DishImage[];
  youtubeVideoUrl: string | null;
}

const MAX_IMAGES = 3;
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB
const TARGET_SIZE = 100 * 1024; // 100 KB

/**
 * Compress an image file to target size using canvas.
 * Iteratively reduces quality until the output is below targetBytes.
 */
const compressImage = (file: File, targetBytes: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);

      // Scale down if very large
      let { width, height } = img;
      const MAX_DIM = 1200;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);

      // Iteratively lower quality
      let quality = 0.7;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Compression failed')); return; }
            if (blob.size <= targetBytes || quality <= 0.1) {
              const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
              });
              resolve(compressed);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          },
          'image/jpeg',
          quality
        );
      };
      tryCompress();
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
};

const uploadToCloudinary = async (file: File, provider: StorageProvider): Promise<string> => {
  const { cloud_name, upload_preset } = provider.credentials;
  if (!cloud_name || !upload_preset) throw new Error('Cloudinary credentials missing');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', upload_preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
    method: 'POST', body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Cloudinary upload failed');
  }
  return (await res.json()).secure_url;
};

const uploadToCustomEndpoint = async (file: File, provider: StorageProvider): Promise<string> => {
  const { endpoint_url, auth_header, response_url_path } = provider.credentials;
  if (!endpoint_url) throw new Error('Custom endpoint URL required');

  const formData = new FormData();
  formData.append('file', file);
  const headers: Record<string, string> = {};
  if (auth_header) headers['Authorization'] = auth_header;

  const res = await fetch(endpoint_url, { method: 'POST', body: formData, headers });
  if (!res.ok) throw new Error('Custom upload failed');

  const data = await res.json();
  const path = response_url_path || 'url';
  const url = path.split('.').reduce((obj: any, key: string) => obj?.[key], data);
  if (typeof url !== 'string') throw new Error('Could not extract URL');
  return url;
};

const uploadToProvider = async (file: File, provider: StorageProvider): Promise<string> => {
  switch (provider.provider_name) {
    case 'cloudinary': return uploadToCloudinary(file, provider);
    case 'custom': return uploadToCustomEndpoint(file, provider);
    default: throw new Error(`Provider "${provider.provider_name}" not supported`);
  }
};

const DishMediaManager: React.FC<DishMediaManagerProps> = ({ cookDishId, images, youtubeVideoUrl }) => {
  const queryClient = useQueryClient();
  const { data: activeProvider } = useActiveStorageProvider();
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState(youtubeVideoUrl || '');
  const [savingVideo, setSavingVideo] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const slots = Array.from({ length: MAX_IMAGES }, (_, i) => {
    return images.find(img => img.display_order === i) || null;
  });

  const imageCount = images.length;
  const hasVideo = !!youtubeVideoUrl;

  const uploadToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `cook-dishes/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('food-images').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('food-images').getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleFileUpload = async (slotIndex: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum image size is 1 MB. File will not be uploaded.', variant: 'destructive' });
      return;
    }

    setUploadingSlot(slotIndex);
    try {
      const compressed = await compressImage(file, TARGET_SIZE);
      const latestProvider = activeProvider ?? await fetchActiveStorageProvider().catch(() => null);

      let url: string;
      if (latestProvider) {
        try {
          url = await uploadToProvider(compressed, latestProvider);
        } catch (extError) {
          console.warn('External provider failed, falling back to Supabase:', extError);
          url = await uploadToSupabase(compressed);
        }
      } else {
        url = await uploadToSupabase(compressed);
      }

      const existing = slots[slotIndex];
      if (existing) {
        await supabase.from('cook_dish_images').delete().eq('id', existing.id);
      }
      const { error } = await supabase.from('cook_dish_images').insert({
        cook_dish_id: cookDishId,
        image_url: url,
        display_order: slotIndex,
      });
      if (error) throw error;
      toast({ title: 'Image uploaded & compressed automatically' });
      queryClient.invalidateQueries({ queryKey: ['cook-allocated-dishes'] });
      queryClient.invalidateQueries({ queryKey: ['storage-providers', 'active'] });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleSaveUrl = async (slotIndex: number, url: string) => {
    if (!url.trim()) return;
    try {
      const existing = slots[slotIndex];
      if (existing) {
        await supabase.from('cook_dish_images').delete().eq('id', existing.id);
      }
      const { error } = await supabase.from('cook_dish_images').insert({
        cook_dish_id: cookDishId,
        image_url: url.trim(),
        display_order: slotIndex,
      });
      if (error) throw error;
      toast({ title: 'Image saved' });
      queryClient.invalidateQueries({ queryKey: ['cook-allocated-dishes'] });
    } catch (err: any) {
      toast({ title: 'Failed to save image', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemoveImage = async (slotIndex: number) => {
    const existing = slots[slotIndex];
    if (!existing) return;
    try {
      const { error } = await supabase.from('cook_dish_images').delete().eq('id', existing.id);
      if (error) throw error;
      toast({ title: 'Image removed' });
      queryClient.invalidateQueries({ queryKey: ['cook-allocated-dishes'] });
    } catch (err: any) {
      toast({ title: 'Failed to remove', description: err.message, variant: 'destructive' });
    }
  };

  const handleSaveVideoUrl = async () => {
    setSavingVideo(true);
    try {
      const { error } = await supabase
        .from('cook_dishes')
        .update({ youtube_video_url: videoUrl.trim() || null })
        .eq('id', cookDishId);
      if (error) throw error;
      toast({ title: 'Video URL saved' });
      queryClient.invalidateQueries({ queryKey: ['cook-allocated-dishes'] });
    } catch (err: any) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSavingVideo(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="pt-2">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
          <span className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            Media
            {imageCount > 0 && (
              <span className="bg-primary/10 text-primary text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                {imageCount} img{imageCount > 1 ? 's' : ''}
              </span>
            )}
            {hasVideo && (
              <span className="bg-primary/10 text-primary text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Video className="h-2.5 w-2.5" /> video
              </span>
            )}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-1">
        <p className="text-[10px] text-muted-foreground px-1">Max 1 MB per image · Auto-compressed to ~100 KB</p>

        {slots.map((slot, index) => (
          <div key={index}>
            <Label className="text-xs font-medium text-foreground">
              {index === 0 ? 'Image 1 (Upload or paste URL)' : `Image ${index + 1}`}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              {slot ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <img src={slot.image_url} alt={`Image ${index + 1}`} className="h-10 w-10 rounded object-cover border shrink-0" />
                  <span className="text-xs text-muted-foreground truncate flex-1">{slot.image_url.split('/').pop()}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => handleRemoveImage(index)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Image URL or upload"
                    className="h-9 text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveUrl(index, (e.target as HTMLInputElement).value);
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) handleSaveUrl(index, e.target.value);
                    }}
                  />
                  <input
                    ref={(el) => { fileInputRefs.current[index] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(index, file);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 shrink-0"
                    disabled={uploadingSlot === index}
                    onClick={() => fileInputRefs.current[index]?.click()}
                  >
                    {uploadingSlot === index ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}

        <div>
          <Label className="text-xs font-medium text-foreground">Video URL</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              placeholder="Paste YouTube or video link"
              className="h-9 text-sm flex-1"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onBlur={handleSaveVideoUrl}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveVideoUrl(); }}
            />
            {savingVideo && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default DishMediaManager;
