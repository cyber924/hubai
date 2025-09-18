import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  redirectTo = "/login",
  requireAdmin = false 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setLocation(redirectTo);
      } else if (requireAdmin && !user?.isAdmin) {
        setLocation("/"); // Redirect non-admin users to home
      }
    }
  }, [isLoading, isAuthenticated, user, setLocation, redirectTo, requireAdmin]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground korean-text">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated or not admin when required
  if (!isAuthenticated || (requireAdmin && !user?.isAdmin)) {
    return null;
  }

  return <>{children}</>;
}