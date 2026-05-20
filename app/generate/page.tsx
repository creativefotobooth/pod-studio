'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { api, type DesignMode, type JobStatus, type ProductType, type Provider, type PublishResponse, type TitleLibraryResponse } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Clock, Eye, ImageIcon, Loader2, Pencil, Sparkles, Trash2, ThumbsDown, ThumbsUp, Upload, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import ColourPicker from '@/components/ColourPicker';
import MockupPreview from '@/components/MockupPreview';
import PlacementPicker from '@/components/PlacementPicker';

type ApprovedDesign = {
  jobId: string;
  title: string;
  niche: string;
  subNiche?: string;
  type: ProductType;
  layout: 'centered-badge';
  mode?: DesignMode;
  score: JobStatus['score'];
  approvedAt: string;
  source?: 'generate' | 'upload';
};

type CurrentJobMeta = {
  jobId: string;
  title: string;
  niche: string;
  status: JobStatus['status'];
  startedAt: string;
  type?: ProductType;
  layout?: 'centered-badge';
  mode?: DesignMode;
};

type PublishedInfo = {
  publishedChannels: string[];
  printifyIds: Record<string, string>;
  publishedAt: string;
  partial?: boolean;
};

type PublishTarget = ApprovedDesign | null;

type UploadMode = 'finished' | 'reference';

const APPROVED_KEY = 'pod-studio-approved-designs';
const CURRENT_JOB_KEY = 'pod_studio_current_job';
const PUBLISHED_KEY = 'pod-studio-published-designs';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function loadApproved(): ApprovedDesign[] {
  return readJson<ApprovedDesign[]>(APPROVED_KEY, []);
}

function saveApproved(items: ApprovedDesign[]) {
  window.localStorage.setItem(APPROVED_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('pod-studio-approved-updated'));
}

function loadPublished(): Record<string, PublishedInfo> {
  return readJson<Record<string, PublishedInfo>>(PUBLISHED_KEY, {});
}

function savePublished(items: Record<string, PublishedInfo>) {
  window.localStorage.setItem(PUBLISHED_KEY, JSON.stringify(items));
}

function loadCurrentJob(): CurrentJobMeta | null {
  return readJson<CurrentJobMeta | null>(CURRENT_JOB_KEY, null);
}

function saveCurrentJob(meta: CurrentJobMeta) {
  window.localStorage.setItem(CURRENT_JOB_KEY, JSON.stringify(meta));
}

function clearCurrentJob() {
  window.localStorage.removeItem(CURRENT_JOB_KEY);
}

