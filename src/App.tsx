
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "next-themes"
import Index from "./pages/Index"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Clients from "./pages/Clients"
import LeadsKanban from "./pages/LeadsKanban"
import Conversations from "./pages/Conversations"
import Financial from "./pages/Financial"
import Contracts from "./pages/Contracts"
import NotFound from "./pages/NotFound"
import SdrAgent from "./pages/SdrAgent"
import Calendar from "./pages/Calendar"
import Automations from "./pages/Automations"
import { CRMLayout } from "./components/Layout/CRMLayout"
import ProtectedRoute from "./components/ProtectedRoute"
import { AuthProvider } from "./hooks/useAuth"
import { PlansProvider } from "./contexts/PlansContext"

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          <AuthProvider>
            <PlansProvider>
              <Toaster />
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<Index />} />
                  <Route path="*" element={<NotFound />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <CRMLayout>
                          <Dashboard />
                        </CRMLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar"
                    element={
                      <ProtectedRoute>
                        <CRMLayout>
                          <Calendar />
                        </CRMLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/clients"
                    element={
                      <ProtectedRoute>
                        <CRMLayout>
                          <Clients />
                        </CRMLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/leads"
                    element={
                      <ProtectedRoute>
                        <CRMLayout>
                          <LeadsKanban />
                        </CRMLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/conversations"
                    element={
                      <ProtectedRoute>
                        <CRMLayout>
                          <Conversations />
                        </CRMLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/financial"
                    element={
                      <ProtectedRoute>
                        <CRMLayout>
                          <Financial />
                        </CRMLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/contracts"
                    element={
                      <ProtectedRoute>
                        <CRMLayout>
                          <Contracts />
                        </CRMLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/sdr-agent"
                    element={
                      <ProtectedRoute>
                        <CRMLayout>
                          <SdrAgent />
                        </CRMLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/automations"
                    element={
                      <ProtectedRoute>
                        <CRMLayout>
                          <Automations />
                        </CRMLayout>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </BrowserRouter>
            </PlansProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
