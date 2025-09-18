import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AiPicks from "@/pages/ai-picks";
import MyStore from "@/pages/my-store";
import MarketSync from "@/pages/market-sync";
import Pricing from "@/pages/pricing";
import Subscribe from "@/pages/subscribe";
import AdminDashboard from "@/pages/admin/dashboard";
import ProductFeed from "@/pages/admin/product-feed";
import ProductManagement from "@/pages/admin/product-management";
import AiReports from "@/pages/admin/ai-reports";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/ai-picks" component={AiPicks} />
      <Route path="/my-store" component={MyStore} />
      <Route path="/market-sync" component={MarketSync} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/product-feed" component={ProductFeed} />
      <Route path="/admin/product-management" component={ProductManagement} />
      <Route path="/admin/ai-reports" component={AiReports} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}

export default App;
