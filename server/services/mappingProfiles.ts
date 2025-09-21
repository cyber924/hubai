import { MappingProfile, FieldMapping } from './dataTransformer';

/**
 * 카테고리 매핑 데이터
 */
export const CATEGORY_MAPPINGS = {
  // 한글 → 영문
  '상의': 'tops',
  '하의': 'bottoms', 
  '원피스': 'dresses',
  '아우터': 'outerwear',
  '신발': 'shoes',
  '가방': 'bags',
  '악세서리': 'accessories',
  '언더웨어': 'underwear',
  '스포츠웨어': 'sportswear',
  '잠옷': 'sleepwear',
  
  // 영문 → 한글
  'tops': '상의',
  'bottoms': '하의',
  'dresses': '원피스', 
  'outerwear': '아우터',
  'shoes': '신발',
  'bags': '가방',
  'accessories': '악세서리',
  'underwear': '언더웨어',
  'sportswear': '스포츠웨어',
  'sleepwear': '잠옷'
};

/**
 * 브랜드 매핑 데이터
 */
export const BRAND_MAPPINGS = {
  // 일반적인 브랜드 변형 처리
  'zara': 'ZARA',
  'h&m': 'H&M',
  'uniqlo': 'UNIQLO',
  'gu': 'GU',
  'nike': 'Nike',
  'adidas': 'Adidas'
};

/**
 * 카페24 매핑 프로필
 */
export const CAFE24_MAPPING_PROFILE: MappingProfile = {
  id: 'cafe24-standard',
  name: '카페24 표준 양식',
  marketplace: 'cafe24',
  mappings: [
    {
      sourceField: 'product_name',
      targetField: '상품명',
      transformer: 'toString',
      required: true,
      options: { maxLength: 100 }
    },
    {
      sourceField: 'price',
      targetField: '판매가',
      transformer: 'toPrice',
      required: true,
      validator: 'positive'
    },
    {
      sourceField: 'original_price',
      targetField: '정가',
      transformer: 'toPrice',
      defaultValue: 0
    },
    {
      sourceField: 'category',
      targetField: '카테고리',
      transformer: 'toCategory',
      options: { categoryMap: CATEGORY_MAPPINGS },
      defaultValue: '기타'
    },
    {
      sourceField: 'brand',
      targetField: '브랜드',
      transformer: 'toString',
      options: { maxLength: 50 }
    },
    {
      sourceField: 'description',
      targetField: '상품설명',
      transformer: 'toString',
      options: { maxLength: 1000 }
    },
    {
      sourceField: 'images',
      targetField: '이미지URL',
      transformer: 'toArray',
      options: { separator: ',', unique: true }
    },
    {
      sourceField: 'stock',
      targetField: '재고수량',
      transformer: 'toNumber',
      defaultValue: 0,
      validator: 'positive'
    },
    {
      sourceField: 'is_sale',
      targetField: '판매상태',
      transformer: 'toBoolean',
      defaultValue: true
    },
    {
      sourceField: 'weight',
      targetField: '무게',
      transformer: 'toNumber',
      defaultValue: 0
    },
    {
      sourceField: 'shipping_fee',
      targetField: '배송비',
      transformer: 'toPrice',
      defaultValue: 0
    },
    {
      sourceField: 'origin_country',
      targetField: '원산지',
      transformer: 'toString',
      defaultValue: '상품상세참조'
    },
    {
      sourceField: 'material',
      targetField: '소재',
      transformer: 'toString',
      defaultValue: '상품상세참조'
    },
    {
      sourceField: 'color',
      targetField: '색상',
      transformer: 'toString'
    },
    {
      sourceField: 'size',
      targetField: '사이즈',
      transformer: 'toString'
    }
  ],
  metadata: {
    version: '1.0',
    description: '카페24 쇼핑몰 표준 상품 등록 양식',
    requiredFields: ['상품명', '판매가'],
    encoding: 'UTF-8'
  }
};

/**
 * 네이버 쇼핑 매핑 프로필
 */
