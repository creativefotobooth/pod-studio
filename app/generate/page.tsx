'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { api, type JobStatus, type TitleLibraryResponse } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Clock, ImageIcon, Loader2, Sparkles, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type ProductType = 'tee' | 'mug' | 'hoodie';
type ApprovedDesign = {
  jobId: string;
  title: string;
  niche: string;
  type: ProductType;
  layout: 'centered-badge';
  score: JobStatus['score'];
  approvedAt: string;
};

const APPROVED_KEY = 'pod-studio-approved-designs';

function loadApproved(): ApprovedDesign[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(APPROVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveApproved(items: ApprovedDesign[]) {
  window.localStorage.setItem(APPROVED_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('pod-studio-approved-updated'));
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
  const [layout] = useState<'centered-badge'>('centered-badge');

  const [generating, setGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [approved, setApproved] = useState<ApprovedDesign[]>(() => loadApproved());

  useEffect(() => {
    let cancelled = false;

    async function loadTitles() {
      try {
        setLoadingTitles(true);
        const data = await api.getTitles();
        if (cancelled) return;
        setLibrary(data);
        const firstNiche = data.niches?.[0];
        setSelectedNiche(firstNiche?.niche ?? '');
        setSelectedSubNiche(firstNiche?.subNiches?.[0]?.subNiche ?? '');
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

  const niches = library?.niches ?? [];
  const currentNiche = niches.find((item) => item.niche === selectedNiche);
  const subNiches = currentNiche?.subNiches ?? [];
  const currentSubNiche = subNiches.find((item) => item.subNiche === selectedSubNiche);
  const titleCandidates = currentSubNiche?.candidates ?? [];

  const activeTitle = useMemo(() => {
    return (customTitle.trim() || selectedTitle.trim()).trim();
  }, [customTitle, selectedTitle]);

  const canGenerate = Boolean(activeTitle && selectedNiche && !generating && job?.status !== 'running');

  useEffect(() => {
    if (!jobId || job?.status === 'done' || job?.status === 'failed') return;

    let cancelled = false;
    const poll = async () => {
      try {
        const nextJob = await api.getJob(jobId);
        if (cancelled) return;
        setJob(nextJob);
        if (nextJob.status === 'done') {
          setGenerating(false);
          toast.success('Generation complete');
        }
        if (nextJob.status === 'failed') {
          setGenerating(false);
          toast.error(nextJob.error || 'Generation failed');
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to poll generation job');
        }
      }
    };

    poll();
    const id = window.setInterval(poll, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [jobId, job?.status]);

  function handleNicheChange(value: string | null) {
    if (!value) return;
    setSelectedNiche(value);
    const next = niches.find((item) => item.niche === value);
    setSelectedSubNiche(next?.subNiches?.[0]?.subNiche ?? '');
    setSelectedTitle('');
    setCustomTitle('');
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
        type: productType,
        layout,
        critic: true,
      });
      setJobId(response.jobId);
      setJob({
        jobId: response.jobId,
        title: activeTitle,
        niche: selectedNiche,
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
      type: productType,
      layout,
      score: job.score,
      approvedAt: new Date().toISOString(),
    };
    const next = [nextItem, ...approved.filter((item) => item.jobId !== job.jobId)];
    setApproved(next);
    saveApproved(next);
    toast.success('Approved locally — Printify publish comes in Phase 3');
  }

  function rejectCurrent() {
    if (!job) return;
    toast.message('Rejected for now — nothing was published');
    setJob(null);
    setJobId(null);
    setGenerating(false);
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
              Browse the title library, generate one design at a time, and approve winners into a local queue.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit text-sm">
            {approved.length} approved locally
          </Badge>
        </div>

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

              <div className="max-h-[430px] space-y-2 overflow-y-auto rounded-lg border p-2">
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
                {!loadingTitles && titleCandidates.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">No titles found for this filter.</div>
                )}
              </div>
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
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="tee">Tee</TabsTrigger>
                      <TabsTrigger value="mug">Mug</TabsTrigger>
                      <TabsTrigger value="hoodie">Hoodie</TabsTrigger>
                    </TabsList>
                  </Tabs>
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
                    <Badge variant={job.status === 'done' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                      {job.status}
                    </Badge>
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

        {approved.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Approved queue</CardTitle>
              <CardDescription>Saved to localStorage for now. Phase 3 will wire Printify publishing.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {approved.map((item) => (
                  <div key={item.jobId} className="rounded-lg border p-3">
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">{item.niche}</Badge>
                      <Badge variant="outline">{item.type}</Badge>
                      {item.score && <Badge>{item.score.total}/35</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
