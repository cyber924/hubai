import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import AiPicks from "@/pages/ai-picks";
import MyStore from "@/pages/my-store";
import MarketSync from "@/pages/market-sync";
import Pricing from "@/pages/pricing";
import Subscribe from "@/pages/subscribe";
import AdminDashboard from "@/pages/admin/dashboard";
import ProductFeed from "@/pages/admin/product-feed";
import ProductManagement from "@/pages/admin/product-management";
import ImageManagement from "@/pages/admin/image-management";
import AiReports from "@/pages/admin/ai-reports";
import AdminUsers from "@/pages/admin/users";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ProtectedRoute from "@/components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/ai-picks">
        <ProtectedRoute>
          <AiPicks />
        </ProtectedRoute>
      </Route>
      <Route path="/my-store">
        <ProtectedRoute>
          <MyStore />
        </ProtectedRoute>
      </Route>
      <Route path="/market-sync">
        <ProtectedRoute>
          <MarketSync />
        </ProtectedRoute>
      </Route>
      <Route path="/subscribe">
        <ProtectedRoute>
          <Subscribe />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute requireAdmin>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute requireAdmin>
          <AdminUsers />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/product-feed">
        <ProtectedRoute requireAdmin>
          <ProductFeed />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/product-management">
        <ProtectedRoute requireAdmin>
          <ProductManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/image-management">
        <ProtectedRoute requireAdmin>
          <ImageManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/ai-reports">
        <ProtectedRoute requireAdmin>
          <AiReports />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              <Router />
            </main>
            <Footer />
          </div>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