export const NAVER_MAPPING_PROFILE: MappingProfile = {
  id: 'naver-shopping',
  name: '네이버 쇼핑 상품등록',
  marketplace: 'naver',
  mappings: [
    {
      sourceField: 'product_name',
      targetField: '상품명',
      transformer: 'toString',
      required: true,
      options: { maxLength: 50 }
    },
    {
      sourceField: 'price',
      targetField: '판매가격',
      transformer: 'toPrice',
      required: true,
      validator: 'positive'
    },
    {
      sourceField: 'category',
      targetField: '카테고리ID',
      transformer: 'toString',
      required: true
    },
    {
      sourceField: 'brand',
      targetField: '브랜드',
      transformer: 'toString',
      required: true
    },
    {
      sourceField: 'model',
      targetField: '모델명',
      transformer: 'toString',
      defaultValue: ''
    },
    {
      sourceField: 'images',
      targetField: '대표이미지URL',
      transformer: 'toString',
      required: true,
      validator: 'url'
    },
    {
      sourceField: 'additional_images',
      targetField: '추가이미지URL',
      transformer: 'toArray',
      options: { separator: '|' }
    },
    {
      sourceField: 'shipping_fee',
      targetField: '배송비',
      transformer: 'toPrice',
      defaultValue: 0
    },
    {
      sourceField: 'delivery_type',
      targetField: '배송방법',
      transformer: 'toString',
      defaultValue: '택배'
    },
    {
      sourceField: 'origin_country',
      targetField: '제조국',
      transformer: 'toString',
      defaultValue: '대한민국'
    },
    {
      sourceField: 'as_info',
      targetField: 'A/S정보',
      transformer: 'toString',
      defaultValue: '판매자 직접 A/S'
    }
  ],
  metadata: {
    version: '1.0',
    description: '네이버 쇼핑 상품 등록 양식',
    requiredFields: ['상품명', '판매가격', '카테고리ID', '브랜드', '대표이미지URL'],
    encoding: 'UTF-8',
    delimiter: '\t'
  }
};

/**
 * 쿠팡 매핑 프로필
 */
export const COUPANG_MAPPING_PROFILE: MappingProfile = {
  id: 'coupang-seller',
  name: '쿠팡 셀러 상품등록',
  marketplace: 'coupang',
  mappings: [
    {
      sourceField: 'product_name',
      targetField: '상품명',
      transformer: 'toString',
      required: true,
      options: { maxLength: 80 }
    },
    {
      sourceField: 'brand',
      targetField: '브랜드',
      transformer: 'toString',
      required: true
    },
    {
      sourceField: 'category_code',
      targetField: '카테고리코드',
      transformer: 'toString',
      required: true
    },
    {
      sourceField: 'price',
      targetField: '판매가',
      transformer: 'toPrice',
      required: true,
      validator: 'positive'
    },
    {
      sourceField: 'discount_price',
      targetField: '할인가',
      transformer: 'toPrice',
      defaultValue: 0
    },
    {
      sourceField: 'stock',
      targetField: '재고수량',
      transformer: 'toNumber',
      required: true,
      validator: 'positive'
    },
    {
      sourceField: 'main_image',
      targetField: '대표이미지',
      transformer: 'toUrl',
      required: true,
      validator: 'url'
    },
    {
      sourceField: 'detail_images',
      targetField: '상세이미지',
      transformer: 'toArray',
      options: { separator: ',' }
    },
    {
      sourceField: 'description',
      targetField: '상품상세',
      transformer: 'toString',
      options: { maxLength: 2000 }
    },
    {
      sourceField: 'keywords',
      targetField: '검색키워드',
      transformer: 'toArray',
      options: { separator: ',', unique: true }
    },
    {
      sourceField: 'adult_product',
      targetField: '성인상품여부',
      transformer: 'toBoolean',
      defaultValue: false
    },
    {
      sourceField: 'parallel_import',
      targetField: '병행수입여부',
      transformer: 'toBoolean',
      defaultValue: false
    },
    {
      sourceField: 'overseas_purchase',
      targetField: '해외구매대행여부',
      transformer: 'toBoolean',
      defaultValue: false
    }
  ],
  metadata: {
    version: '1.0',
    description: '쿠팡 셀러 상품 등록 양식',
    requiredFields: ['상품명', '브랜드', '카테고리코드', '판매가', '재고수량', '대표이미지'],
    encoding: 'UTF-8'
  }
};

/**
 * 지그재그 매핑 프로필
 */
