const BASE_URL = process.env.NEXT_PUBLIC_BENSON_API_URL || 'http://46.225.130.78:18792';
const AUTH_TOKEN = process.env.NEXT_PUBLIC_POD_STUDIO_AUTH_TOKEN || '';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function apiFetch<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
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

export interface GenerateRequest {
  niche: string;
  quantity: number;
  layout: string;
  productType: string;
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

export const api = {
  health: () => apiFetch<{ ok: boolean; version: string; uptime: number }>('/health'),
  getProducts: () => apiFetch<Product[]>('/api/products'),
  getProduct: (id: string) => apiFetch<Product>(`/api/products/${id}`),
  getProductsStats: () => apiFetch<ProductsStats>('/api/products/stats'),
  getScores: () => apiFetch<ScoreEntry[]>('/api/scores'),
  getRatings: () => apiFetch<RatingEntry[]>('/api/ratings'),
  postRating: (data: { designId: string; score: number; notes?: string }) =>
    apiFetch<{ ok: boolean }>('/api/ratings', { method: 'POST', body: data }),
  generate: (data: GenerateRequest) =>
    apiFetch<GeneratedDesign[]>('/api/generate', { method: 'POST', body: data }),
  publish: (data: unknown) =>
    apiFetch<{ ok: boolean; mocked: boolean }>('/api/publish', { method: 'POST', body: data }),
};
