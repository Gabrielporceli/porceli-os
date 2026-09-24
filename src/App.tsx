
import { Suspense, lazy } from "react"
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
import FunnelMaps from "./pages/FunnelMaps"
import AgentsHub from "./pages/AgentsHub"
import Notes from "./pages/Notes"
// Laboratorios sao carregados sob demanda: o RoundTripLab puxa o Tiptap
// inteiro, e importado direto ele arrastava ~200 KB pro pacote principal,
// que carrega em TODA pagina do sistema.
const PillLab = lazy(() => import("./pages/PillLab"))
const IconLab = lazy(() => import("./pages/IconLab"))
const NotesLab = lazy(() => import("./pages/NotesLab"))
const RoundTripLab = lazy(() => import("./pages/RoundTripLab"))
import { CRMLayout } from "./components/Layout/CRMLayout"
import ProtectedRoute from "./components/ProtectedRoute"
import { AuthProvider } from "./hooks/useAuth"
import { PlansProvider } from "./contexts/PlansContext"
import { LiquidGlassFilter } from "./components/ui/liquid-glass-button"

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
              {/* Filtro SVG compartilhado p/ vidro líquido (botões, cards, modais) */}
              <LiquidGlassFilter />
              <Toaster />
              <BrowserRouter>
                <Suspense fallback={null}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  {/* Laboratório de design da pílula do menu mobile — pública, sem layout. */}
                  <Route path="/dev/pill" element={<PillLab />} />
                  {/* Exemplo dos ícones do iconsax — pública, sem layout. */}
                  <Route path="/dev/icons" element={<IconLab />} />
                  {/* Mural, janelas e quadros das Notas com dados falsos —
                      a tela real fica atrás do login. Pública, sem layout. */}
                  <Route path="/dev/notas" element={<NotesLab />} />
                  {/* TEMPORARIO: medicao da ida e volta do Markdown. */}
                  <Route path="/dev/roundtrip" element={<RoundTripLab />} />
                  <Route path="/" element={<Index />} />
                  <Route path="*" element={<NotFound />} />
                  <Route
                    path="/agents"
                    element={
                      <ProtectedRoute>
                        <CRMLayout>
                          <AgentsHub />
                        </CRMLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/notes"
                    element={
                      <ProtectedRoute>
                        <CRMLayout>
                          <Notes />
                        </CRMLayout>
                      </ProtectedRoute>
                    }
                  />
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
                  <Route
                    path="/funnel-maps"
                    element={
                      <ProtectedRoute>
                        <CRMLayout>
                          <FunnelMaps />
                        </CRMLayout>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
                </Suspense>
              </BrowserRouter>
            </PlansProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