export const ZIGZAG_MAPPING_PROFILE: MappingProfile = {
  id: 'zigzag-fashion',
  name: '지그재그 패션 상품등록',
  marketplace: 'zigzag',
  mappings: [
    {
      sourceField: 'product_name',
      targetField: '상품명',
      transformer: 'toString',
      required: true,
      options: { maxLength: 60 }
    },
    {
      sourceField: 'price',
      targetField: '정가',
      transformer: 'toPrice',
      required: true,
      validator: 'positive'
    },
    {
      sourceField: 'sale_price',
      targetField: '할인가',
      transformer: 'toPrice',
      defaultValue: 0
    },
    {
      sourceField: 'category',
      targetField: '카테고리',
      transformer: 'toCategory',
      options: { categoryMap: CATEGORY_MAPPINGS },
      required: true
    },
    {
      sourceField: 'style',
      targetField: '스타일',
      transformer: 'toString',
      defaultValue: ''
    },
    {
      sourceField: 'color',
      targetField: '색상',
      transformer: 'toString',
      defaultValue: ''
    },
    {
      sourceField: 'size_info',
      targetField: '사이즈정보',
      transformer: 'toString',
      defaultValue: 'FREE'
    },
    {
      sourceField: 'material',
      targetField: '소재정보',
      transformer: 'toString',
      defaultValue: '상품상세참조'
    },
    {
      sourceField: 'season',
      targetField: '시즌',
      transformer: 'toString',
      defaultValue: '사계절'
    },
    {
      sourceField: 'main_image',
      targetField: '메인이미지URL',
      transformer: 'toUrl',
      required: true,
      validator: 'url'
    },
    {
      sourceField: 'sub_images',
      targetField: '서브이미지URL',
      transformer: 'toArray',
      options: { separator: ',' }
    },
    {
      sourceField: 'model_size',
      targetField: '모델착용사이즈',
      transformer: 'toString',
      defaultValue: ''
    },
    {
      sourceField: 'fit_type',
      targetField: '핏타입',
      transformer: 'toString',
      defaultValue: '노멀핏'
    },
    {
      sourceField: 'thickness',
      targetField: '두께감',
      transformer: 'toString',
      defaultValue: '보통'
    },
    {
      sourceField: 'elasticity',
      targetField: '신축성',
      transformer: 'toString',
      defaultValue: '보통'
    },
    {
      sourceField: 'lining',
      targetField: '안감여부',
      transformer: 'toBoolean',
      defaultValue: false
    },
    {
      sourceField: 'transparency',
      targetField: '비침여부',
      transformer: 'toBoolean',
      defaultValue: false
    }
  ],
  metadata: {
    version: '1.0',
    description: '지그재그 패션 상품 등록 양식',
    requiredFields: ['상품명', '정가', '카테고리', '메인이미지URL'],
    encoding: 'UTF-8',
    fashionSpecific: true
  }
};

/**
 * 매핑 프로필 레지스트리
 */
export const MAPPING_PROFILES: Record<string, MappingProfile> = {
  'cafe24-standard': CAFE24_MAPPING_PROFILE,
  'naver-shopping': NAVER_MAPPING_PROFILE,
  'coupang-seller': COUPANG_MAPPING_PROFILE,
  'zigzag-fashion': ZIGZAG_MAPPING_PROFILE
};

/**
 * 마켓플레이스별 프로필 가져오기
 */
export function getMappingProfilesByMarketplace(marketplace: string): MappingProfile[] {
  return Object.values(MAPPING_PROFILES).filter(profile => 
    profile.marketplace === marketplace
  );
}

/**
 * 프로필 ID로 매핑 프로필 가져오기
 */
export function getMappingProfile(profileId: string): MappingProfile | null {
  return MAPPING_PROFILES[profileId] || null;
}

/**
 * 사용 가능한 변환 함수 목록
 */
export const AVAILABLE_TRANSFORMERS = [
  'toString',
  'toNumber', 
  'toBoolean',
  'toPrice',
  'toDate',
  'toUrl',
  'toCategory',
  'toArray'
];

/**
 * 사용 가능한 검증 함수 목록
 */
export const AVAILABLE_VALIDATORS = [
  'required',
  'positive',
  'email',
  'url',
  'phone'
];