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
export type DesignMode = 'artwork-only' | 'combined';

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

export interface GenerateRequest {
  title: string;
  niche: string;
  subNiche?: string;
  type: ProductType;
  layout: 'centered-badge';
  mode: DesignMode;
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
};
