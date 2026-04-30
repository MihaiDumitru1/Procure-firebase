import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/hooks/useAuth";
import { SPVProvider } from "@/context/SPVContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import TenderList from "./pages/TenderList";
import TenderDetail from "./pages/TenderDetail";
import NewTender from "./pages/NewTender";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Suppliers from "./pages/Suppliers";
import Settings from "./pages/Settings";
import SupplierPortal from "./pages/SupplierPortal";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

const queryClient = new QueryClient();

const App = () => (
  <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SPVProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute redirectSuppliers><Index /></ProtectedRoute>} />
                <Route path="/properties" element={<ProtectedRoute redirectSuppliers><Properties /></ProtectedRoute>} />
                <Route path="/properties/:id" element={<ProtectedRoute redirectSuppliers><PropertyDetail /></ProtectedRoute>} />
                <Route path="/tenders" element={<ProtectedRoute redirectSuppliers><TenderList /></ProtectedRoute>} />
                <Route path="/tenders/new" element={<ProtectedRoute redirectSuppliers><NewTender /></ProtectedRoute>} />
                <Route path="/tenders/:id" element={<ProtectedRoute><TenderDetail /></ProtectedRoute>} />
                <Route path="/suppliers" element={<ProtectedRoute redirectSuppliers><Suppliers /></ProtectedRoute>} />
                <Route path="/supplier-portal" element={<ProtectedRoute suppliersOnly><SupplierPortal /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </SPVProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </LanguageProvider>
);

export default App;
