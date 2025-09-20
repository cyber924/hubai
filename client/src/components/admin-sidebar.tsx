import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Database, 
  Package, 
  BarChart3, 
  Settings,
  Home,
  ChevronLeft,
  ChevronRight,
  Users,
  Image,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";

interface AdminSidebarProps {
  className?: string;
}

export default function AdminSidebar({ className }: AdminSidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navigation = [
    { 
      name: "대시보드", 
      href: "/admin", 
      icon: LayoutDashboard,
      exact: true
    },
    { 
      name: "사용자 관리", 
      href: "/admin/users", 
      icon: Users,
      exact: false
    },
    { 
      name: "상품 피드", 
      href: "/admin/product-feed", 
      icon: Database,
      exact: false
    },
    { 
      name: "상품 관리", 
      href: "/admin/product-management", 
      icon: Package,
      exact: false
    },
    { 
      name: "이미지 관리", 
      href: "/admin/image-management", 
      icon: Image,
      exact: false
    },
    { 
      name: "AI 상품명 최적화", 
      href: "/admin/ai-optimization", 
      icon: Bot,
      exact: false
    },
    { 
      name: "AI 리포트", 
      href: "/admin/ai-reports", 
      icon: BarChart3,
      exact: false
    },
  ];

  const isActive = (href: string, exact: boolean) => {
    if (exact) {
      return location === href;
    }
    return location.startsWith(href);
  };

  return (
    <Card className={`h-full ${collapsed ? 'w-16' : 'w-64'} transition-all duration-300 ${className}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <LayoutDashboard className="text-primary-foreground text-sm" />
                </div>
                <span className="font-bold korean-text">관리자</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1"
              data-testid="button-toggle-sidebar"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    className={`w-full justify-start ${collapsed ? 'px-2' : 'px-4'} korean-text`}
                    data-testid={`link-admin-${item.name.toLowerCase()}`}
                  >
                    <Icon className={`h-4 w-4 ${collapsed ? '' : 'mr-2'} ${active ? 'text-primary' : ''}`} />
                    {!collapsed && <span>{item.name}</span>}
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Back to Site */}
        <div className="p-4 border-t border-border">
          <Link href="/">
            <Button
              variant="outline"
              className={`w-full justify-start ${collapsed ? 'px-2' : 'px-4'} korean-text`}
              data-testid="link-back-to-site"
            >
              <Home className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
              {!collapsed && <span>사이트로 돌아가기</span>}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
