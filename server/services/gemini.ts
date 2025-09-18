import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ProductAnalysis {
  category: string;
  subcategory: string;
  tags: string[];
  season: string;
  gender: string;
  ageGroup: string;
  recommendedPrice: number;
  confidence: number;
  description: string;
  style: string;
}

export async function analyzeProduct(product: {
  name: string;
  description?: string;
  price: string;
  imageUrl?: string;
  source: string;
}): Promise<ProductAnalysis> {
  try {
    const systemPrompt = `당신은 패션 상품 분석 전문가입니다. 
주어진 상품 정보를 분석하여 다음 JSON 형식으로 응답해주세요:
{
  "category": "상위 카테고리 (예: 상의, 하의, 아우터, 신발, 액세서리)",
  "subcategory": "세부 카테고리 (예: 티셔츠, 셔츠, 청바지, 스니커즈)",
  "tags": ["해시태그1", "해시태그2", "해시태그3"],
  "season": "시즌 (봄, 여름, 가을, 겨울, 사계절)",
  "gender": "성별 (남성, 여성, 공용)",
  "ageGroup": "연령대 (10대, 20대, 30대, 40대, 50대이상, 전연령)",
  "recommendedPrice": 추천가격,
  "confidence": 0.0-1.0,
  "description": "상품 설명",
  "style": "스타일 (캐주얼, 정장, 스포츠, 스트릿, 빈티지 등)"
}`;

    const productInfo = `
상품명: ${product.name}
설명: ${product.description || ""}
현재 가격: ${product.price}
출처: ${product.source}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            category: { type: "string" },
            subcategory: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            season: { type: "string" },
            gender: { type: "string" },
            ageGroup: { type: "string" },
            recommendedPrice: { type: "number" },
            confidence: { type: "number" },
            description: { type: "string" },
            style: { type: "string" }
          },
          required: ["category", "subcategory", "tags", "season", "gender", "ageGroup", "recommendedPrice", "confidence", "description", "style"]
        }
      },
      contents: productInfo
    });

    const rawJson = response.text;
    if (rawJson) {
      const analysis: ProductAnalysis = JSON.parse(rawJson);
      return analysis;
    } else {
      throw new Error("Empty response from Gemini AI");
    }
  } catch (error) {
    console.error("Failed to analyze product with Gemini AI:", error);
    // Return fallback analysis
    return {
      category: "기타",
      subcategory: "미분류",
      tags: ["신상품"],
      season: "사계절",
      gender: "공용",
      ageGroup: "전연령",
      recommendedPrice: parseFloat(product.price) || 0,
      confidence: 0.1,
      description: product.description || product.name,
      style: "캐주얼"
    };
  }
}

export async function generateTrendReport(products: any[]): Promise<{
  trendingCategories: { category: string; count: number; growth: number }[];
  seasonalTrends: { season: string; percentage: number }[];
  priceAnalysis: { avgPrice: number; priceRange: { min: number; max: number } };
  recommendations: string[];
}> {
  try {
    const systemPrompt = `패션 트렌드 분석 전문가로서 주어진 상품 데이터를 분석하여 JSON 형식으로 트렌드 리포트를 작성해주세요:
{
  "trendingCategories": [{"category": "카테고리명", "count": 수량, "growth": 성장률}],
  "seasonalTrends": [{"season": "시즌", "percentage": 비율}],
  "priceAnalysis": {"avgPrice": 평균가격, "priceRange": {"min": 최저가, "max": 최고가}},
  "recommendations": ["추천사항1", "추천사항2", "추천사항3"]
}`;

    const productData = products.map(p => ({
      category: p.category,
      price: p.price,
      season: p.season,
      tags: p.tags
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json"
      },
      contents: `상품 데이터: ${JSON.stringify(productData.slice(0, 100))}`
    });

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson);
    } else {
      throw new Error("Empty response from Gemini AI");
    }
  } catch (error) {
    console.error("Failed to generate trend report:", error);
    return {
      trendingCategories: [],
      seasonalTrends: [],
      priceAnalysis: { avgPrice: 0, priceRange: { min: 0, max: 0 } },
      recommendations: []
    };
  }
}
