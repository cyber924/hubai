import * as crypto from 'crypto';

export interface CSVParseResult {
  headers: string[];
  delimiter: string;
  encoding: string;
  lineCount: number;
  fingerprint: string;
  hasQuotedFields: boolean;
  isConsistent: boolean;
  sampleRows?: string[][];
}

export interface CSVAnalysisOptions {
  maxSampleRows?: number;
  strictValidation?: boolean;
  supportedDelimiters?: string[];
  supportedEncodings?: string[];
}

export class CSVParsingEngine {
  private static readonly DEFAULT_DELIMITERS = [',', '\t', ';', '|'];
  private static readonly DEFAULT_ENCODINGS = ['UTF-8', 'UTF-16', 'EUC-KR', 'CP949'];
  
  // Vercel 최적화: 파일 크기 제한 (10MB)
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024;
  // Vercel 최적화: 최대 처리 행 수 (5000행)
  private static readonly MAX_ROWS = 5000;
  
  /**
   * Buffer에서 CSV 파일을 분석하여 구조를 파악합니다 (인코딩 감지 포함)
   */
  static analyzeCSVFromBuffer(buffer: Buffer, options: CSVAnalysisOptions = {}): CSVParseResult {
    // Vercel 최적화: 파일 크기 검증
    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new Error(`파일 크기가 너무 큽니다. 최대 ${this.MAX_FILE_SIZE / 1024 / 1024}MB까지 지원됩니다.`);
    }
    
