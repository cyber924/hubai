import { Link } from "wouter";
import { Box, Instagram, Twitter, Facebook } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-muted/30 py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Box className="text-primary-foreground text-sm" />
              </div>
              <span className="text-xl font-bold korean-text">StyleHub</span>
            </div>
            <p className="text-muted-foreground mb-4 korean-text">
              AI 기반 패션 트렌드 자동화 서비스로 스마트한 쇼핑몰 운영을 시작하세요.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-instagram">
                <Instagram className="text-xl" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-twitter">
                <Twitter className="text-xl" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-facebook">
                <Facebook className="text-xl" />
              </a>
            </div>
          </div>
          
          {/* Product */}
          <div>
            <h4 className="font-semibold mb-6 korean-text">서비스</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors korean-text" data-testid="link-ai-collection">AI 상품 수집</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors korean-text" data-testid="link-trend-analysis">트렌드 분석</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors korean-text" data-testid="link-market-integration">마켓 연동</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors korean-text" data-testid="link-auto-registration">자동 등록</a></li>
            </ul>
          </div>
          
          {/* Support */}
          <div>
            <h4 className="font-semibold mb-6 korean-text">지원</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors korean-text" data-testid="link-help-center">도움말 센터</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors korean-text" data-testid="link-api-docs">API 문서</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors korean-text" data-testid="link-community">커뮤니티</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors korean-text" data-testid="link-contact">문의하기</a></li>
            </ul>
          </div>
          
          {/* Company */}
          <div>
            <h4 className="font-semibold mb-6 korean-text">회사</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors korean-text" data-testid="link-about">회사 소개</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors korean-text" data-testid="link-careers">채용 정보</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors korean-text" data-testid="link-privacy">개인정보처리방침</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors korean-text" data-testid="link-terms">이용약관</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-muted-foreground text-sm korean-text">
              © 2024 StyleHub. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <span className="text-muted-foreground text-sm korean-text">한국어</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground text-sm english-text">English</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
