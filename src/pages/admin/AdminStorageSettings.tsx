import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminNavbar from '@/components/admin/AdminNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Save, Cloud, Settings, Lock, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  useStorageProviders,
  useCreateStorageProvider,
  useUpdateStorageProvider,
  useDeleteStorageProvider,
  StorageProvider,
} from '@/hooks/useStorageProviders';

const PROVIDER_PRESETS: Record<string, { label: string; icon: string; fields: { key: string; label: string; placeholder: string }[] }> = {
  cloudinary: {
    label: 'Cloudinary',
    icon: '☁️',
    fields: [
      { key: 'cloud_name', label: 'Cloud Name', placeholder: 'Enter cloud name' },
      { key: 'upload_preset', label: 'Upload Preset', placeholder: 'Enter upload preset' },
    ],
  },
  aws_s3: {
    label: 'AWS S3',
    icon: '🔒',
    fields: [
      { key: 'access_key', label: 'Access Key', placeholder: 'Enter access key' },
      { key: 'secret_key', label: 'Secret Key', placeholder: 'Enter secret key' },
      { key: 'bucket', label: 'Bucket Name', placeholder: 'Enter bucket name' },
      { key: 'region', label: 'Region', placeholder: 'Enter region' },
    ],
  },
  imagekit: {
    label: 'ImageKit',
    icon: '🖼️',
    fields: [
      { key: 'public_key', label: 'Public Key', placeholder: 'Enter public key' },
      { key: 'private_key', label: 'Private Key', placeholder: 'Enter private key' },
      { key: 'url_endpoint', label: 'URL Endpoint', placeholder: 'Enter URL endpoint' },
    ],
  },
  backblaze: {
    label: 'Backblaze B2',
    icon: '🔥',
    fields: [
      { key: 'key_id', label: 'Application Key ID', placeholder: 'Enter key ID' },
      { key: 'application_key', label: 'Application Key', placeholder: 'Enter application key' },
      { key: 'bucket_id', label: 'Bucket ID', placeholder: 'Enter bucket ID' },
    ],
  },
  do_spaces: {
    label: 'DigitalOcean Spaces',
    icon: '🌊',
    fields: [
      { key: 'access_key', label: 'Access Key', placeholder: 'Enter access key' },
      { key: 'secret_key', label: 'Secret Key', placeholder: 'Enter secret key' },
      { key: 'space_name', label: 'Space Name', placeholder: 'Enter space name' },
      { key: 'region', label: 'Region', placeholder: 'Enter region' },
    ],
  },
  wasabi: {
    label: 'Wasabi',
    icon: '🟢',
    fields: [
      { key: 'access_key', label: 'Access Key', placeholder: 'Enter access key' },
      { key: 'secret_key', label: 'Secret Key', placeholder: 'Enter secret key' },
      { key: 'bucket', label: 'Bucket Name', placeholder: 'Enter bucket name' },
      { key: 'region', label: 'Region', placeholder: 'Enter region' },
    ],
  },
  custom: {
    label: 'Custom Endpoint',
    icon: '⚙️',
    fields: [
      { key: 'endpoint_url', label: 'Upload Endpoint URL', placeholder: 'https://api.example.com/upload' },
      { key: 'auth_header', label: 'Authorization Header', placeholder: 'Bearer xxx' },
      { key: 'response_url_path', label: 'Response URL JSON Path', placeholder: 'data.url' },
    ],
  },
};

