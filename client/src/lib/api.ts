import { apiRequest } from "./queryClient";

export interface ProductStats {
  total: number;
  analyzed: number;
  registered: number;
  synced: number;
}

export interface TrendReport {
  trendingCategories: { category: string; count: number; growth: number }[];
  seasonalTrends: { season: string; percentage: number }[];
  priceAnalysis: { avgPrice: number; priceRange: { min: number; max: number } };
  recommendations: string[];
}

export interface ScrapingJob {
  id: string;
  source: string;
  status: string;
  productsFound: number;
  productsProcessed: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export interface RegistrationJob {
  id: string;
  type: 'individual' | 'selected' | 'bulk';
  status: 'pending' | 'running' | 'completed' | 'failed';
  productIds: string[];
  totalProducts: number;
  processedProducts: number;
  successCount: number;
  failureCount: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const api = {
  // Product operations
  async getProducts(params?: { limit?: number; offset?: number; source?: string; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.source) searchParams.set('source', params.source);
    if (params?.status) searchParams.set('status', params.status);
    
    const url = `/api/products${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  },

  async getProduct(id: string) {
    const response = await fetch(`/api/products/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
  },

  async updateProduct(id: string, updates: any) {
    return apiRequest('PUT', `/api/products/${id}`, updates);
  },

  async deleteProduct(id: string) {
    return apiRequest('DELETE', `/api/products/${id}`);
  },

  // Stats operations
  async getProductStats(): Promise<ProductStats> {
    const response = await fetch('/api/stats/products');
    if (!response.ok) throw new Error('Failed to fetch product stats');
    return response.json();
  },

  async getTrendReport(): Promise<TrendReport> {
    const response = await fetch('/api/stats/trend-report');
    if (!response.ok) throw new Error('Failed to fetch trend report');
    return response.json();
  },

  // Scraping operations
  async startScraping(source?: string) {
    return apiRequest('POST', '/api/scraping/start', { source });
  },

  async getScrapingJobs(limit?: number): Promise<ScrapingJob[]> {
    const url = `/api/scraping/jobs${limit ? `?limit=${limit}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch scraping jobs');
    return response.json();
  },

  // Marketplace sync operations
  async getMarketplaceSyncs(productId?: string) {
    const url = `/api/marketplace-syncs${productId ? `?productId=${productId}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch marketplace syncs');
    return response.json();
  },

  async createMarketplaceSync(data: any) {
    return apiRequest('POST', '/api/marketplace-syncs', data);
  },

  // Registration operations
  async registerSelectedProducts(productIds: string[]) {
    return apiRequest('POST', '/api/registration/selected', { productIds });
  },

  async registerAllProducts() {
    return apiRequest('POST', '/api/registration/bulk');
  },

  async getRegistrationJobs(limit?: number) {
    const url = `/api/registration/jobs${limit ? `?limit=${limit}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch registration jobs');
    return response.json();
  },

  async getRegistrationJob(id: string) {
    const response = await fetch(`/api/registration/jobs/${id}`);
    if (!response.ok) throw new Error('Failed to fetch registration job');
    return response.json();
  },

  // Subscription operations
  async createSubscription() {
    return apiRequest('POST', '/api/get-or-create-subscription');
  }
};
