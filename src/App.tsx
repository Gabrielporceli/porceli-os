
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

import Financial from "./pages/Financial"
import Contracts from "./pages/Contracts"
import NotFound from "./pages/NotFound"
import Calendar from "./pages/Calendar"
import Automations from "./pages/Automations"
import ScheduledMessages from "./pages/ScheduledMessages"
import { CRMLayout } from "./components/Layout/CRMLayout"
import ProtectedRoute from "./components/ProtectedRoute"
import { AuthProvider } from "./hooks/useAuth"
import { PlansProvider } from "./contexts/PlansContext"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 min: dados não são re-buscados em retornos rápidos
      gcTime: 1000 * 60 * 10,        // 10 min: mantém em memória mesmo sem componentes ativos
      refetchOnWindowFocus: false,   // não rebusca ao voltar para a aba
      retry: 1,
    },
  },
})

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
                    path="/automations"
                    element={
                      <ProtectedRoute>
                        <CRMLayout>
                          <Automations />
                        </CRMLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/scheduled-messages"
                    element={
                      <ProtectedRoute>
                        <CRMLayout>
                          <ScheduledMessages />
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