function formatChannel(channel: string) {
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

function successfulChannels(response: PublishResponse) {
  return Object.entries(response.results)
    .filter(([, result]) => result.ok)
    .map(([channel]) => channel);
}

function printifyIds(response: PublishResponse) {
  return Object.fromEntries(
    Object.entries(response.results)
      .filter(([, result]) => result.printifyProductId)
      .map(([channel, result]) => [channel, result.printifyProductId as string])
  );
}

export default function GeneratePage() {
  const [library, setLibrary] = useState<TitleLibraryResponse | null>(null);
  const [loadingTitles, setLoadingTitles] = useState(true);
  const [titleError, setTitleError] = useState<string | null>(null);

  const [selectedNiche, setSelectedNiche] = useState('');
  const [selectedSubNiche, setSelectedSubNiche] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [productType, setProductType] = useState<ProductType>('tee');
  const [designMode, setDesignMode] = useState<DesignMode>('artwork-only');
  const [provider, setProvider] = useState<Provider>('fal');
  const [activeTab, setActiveTab] = useState<'generate' | 'queue'>('generate');

  // When user switches to local provider, fall back from text-overlay-ai
  // (which is not supported on local — too slow on the Mac Mini).
  useEffect(() => {
    if (provider === 'local' && designMode === 'text-overlay-ai') {
      setDesignMode('artwork-only');
    }
  }, [provider, designMode]);
  const [layout] = useState<'centered-badge'>('centered-badge');

  const [generating, setGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [approved, setApproved] = useState<ApprovedDesign[]>(() => loadApproved());
  const [published, setPublished] = useState<Record<string, PublishedInfo>>(() => loadPublished());
  const [hidePublished, setHidePublished] = useState(false);

  const [publishTarget, setPublishTarget] = useState<PublishTarget>(null);
  const [publishChannels, setPublishChannels] = useState<Array<'shopify' | 'etsy'>>(['shopify', 'etsy']);
  const [publishPrice, setPublishPrice] = useState('19.99');
  const [publishColours, setPublishColours] = useState<string[]>([]);
  const [mockupTarget, setMockupTarget] = useState<ApprovedDesign | null>(null);
  const [publishPlacement, setPublishPlacement] = useState<{ preset?: string; x?: number; y?: number; scale?: number }>({});
  const [deleteTarget, setDeleteTarget] = useState<ApprovedDesign | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<ApprovedDesign | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editFields, setEditFields] = useState<{ title: string; description: string; tags: string; priceGbp: string }>({ title: '', description: '', tags: '', priceGbp: '' });
  const [publishing, setPublishing] = useState(false);

  const [uploadMode, setUploadMode] = useState<UploadMode>('finished');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadNiche, setUploadNiche] = useState('');
  const [uploadSubNiche, setUploadSubNiche] = useState('');
  const [uploading, setUploading] = useState(false);
  const [referenceStrength, setReferenceStrength] = useState(50);

  useEffect(() => {
    let cancelled = false;

    async function restoreCurrentJob() {
      const saved = loadCurrentJob();
      if (!saved?.jobId) return;

      setJobId(saved.jobId);
      setSelectedTitle(saved.title ?? '');
      setSelectedNiche(saved.niche ?? '');
      if (saved.type) setProductType(saved.type);
      if (saved.mode) setDesignMode(saved.mode);
      setGenerating(saved.status === 'running');

      setJob({
        jobId: saved.jobId,
        title: saved.title,
        niche: saved.niche,
        mode: saved.mode,
        status: saved.status,
        score: null,
        error: null,
        startedAt: saved.startedAt,
        finishedAt: null,
        hasComposite: false,
        hasAi: false,
        stdoutTail: ['Restoring saved job...'],
      });

      try {
        const restored = await api.getJob(saved.jobId);
        if (cancelled) return;
        setJob(restored);
        setGenerating(restored.status === 'running');
        saveCurrentJob({
          jobId: restored.jobId,
          title: restored.title || saved.title,
          niche: restored.niche || saved.niche,
          status: restored.status,
          startedAt: restored.startedAt || saved.startedAt,
          type: saved.type,
          layout: saved.layout ?? 'centered-badge',
          mode: (restored.mode as DesignMode) || saved.mode,
        });
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to restore saved job');
          setGenerating(false);
        }
      }
    }

    restoreCurrentJob();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTitles() {
      try {
        setLoadingTitles(true);
        const data = await api.getTitles();
        if (cancelled) return;
        setLibrary(data);
        const saved = loadCurrentJob();
        const savedNiche = saved?.niche ? data.niches.find((item) => item.niche === saved.niche) : null;
        const firstNiche = savedNiche ?? data.niches?.[0];
        const firstSub = firstNiche?.subNiches?.[0];
        setSelectedNiche(firstNiche?.niche ?? '');
        setSelectedSubNiche(firstSub?.subNiche ?? '');
        setUploadNiche(firstNiche?.niche ?? '');
        setUploadSubNiche(firstSub?.subNiche ?? '');
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load title library';
        setTitleError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoadingTitles(false);
      }
    }

    loadTitles();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!uploadFile) {
      setUploadPreview(null);
      return;
    }
    const url = URL.createObjectURL(uploadFile);
    setUploadPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadFile]);

  const niches = library?.niches ?? [];
  const currentNiche = niches.find((item) => item.niche === selectedNiche);
  const subNiches = currentNiche?.subNiches ?? [];
  const currentSubNiche = subNiches.find((item) => item.subNiche === selectedSubNiche);
  const titleCandidates = currentSubNiche?.candidates ?? [];

  const uploadNicheEntry = niches.find((item) => item.niche === uploadNiche);
  const uploadSubNiches = uploadNicheEntry?.subNiches ?? [];

  const activeTitle = useMemo(() => (customTitle.trim() || selectedTitle.trim()).trim(), [customTitle, selectedTitle]);
  const canGenerate = Boolean(activeTitle && selectedNiche && !generating && job?.status !== 'running');
  const publishPriceNumber = Number(publishPrice);
  const publishPriceError = publishPrice.trim() && publishPriceNumber > 0 ? '' : 'Enter a price greater than £0.';
  const canConfirmPublish = Boolean(publishTarget && publishChannels.length > 0 && !publishPriceError && !publishing);
  const visibleApproved = hidePublished ? approved.filter((item) => !published[item.jobId]) : approved;

  useEffect(() => {
    if (!jobId || job?.status === 'done' || job?.status === 'failed') return;

    let cancelled = false;
    const poll = async () => {
      try {
        const nextJob = await api.getJob(jobId);
        if (cancelled) return;
        setJob(nextJob);
        saveCurrentJob({
          jobId: nextJob.jobId,
          title: nextJob.title || activeTitle,
          niche: nextJob.niche || selectedNiche,
          status: nextJob.status,
          startedAt: nextJob.startedAt,
          type: productType,
          layout,
          mode: (nextJob.mode as DesignMode) || designMode,
        });
        if (nextJob.status === 'done') {
          setGenerating(false);
          toast.success('Generation complete');
        }
        if (nextJob.status === 'failed') {
          setGenerating(false);
          toast.error(nextJob.error || 'Generation failed');
        }
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : 'Failed to poll generation job');
      }
    };

    poll();
    const id = window.setInterval(poll, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [jobId, job?.status, activeTitle, selectedNiche, productType, layout, designMode]);

  function handleNicheChange(value: string | null) {
    if (!value) return;
    setSelectedNiche(value);
    const next = niches.find((item) => item.niche === value);
    setSelectedSubNiche(next?.subNiches?.[0]?.subNiche ?? '');
    setSelectedTitle('');
    setCustomTitle('');
  }

  function handleUploadNicheChange(value: string | null) {
    if (!value) return;
    setUploadNiche(value);
    const next = niches.find((item) => item.niche === value);
    setUploadSubNiche(next?.subNiches?.[0]?.subNiche ?? '');
  }

  function handleSubNicheChange(value: string | null) {
    if (!value) return;
    setSelectedSubNiche(value);
    setSelectedTitle('');
    setCustomTitle('');
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    try {
      setGenerating(true);
      setJob(null);
      const response = await api.generate({
        title: activeTitle,
        niche: selectedNiche,
        subNiche: selectedSubNiche,
        type: productType,
        layout,
        mode: designMode,
        provider,
        critic: false,
      });
      setJobId(response.jobId);
      saveCurrentJob({
        jobId: response.jobId,
        title: activeTitle,
        niche: selectedNiche,
        status: response.status,
        startedAt: response.startedAt,
        type: productType,
        layout,
        mode: designMode,
      });
      setJob({
        jobId: response.jobId,
        title: activeTitle,
        niche: selectedNiche,
        mode: designMode,
        status: response.status,
        score: null,
        error: null,
        startedAt: response.startedAt,
        finishedAt: null,
        hasComposite: false,
        hasAi: false,
        stdoutTail: ['Generation started...'],
      });
      toast.success('Generation started');
    } catch (error) {
      setGenerating(false);
      toast.error(error instanceof Error ? error.message : 'Failed to start generation');
    }
  }

  function approveCurrent() {
    if (!job || job.status !== 'done') return;
    const nextItem: ApprovedDesign = {
      jobId: job.jobId,
      title: job.title || activeTitle,
      niche: job.niche || selectedNiche,
      subNiche: selectedSubNiche,
      type: productType,
      layout,
      mode: (job.mode as DesignMode) || designMode,
      score: job.score,
      approvedAt: new Date().toISOString(),
      source: 'generate',
    };
    const next = [nextItem, ...approved.filter((item) => item.jobId !== job.jobId)];
    setApproved(next);
    saveApproved(next);
    clearCurrentJob();
    setJob(null);
    setJobId(null);
    setGenerating(false);
    toast.success('Approved — ready to publish');
  }

  function rejectCurrent() {
    if (!job) return;
    toast.message('Rejected for now — nothing was published');
    clearCurrentJob();
    setJob(null);
    setJobId(null);
    setGenerating(false);
  }

  function discardCurrent() {
    clearCurrentJob();
    setJob(null);
    setJobId(null);
    setGenerating(false);
    toast.message('Cleared current job from this browser');
  }

  function chooseUploadFile(event: ChangeEvent<HTMLInputElement>, mode: UploadMode) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setUploadFile(null);
      return;
    }
    const maxMb = mode === 'finished' ? 25 : 10;
    const okType = mode === 'finished' ? file.type === 'image/png' : ['image/png', 'image/jpeg'].includes(file.type);
    if (!okType) {
      toast.error(mode === 'finished' ? 'Upload finished design requires a PNG file.' : 'Reference image must be PNG or JPG.');
      event.target.value = '';
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`File must be ${maxMb}MB or smaller.`);
      event.target.value = '';
      return;
    }
    setUploadFile(file);
  }

  async function handleUploadFinished() {
    if (!uploadFile || !uploadTitle.trim() || !uploadNiche) {
      toast.error('Choose a PNG, title, and niche first.');
      return;
    }
    if (uploadFile.size > 25 * 1024 * 1024 || uploadFile.type !== 'image/png') {
      toast.error('Finished design must be a PNG under 25MB.');
      return;
    }
    try {
      setUploading(true);
      const form = new FormData();
      form.append('file', uploadFile);
      form.append('title', uploadTitle.trim());
      form.append('niche', uploadNiche);
      form.append('subNiche', uploadSubNiche || '');
      const response = await api.uploadDesign(form);
      const nextItem: ApprovedDesign = {
        jobId: response.jobId,
        title: response.title,
        niche: response.niche,
        subNiche: response.subNiche,
        type: 'tee',
        layout,
        mode: 'artwork-only',
        score: null,
        approvedAt: response.uploadedAt,
        source: 'upload',
      };
      const next = [nextItem, ...approved.filter((item) => item.jobId !== response.jobId)];
      setApproved(next);
      saveApproved(next);
      setUploadFile(null);
      setUploadTitle('');
      toast.success('Uploaded design added to Approved queue');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleReferenceSubmit() {
    toast.message('Reference-image generation coming soon — backend not yet implemented');
  }

  function openPublish(item: ApprovedDesign) {
    setPublishTarget(item);
    setPublishChannels(['shopify', 'etsy']);
    setPublishPrice('19.99');
    setPublishPlacement({}); // PlacementPicker will set niche default
    // Load all colours by default; ColourPicker handles defaults via empty-array signal
    // Default to 12 recommended colours (stays under Printify 100-variant cap)
    const RECOMMENDED_DEFAULTS = [
      'Black', 'White', 'Navy', 'Asphalt', 'Soft Cream',
      'Maroon', 'Forest', 'Mustard',
      'Heather Navy', 'Heather Forest', 'Heather Mauve', 'Heather Mustard',
    ];
    setPublishColours([]); // empty = backend uses all defaults
    api.getVariants('tee')
      .then((res) => {
        const available = res.colours.map((c) => c.name);
        const recommended = available.filter((name) => RECOMMENDED_DEFAULTS.includes(name));
        setPublishColours(recommended);
      })
      .catch(() => { /* fall back to backend defaults */ });
  }

  async function handlePublish() {
    if (!publishTarget || !canConfirmPublish) return;
    try {
      setPublishing(true);
      const response = await api.publish({
        jobId: publishTarget.jobId,
        productType: publishTarget.type,
        title: publishTarget.title,
        niche: publishTarget.niche,
        subNiche: publishTarget.subNiche || '',
        priceGbp: publishPriceNumber,
        channels: publishChannels,
        colours: publishColours.length > 0 ? publishColours : undefined,
        placement: Object.keys(publishPlacement).length > 0 ? publishPlacement : undefined,
      });
      const channels = successfulChannels(response);
      if (channels.length === 0) {
        toast.error('Publish failed for all channels');
        return;
      }
      const nextPublished = {
        ...published,
        [publishTarget.jobId]: {
          publishedChannels: channels,
          printifyIds: printifyIds(response),
          publishedAt: response.publishedAt,
          partial: response.partial,
        },
      };
      setPublished(nextPublished);
      savePublished(nextPublished);
      setPublishTarget(null);
      const ids = Object.values(printifyIds(response)).join(', ');
      toast.success(`Published to ${channels.map(formatChannel).join('+')}${ids ? ` — Printify ID(s): ${ids}` : ''}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete(scope: 'soft' | 'hard') {
    if (!deleteTarget) return;
    try {
      setDeleting(true);

      // Hard delete: remove from Printify (cascades to Shopify/Etsy)
      if (scope === 'hard') {
        const pub = published[deleteTarget.jobId];
        if (pub && pub.printifyIds) {
          const channelMap: Record<string, number> = { shopify: 26974619, etsy: 26982418 };
          let anyFailed = false;
          for (const [channel, productId] of Object.entries(pub.printifyIds)) {
            const shopId = channelMap[channel];
            if (!shopId || !productId) continue;
            try {
              await api.deleteProduct(productId as string, shopId);
            } catch (err) {
              console.error(`Failed to delete ${channel} product:`, err);
              anyFailed = true;
            }
          }
          if (anyFailed) {
            toast.error('Some channels failed to delete — check console');
          } else {
            toast.success(`Deleted from Printify (${Object.keys(pub.printifyIds).join(', ')})`);
          }
        }
      }

      // Both scopes: remove from approved queue + published state
      const nextApproved = approved.filter((a) => a.jobId !== deleteTarget.jobId);
      setApproved(nextApproved);
      saveApproved(nextApproved);

      if (published[deleteTarget.jobId]) {
        const nextPublished = { ...published };
        delete nextPublished[deleteTarget.jobId];
        setPublished(nextPublished);
        savePublished(nextPublished);
      }

      if (scope === 'soft') {
        toast.success('Removed from approved queue (listing stays live)');
      }
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  async function openEdit(item: ApprovedDesign) {
    const pub = published[item.jobId];
    if (!pub || !pub.printifyIds) {
      toast.error('Cannot edit — design is not published');
      return;
    }
    setEditTarget(item);
    setEditLoading(true);
    try {
      const channelMap: Record<string, number> = { shopify: 26974619, etsy: 26982418 };
      // Fetch from the first available channel for current values
      const [firstChannel, firstProductId] = Object.entries(pub.printifyIds)[0];
      const shopId = channelMap[firstChannel];
      if (!shopId || !firstProductId) throw new Error('No valid channel to fetch from');

      const data = await api.getProductDetails(firstProductId as string, shopId);
      const firstVariant = data.variants?.[0];
      const priceGbp = firstVariant ? (firstVariant.price / 100).toFixed(2) : '19.99';

      setEditFields({
        title: data.title || item.title,
        description: data.description || '',
        tags: (data.tags || []).join(', '),
        priceGbp,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load product');
      setEditTarget(null);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleEditSave() {
    if (!editTarget) return;
    const pub = published[editTarget.jobId];
    if (!pub) return;

    const priceGbp = Number(editFields.priceGbp);
    if (!Number.isFinite(priceGbp) || priceGbp <= 0) {
      toast.error('Enter a valid price');
      return;
    }
    const tags = editFields.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (!editFields.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setEditSaving(true);
    try {
      const channelMap: Record<string, number> = { shopify: 26974619, etsy: 26982418 };
      const failed: string[] = [];
      const succeeded: string[] = [];

      for (const [channel, productId] of Object.entries(pub.printifyIds)) {
        const shopId = channelMap[channel];
        if (!shopId || !productId) continue;
        try {
          await api.updateProduct(productId as string, shopId, {
            title: editFields.title.trim(),
            description: editFields.description,
            tags,
            priceGbp,
          });
          succeeded.push(channel);
        } catch (err) {
          console.error(`Edit failed for ${channel}:`, err);
          failed.push(channel);
        }
      }

      if (succeeded.length > 0 && failed.length === 0) {
        toast.success(`Updated on ${succeeded.map(formatChannel).join(' + ')}`);
        // Update local title in approved queue so UI stays consistent
        const nextApproved = approved.map((a) =>
          a.jobId === editTarget.jobId ? { ...a, title: editFields.title.trim() } : a
        );
        setApproved(nextApproved);
        saveApproved(nextApproved);
        setEditTarget(null);
      } else if (succeeded.length > 0) {
        toast.error(`Partial: updated ${succeeded.join(',')} but failed ${failed.join(',')}`);
      } else {
        toast.error('All update attempts failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setEditSaving(false);
    }
  }

  function togglePublishChannel(channel: 'shopify' | 'etsy') {
    setPublishChannels((current) =>
      current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-500" />
              <h1 className="text-3xl font-bold tracking-tight">Generate Design</h1>
            </div>
            <p className="mt-1 text-muted-foreground">
              Generate artwork, upload finished PNGs, approve winners, and publish to Printify.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit text-sm">
            {approved.length} approved locally
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => value && setActiveTab(value as 'generate' | 'queue')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="queue">Approved queue ({approved.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Title library</CardTitle>
              <CardDescription>Filter by niche and sub-niche, then pick a title or type your own.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Niche</Label>
                  <Select value={selectedNiche} onValueChange={handleNicheChange} disabled={loadingTitles || niches.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingTitles ? 'Loading niches...' : 'Select niche'} />
                    </SelectTrigger>
                    <SelectContent>
                      {niches.map((item) => (
                        <SelectItem key={item.niche} value={item.niche}>
                          {item.niche} ({item.subNiches.reduce((sum, sub) => sum + sub.count, 0)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sub-niche</Label>
                  <Select value={selectedSubNiche} onValueChange={handleSubNicheChange} disabled={loadingTitles || subNiches.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-niche" />
                    </SelectTrigger>
                    <SelectContent>
                      {subNiches.map((item) => (
                        <SelectItem key={item.subNiche} value={item.subNiche}>
                          {item.subNiche} ({item.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Custom title</Label>
                <Input
                  value={customTitle}
                  onChange={(event) => {
                    setCustomTitle(event.target.value);
                    if (event.target.value) setSelectedTitle('');
                  }}
                  placeholder="Type a custom title, or choose one below..."
                />
              </div>

              {loadingTitles && (
                <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading title library through the auth proxy...
                </div>
              )}

              {titleError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  Could not load titles: {titleError}
                </div>
              )}

              {titleCandidates.length > 0 ? (
                <details className="rounded-lg border" open={titleCandidates.length <= 5}>
                  <summary className="cursor-pointer select-none px-3 py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg">
                    {titleCandidates.length} title{titleCandidates.length === 1 ? '' : 's'} available — tap to {titleCandidates.length <= 5 ? 'collapse' : 'expand'}
                  </summary>
                  <div className="max-h-[430px] space-y-2 overflow-y-auto p-2 border-t">
                    {titleCandidates.map((title) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => {
                          setSelectedTitle(title);
                          setCustomTitle('');
                        }}
                        className={`w-full rounded-md border px-3 py-2 text-left text-sm transition hover:bg-accent ${
                          selectedTitle === title ? 'border-primary bg-primary/10' : 'border-transparent'
                        }`}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </details>
              ) : (
                !loadingTitles && (
                  <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No titles found for this filter.</div>
                )
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configure generation</CardTitle>
                <CardDescription>Everything goes through /api/proxy — no direct VPS calls from the browser.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <Label className="text-xs uppercase text-muted-foreground">Selected title</Label>
                  <p className="mt-1 min-h-6 font-medium">{activeTitle || 'Choose a title or enter a custom one'}</p>
                </div>

                <div className="space-y-2">
                  <Label>Product type</Label>
                  <Tabs value={productType} onValueChange={(value) => value && setProductType(value as ProductType)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="tee">Tee</TabsTrigger>
                      <TabsTrigger value="mug">Mug</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <Label>Generation provider</Label>
                  <Tabs value={provider} onValueChange={(value) => value && setProvider(value as Provider)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="fal">fal.ai (cloud)</TabsTrigger>
                      <TabsTrigger value="local">Mac Mini (local)</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <p className="text-xs text-muted-foreground">
                    fal.ai is fast (~10s/gen, paid). Mac Mini is free but slower (~150-250s/gen) and does not support AI text + object.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Design mode</Label>
                  <Tabs value={designMode} onValueChange={(value) => value && setDesignMode(value as DesignMode)}>
                    <TabsList className={`grid w-full ${provider === 'fal' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      <TabsTrigger value="artwork-only">Artwork only</TabsTrigger>
                      <TabsTrigger value="combined">Artwork + text</TabsTrigger>
                      {provider === 'fal' && (
                        <TabsTrigger value="text-overlay-ai">AI text + object</TabsTrigger>
                      )}
                    </TabsList>
                  </Tabs>
                  <p className="text-xs text-muted-foreground">
                    Artwork only is the default. Artwork + text composites the title below the artwork.
                    {provider === 'fal' && ' AI text + object generates both the title and a matching object as separate AI layers — best for bold typography.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Layout</Label>
                  <div className="rounded-lg border px-3 py-2 text-sm">centered-badge</div>
                </div>

                <Button className="w-full" size="lg" disabled={!canGenerate} onClick={handleGenerate}>
                  {generating || job?.status === 'running' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" /> Generate
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {job && (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {job.status === 'running' && <Clock className="h-5 w-5 text-amber-500" />}
                        {job.status === 'done' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                        {job.status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                        Job {job.jobId}
                      </CardTitle>
                      <CardDescription>{job.title}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={job.status === 'done' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                        {job.status}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={discardCurrent}>
                        <Trash2 className="mr-2 h-4 w-4" /> Discard
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-black p-3 font-mono text-xs text-green-200">
                    <div className="mb-2 text-green-400">stdout tail</div>
                    <div className="max-h-44 space-y-1 overflow-y-auto whitespace-pre-wrap">
                      {(job.stdoutTail?.length ? job.stdoutTail : ['Waiting for generator output...']).map((line, index) => (
                        <div key={`${line}-${index}`}>{line}</div>
                      ))}
                    </div>
                  </div>

                  {job.status === 'failed' && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      {job.error || 'Generation failed'}
                    </div>
                  )}

                  {job.status === 'done' && (
                    <div className="space-y-4">
                      {job.score && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={job.score.verdict === 'PASS' ? 'default' : 'destructive'}>{job.score.verdict}</Badge>
                          <Badge variant="secondary">Critic score: {job.score.total}/35</Badge>
                        </div>
                      )}

                      {job.hasComposite ? (
                        <div className="overflow-hidden rounded-xl border bg-muted">
                          <img
                            src={`/api/proxy/api/generate/${job.jobId}/image?type=composite`}
                            alt={`Composite for ${job.title}`}
                            className="h-auto w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
                          <ImageIcon className="h-4 w-4" /> Composite image is not ready yet.
                        </div>
                      )}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Button disabled={!job.hasComposite} onClick={approveCurrent}>
                          <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                        </Button>
                        <Button variant="outline" onClick={rejectCurrent}>
                          <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Upload Your Own</CardTitle>
            <CardDescription>Add finished PNGs directly to the approved queue, or preview the future reference-image flow.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={uploadMode} onValueChange={(value) => {
              setUploadMode(value as UploadMode);
              setUploadFile(null);
            }}>
              <TabsList className="grid w-full max-w-xl grid-cols-2">
                <TabsTrigger value="finished">Upload finished design</TabsTrigger>
                <TabsTrigger value="reference">Generate from reference</TabsTrigger>
              </TabsList>

              <TabsContent value="finished" className="mt-5 space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>PNG file (max 25MB)</Label>
                      <Input type="file" accept="image/png,.png" onChange={(event) => chooseUploadFile(event, 'finished')} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="Design title" />
                      </div>
                      <div className="space-y-2">
                        <Label>Niche</Label>
                        <Select value={uploadNiche} onValueChange={handleUploadNicheChange} disabled={loadingTitles || niches.length === 0}>
                          <SelectTrigger><SelectValue placeholder="Select niche" /></SelectTrigger>
                          <SelectContent>
                            {niches.map((item) => <SelectItem key={item.niche} value={item.niche}>{item.niche}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Sub-niche</Label>
                        <Select value={uploadSubNiche} onValueChange={(value) => value && setUploadSubNiche(value)} disabled={uploadSubNiches.length === 0}>
                          <SelectTrigger><SelectValue placeholder="Select sub-niche" /></SelectTrigger>
                          <SelectContent>
                            {uploadSubNiches.map((item) => <SelectItem key={item.subNiche} value={item.subNiche}>{item.subNiche}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleUploadFinished} disabled={uploading || !uploadFile || !uploadTitle.trim() || !uploadNiche}>
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Add to Approved Queue
                    </Button>
                  </div>
                  <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
                    {uploadPreview ? (
                      <img src={uploadPreview} alt="Upload preview" className="max-h-72 w-full object-contain p-3" />
                    ) : (
                      <div className="p-6 text-center text-sm text-muted-foreground">PNG preview appears here</div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reference" className="mt-5 space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Reference image (PNG/JPG, max 10MB)</Label>
                      <Input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(event) => chooseUploadFile(event, 'reference')} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="Design title" />
                      </div>
                      <div className="space-y-2">
                        <Label>Niche</Label>
                        <Select value={uploadNiche} onValueChange={handleUploadNicheChange} disabled={loadingTitles || niches.length === 0}>
                          <SelectTrigger><SelectValue placeholder="Select niche" /></SelectTrigger>
                          <SelectContent>
                            {niches.map((item) => <SelectItem key={item.niche} value={item.niche}>{item.niche}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Sub-niche</Label>
                        <Select value={uploadSubNiche} onValueChange={(value) => value && setUploadSubNiche(value)} disabled={uploadSubNiches.length === 0}>
                          <SelectTrigger><SelectValue placeholder="Select sub-niche" /></SelectTrigger>
                          <SelectContent>
                            {uploadSubNiches.map((item) => <SelectItem key={item.subNiche} value={item.subNiche}>{item.subNiche}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Reference strength: {referenceStrength}</Label>
                      <Input type="range" min="0" max="100" value={referenceStrength} onChange={(event) => setReferenceStrength(Number(event.target.value))} />
                    </div>
                    <Button onClick={handleReferenceSubmit} disabled={!uploadFile || !uploadTitle.trim() || !uploadNiche}>
                      Generate from reference
                    </Button>
                  </div>
                  <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
                    {uploadPreview ? (
                      <img src={uploadPreview} alt="Reference preview" className="max-h-72 w-full object-contain p-3" />
                    ) : (
                      <div className="p-6 text-center text-sm text-muted-foreground">Reference preview appears here</div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="queue" className="mt-6 space-y-6">
            {approved.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Approved queue</CardTitle>
                  <CardDescription>No approved designs yet. Generate or upload some from the Generate tab.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Approved queue</CardTitle>
                  <CardDescription>Publish approved generated or uploaded designs to Printify channels.</CardDescription>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hidePublished} onChange={(event) => setHidePublished(event.target.checked)} />
                  Hide published
                </label>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // Group by subNiche (or niche if no subNiche), sorted by count desc
                const groups: Record<string, ApprovedDesign[]> = {};
                for (const item of visibleApproved) {
                  const key = item.subNiche ? `${item.niche}-${item.subNiche}` : item.niche || 'other';
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(item);
                }
                const sortedGroups = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
                return sortedGroups.map(([groupKey, items]) => (
                  <details key={groupKey} open className="mb-3 rounded-lg border">
                    <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium hover:bg-accent rounded-lg">
                      {groupKey} ({items.length})
                    </summary>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 p-3 border-t">
                      {items.map((item) => {
                  const pub = published[item.jobId];
                  return (
                    <div key={item.jobId} className={`rounded-lg border p-3 ${pub ? 'border-green-500/60 bg-green-500/5' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium">{item.title}</div>
                        <div className="flex items-center gap-2">
                          {pub && <Badge className="bg-green-600">Published ✓</Badge>}
                          {pub && (
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="text-muted-foreground hover:text-blue-600 transition"
                              title="Edit design"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="text-muted-foreground hover:text-red-600 transition"
                            title="Delete design"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 overflow-hidden rounded-md border bg-muted">
                        <img src={`/api/proxy/api/generate/${item.jobId}/image?type=composite`} alt={item.title} className="h-36 w-full object-contain" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">{item.niche}</Badge>
                        <Badge variant="outline">{item.type}</Badge>
                        <Badge variant="outline">{item.source === 'upload' ? 'uploaded' : item.mode || 'generated'}</Badge>
                        {item.score && <Badge>{item.score.total}/35</Badge>}
                      </div>
                      {pub ? (
                        <div className="mt-3 rounded-md bg-green-500/10 p-2 text-xs text-green-700 dark:text-green-300">
                          {pub.partial ? 'Published partial' : 'Published'}: {pub.publishedChannels.map(formatChannel).join('+')}
                          {Object.values(pub.printifyIds).length > 0 && (
                            <div className="mt-1">Printify ID(s): {Object.values(pub.printifyIds).join(', ')}</div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setMockupTarget(item)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Preview Mockup
                          </Button>
                          <Button className="w-full" onClick={() => openPublish(item)}>
                            Publish to Printify
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                      })}
                    </div>
                  </details>
                ));
              })()}
              {visibleApproved.length === 0 && (
                <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">All published items are hidden.</div>
              )}
            </CardContent>
          </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Edit design</h2>
                <p className="mt-1 text-sm text-muted-foreground">{editTarget.title}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditTarget(null)} disabled={editSaving}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {editLoading ? (
              <div className="mt-6 flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editTitle">Title</Label>
                  <Input
                    id="editTitle"
                    value={editFields.title}
                    onChange={(e) => setEditFields((f) => ({ ...f, title: e.target.value }))}
                    disabled={editSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editDescription">Description</Label>
                  <textarea
                    id="editDescription"
                    value={editFields.description}
                    onChange={(e) => setEditFields((f) => ({ ...f, description: e.target.value }))}
                    disabled={editSaving}
                    rows={6}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editTags">Tags (comma-separated)</Label>
                  <Input
                    id="editTags"
                    value={editFields.tags}
                    onChange={(e) => setEditFields((f) => ({ ...f, tags: e.target.value }))}
                    disabled={editSaving}
                    placeholder="bohemian, general, tee"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editPrice">Price (£)</Label>
                  <Input
                    id="editPrice"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editFields.priceGbp}
                    onChange={(e) => setEditFields((f) => ({ ...f, priceGbp: e.target.value }))}
                    disabled={editSaving}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEditTarget(null)} disabled={editSaving}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleEditSave} disabled={editSaving}>
                    {editSaving ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                    ) : (
                      'Save & Republish'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Delete design</h2>
                <p className="mt-1 text-sm text-muted-foreground">{deleteTarget.title}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {published[deleteTarget.jobId] ? (
                <>
                  <p className="text-sm">This design is <strong>published</strong> to {published[deleteTarget.jobId].publishedChannels.map(formatChannel).join(' + ')}.</p>
                  <p className="text-sm text-muted-foreground">Choose how to delete:</p>

                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDelete('soft')}
                    className="w-full rounded-lg border p-3 text-left hover:bg-muted transition disabled:opacity-50"
                  >
                    <div className="font-medium text-sm">Remove from queue only</div>
                    <div className="text-xs text-muted-foreground mt-1">Hides from POD Studio. Listing stays live on your shops.</div>
                  </button>

                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDelete('hard')}
                    className="w-full rounded-lg border border-red-500/60 bg-red-500/5 p-3 text-left hover:bg-red-500/10 transition disabled:opacity-50"
                  >
                    <div className="font-medium text-sm text-red-600 dark:text-red-400">Delete everything</div>
                    <div className="text-xs text-muted-foreground mt-1">Removes from Printify, which cascades to Etsy/Shopify. Cannot be undone.</div>
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm">This design is not published anywhere.</p>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDelete('soft')}
                    className="w-full rounded-lg border border-red-500/60 bg-red-500/5 p-3 text-left hover:bg-red-500/10 transition disabled:opacity-50"
                  >
                    <div className="font-medium text-sm text-red-600 dark:text-red-400">Remove from queue</div>
                    <div className="text-xs text-muted-foreground mt-1">This will remove the design from your approved queue.</div>
                  </button>
                </>
              )}

              <Button variant="outline" className="w-full" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {mockupTarget && (
        <MockupPreview
          jobId={mockupTarget.jobId}
          designTitle={mockupTarget.title}
          isOpen={true}
          onClose={() => setMockupTarget(null)}
          onPublishClick={() => { const t = mockupTarget; setMockupTarget(null); openPublish(t); }}
        />
      )}

      {publishTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Publish to Printify</h2>
                <p className="mt-1 text-sm text-muted-foreground">{publishTarget.title}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPublishTarget(null)} disabled={publishing}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label>Channels</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(['shopify', 'etsy'] as const).map((channel) => (
                    <label key={channel} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                      <input type="checkbox" checked={publishChannels.includes(channel)} onChange={() => togglePublishChannel(channel)} />
                      {formatChannel(channel)}
                    </label>
                  ))}
                </div>
                {publishChannels.length === 0 && <p className="text-sm text-destructive">Choose at least one channel.</p>}
              </div>

              <div className="space-y-2">
                <ColourPicker selected={publishColours} onChange={setPublishColours} productType="tee" />
              </div>

              <div className="space-y-2">
                <PlacementPicker
                  subNiche={publishTarget?.subNiche ? `${publishTarget.niche}-${publishTarget.subNiche}` : publishTarget?.niche || 'general'}
                  value={publishPlacement}
                  onChange={setPublishPlacement}
                />
              </div>

              <div className="space-y-2">
                <Label>Price (£)</Label>
                <Input type="number" min="0.01" step="0.01" value={publishPrice} onChange={(event) => setPublishPrice(event.target.value)} />
                {publishPriceError && <p className="text-sm text-destructive">{publishPriceError}</p>}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPublishTarget(null)} disabled={publishing}>Cancel</Button>
              <Button onClick={handlePublish} disabled={!canConfirmPublish}>
                {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Publish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
