"use client"

import { useEffect, useRef } from "react"

/* ──────────────────────────────────────────────────────────────────────────
 * Checkout embebido de Izipay (KR-Embedded / micuentaweb).
 *
 * Recibe un formToken generado en backend (/api/izipay) y la clave pública.
 * El SDK se carga bajo demanda SOLO al abrir el pago. La confirmación real del
 * cobro la hace el webhook IPN en backend; este componente solo muestra el form.
 *
 * Corrección definitiva de CLIENT_725 ("un formulario ya está renderizado"):
 *  - El contenedor NO lleva la clase `kr-embedded` de forma estática. Así, cuando
 *    KR.setFormConfig() escanea el DOM, NO encuentra contenedor y NO auto-renderiza.
 *    (El auto-render + nuestro renderElements era el doble render real.)
 *  - Antes de renderizar: await KR.removeForms() + se vacía el contenedor.
 *  - La clase `kr-embedded` se añade JUSTO antes del único renderElements().
 *  - renderElements() se ejecuta UNA sola vez por apertura (guardas renderedRef
 *    + verificación de formulario existente).
 *  - onSubmit/onError se registran UNA sola vez por carga de página (no se apilan).
 *  - Callbacks vía ref + invalidación por run-id → seguro con React Strict Mode
 *    (doble montaje) y remounts de App Router. Sin fugas. Abrir/cerrar infinitas veces.
 * ────────────────────────────────────────────────────────────────────────── */

const KR_CDN = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0"
const CONTAINER_ID = "izipay-embedded"

type KRType = {
  setFormConfig: (cfg: Record<string, unknown>) => Promise<void> | void
  renderElements: (selector: string) => Promise<void> | void
  onSubmit: (cb: (resp: unknown) => boolean | Promise<boolean>) => void
  onError?: (cb: (err: unknown) => void) => void
  removeForms?: () => Promise<void> | void
}

declare global {
  interface Window {
    KR?: KRType
  }
}

// Estado a nivel de módulo (por pestaña): listeners registrados una sola vez,
// y refs vivos para que esos listeners usen siempre los callbacks vigentes.
let krHandlersBound = false
const liveOnSuccess: { current: (() => void) | null } = { current: null }
const liveOnError: { current: (() => void) | null } = { current: null }

function loadOnce(tag: "link" | "script", attrs: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const key = attrs.href || attrs.src
    if (document.querySelector(`[data-izipay="${key}"]`)) { resolve(); return }
    const el = document.createElement(tag)
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
    el.setAttribute("data-izipay", key)
    if (tag === "link") { (el as HTMLLinkElement).rel = "stylesheet" }
    el.addEventListener("load", () => resolve())
    el.addEventListener("error", () => reject(new Error(`No se pudo cargar ${key}`)))
    document.head.appendChild(el)
  })
}

function waitForKR(timeoutMs = 5000): Promise<KRType | null> {
  return new Promise(resolve => {
    const start = Date.now()
    const tick = () => {
      if (window.KR) { resolve(window.KR); return }
      if (Date.now() - start > timeoutMs) { resolve(null); return }
      setTimeout(tick, 100)
    }
    tick()
  })
}

// Elimina cualquier formulario KR existente (incluido un posible auto-render) y
// deja el contenedor completamente limpio y sin la clase que dispara el escaneo.
async function teardownForm() {
  try { await window.KR?.removeForms?.() } catch { /* no había formulario */ }
  const el = document.getElementById(CONTAINER_ID)
  if (el) {
    el.innerHTML = ""
    el.classList.remove("kr-embedded")
  }
}

interface Props {
  formToken: string
  publicKey: string
  onSuccess: () => void
  onClose: () => void
}

export function IzipayCheckout({ formToken, publicKey, onSuccess, onClose }: Props) {
  // Callbacks en refs: el efecto NO depende de su identidad (que cambia en cada
  // render del padre), evitando re-ejecuciones y dobles render del formulario.
  const onSuccessRef = useRef(onSuccess)
  const onCloseRef = useRef(onClose)
  onSuccessRef.current = onSuccess
  onCloseRef.current = onClose

  liveOnSuccess.current = () => onSuccessRef.current()
  liveOnError.current = () => {/* el formulario muestra sus propios errores */}

  // run-id: solo la ejecución más reciente puede configurar/renderizar.
  const runIdRef = useRef(0)
  // renderedRef: este montaje ya renderizó (evita renderElements en re-render).
  const renderedRef = useRef(false)

  useEffect(() => {
    const myRun = ++runIdRef.current
    const stale = () => runIdRef.current !== myRun
    renderedRef.current = false

    ;(async () => {
      try {
        await loadOnce("link", { href: `${KR_CDN}/ext/classic-reset.css` })
        await loadOnce("script", { src: `${KR_CDN}/ext/classic.js` })
        await loadOnce("script", {
          src: `${KR_CDN}/stable/kr-payment-form.min.js`,
          "kr-public-key": publicKey,
        })

        const KR = await waitForKR()
        if (stale()) return
        if (!KR) { onCloseRef.current(); return }

        // Limpiar cualquier formulario previo ANTES de configurar.
        await teardownForm()
        if (stale()) return

        // setFormConfig NO auto-renderiza porque el contenedor aún no tiene
        // la clase `kr-embedded`.
        await KR.setFormConfig({
          formToken,
          "kr-public-key": publicKey,
          "kr-language": "es-ES",
        })
        if (stale()) return

        // Listeners UNA sola vez por carga de página (no se apilan; leen refs vivos).
        if (!krHandlersBound) {
          krHandlersBound = true
          KR.onSubmit(() => {
            liveOnSuccess.current?.() // el cobro lo confirma el IPN en backend
            return false              // evita la página de resultado del SDK
          })
          KR.onError?.(() => { liveOnError.current?.() })
        }

        // Segunda limpieza por seguridad (por si alguna versión auto-renderiza).
        await teardownForm()
        if (stale() || renderedRef.current) return

        const el = document.getElementById(CONTAINER_ID)
        if (!el) return
        // Si ya hubiera un formulario montado, no volver a renderizar.
        if (el.querySelector("form, .kr-embedded-form, .kr-form")) return

        // Activar el contenedor y renderizar UNA sola vez.
        renderedRef.current = true
        el.classList.add("kr-embedded")
        await KR.renderElements(`#${CONTAINER_ID}`)
      } catch {
        if (!stale()) onCloseRef.current()
      }
    })()

    return () => {
      // Invalida esta ejecución y desmonta el formulario (sin fugas).
      runIdRef.current++
      void teardownForm()
    }
  }, [formToken, publicKey])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => onCloseRef.current()}
    >
      <div
        className="w-full max-w-md rounded-xl border border-white/10 bg-[#141418] p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#E6E6E6]">Pago seguro</p>
          <button
            onClick={() => onCloseRef.current()}
            className="rounded-md px-2 py-1 text-xs text-[#E6E6E6]/50 hover:text-[#E6E6E6]"
          >
            Cerrar
          </button>
        </div>

        {/* Contenedor SIN clase `kr-embedded` estática: evita que KR.setFormConfig
            auto-renderice. La clase se añade en runtime justo antes del único
            renderElements(). El formToken se entrega vía KR.setFormConfig. */}
        <div id="izipay-embedded" />

        <p className="mt-4 text-center text-[11px] text-[#E6E6E6]/40">
          Procesado por Izipay · tus datos de tarjeta no pasan por nuestros servidores
        </p>
      </div>
    </div>
  )
}
