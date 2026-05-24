// Proxy prefix — all calls go through Next.js server-side proxy to avoid mixed content
const PROXY_PREFIX = '/api/proxy';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function apiFetch<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const response = await fetch(`${PROXY_PREFIX}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

async function apiFetchFormData<T>(endpoint: string, formData: FormData): Promise<T> {
  const response = await fetch(`${PROXY_PREFIX}${endpoint}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

async function apiFetchBlob(endpoint: string): Promise<Blob> {
  const response = await fetch(`${PROXY_PREFIX}${endpoint}`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.blob();
}

// --- Typed API functions ---

export interface Product {
  id: string;
  title: string;
  description: string;
  images: string[];
  variants: Array<{
    id: string;
    sku: string;
    price: number;
    stock: number;
  }>;
}

export interface ProductsStats {
  total: number;
  by_niche: Record<string, number>;
  last_updated: string;
}

export interface ScoreEntry {
  timestamp: string;
  designId: string;
  title: string | null;
  imagePath: string;
  niche: string;
  product: string;
  layout: string;
  score: {
    print_clarity: number;
    composition: number;
    niche_fit: number;
    originality: number;
    commercial_appeal: number;
    total: number;
    pass: boolean;
    one_sentence_critique: string;
  };
}

export interface RatingEntry {
  designId: string;
  score: number;
  notes?: string;
  timestamp: string;
}

export interface TitleLibraryResponse {
  niches: Array<{
    niche: string;
    subNiches: Array<{
      subNiche: string;
      count: number;
      candidates: string[];
      model: string;
      generatedAt: string;
    }>;
  }>;
}

export type ProductType = 'tee' | 'mug';
export type DesignMode = 'artwork-only' | 'combined' | 'text-overlay-ai';
export type Provider = 'fal' | 'local';

export interface ColourMeta {
  name: string;
  hex: string;
  available: string[];
}

export interface VariantsResponse {
  productType: string;
  colours: ColourMeta[];
  sizes: string[];
  sizePricing: Record<string, number>;
}

export interface PlacementPreset {
  label: string;
  description: string;
  x: number;
  y: number;
  scale: number;
}

export interface PlacementBounds {
  min: number;
  max: number;
  step: number;
}

export interface PlacementResponse {
  presets: Record<string, PlacementPreset>;
  nicheDefaults: Record<string, string>;
  manualBounds: {
    x: PlacementBounds;
    y: PlacementBounds;
    scale: PlacementBounds;
  };
  resolved: (PlacementPreset & { source: string }) | null;
}

export interface PlacementValue {
  preset?: string;
  x?: number;
  y?: number;
  scale?: number;
}

export interface GenerateRequest {
  title: string;
  niche: string;
  subNiche?: string;
  type: ProductType;
  layout: 'centered-badge';
  mode: DesignMode;
  provider?: Provider;
  critic: boolean;
}

export interface GenerateResponse {
  jobId: string;
  status: 'running' | 'done' | 'failed';
  startedAt: string;
}

export interface JobStatus {
  jobId: string;
  title: string;
  niche: string;
  mode?: DesignMode | 'text-only';
  status: 'running' | 'done' | 'failed';
  score: null | {
    verdict: 'PASS' | 'FAIL';
    total: number;
  };
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  hasComposite: boolean;
  hasAi: boolean;
  stdoutTail: string[];
}

export interface GeneratedDesign {
  designId: string;
  title: string;
  niche: string;
  layout: string;
  imageUrl: string;
  aiScore: number;
  productType: string;
  createdAt: string;
}

export interface PublishRequest {
  jobId: string;
  productType: ProductType;
  title: string;
  niche: string;
  subNiche: string;
  priceGbp: number;
  channels: Array<'shopify' | 'etsy'>;
  colours?: string[];   // Optional: colour names (e.g. ['Black','White']); defaults to all
  sizes?: string[];     // Optional: size names (e.g. ['M','L','XL']); defaults to all
  placement?: { preset?: string; x?: number; y?: number; scale?: number };
}

export interface PublishResponse {
  ok: boolean;
  partial: boolean;
  title: string;
  productType: string;
  priceGbp: number;
  publishedAt: string;
  channels: string[];
  results: Record<string, {
    ok: boolean;
    printifyProductId?: string;
    shopId?: number;
    error?: string;
    warning?: string;
    detail?: string;
  }>;
}

export interface UploadDesignResponse {
  jobId: string;
  title: string;
  niche: string;
  subNiche?: string;
  status: 'done';
  uploadedAt: string;
}

export interface Logo {
  id: string;
  name: string;
  slug?: string;
  filename?: string | null;
  fileSize?: number;
  createdAt: string;
  tags?: string[];
  printifyImageId?: string | null;
  viewUrl: string;
}

export interface LogosResponse {
  logos: Logo[];
  count: number;
}

export interface UploadLogoResponse {
  id: string;
  name: string;
  filename: string;
  printifyImageId: string | null;
  viewUrl: string;
  createdAt: string;
}

export interface PublishUniformRequest {
  logoId: string;
  productType: ProductType;
  priceGbp: number;
  colours?: string[];
  sizes?: string[];
  channels?: Array<'shopify' | 'etsy'>;
  placement?: string | PlacementValue;
  title?: string;
  description?: string;
}

export interface PublishUniformResponse extends PublishResponse {
  logoId: string;
  placement: { x: number; y: number; scale: number; source: string };
}

export interface Asset {
  id: string;
  jobId: string | null;
  slug: string;
  title: string | null;
  niche: string | null;
  subNiche: string | null;
  mode: string | null;
  productType: string | null;
  provider: string | null;
  layerType: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
  tags?: string[];
  printifyImageId?: string | null;
  viewUrl: string | null;
  is_approved?: boolean;
  approvedAt?: string;
}

export interface AssetsResponse {
  assets: Asset[];
  total: number;
  filtered: number;
}

export interface ApproveAssetResponse {
  ok: boolean;
  id: string;
  is_approved: boolean;
  approvedAt: string | null;
}

export interface ComposedPlacement {
  assetId: string;
  placement: string | PlacementValue;
}

export interface PublishComposedRequest {
  blueprintId: number;
  productType: ProductType;
  priceGbp: number;
  colours?: string[];
  sizes?: string[];
  channels?: Array<'shopify' | 'etsy'>;
  title?: string;
  description?: string;
  tags?: string[];
  placements: ComposedPlacement[];
}

export interface PublishComposedResponse extends PublishResponse {
  placementCount: number;
  positions: string[];
}

export const api = {
  health: () => apiFetch<{ ok: boolean; version: string; uptime: number }>('/health'),
  getProducts: () => apiFetch<Product[]>('/api/products'),
  getProduct: (id: string) => apiFetch<Product>(`/api/products/${id}`),
  getProductsStats: () => apiFetch<ProductsStats>('/api/products/stats'),
  getScores: () => apiFetch<ScoreEntry[]>('/api/scores'),
  getRatings: () => apiFetch<RatingEntry[]>('/api/ratings'),
  postRating: (data: { designId: string; score: number; notes?: string }) =>
    apiFetch<{ ok: boolean }>('/api/ratings', { method: 'POST', body: data }),

  // --- Phase 3 generation/publishing APIs ---
  getTitles: () => apiFetch<TitleLibraryResponse>('/api/titles'),
  generate: (data: GenerateRequest) =>
    apiFetch<GenerateResponse>('/api/generate', { method: 'POST', body: data }),
  getJob: (jobId: string) => apiFetch<JobStatus>(`/api/generate/${jobId}`),
  getJobImage: (jobId: string, type: 'composite' | 'ai') =>
    apiFetchBlob(`/api/generate/${jobId}/image?type=${type}`),
  publish: (req: PublishRequest | { designId: string }) =>
    apiFetch<PublishResponse>('/api/publish', { method: 'POST', body: req }),
  uploadDesign: (formData: FormData) =>
    apiFetchFormData<UploadDesignResponse>('/api/upload-design', formData),
  getVariants: (productType: ProductType = 'tee') =>
    apiFetch<VariantsResponse>(`/api/variants?productType=${productType}`),

  getPlacement: (subNiche?: string) =>
    apiFetch<PlacementResponse>(`/api/placement${subNiche ? `?subNiche=${encodeURIComponent(subNiche)}` : ''}`),

  deleteProduct: (printifyProductId: string, shopId: number) =>
    apiFetch<{ ok: boolean; printifyProductId: string; shopId: number }>(
      `/api/products/${encodeURIComponent(printifyProductId)}?shopId=${shopId}`,
      { method: 'DELETE' }
    ),

  updateProduct: (
    printifyProductId: string,
    shopId: number,
    fields: { title?: string; description?: string; tags?: string[]; priceGbp?: number }
  ) =>
    apiFetch<{ ok: boolean; printifyProductId: string; shopId: number; updated: string[]; republished: boolean }>(
      `/api/products/${encodeURIComponent(printifyProductId)}?shopId=${shopId}`,
      { method: 'PUT', body: JSON.stringify(fields), headers: { 'Content-Type': 'application/json' } }
    ),

  getProductDetails: (printifyProductId: string, shopId: number) =>
    apiFetch<{ id: string; title: string; description: string; tags: string[]; variants: Array<{ id: number; price: number; is_enabled: boolean }> }>(
      `/api/products/${encodeURIComponent(printifyProductId)}/details?shopId=${shopId}`
    ),

  // --- Logos + Uniforms ---
  getLogos: () => apiFetch<LogosResponse>('/api/logos'),
  uploadLogo: (formData: FormData) =>
    apiFetchFormData<UploadLogoResponse>('/api/logos/upload', formData),
  deleteLogo: (logoId: string) =>
    apiFetch<{ ok: boolean; id: string }>(`/api/logos/${encodeURIComponent(logoId)}`, { method: 'DELETE' }),
  publishUniform: (req: PublishUniformRequest) =>
    apiFetch<PublishUniformResponse>('/api/publish/uniform', { method: 'POST', body: req }),
  publishComposed: (req: PublishComposedRequest) =>
    apiFetch<PublishComposedResponse>('/api/publish/composed', { method: 'POST', body: req }),

  // --- Asset approval (Fix 1: server-side approved queue) ---
  getAssets: (params?: { approved?: boolean; layerType?: string; niche?: string; subNiche?: string; mode?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.approved !== undefined) qs.set('approved', String(params.approved));
    if (params?.layerType) qs.set('layerType', params.layerType);
    if (params?.niche) qs.set('niche', params.niche);
    if (params?.subNiche) qs.set('subNiche', params.subNiche);
    if (params?.mode) qs.set('mode', params.mode);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<AssetsResponse>(`/api/assets${suffix}`);
  },
  approveAsset: (assetId: string, approved: boolean) =>
    apiFetch<ApproveAssetResponse>(`/api/assets/${encodeURIComponent(assetId)}/approve`, {
      method: 'POST',
      body: { approved },
    }),
};
