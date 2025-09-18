import { storage } from "../storage";
import { analyzeProduct } from "./gemini";

// Simulated product data for different sources
const MOCK_PRODUCTS = {
  naver: [
    { name: "오버핏 기본 셔츠", price: "29000", description: "편안한 오버핏 셔츠", imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab" },
    { name: "클래식 화이트 스니커즈", price: "89000", description: "데일리 화이트 스니커즈", imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772" },
    { name: "미니멀 롱 코트", price: "159000", description: "겨울 미니멀 코트", imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea" },
    { name: "스트레이트 데님 진", price: "79000", description: "빈티지 스트레이트 진", imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d" },
    { name: "니트 스웨터", price: "45000", description: "따뜻한 겨울 니트", imageUrl: "https://images.unsplash.com/photo-1576566588028-4147f3842f27" }
  ],
  coupang: [
    { name: "캐주얼 후드티", price: "35000", description: "편안한 캐주얼 후드티", imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7" },
    { name: "운동화 런닝화", price: "65000", description: "운동용 런닝화", imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff" },
    { name: "체크 셔츠", price: "42000", description: "클래식 체크 셔츠", imageUrl: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf" },
    { name: "청자켓", price: "85000", description: "데님 재킷", imageUrl: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256" },
    { name: "크로스백", price: "55000", description: "미니멀 크로스백", imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62" }
  ],
  zigzag: [
    { name: "플리츠 스커트", price: "38000", description: "여성용 플리츠 스커트", imageUrl: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1" },
    { name: "블라우스", price: "48000", description: "오피스 블라우스", imageUrl: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5" },
    { name: "하이힐", price: "95000", description: "정장용 하이힐", imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2" },
    { name: "원피스", price: "72000", description: "데일리 원피스", imageUrl: "https://images.unsplash.com/photo-1566479179817-c7a8e1f01a72" },
    { name: "가디건", price: "52000", description: "봄 가을 가디건", imageUrl: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f" }
  ]
};

export async function scrapeProducts(source: "naver" | "coupang" | "zigzag"): Promise<void> {
  console.log(`Starting to scrape products from ${source}`);
  
  // Create scraping job
  const job = await storage.createScrapingJob({
    source,
    status: "running"
  });

  try {
    await storage.updateScrapingJob(job.id, {
      status: "running",
      startedAt: new Date()
    });

    const mockProducts = MOCK_PRODUCTS[source] || [];
    
    await storage.updateScrapingJob(job.id, {
      productsFound: mockProducts.length
    });

    let processed = 0;
    
    for (const mockProduct of mockProducts) {
      try {
        // Create product
        const product = await storage.createProduct({
          name: mockProduct.name,
          description: mockProduct.description,
          price: mockProduct.price,
          imageUrl: mockProduct.imageUrl,
          source,
          sourceUrl: `https://${source}.com/product/${Math.random().toString(36).substr(2, 9)}`,
          sourceProductId: Math.random().toString(36).substr(2, 9),
          tags: [],
        });

        // Analyze with Gemini AI
        try {
          const analysis = await analyzeProduct({
            name: product.name,
            description: product.description || "",
            price: product.price,
            imageUrl: product.imageUrl || "",
            source: product.source
          });

          await storage.updateProductAiAnalysis(product.id, analysis);
          console.log(`Analyzed product: ${product.name}`);
        } catch (analysisError) {
          console.error(`Failed to analyze product ${product.name}:`, analysisError);
        }

        processed++;
        await storage.updateScrapingJob(job.id, {
          productsProcessed: processed
        });

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (productError) {
        console.error(`Failed to process product ${mockProduct.name}:`, productError);
      }
    }

    await storage.updateScrapingJob(job.id, {
      status: "completed",
      completedAt: new Date()
    });

    console.log(`Completed scraping ${processed} products from ${source}`);
  } catch (error) {
    console.error(`Scraping job failed for ${source}:`, error);
    await storage.updateScrapingJob(job.id, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      completedAt: new Date()
    });
  }
}

export async function startScheduledScraping(): Promise<void> {
  console.log("Starting scheduled scraping...");
  
  // Scrape from all sources
  const sources: ("naver" | "coupang" | "zigzag")[] = ["naver", "coupang", "zigzag"];
  
  for (const source of sources) {
    try {
      await scrapeProducts(source);
      // Wait between sources
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to scrape ${source}:`, error);
    }
  }
}