const ProviderCard: React.FC<{
  provider: StorageProvider;
  onUpdate: (id: string, updates: Partial<StorageProvider>) => void;
  onDelete: (id: string) => void;
}> = ({ provider, onUpdate, onDelete }) => {
  const preset = PROVIDER_PRESETS[provider.provider_name];
  const [localCreds, setLocalCreds] = useState<Record<string, string>>(
    (provider.credentials as Record<string, string>) || {}
  );
  const [localPriority, setLocalPriority] = useState(provider.priority);

  const handleSave = () => {
    onUpdate(provider.id, { credentials: localCreds, priority: localPriority });
  };

  return (
    <Card className="border">
      <CardContent className="p-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{preset?.icon || '📦'}</span>
            <div>
              <h3 className="text-lg font-semibold">{preset?.label || provider.provider_name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-muted-foreground">Priority: {provider.priority}</span>
                {provider.is_enabled && (
                  <Badge className="bg-primary/20 text-primary text-xs">Enabled</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Priority</Label>
              <Input
                type="number"
                value={localPriority}
                onChange={(e) => setLocalPriority(Number(e.target.value))}
                className="w-20 h-9"
              />
            </div>
            <Switch
              checked={provider.is_enabled}
              onCheckedChange={(checked) => onUpdate(provider.id, { is_enabled: checked })}
            />
          </div>
        </div>

        {/* Credential fields */}
        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          {preset?.fields.map((field) => (
            <div key={field.key}>
              <Label className="text-sm font-medium">{field.label}</Label>
              <Input
                value={localCreds[field.key] || ''}
                placeholder={field.placeholder}
                onChange={(e) =>
                  setLocalCreds((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                className="mt-1"
              />
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" /> Save
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(provider.id)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminStorageSettings: React.FC = () => {
  const navigate = useNavigate();
  const { role, isLoading: authLoading } = useAuth();
  const { data: providers, isLoading } = useStorageProviders();
  const createProvider = useCreateStorageProvider();
  const updateProvider = useUpdateStorageProvider();
  const deleteProvider = useDeleteStorageProvider();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [newCreds, setNewCreds] = useState<Record<string, string>>({});
  const [newPriority, setNewPriority] = useState(1);

  const isAdmin = role === 'super_admin' || role === 'admin';

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Settings className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
        <p className="mt-2 text-muted-foreground">Only Admins can manage storage settings</p>
        <Button className="mt-6" onClick={() => navigate('/admin')}>Go Back</Button>
      </div>
    );
  }

  const handleAdd = () => {
    if (!selectedPreset) return;
    createProvider.mutate(
      { provider_name: selectedPreset, credentials: newCreds, priority: newPriority },
      {
        onSuccess: () => {
          setAddDialogOpen(false);
          setSelectedPreset('');
          setNewCreds({});
          setNewPriority(1);
        },
      }
    );
  };

  const handleUpdate = (id: string, updates: Partial<StorageProvider>) => {
    updateProvider.mutate({ id, ...updates });
  };

  const handleDelete = (id: string) => {
    deleteProvider.mutate(id);
  };

  const preset = selectedPreset ? PROVIDER_PRESETS[selectedPreset] : null;

  return (
    <div className="bg-background pb-6">

      <main className="mx-auto max-w-4xl p-4 pb-20">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Storage Configuration</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure external image storage providers. Images will be uploaded to the highest-priority enabled provider with automatic fallback.
            </p>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0">
                <Plus className="h-4 w-4" /> Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Storage Provider</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Provider Type</Label>
                  <Select value={selectedPreset} onValueChange={(v) => { setSelectedPreset(v); setNewCreds({}); }}>
                    <SelectTrigger><SelectValue placeholder="Select a provider" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROVIDER_PRESETS).map(([key, p]) => (
                        <SelectItem key={key} value={key}>
                          {p.icon} {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {preset && preset.fields.map((field) => (
                  <div key={field.key}>
                    <Label>{field.label}</Label>
                    <Input
                      placeholder={field.placeholder}
                      value={newCreds[field.key] || ''}
                      onChange={(e) => setNewCreds((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}

                <div>
                  <Label>Priority (higher = preferred)</Label>
                  <Input
                    type="number"
                    value={newPriority}
                    onChange={(e) => setNewPriority(Number(e.target.value))}
                  />
                </div>

                <Button onClick={handleAdd} disabled={!selectedPreset || createProvider.isPending} className="w-full">
                  {createProvider.isPending ? 'Adding...' : 'Add Provider'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Provider cards */}
        <div className="space-y-6">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading providers...</p>
          ) : providers && providers.length > 0 ? (
            providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Cloud className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="font-semibold">No External Providers</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  All uploads currently use Supabase Storage. Add a provider to use external storage.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Supabase fallback info */}
          <Card className="border-dashed bg-muted/30">
            <CardContent className="flex items-center gap-4 p-4">
              <Lock className="h-8 w-8 text-muted-foreground shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Supabase Storage (Default Fallback)</h4>
                <p className="text-xs text-muted-foreground">
                  Built-in storage is always available. If no external provider is enabled or upload fails, Supabase Storage is used automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminStorageSettings;
