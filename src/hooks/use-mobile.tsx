import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Começa JÁ com a resposta certa. Antes nascia `undefined` (= "não é
  // celular") e só corrigia no primeiro efeito: o app abria no celular com a
  // barra lateral do computador e a jogava pra baixo um instante depois.
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(() =>
    typeof window === "undefined" ? undefined : window.innerWidth < MOBILE_BREAKPOINT,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
