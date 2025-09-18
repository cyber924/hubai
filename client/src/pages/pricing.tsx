import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const plans = [
    {
      id: "starter",
      name: "스타터",
      description: "개인 및 소규모 쇼핑몰",
      price: {
        monthly: 29000,
        yearly: 290000,
      },
      features: [
        "월 300개 상품 수집",
        "AI 자동 분석",
        "1개 마켓 연동",
        "기본 대시보드",
        "이메일 지원",
      ],
      popular: false,
    },
    {
      id: "pro",
      name: "프로",
      description: "성장하는 비즈니스",
      price: {
        monthly: 89000,
        yearly: 890000,
      },
      features: [
        "월 1,000개 상품 수집",
        "고급 AI 분석",
        "3개 마켓 연동",
        "실시간 대시보드",
        "우선 고객 지원",
        "API 접근",
        "커스텀 태그",
      ],
      popular: true,
    },
    {
      id: "enterprise",
      name: "엔터프라이즈",
      description: "대형 쇼핑몰 및 기업",
      price: {
        monthly: 299000,
        yearly: 2990000,
      },
      features: [
        "무제한 상품 수집",
        "커스텀 AI 모델",
        "무제한 마켓 연동",
        "전용 대시보드",
        "24/7 전담 지원",
        "전용 계정 매니저",
        "커스텀 통합",
        "화이트라벨 솔루션",
      ],
      popular: false,
    },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const getDiscountPercentage = () => {
    return Math.round(((12 - 10) / 12) * 100); // 연간 결제시 2개월 할인
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 korean-text" data-testid="text-page-title">요금제 선택</h1>
          <p className="text-lg text-muted-foreground korean-text mb-8">
            비즈니스 규모에 맞는 최적의 플랜을 선택하세요
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-muted rounded-lg p-1 mb-8">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-medium korean-text transition-colors ${
                billingCycle === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-monthly-billing"
            >
              월간 결제
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-md text-sm font-medium korean-text transition-colors relative ${
                billingCycle === "yearly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-yearly-billing"
            >
              연간 결제
              <Badge variant="secondary" className="ml-2 text-xs">
                {getDiscountPercentage()}% 할인
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${
                plan.popular 
                  ? "border-2 border-primary ring-1 ring-primary/20" 
                  : "border border-border"
              } hover:shadow-lg transition-all`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-2 korean-text">
                    <Star className="mr-1 h-3 w-3" />
                    가장 인기
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-xl korean-text" data-testid={`text-plan-name-${plan.id}`}>{plan.name}</CardTitle>
                <p className="text-muted-foreground text-sm korean-text">{plan.description}</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold english-text" data-testid={`text-plan-price-${plan.id}`}>
                    ₩{formatPrice(plan.price[billingCycle])}
                  </span>
                  <span className="text-muted-foreground korean-text">
                    /{billingCycle === "monthly" ? "월" : "년"}
                  </span>
                  {billingCycle === "yearly" && (
                    <p className="text-sm text-secondary korean-text mt-2">
                      월 ₩{formatPrice(Math.round(plan.price.yearly / 12))} 상당
                    </p>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center korean-text">
                      <Check className="text-secondary mr-3 h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link href="/subscribe">
                  <Button 
                    className={`w-full korean-text ${
                      plan.popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    data-testid={`button-select-plan-${plan.id}`}
                  >
                    {plan.id === "enterprise" ? "문의하기" : "시작하기"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center korean-text">자주 묻는 질문</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold korean-text mb-2">무료 체험이 가능한가요?</h4>
                <p className="text-sm text-muted-foreground korean-text">
                  네, 모든 플랜에서 14일 무료 체험을 제공합니다. 신용카드 등록 없이 체험 가능합니다.
                </p>
              </div>
              <div>
                <h4 className="font-semibold korean-text mb-2">언제든지 플랜 변경이 가능한가요?</h4>
                <p className="text-sm text-muted-foreground korean-text">
                  네, 언제든지 플랜을 업그레이드하거나 다운그레이드할 수 있습니다. 변경사항은 다음 결제 주기부터 적용됩니다.
                </p>
              </div>
              <div>
                <h4 className="font-semibold korean-text mb-2">데이터는 안전하게 보관되나요?</h4>
                <p className="text-sm text-muted-foreground korean-text">
                  모든 데이터는 암호화되어 안전하게 보관되며, 정기적인 백업을 통해 데이터 손실을 방지합니다.
                </p>
              </div>
              <div>
                <h4 className="font-semibold korean-text mb-2">API 연동은 어떻게 하나요?</h4>
                <p className="text-sm text-muted-foreground korean-text">
                  프로 플랜 이상에서 API 키를 제공하며, 상세한 개발자 문서와 함께 기술 지원을 받을 수 있습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center mt-12">
          <h3 className="text-2xl font-bold korean-text mb-4">아직 고민이신가요?</h3>
          <p className="text-muted-foreground korean-text mb-6">
            전문가와 1:1 상담을 통해 최적의 플랜을 찾아보세요
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" className="korean-text" data-testid="button-contact-sales">
              영업팀 문의
            </Button>
            <Link href="/subscribe">
              <Button className="korean-text" data-testid="button-start-trial">
                무료 체험 시작
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