    const { encoding, content } = this.detectEncodingFromBuffer(buffer);
    return this.analyzeCSV(content, { ...options, detectedEncoding: encoding });
  }

  /**
   * CSV 파일 내용을 분석하여 구조를 파악합니다
   */
  static analyzeCSV(content: string, options: CSVAnalysisOptions & { detectedEncoding?: string } = {}): CSVParseResult {
    const {
      maxSampleRows = 5,
      strictValidation = false,
      supportedDelimiters = this.DEFAULT_DELIMITERS,
      supportedEncodings = this.DEFAULT_ENCODINGS,
      detectedEncoding
    } = options;

    // 1. 인코딩 감지 및 정리 (이미 감지된 경우 사용)
    const { cleanContent, encoding } = detectedEncoding 
      ? { cleanContent: content, encoding: detectedEncoding }
      : this.detectAndCleanEncoding(content, supportedEncodings);
    
    // 2. 멀티라인 파싱으로 행 분할
    let rows: string[][];
    let delimiter: string;
    
    // 구분자 감지를 위해 첫 줄만 먼저 확인
    const firstLine = cleanContent.split(/\r?\n/)[0];
    if (!firstLine.trim()) {
      throw new Error('CSV 파일이 비어있습니다');
    }
    
    // 3. 구분자 감지 (첫 줄 기반)
    delimiter = this.detectDelimiterFromLine(firstLine, supportedDelimiters);
    
    // 4. 멀티라인 파싱으로 모든 행 처리
    rows = this.parseMultilineCSV(cleanContent, delimiter);
    
    if (rows.length === 0) {
      throw new Error('유효한 데이터 행이 없습니다');
    }
    
    // Vercel 최적화: 행 수 제한
    if (rows.length > this.MAX_ROWS) {
      throw new Error(`행 수가 너무 많습니다. 최대 ${this.MAX_ROWS}행까지 지원됩니다. (현재: ${rows.length}행)`);
    }
    
    // 5. 헤더 추출
    const headers = rows[0];
    
    if (headers.length === 0) {
      throw new Error('유효한 헤더를 찾을 수 없습니다');
    }

    // 5. 샘플 데이터 파싱 (일관성 검증용)
    const sampleRows: string[][] = [];
    let hasQuotedFields = false;
    let isConsistent = true;
    
    // 헤더를 제외한 데이터 행들에서 샘플 추출
    const dataRows = rows.slice(1);
    const sampleCount = Math.min(dataRows.length, maxSampleRows);
    
    for (let i = 0; i < sampleCount; i++) {
      const row = dataRows[i];
      sampleRows.push(row);
      
      // 원본 행에서 따옴표 확인을 위해 다시 조인
      const rawRow = row.join(delimiter);
      if (rawRow.includes('"')) {
        hasQuotedFields = true;
      }
      
      if (strictValidation && row.length !== headers.length) {
        isConsistent = false;
      }
    }

    // 6. 지문 생성
    const fingerprint = this.generateFingerprint(headers, delimiter, encoding);

    return {
      headers,
      delimiter,
      encoding,
      lineCount: rows.length,
      fingerprint,
      hasQuotedFields,
      isConsistent,
      sampleRows
    };
  }

  /**
   * 인코딩 감지 및 BOM 제거
   */
  private static detectAndCleanEncoding(content: string, supportedEncodings: string[]): { cleanContent: string; encoding: string } {
    let cleanContent = content;
    let encoding = 'UTF-8'; // 기본값

    // BOM 제거 (UTF-8, UTF-16)
    if (content.charCodeAt(0) === 0xFEFF) {
      cleanContent = content.slice(1);
      encoding = 'UTF-8';
    } else if (content.length >= 2) {
      const firstTwo = content.slice(0, 2);
      if (firstTwo === '\xFF\xFE') {
        cleanContent = content.slice(2);
        encoding = 'UTF-16LE';
      } else if (firstTwo === '\xFE\xFF') {
        cleanContent = content.slice(2);
        encoding = 'UTF-16BE';
      }
    }

    // 간단한 한글 인코딩 감지 (휴리스틱)
    if (encoding === 'UTF-8' && this.containsKorean(cleanContent)) {
      const utf8Test = this.isValidUTF8(cleanContent);
      if (!utf8Test && supportedEncodings.includes('EUC-KR')) {
        encoding = 'EUC-KR';
      }
    }

    return { cleanContent, encoding };
  }

  /**
   * 구분자 자동 감지 (단일 라인 기반)
   */
  private static detectDelimiterFromLine(line: string, supportedDelimiters: string[]): string {
    const scores: { [delimiter: string]: number } = {};
    
    // 각 구분자의 빈도 계산 (따옴표 외부에서만)
    for (const delimiter of supportedDelimiters) {
      scores[delimiter] = this.countDelimiterOccurrences(line, delimiter);
    }

    // 가장 빈도가 높은 구분자 선택
    return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b) || ',';
  }

  /**
   * 구분자 자동 감지 (멀티라인 기반)
   */
  private static detectDelimiter(lines: string[], supportedDelimiters: string[]): string {
    const scores: { [delimiter: string]: number } = {};
    
    // 첫 번째 줄에서 각 구분자의 빈도 계산
    const firstLine = lines[0];
    
    for (const delimiter of supportedDelimiters) {
      scores[delimiter] = 0;
      
      // 따옴표 외부에서만 구분자 카운트
      let inQuotes = false;
      for (let i = 0; i < firstLine.length; i++) {
        const char = firstLine[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          scores[delimiter]++;
        }
      }
    }

    // 여러 줄에서 일관성 검증
    const firstLineCount = Math.max(...Object.values(scores));
    const bestDelimiter = Object.keys(scores).find(d => scores[d] === firstLineCount) || ',';
    
    // 추가 줄에서 일관성 확인 (최대 5줄)
    if (lines.length > 1) {
      const sampleLines = lines.slice(1, Math.min(lines.length, 6));
      let consistentCount = 0;
      
      for (const line of sampleLines) {
        const count = this.countDelimiterOccurrences(line, bestDelimiter);
        if (count === firstLineCount) {
          consistentCount++;
        }
      }
      
      // 일관성이 낮으면 다음 후보 시도
      if (consistentCount < sampleLines.length * 0.7) {
        const alternatives = Object.keys(scores)
          .filter(d => d !== bestDelimiter)
          .sort((a, b) => scores[b] - scores[a]);
          
        for (const alt of alternatives) {
          if (scores[alt] > 0) {
            return alt;
          }
        }
      }
    }

    return bestDelimiter;
  }

  /**
   * CSV 라인 파싱 (따옴표 처리 포함)
   */
  private static parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 이스케이프된 따옴표
          current += '"';
          i++; // 다음 따옴표 건너뛰기
        } else {
          // 따옴표 토글
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        // 구분자 발견 (따옴표 외부)
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * 지문 생성 (템플릿 식별용)
   */
  private static generateFingerprint(headers: string[], delimiter: string, encoding: string): string {
    // 헤더를 정규화하고 정렬
    const normalizedHeaders = headers
      .map(h => h.trim().toLowerCase())
      .sort();
      
    const fingerData = `${normalizedHeaders.join('|')}|${delimiter}|${encoding}`;
    
    return crypto.createHash('md5')
      .update(fingerData, 'utf8')
      .digest('hex');
  }

  /**
   * Buffer에서 인코딩 감지
   */
  private static detectEncodingFromBuffer(buffer: Buffer): { encoding: string; content: string } {
    // BOM 체크
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return { encoding: 'UTF-8', content: buffer.subarray(3).toString('utf8') };
    }
    if (buffer.length >= 2) {
      if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return { encoding: 'UTF-16LE', content: buffer.subarray(2).toString('utf16le') };
      }
      if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return { encoding: 'UTF-16BE', content: buffer.subarray(2).toString('utf16le').split('').reverse().join('') };
      }
    }

    // UTF-8 시도
    try {
      const utf8Content = buffer.toString('utf8');
      if (this.isValidUTF8Buffer(buffer)) {
        return { encoding: 'UTF-8', content: utf8Content };
      }
    } catch {}

    // EUC-KR/CP949 감지 (한글 포함 시)
    try {
      const utf8Content = buffer.toString('utf8');
      if (this.containsKorean(utf8Content)) {
        // 간단한 휴리스틱: UTF-8로 디코딩했을 때 깨진 문자가 있으면 EUC-KR일 가능성
        if (utf8Content.includes('�') || utf8Content.includes('\uFFFD')) {
          return { encoding: 'EUC-KR', content: utf8Content }; // 실제로는 iconv-lite 등 필요
        }
      }
    } catch {}

    // 기본값
    return { encoding: 'UTF-8', content: buffer.toString('utf8') };
  }

  /**
   * 멀티라인 CSV 파싱 (따옴표 균형 고려)
   */
  private static parseMultilineCSV(content: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    const lines = content.split(/\r?\n/);
    let currentRow = '';
    let inQuotes = false;

    for (const line of lines) {
      if (currentRow) {
        currentRow += '\n' + line;
      } else {
        currentRow = line;
      }

      // 따옴표 균형 확인
      let quoteCount = 0;
      for (const char of currentRow) {
        if (char === '"') {
          quoteCount++;
        }
      }

      // 홀수면 아직 열린 따옴표가 있음
      inQuotes = quoteCount % 2 !== 0;

      if (!inQuotes && currentRow.trim()) {
        rows.push(this.parseCSVLine(currentRow, delimiter));
        currentRow = '';
      }
    }

    // 마지막 행 처리
    if (currentRow.trim()) {
      rows.push(this.parseCSVLine(currentRow, delimiter));
    }

    return rows;
  }

  /**
   * 유틸리티 메서드들
   */
  private static isValidUTF8Buffer(buffer: Buffer): boolean {
    try {
      // TextDecoder를 사용한 안전한 UTF-8 검증
      const decoder = new TextDecoder('utf-8', { fatal: true });
      decoder.decode(buffer);
      return true;
    } catch {
      return false;
    }
  }

  private static countDelimiterOccurrences(line: string, delimiter: string): number {
    let count = 0;
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        count++;
      }
    }
    
    return count;
  }

  private static containsKorean(text: string): boolean {
    return /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
  }

  private static isValidUTF8(text: string): boolean {
    try {
      // Node.js 안전한 UTF-8 유효성 검사
      const encoder = new TextEncoder();
      const decoder = new TextDecoder('utf-8', { fatal: true });
      decoder.decode(encoder.encode(text));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * CSV 생성 (내보내기용)
   */
  static generateCSV(data: Record<string, any>[], headers: string[], delimiter: string = ','): string {
    if (data.length === 0) {
      return '';
    }

    // CSV 헤더
    let csv = headers.map(h => this.escapeCSVField(h, delimiter)).join(delimiter) + '\n';
    
    // CSV 데이터
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header] ?? '';
        return this.escapeCSVField(String(value), delimiter);
      });
      csv += values.join(delimiter) + '\n';
    }

    return csv;
  }

  /**
   * CSV 필드 이스케이프 처리 (공식 주입 방지 포함)
   */
  private static escapeCSVField(field: string, delimiter: string, preventFormulaInjection: boolean = true): string {
    let value = String(field);
    
    // CSV 공식 주입 방지
    if (preventFormulaInjection && value.length > 0) {
      const dangerousChars = ['=', '+', '-', '@', '\t'];
      if (dangerousChars.includes(value[0])) {
        value = "'" + value; // 앞에 작은따옴표 추가
      }
    }
    
    // 구분자, 따옴표, 개행 문자가 포함된 경우 따옴표로 감싸기
    if (value.includes(delimiter) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      // 내부 따옴표를 이스케이프하고 전체를 따옴표로 감싸기
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }
}