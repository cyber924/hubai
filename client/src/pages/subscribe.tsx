import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Check, Star, CreditCard, Shield } from 'lucide-react';

// Load Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast({
        title: "결제 실패",
        description: error.message || "결제 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "결제 성공",
        description: "StyleHub 구독이 시작되었습니다!",
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border rounded-lg bg-muted/50">
        <PaymentElement />
      </div>
      
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span className="korean-text">SSL 암호화로 안전하게 보호됩니다</span>
      </div>
      
      <Button 
        type="submit" 
        className="w-full korean-text" 
        disabled={!stripe || isProcessing}
        data-testid="button-confirm-payment"
      >
        <CreditCard className="mr-2 h-4 w-4" />
        {isProcessing ? "처리중..." : "구독 시작하기"}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const { toast } = useToast();

  const plans = [
    {
      id: "starter",
      name: "스타터",
      description: "개인 및 소규모 쇼핑몰",
      price: 29000,
      features: [
        "월 300개 상품 수집",
        "AI 자동 분석",
        "1개 마켓 연동",
        "기본 대시보드",
      ],
      popular: false,
    },
    {
      id: "pro",
      name: "프로",
      description: "성장하는 비즈니스",
      price: 89000,
      features: [
        "월 1,000개 상품 수집",
        "고급 AI 분석",
        "3개 마켓 연동",
        "실시간 대시보드",
        "우선 고객 지원",
      ],
      popular: true,
    },
    {
      id: "enterprise",
      name: "엔터프라이즈",
      description: "대형 쇼핑몰 및 기업",
      price: 299000,
      features: [
        "무제한 상품 수집",
        "커스텀 AI 모델",
        "무제한 마켓 연동",
        "전용 대시보드",
        "24/7 전담 지원",
      ],
      popular: false,
    },
  ];

  useEffect(() => {
    // Create subscription when component mounts
    const createSubscription = async () => {
      try {
        const response = await api.createSubscription();
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        toast({
          title: "오류",
          description: "구독 생성에 실패했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
      }
    };

    createSubscription();
  }, [toast]);

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground korean-text">구독 준비중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 korean-text" data-testid="text-subscribe-title">StyleHub 구독하기</h1>
          <p className="text-lg text-muted-foreground korean-text">
            AI 기반 패션 트렌드 자동화 서비스를 시작하세요
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Plan Selection */}
          <div>
            <h2 className="text-2xl font-bold mb-6 korean-text">플랜 선택</h2>
            <div className="space-y-4">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`cursor-pointer transition-all ${
                    selectedPlan === plan.id 
                      ? "border-2 border-primary ring-1 ring-primary/20" 
                      : "border border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedPlan === plan.id 
                            ? "border-primary bg-primary" 
                            : "border-muted-foreground"
                        }`} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold korean-text" data-testid={`text-plan-${plan.id}`}>
                              {plan.name}
                            </h3>
                            {plan.popular && (
                              <Badge className="bg-primary text-primary-foreground korean-text">
                                <Star className="mr-1 h-3 w-3" />
                                인기
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground korean-text">{plan.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold english-text">₩{plan.price.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground korean-text">/월</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-secondary flex-shrink-0" />
                          <span className="text-sm korean-text">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Payment Form */}
          <div>
            <h2 className="text-2xl font-bold mb-6 korean-text">결제 정보</h2>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center korean-text">
                  <CreditCard className="mr-2 h-5 w-5" />
                  결제 수단
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <SubscribeForm />
                </Elements>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="korean-text">구독 혜택</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm korean-text">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-secondary" />
                    <span>14일 무료 체험</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-secondary" />
                    <span>언제든지 취소 가능</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-secondary" />
                    <span>24/7 고객 지원</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-secondary" />
                    <span>정기 업데이트 및 신기능</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle className="text-center korean-text">자주 묻는 질문</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold korean-text mb-2">무료 체험 기간이 있나요?</h4>
                <p className="text-sm text-muted-foreground korean-text">
                  네, 모든 플랜에서 14일 무료 체험을 제공합니다. 체험 기간 중 언제든지 취소할 수 있습니다.
                </p>
              </div>
              <div>
                <h4 className="font-semibold korean-text mb-2">구독을 언제 취소할 수 있나요?</h4>
                <p className="text-sm text-muted-foreground korean-text">
                  언제든지 구독을 취소할 수 있으며, 다음 결제 주기부터 적용됩니다.
                </p>
              </div>
              <div>
                <h4 className="font-semibold korean-text mb-2">플랜 변경이 가능한가요?</h4>
                <p className="text-sm text-muted-foreground korean-text">
                  네, 언제든지 상위 또는 하위 플랜으로 변경할 수 있습니다.
                </p>
              </div>
              <div>
                <h4 className="font-semibold korean-text mb-2">결제는 어떻게 이루어지나요?</h4>
                <p className="text-sm text-muted-foreground korean-text">
                  신용카드를 통해 매월 자동 결제되며, 안전한 SSL 암호화로 보호됩니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
