import { z } from 'zod';

/**
 * 데이터 변환 결과
 */
export interface TransformResult<T = any> {
  success: boolean;
  value: T;
  error?: string;
  warnings?: string[];
}

/**
 * 변환 옵션
 */
export interface TransformOptions {
  defaultValue?: any;
  strict?: boolean;
  allowEmpty?: boolean;
  customValidator?: (value: any) => boolean;
}

/**
 * 필드 매핑 정의
 */
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformer?: string; // 변환 함수 이름
  defaultValue?: any;
  required?: boolean;
  validator?: string; // 검증 함수 이름
  options?: Record<string, any>;
}

/**
 * 마켓플레이스별 필드 매핑 프로필
 */
export interface MappingProfile {
  id: string;
  name: string;
  marketplace: string;
  mappings: FieldMapping[];
  metadata?: Record<string, any>;
}

/**
 * 안전한 데이터 변환 함수 라이브러리
 */
export class DataTransformer {
  
  /**
   * 문자열을 안전하게 숫자로 변환
   */
  static toNumber(value: any, options: TransformOptions = {}): TransformResult<number> {
    const { defaultValue = 0, strict = false, allowEmpty = false } = options;
    
    if (value === null || value === undefined) {
      return { success: true, value: defaultValue };
    }
    
    if (allowEmpty && value === '') {
      return { success: true, value: defaultValue };
    }
    
    // 숫자 타입인 경우 그대로 반환
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) {
        return { success: false, value: defaultValue, error: '유효하지 않은 숫자입니다' };
      }
      return { success: true, value };
    }
    
    // 문자열에서 숫자만 추출
    const cleaned = String(value).replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    
    if (isNaN(parsed)) {
      if (strict) {
        return { success: false, value: defaultValue, error: `'${value}'를 숫자로 변환할 수 없습니다` };
      }
      return { success: true, value: defaultValue, warnings: [`'${value}'를 숫자로 변환할 수 없어 기본값 ${defaultValue}을 사용합니다`] };
    }
    
    return { success: true, value: parsed };
  }
  
  /**
   * 문자열을 안전하게 불린으로 변환
   */
  static toBoolean(value: any, options: TransformOptions = {}): TransformResult<boolean> {
    const { defaultValue = false, strict = false } = options;
    
    if (value === null || value === undefined) {
      return { success: true, value: defaultValue };
    }
    
    if (typeof value === 'boolean') {
      return { success: true, value };
    }
    
    const stringValue = String(value).toLowerCase().trim();
    
    // 참으로 간주되는 값들
    const truthyValues = ['true', 'yes', 'y', '1', 'on', 'enabled', '사용', '판매중', 'active'];
    // 거짓으로 간주되는 값들
    const falsyValues = ['false', 'no', 'n', '0', 'off', 'disabled', '미사용', '품절', 'inactive'];
    
    if (truthyValues.includes(stringValue)) {
      return { success: true, value: true };
    }
    
    if (falsyValues.includes(stringValue)) {
      return { success: true, value: false };
    }
    
    if (strict) {
      return { success: false, value: defaultValue, error: `'${value}'를 불린으로 변환할 수 없습니다` };
    }
    
    return { success: true, value: defaultValue, warnings: [`'${value}'를 불린으로 변환할 수 없어 기본값 ${defaultValue}을 사용합니다`] };
  }
  
  /**
   * 문자열 정리 및 유효성 검사
   */
  static toString(value: any, options: TransformOptions & { maxLength?: number; minLength?: number } = {}): TransformResult<string> {
    const { defaultValue = '', allowEmpty = true, maxLength, minLength } = options;
    
    if (value === null || value === undefined) {
      return { success: true, value: defaultValue };
    }
    
    const stringValue = String(value).trim();
    
    if (!allowEmpty && stringValue === '') {
      return { success: false, value: defaultValue, error: '빈 문자열은 허용되지 않습니다' };
    }
    
    if (minLength && stringValue.length < minLength) {
      return { success: false, value: defaultValue, error: `문자열 길이가 최소 ${minLength}자 이상이어야 합니다` };
    }
    
    if (maxLength && stringValue.length > maxLength) {
      return { success: false, value: defaultValue, error: `문자열 길이가 최대 ${maxLength}자를 초과했습니다` };
    }
    
    return { success: true, value: stringValue };
  }
  
  /**
   * 가격 변환 (쉼표 제거, 통화 기호 제거)
   */
  static toPrice(value: any, options: TransformOptions = {}): TransformResult<number> {
    const { defaultValue = 0 } = options;
    
    if (value === null || value === undefined) {
      return { success: true, value: defaultValue };
    }
    
    // 통화 기호와 쉼표 제거
    const cleaned = String(value)
      .replace(/[₩$€£¥]/g, '') // 통화 기호 제거
      .replace(/[,\s]/g, '')   // 쉼표와 공백 제거
      .trim();
    
    return this.toNumber(cleaned, { ...options, defaultValue });
  }
  
  /**
   * 날짜 형식 변환
   */
  static toDate(value: any, options: TransformOptions & { format?: 'iso' | 'korean' | 'timestamp' } = {}): TransformResult<string> {
    const { defaultValue = '', format = 'iso' } = options;
    
    if (value === null || value === undefined) {
      return { success: true, value: defaultValue };
    }
    
    let date: Date;
    
    // 이미 Date 객체인 경우
    if (value instanceof Date) {
      date = value;
    }
    // 숫자 타임스탬프인 경우
    else if (typeof value === 'number') {
      date = new Date(value);
    }
    // 문자열인 경우
    else {
      date = new Date(String(value));
    }
    
    if (isNaN(date.getTime())) {
      return { success: false, value: defaultValue, error: `'${value}'는 유효한 날짜가 아닙니다` };
    }
    
    switch (format) {
      case 'iso':
        return { success: true, value: date.toISOString().split('T')[0] };
      case 'korean':
        return { success: true, value: date.toLocaleDateString('ko-KR') };
      case 'timestamp':
        return { success: true, value: date.getTime().toString() };
      default:
        return { success: true, value: date.toISOString() };
    }
  }
  
  /**
   * URL 유효성 검사 및 정리
   */
  static toUrl(value: any, options: TransformOptions & { protocol?: 'http' | 'https' } = {}): TransformResult<string> {
    const { defaultValue = '', protocol = 'https' } = options;
    
    if (value === null || value === undefined) {
      return { success: true, value: defaultValue };
    }
    
    let url = String(value).trim();
    
    if (url === '') {
      return { success: true, value: defaultValue };
    }
    
    // 프로토콜이 없는 경우 추가
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `${protocol}://${url}`;
    }
    
    try {
      new URL(url);
      return { success: true, value: url };
    } catch {
      return { success: false, value: defaultValue, error: `'${value}'는 유효한 URL이 아닙니다` };
    }
  }
  
  /**
   * 카테고리 변환 (매핑 테이블 기반)
   */
  static toCategory(value: any, categoryMap: Record<string, string>, options: TransformOptions = {}): TransformResult<string> {
    const { defaultValue = '기타' } = options;
    
    if (value === null || value === undefined) {
      return { success: true, value: defaultValue };
    }
    
    const stringValue = String(value).trim();
    
    // 정확한 매치 시도
    if (categoryMap[stringValue]) {
      return { success: true, value: categoryMap[stringValue] };
    }
    
    // 대소문자 무시하고 매치 시도
    const lowerValue = stringValue.toLowerCase();
    for (const [key, mapped] of Object.entries(categoryMap)) {
      if (key.toLowerCase() === lowerValue) {
        return { success: true, value: mapped };
      }
    }
    
    // 부분 매치 시도
    for (const [key, mapped] of Object.entries(categoryMap)) {
      if (stringValue.includes(key) || key.includes(stringValue)) {
        return { 
          success: true, 
          value: mapped, 
          warnings: [`'${stringValue}'을 '${mapped}'으로 부분 매칭했습니다`] 
        };
      }
    }
    
    return { 
      success: true, 
      value: defaultValue, 
      warnings: [`'${stringValue}'에 대한 카테고리 매핑을 찾지 못해 기본값 '${defaultValue}'을 사용합니다`] 
    };
  }
  
  /**
   * 배열 필드 처리 (쉼표로 구분된 문자열을 배열로)
   */
  static toArray(value: any, options: TransformOptions & { separator?: string; unique?: boolean } = {}): TransformResult<string[]> {
    const { defaultValue = [], separator = ',', unique = false } = options;
    
    if (value === null || value === undefined) {
      return { success: true, value: defaultValue };
    }
    
    let array: string[];
    
    if (Array.isArray(value)) {
      array = value.map(v => String(v).trim());
    } else {
      array = String(value)
        .split(separator)
        .map(item => item.trim())
        .filter(item => item !== '');
    }
    
    if (unique) {
      array = Array.from(new Set(array));
    }
    
    return { success: true, value: array };
  }
  
  /**
   * 필드 매핑 적용
   */
  static applyMapping(sourceData: Record<string, any>, mapping: FieldMapping): TransformResult {
    const { sourceField, targetField, transformer, defaultValue, required, validator, options = {} } = mapping;
    
    const sourceValue = sourceData[sourceField];
    
    // 필수 필드 검증
    if (required && (sourceValue === null || sourceValue === undefined || sourceValue === '')) {
      return { success: false, value: defaultValue, error: `필수 필드 '${sourceField}'가 비어있습니다` };
    }
    
    let transformedValue = sourceValue;
    const warnings: string[] = [];
    
    // 변환 함수 적용
    if (transformer && sourceValue !== null && sourceValue !== undefined) {
      const transformResult = this.applyTransformer(sourceValue, transformer, options);
      if (!transformResult.success && required) {
        return transformResult;
      }
      transformedValue = transformResult.value;
      if (transformResult.warnings) {
        warnings.push(...transformResult.warnings);
      }
    }
    
    // 기본값 처리
    if ((transformedValue === null || transformedValue === undefined || transformedValue === '') && defaultValue !== undefined) {
      transformedValue = defaultValue;
    }
    
    // 커스텀 검증
    if (validator && transformedValue !== null && transformedValue !== undefined) {
      const isValid = this.applyValidator(transformedValue, validator, options);
      if (!isValid && required) {
        return { success: false, value: defaultValue, error: `'${targetField}' 필드의 값이 유효하지 않습니다` };
      }
    }
    
    return { success: true, value: transformedValue, warnings: warnings.length > 0 ? warnings : undefined };
  }
  
  /**
   * 변환 함수 적용
   */
  private static applyTransformer(value: any, transformer: string, options: Record<string, any>): TransformResult {
    switch (transformer) {
      case 'toNumber':
        return this.toNumber(value, options);
      case 'toBoolean':
        return this.toBoolean(value, options);
      case 'toString':
        return this.toString(value, options);
      case 'toPrice':
        return this.toPrice(value, options);
      case 'toDate':
        return this.toDate(value, options);
      case 'toUrl':
        return this.toUrl(value, options);
      case 'toCategory':
        // categoryMap을 두 번째 매개변수로 올바르게 전달
        return this.toCategory(value, options.categoryMap || {}, options);
      case 'toArray':
        return this.toArray(value, options);
      default:
        return { success: true, value };
    }
  }
  
  /**
   * 검증 함수 적용
   */
  private static applyValidator(value: any, validator: string, options: Record<string, any>): boolean {
    switch (validator) {
      case 'required':
        return value !== null && value !== undefined && value !== '';
      case 'positive':
        return typeof value === 'number' && value > 0;
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url':
        return typeof value === 'string' && /^https?:\/\/.+/.test(value);
      case 'phone':
        return typeof value === 'string' && /^[\d-+().\s]+$/.test(value);
      case 'minLength':
        return typeof value === 'string' && value.length >= (options.minLength || 0);
      case 'maxLength':
        return typeof value === 'string' && value.length <= (options.maxLength || Number.MAX_SAFE_INTEGER);
      case 'range':
        return typeof value === 'number' && value >= (options.min || Number.MIN_SAFE_INTEGER) && value <= (options.max || Number.MAX_SAFE_INTEGER);
      default:
        return true;
    }
  }
  
  /**
   * 전체 데이터 변환 (매핑 프로필 적용)
   */
  static transformData(sourceData: Record<string, any>, profile: MappingProfile): {
    success: boolean;
    data: Record<string, any>;
    errors: string[];
    warnings: string[];
  } {
    const result: Record<string, any> = {};
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (const mapping of profile.mappings) {
      const transformResult = this.applyMapping(sourceData, mapping);
      
      if (transformResult.success) {
        result[mapping.targetField] = transformResult.value;
        if (transformResult.warnings) {
          warnings.push(...transformResult.warnings);
        }
      } else {
        errors.push(`${mapping.targetField}: ${transformResult.error}`);
        if (mapping.defaultValue !== undefined) {
          result[mapping.targetField] = mapping.defaultValue;
        }
      }
    }
    
    return {
      success: errors.length === 0,
      data: result,
      errors,
      warnings
    };
  }

  /**
   * 다중 레코드 변환 (배열 데이터 처리)
   */
  static transformMultipleData(sourceDataArray: Record<string, any>[], profile: MappingProfile): {
    success: boolean;
    data: Record<string, any>[];
    errors: string[];
    warnings: string[];
    successCount: number;
    failureCount: number;
  } {
    const results: Record<string, any>[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    sourceDataArray.forEach((sourceData, index) => {
      const transformResult = this.transformData(sourceData, profile);
      
      if (transformResult.success) {
        results.push(transformResult.data);
        successCount++;
      } else {
        // 실패한 경우에도 부분 데이터는 포함
        results.push(transformResult.data);
        failureCount++;
        allErrors.push(`행 ${index + 1}: ${transformResult.errors.join(', ')}`);
      }
      
      if (transformResult.warnings.length > 0) {
        allWarnings.push(`행 ${index + 1}: ${transformResult.warnings.join(', ')}`);
      }
    });

    return {
      success: failureCount === 0,
      data: results,
      errors: allErrors,
      warnings: allWarnings,
      successCount,
      failureCount
    };
  }

  /**
   * 프로필 검증 (매핑 프로필의 유효성 확인)
   */
  static validateProfile(profile: MappingProfile): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 기본 정보 검증
    if (!profile.id || !profile.name || !profile.marketplace) {
      errors.push('프로필에 필수 정보(id, name, marketplace)가 누락되었습니다');
    }

    // 매핑 유효성 검증
    if (!profile.mappings || profile.mappings.length === 0) {
      errors.push('매핑 정보가 없습니다');
    } else {
      const targetFields = new Set<string>();
      const sourceFields = new Set<string>();

      profile.mappings.forEach((mapping, index) => {
        // 필수 필드 확인
        if (!mapping.sourceField || !mapping.targetField) {
          errors.push(`매핑 ${index + 1}: 소스 필드와 타겟 필드가 필요합니다`);
        }

        // 중복 타겟 필드 확인
        if (targetFields.has(mapping.targetField)) {
          errors.push(`중복된 타겟 필드: ${mapping.targetField}`);
        }
        targetFields.add(mapping.targetField);
        sourceFields.add(mapping.sourceField);

        // 변환 함수 유효성 확인
        if (mapping.transformer && !['toString', 'toNumber', 'toBoolean', 'toPrice', 'toDate', 'toUrl', 'toCategory', 'toArray'].includes(mapping.transformer)) {
          warnings.push(`알 수 없는 변환 함수: ${mapping.transformer}`);
        }

        // 검증 함수 유효성 확인
        if (mapping.validator && !['required', 'positive', 'email', 'url', 'phone', 'minLength', 'maxLength', 'range'].includes(mapping.validator)) {
          warnings.push(`알 수 없는 검증 함수: ${mapping.validator}`);
        }

        // 필수 필드 설정 확인
        if (mapping.required && !mapping.defaultValue) {
          warnings.push(`필수 필드 ${mapping.targetField}에 기본값이 설정되지 않았습니다`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}