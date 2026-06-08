import { useState, useEffect } from "react";
import { PRODUCTS, imageForFile } from "./data/products";
import banner1 from "./assets/banners/banner-1.jpg";
import banner2 from "./assets/banners/banner-2.jpg";
import banner3 from "./assets/banners/banner-3.jpg";
import feat1 from "./assets/featured/feat-1.jpg";
import feat2 from "./assets/featured/feat-2.jpg";
import feat3 from "./assets/featured/feat-3.jpg";
import feat4 from "./assets/featured/feat-4.jpg";
import logoPrincipal from "./assets/logo-principal.png";

/* ════════════════════════════════════════════════════════════════
   CONFIGURACIÓN — edita estos valores
   ════════════════════════════════════════════════════════════════ */
const WHATSAPP = "573173293542";          // ← Tu número de WhatsApp (con 57)
const ADMIN_PASSWORD = "admin123";         // ← Cambia tu contraseña de admin
const LS_KEY = "rda-catalog-v3";

const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
const cop = (n) => "$" + Number(n || 0).toLocaleString("es-CO");

/* ════════════════════════════════════════════════════════════════
   MÉTODOS DE PAGO — pega aquí tus datos reales de cada pasarela
   ════════════════════════════════════════════════════════════════ */
const PAYMENTS = {
  // WOMPI — tarjetas, PSE, Nequi, Bancolombia…
  wompi: {
    enabled: true,
    publicKey: "",        // ← tu llave pública: pub_prod_xxx  (usa pub_test_xxx para pruebas)
    integritySecret: "",  // ← tu "secreto de integridad" de Wompi (ver nota de seguridad abajo)
    redirectUrl: "",      // ← (opcional) URL de tu tienda a la que vuelve el cliente tras pagar
  },
  // ADDI — paga a cuotas, sin tarjeta
  addi: {
    enabled: true,
    url: "",              // ← tu enlace de checkout / comercio Addi
  },
  // SISTECRÉDITO — crédito en cuotas fijas
  sistecredito: {
    enabled: true,
    url: "",              // ← tu enlace de checkout Sistecrédito
  },
};

/* Referencia única para cada pedido */
const newReference = () =>
  "RDA-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

/* Firma de integridad de Wompi (SHA-256). Si no hay secreto, no firma. */
async function wompiSignature(reference, amountInCents, currency, secret) {
  if (!secret || !window.crypto?.subtle) return "";
  const data = `${reference}${amountInCents}${currency}${secret}`;
  const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Construye la URL del Checkout Web de Wompi */
async function buildWompiUrl({ amount, reference, email, phone, fullName }) {
  const cents = Math.round(Number(amount) || 0) * 100; // COP no tiene decimales
  const p = new URLSearchParams();
  p.set("public-key", PAYMENTS.wompi.publicKey);
  p.set("currency", "COP");
  p.set("amount-in-cents", String(cents));
  p.set("reference", reference);
  if (PAYMENTS.wompi.redirectUrl) p.set("redirect-url", PAYMENTS.wompi.redirectUrl);
  if (email) p.set("customer-data:email", email);
  if (phone) p.set("customer-data:phone-number", phone);
  if (fullName) p.set("customer-data:full-name", fullName);
  const sig = await wompiSignature(reference, cents, "COP", PAYMENTS.wompi.integritySecret);
  if (sig) p.set("signature:integrity", sig);
  return `https://checkout.wompi.co/p/?${p.toString()}`;
}

/* Abre un enlace externo agregando monto + referencia como parámetros */
const openWithParams = (raw, params) => {
  try {
    const u = new URL(raw);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)));
    window.open(u.toString(), "_blank");
  } catch (_) {
    window.open(raw, "_blank");
  }
};

/* ──────────────────────────────────────────────────────────────
   ESTILOS GLOBALES
────────────────────────────────────────────────────────────── */
const CSS = `
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --gold: #c9a84c;
  --gold-l: #e8d48a;
  --gold-d: #8a6010;
  --bg:  #fafaf8;
  --bg2: #f2f2ee;
  --bg3: #e8e8e4;
  --bg4: #dfdfd9;
  --surface: rgba(0,0,0,0.03);
  --border: rgba(201,168,76,0.28);
  --border-h: rgba(201,168,76,0.6);
  --text: #1a1a18;
  --text-dim: #444;
  --text-muted: #888;
  --wa: #1fa855;
  --serif: 'Cormorant Garamond', Georgia, serif;
  --sans: 'Jost', system-ui, sans-serif;
}

html, body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  font-weight: 300;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}
button { font-family: var(--sans); }
input, select, textarea { font-family: var(--sans); }
img { max-width: 100%; }

/* GRANO */
body::after {
  content: ''; position: fixed; inset: 0; pointer-events: none;
  z-index: 9999; opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}

/* ── BARRA ANUNCIO ── */
.announce { background: var(--bg); border-bottom: 1px solid var(--border); padding: 12px 0; overflow: hidden; position: relative; }
.announce::before, .announce::after { content: ''; position: absolute; top: 0; bottom: 0; width: 100px; z-index: 2; pointer-events: none; }
.announce::before { left: 0; background: linear-gradient(to right, var(--bg), transparent); }
.announce::after  { right: 0; background: linear-gradient(to left, var(--bg), transparent); }
.ann-track { display: flex; width: max-content; animation: ticker 30s linear infinite; }
.ann-i { font-size: 12px; font-weight: 500; letter-spacing: 3px; color: var(--text-muted); text-transform: uppercase; display: flex; align-items: center; gap: 12px; padding: 0 48px; white-space: nowrap; }
.ann-i em { color: var(--gold); font-style: normal; }
.ann-sep { width: 3px; height: 3px; background: var(--gold); border-radius: 50%; opacity: 0.4; flex-shrink: 0; }
@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* ── NAVBAR ── */
.nav { background: rgba(12,12,11,0.97); backdrop-filter: blur(24px) saturate(160%); -webkit-backdrop-filter: blur(24px) saturate(160%); border-bottom: 1px solid var(--border); padding: 0 52px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; height: 72px; }
.nav-logo-img { height: 46px; width: auto; display: block; flex-shrink: 0; }
.nav-logo { display: flex; align-items: center; gap: 14px; cursor: pointer; transition: opacity 0.3s; }
.nav-logo:hover { opacity: 0.75; }
.nav-logo-text { display: flex; flex-direction: column; }
.l-rey { font-family: var(--serif); font-size: 28px; font-weight: 600; color: var(--gold); letter-spacing: 7px; display: block; line-height: 1; }
.l-da { font-size: 10px; font-weight: 500; letter-spacing: 7px; color: var(--gold); opacity: 0.45; display: block; margin-top: 4px; }
.nav-sep { width: 1px; height: 30px; background: var(--border); }
.nav-links { display: flex; gap: 2px; }
.nl { font-size: 12px; font-weight: 500; letter-spacing: 2.5px; color: rgba(255,255,255,0.72); cursor: pointer; text-transform: uppercase; background: none; border: none; transition: color 0.25s; padding: 8px 13px; position: relative; }
.nl::after { content: ''; position: absolute; bottom: 2px; left: 50%; right: 50%; height: 1px; background: var(--gold); transition: left 0.35s, right 0.35s; }
.nl:hover::after, .nl.act::after { left: 13px; right: 13px; }
.nl:hover, .nl.act { color: var(--gold); }
.nav-r { display: flex; align-items: center; gap: 6px; }
.icon-btn { background: none; border: 1px solid transparent; color: rgba(255,255,255,0.8); cursor: pointer; font-size: 18px; padding: 7px 10px; transition: all 0.25s; position: relative; line-height: 1; border-radius: 2px; }
.icon-btn:hover { color: var(--gold); border-color: var(--border); background: rgba(255,255,255,0.07); }
.cbadge { position: absolute; top: -4px; right: -5px; background: var(--gold); color: #000; font-size: 10px; font-weight: 700; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; }

/* ── HAMBURGUESA / MENÚ MÓVIL ── */
.hamburger { display: none; flex-direction: column; justify-content: center; gap: 5px; width: 40px; height: 40px; background: none; border: 1px solid var(--border); cursor: pointer; padding: 9px; border-radius: 2px; transition: border-color 0.25s; flex-shrink: 0; }
.hamburger:hover { border-color: var(--gold); }
.ham-line { display: block; height: 1px; background: rgba(255,255,255,0.8); transition: all 0.3s; transform-origin: center; }
.hamburger.open .ham-line:nth-child(1) { transform: translateY(6px) rotate(45deg); background: var(--gold); }
.hamburger.open .ham-line:nth-child(2) { opacity: 0; transform: scaleX(0); }
.hamburger.open .ham-line:nth-child(3) { transform: translateY(-6px) rotate(-45deg); background: var(--gold); }
.mobile-menu { display: none; position: absolute; top: 72px; left: 0; right: 0; background: rgba(12,12,11,0.99); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); flex-direction: column; padding: 8px 0 18px; z-index: 99; box-shadow: 0 16px 48px rgba(0,0,0,0.35); }
.mobile-menu.open { display: flex; }
.mobile-menu .nl { width: 100%; text-align: left; padding: 16px 28px; font-size: 13px; border-bottom: 1px solid rgba(201,168,76,0.07); border-radius: 0; }
.mobile-menu .nl:last-child { border-bottom: none; }
.mobile-menu .nl::after { display: none; }
.mobile-menu .nl:hover, .mobile-menu .nl.act { background: rgba(201,168,76,0.05); color: var(--gold); }

/* ── CARRUSEL HERO ── */
.hero-carousel { padding: 28px 52px 10px; background: var(--bg); }
.hc-viewport { position: relative; max-width: 1280px; margin: 0 auto; border-radius: 14px; overflow: hidden; border: 1px solid var(--border); box-shadow: 0 30px 80px rgba(0,0,0,0.18); background: #0a0a0a; aspect-ratio: 1350 / 714; }
.hc-track { display: flex; height: 100%; transition: transform 0.7s cubic-bezier(.4,0,.2,1); }
.hc-slide { min-width: 100%; height: 100%; border: none; padding: 0; cursor: pointer; background: #0a0a0a; display: block; }
.hc-slide img { width: 100%; height: 100%; object-fit: contain; display: block; }
.hc-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 48px; height: 48px; border-radius: 50%; background: rgba(10,10,10,0.4); color: var(--gold-l); border: 1px solid rgba(201,168,76,0.5); backdrop-filter: blur(6px); cursor: pointer; font-size: 28px; line-height: 1; display: flex; align-items: center; justify-content: center; transition: all 0.25s; z-index: 3; }
.hc-arrow:hover { background: var(--gold); color: #000; border-color: var(--gold); }
.hc-prev { left: 18px; } .hc-next { right: 18px; }
.hc-dots { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 9px; z-index: 3; }
.hc-dot { width: 9px; height: 9px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.6); background: rgba(255,255,255,0.25); cursor: pointer; padding: 0; transition: all 0.3s; }
.hc-dot.act { background: var(--gold); border-color: var(--gold); width: 26px; border-radius: 5px; }

/* ── DESTACADOS (íconos dorados) ── */
.featured { background: var(--bg); padding: 30px 52px 12px; display: flex; flex-wrap: wrap; gap: 22px 32px; justify-content: center; }
.feat-badge { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 128px; text-align: center; background: none; border: none; }
.feat-badge.clk { cursor: pointer; }
.feat-ring { width: 84px; height: 84px; border-radius: 50%; overflow: hidden; border: 2px solid var(--gold); box-shadow: 0 0 0 4px rgba(201,168,76,0.12), 0 10px 26px rgba(0,0,0,0.18); transition: transform 0.35s, box-shadow 0.35s; background: #0a0a0a; }
.feat-badge:hover .feat-ring { transform: translateY(-5px); box-shadow: 0 0 0 4px rgba(201,168,76,0.22), 0 16px 32px rgba(0,0,0,0.28); }
.feat-ring img { width: 100%; height: 100%; object-fit: cover; }
.feat-cap { font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: var(--text-dim); line-height: 1.5; }

/* ── BOTONES ── */
.btn-g { display: inline-flex; align-items: center; gap: 10px; background: var(--gold); color: #000; padding: 15px 38px; font-size: 12px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; border: none; cursor: pointer; transition: all 0.4s cubic-bezier(0.25,0.46,0.45,0.94); position: relative; overflow: hidden; }
.btn-g::before { content: ''; position: absolute; inset: 0; background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%); transform: translateX(-120%); transition: transform 0.6s; }
.btn-g:hover::before { transform: translateX(120%); }
.btn-g:hover { background: var(--gold-l); box-shadow: 0 0 50px rgba(201,168,76,0.3), 0 12px 36px rgba(0,0,0,0.18); transform: translateY(-2px); }
.btn-o { display: inline-flex; align-items: center; gap: 10px; background: transparent; color: var(--gold); padding: 14px 38px; font-size: 12px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; border: 1px solid rgba(201,168,76,0.35); cursor: pointer; transition: all 0.3s; }
.btn-o:hover { background: rgba(201,168,76,0.06); border-color: var(--gold); box-shadow: 0 0 24px rgba(201,168,76,0.1); }
.wa-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; height: 54px; background: var(--wa); color: #fff; border: none; font-size: 13px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; cursor: pointer; transition: all 0.3s; }
.wa-btn:hover { background: #17924a; box-shadow: 0 10px 30px rgba(31,168,85,0.35); }

/* ── FILTROS ── */
.filters { padding: 0 52px; display: flex; background: var(--bg2); border-bottom: 1px solid rgba(0,0,0,0.07); }
.ftab { padding: 18px 24px; font-size: 12px; font-weight: 500; letter-spacing: 3px; text-transform: uppercase; cursor: pointer; color: var(--text-muted); border: none; border-bottom: 2px solid transparent; background: none; transition: all 0.25s; white-space: nowrap; }
.ftab:hover { color: #999; }
.ftab.act { color: var(--gold); border-bottom-color: var(--gold); }

/* ── PRODUCTOS ── */
.products-wrap { padding: 56px 52px 88px; background: var(--bg); }
.sec-hdr { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 44px; flex-wrap: wrap; gap: 8px; }
.sec-title { font-family: var(--serif); font-size: 44px; font-weight: 300; letter-spacing: 0.5px; }
.sec-title span { color: var(--gold); font-style: italic; }
.sec-cnt { font-size: 12px; color: var(--text-muted); letter-spacing: 2.5px; text-transform: uppercase; }
.pgrid { display: grid; grid-template-columns: repeat(2,1fr); gap: 1px; background: rgba(201,168,76,0.08); max-width: 1180px; margin: 0 auto; }
.pcard { background: var(--bg); cursor: pointer; overflow: hidden; transition: all 0.45s cubic-bezier(0.25,0.46,0.45,0.94); position: relative; display: flex; flex-direction: column; }
.pcard::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(201,168,76,0.05) 0%, transparent 55%); opacity: 0; transition: opacity 0.4s; z-index: 1; pointer-events: none; }
.pcard:hover::before { opacity: 1; }
.pcard:hover { background: #f6f6f2; box-shadow: 0 28px 70px rgba(0,0,0,0.1); z-index: 2; transform: translateY(-8px); }
.pcard-img { height: 340px; display: flex; align-items: center; justify-content: center; position: relative; background: #ffffff; overflow: hidden; }
.pcard-real-img { width: 100%; height: 100%; object-fit: contain; padding: 24px; transition: transform 0.5s; }
.pcard:hover .pcard-real-img { transform: scale(1.05); }
.pcard-badge { position: absolute; top: 16px; left: 0; background: var(--gold); color: #000; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; padding: 6px 14px 6px 12px; text-transform: uppercase; z-index: 2; box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
.pcard-body { padding: 22px 24px 12px; flex: 1; }
.pcard-cat { font-size: 10px; font-weight: 600; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; margin-bottom: 8px; }
.pcard-name { font-family: var(--serif); font-size: 25px; font-weight: 600; margin-bottom: 4px; letter-spacing: 0.4px; line-height: 1.12; transition: color 0.3s; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 50px; }
.pcard:hover .pcard-name { color: var(--gold-d); }
.pcard-sub { font-size: 11px; color: var(--text-muted); letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 14px; min-height: 11px; }
.pcard-price { font-family: var(--serif); font-size: 25px; font-weight: 500; color: var(--gold-d); }
.pcard-curr { font-size: 13px; opacity: 0.5; font-family: var(--sans); font-weight: 300; letter-spacing: 1px; }
.pcard-foot { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-top: 1px solid rgba(0,0,0,0.07); }
.pcard-orig { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.pcard-orig::before { content: '✓'; color: var(--gold); font-weight: 700; }
.quick-buy { background: transparent; color: var(--gold-d); border: 1px solid rgba(201,168,76,0.3); font-size: 11px; font-weight: 600; letter-spacing: 2px; padding: 9px 18px; cursor: pointer; transition: all 0.3s; text-transform: uppercase; font-family: var(--sans); }
.quick-buy:hover { background: var(--gold); color: #000; border-color: var(--gold); }
.empty-state { grid-column: 1/-1; text-align: center; padding: 100px; color: var(--text-muted); }
.empty-state-icon { font-size: 56px; margin-bottom: 18px; opacity: 0.25; }

/* ── DETALLE PRODUCTO ── */
.pd-wrap { padding: 48px 52px 88px; background: var(--bg); }
.bc { display: flex; gap: 8px; align-items: center; font-size: 12px; color: var(--text-muted); margin-bottom: 40px; letter-spacing: 1.5px; text-transform: uppercase; flex-wrap: wrap; }
.bc .cur { color: var(--gold); }
.bc-sep { color: rgba(0,0,0,0.18); font-size: 14px; }
.bc-lnk { cursor: pointer; transition: color 0.2s; }
.bc-lnk:hover { color: var(--gold); }
.pd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; }
.pd-main { width: 100%; aspect-ratio: 1/1; background: #ffffff; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.pd-real-img { max-width: 88%; max-height: 88%; object-fit: contain; position: relative; z-index: 1; }
.pd-info { padding-top: 8px; }
.pd-badge { display: inline-block; background: var(--gold); color: #000; font-size: 11px; font-weight: 700; letter-spacing: 2px; padding: 6px 16px; text-transform: uppercase; margin-bottom: 22px; }
.pd-name { font-family: var(--serif); font-size: 56px; font-weight: 300; line-height: 0.95; margin-bottom: 10px; letter-spacing: 0.5px; }
.pd-name b { color: var(--gold-d); font-weight: 600; }
.pd-sub { font-size: 12px; letter-spacing: 5px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 24px; }
.pd-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(0,0,0,0.08); }
.pd-chip { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; padding: 7px 14px; border: 1px solid var(--border); color: var(--text-dim); }
.pd-chip.gold { background: var(--gold); color: #000; border-color: var(--gold); font-weight: 700; }
.pd-price { font-family: var(--serif); font-size: 40px; font-weight: 500; color: var(--gold-d); margin-bottom: 24px; letter-spacing: 0.5px; }
.pd-curr { font-size: 18px; opacity: 0.5; font-family: var(--sans); font-weight: 300; }
.pd-promo { display: flex; align-items: center; gap: 12px; background: rgba(201,168,76,0.08); border: 1px solid var(--border); padding: 14px 18px; margin-bottom: 26px; }
.pd-promo b { color: var(--gold-d); font-family: var(--serif); font-size: 22px; }
.pd-promo span { font-size: 13px; color: var(--text-dim); letter-spacing: 0.4px; }
.pd-desc { font-size: 14px; color: var(--text-dim); line-height: 2.2; padding: 22px 0; border-top: 1px solid rgba(0,0,0,0.08); border-bottom: 1px solid rgba(0,0,0,0.08); margin-bottom: 30px; font-weight: 300; }
.pd-sec-t { font-size: 11px; font-weight: 600; letter-spacing: 4px; color: var(--gold); text-transform: uppercase; margin-bottom: 16px; }
.sizes-row { display: flex; gap: 8px; margin-bottom: 30px; flex-wrap: wrap; }
.size-btn { padding: 12px 24px; font-size: 13px; font-weight: 400; border: 1px solid rgba(0,0,0,0.1); background: none; color: #777; cursor: pointer; transition: all 0.25s; font-family: var(--sans); letter-spacing: 1px; }
.size-btn.act { border-color: var(--gold); color: var(--gold-d); background: rgba(201,168,76,0.06); }
.size-btn:hover { border-color: #aaa; }
.add-row { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
.qty-ctrl { display: flex; align-items: center; border: 1px solid rgba(0,0,0,0.12); }
.qty-btn { width: 46px; height: 54px; background: none; border: none; color: #666; font-size: 25px; cursor: pointer; transition: color 0.2s; line-height: 1; }
.qty-btn:hover { color: var(--gold); }
.qty-n { width: 46px; text-align: center; font-size: 17px; color: var(--text); font-family: var(--serif); }
.add-btn { flex: 1; min-width: 200px; height: 54px; background: #1a1a18; color: var(--gold-l); border: none; font-size: 12px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; cursor: pointer; transition: all 0.35s; display: flex; align-items: center; justify-content: center; gap: 10px; font-family: var(--sans); }
.add-btn:hover { background: #000; box-shadow: 0 12px 30px rgba(0,0,0,0.25); }
.pd-buy { margin-bottom: 26px; }
.feats { display: grid; grid-template-columns: repeat(2,1fr); gap: 1px; background: rgba(0,0,0,0.07); margin-top: 8px; }
.feat { padding: 20px 14px; text-align: center; background: var(--bg); transition: background 0.3s; }
.feat:hover { background: var(--bg2); }
.feat-ic { font-size: 20px; margin-bottom: 9px; }
.feat-lbl { font-size: 10px; color: var(--text-muted); letter-spacing: 2px; text-transform: uppercase; }
.feat-val { font-size: 13px; color: #555; margin-top: 5px; font-weight: 400; line-height: 1.5; }

/* ── COLECCIONES ── */
.coll-sec { padding: 88px 52px; background: var(--bg2); }
.coll-hdr { text-align: center; margin-bottom: 56px; }
.coll-eyebrow { font-size: 12px; font-weight: 500; letter-spacing: 6px; color: var(--gold); text-transform: uppercase; margin-bottom: 14px; }
.coll-title { font-family: var(--serif); font-size: 52px; font-weight: 300; margin-bottom: 10px; }
.coll-title span { color: var(--gold); font-style: italic; }
.coll-sub { font-size: 13px; letter-spacing: 4px; color: var(--text-muted); text-transform: uppercase; }
.coll-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; max-width: 1280px; margin: 0 auto; }
.coll-card { height: 300px; position: relative; overflow: hidden; cursor: pointer; border-radius: 10px; border: 1px solid var(--border); }
.coll-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.75s cubic-bezier(0.25,0.46,0.45,0.94); }
.coll-card:hover .coll-img { transform: scale(1.08); }
.coll-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.2) 55%, rgba(0,0,0,0.05) 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 30px; transition: background 0.45s; }
.coll-card:hover .coll-overlay { background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.15) 100%); }
.coll-cat { font-size: 10px; font-weight: 600; letter-spacing: 4px; color: var(--gold-l); text-transform: uppercase; margin-bottom: 8px; }
.coll-name { font-family: var(--serif); font-size: 34px; font-weight: 600; margin-bottom: 7px; color: #fff; }
.coll-tag { font-size: 13px; color: #cfcfcf; margin-bottom: 18px; font-weight: 300; line-height: 1.5; }
.coll-cta { font-size: 11px; font-weight: 600; letter-spacing: 3px; color: var(--gold-l); text-transform: uppercase; display: flex; align-items: center; gap: 8px; }
.coll-cta::after { content: '→'; }

/* ── FOOTER ── */
.footer { background: var(--bg2); border-top: 1px solid var(--border); }
.footer-trust { display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: var(--border); }
.ft-item { text-align: center; padding: 40px 20px; background: var(--bg2); display: flex; flex-direction: column; align-items: center; gap: 8px; transition: background 0.3s; }
.ft-item:hover { background: #e8e8e4; }
.ft-icon { font-size: 28px; margin-bottom: 4px; }
.ft-title { font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #333; }
.ft-sub { font-size: 13px; color: var(--text-muted); font-weight: 300; line-height: 1.5; }
.footer-bot { text-align: center; padding: 48px 52px; }
.footer-logo { font-family: var(--serif); font-size: 31px; color: var(--gold); letter-spacing: 10px; margin-bottom: 8px; font-weight: 400; }
.footer-tag { font-size: 12px; color: var(--text-muted); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 22px; }
.footer-wa { display: inline-flex; align-items: center; gap: 9px; color: var(--wa); border: 1px solid rgba(31,168,85,0.35); padding: 11px 24px; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; transition: all 0.3s; margin-bottom: 26px; }
.footer-wa:hover { background: rgba(31,168,85,0.08); border-color: var(--wa); }
.footer-divider { width: 40px; height: 1px; background: var(--gold); margin: 0 auto 18px; opacity: 0.3; }
.footer-copy { font-size: 12px; color: var(--text-muted); letter-spacing: 1.5px; line-height: 1.8; }

/* ── ADMIN ── */
.admin-wrap { max-width: 1100px; margin: 0 auto; padding: 52px; }
.admin-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid var(--border); gap: 16px; flex-wrap: wrap; }
.admin-title { font-family: var(--serif); font-size: 40px; font-weight: 300; }
.admin-title span { color: var(--gold); font-style: italic; }
.admin-info { margin-bottom: 24px; padding: 14px 18px; background: rgba(201,168,76,0.04); border: 1px solid var(--border); font-size: 14px; color: var(--text-muted); }
.admin-info b { color: var(--gold-d); }
.atbl { width: 100%; border-collapse: collapse; }
.atbl th { text-align: left; padding: 14px 16px; font-size: 10px; font-weight: 600; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; border-bottom: 1px solid var(--border); }
.atbl td { padding: 14px 16px; font-size: 15px; border-bottom: 1px solid rgba(0,0,0,0.05); vertical-align: middle; }
.atbl tr:hover td { background: rgba(0,0,0,0.03); }
.athumb { width: 46px; height: 56px; object-fit: contain; background: #fff; border: 1px solid var(--border); }
.atn { font-family: var(--serif); font-size: 18px; }
.ats { font-size: 11px; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase; }
.atp { color: var(--gold-d); font-weight: 500; font-family: var(--serif); font-size: 17px; }
.atc { font-size: 13px; color: var(--text-muted); }
.abtn { padding: 7px 14px; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; cursor: pointer; text-transform: uppercase; border: 1px solid; transition: all 0.25s; font-family: var(--sans); }
.abtn-e { color: var(--gold-d); border-color: rgba(201,168,76,0.3); background: none; margin-right: 8px; }
.abtn-e:hover { background: rgba(201,168,76,0.08); }
.abtn-d { color: #d64545; border-color: rgba(214,69,69,0.3); background: none; }
.abtn-d:hover { background: rgba(214,69,69,0.08); }
.form-g { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.fg { display: flex; flex-direction: column; gap: 8px; }
.fg.full { grid-column: 1/-1; }
.fl { font-size: 11px; font-weight: 600; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; }
.fi, .fsel, .fta { background: var(--bg3); border: 1px solid rgba(0,0,0,0.1); color: var(--text); padding: 13px 16px; font-size: 15px; outline: none; transition: border-color 0.25s; width: 100%; font-family: var(--sans); font-weight: 300; }
.fi:focus, .fsel:focus, .fta:focus { border-color: rgba(201,168,76,0.5); }
.fta { resize: vertical; min-height: 84px; }
.form-hint { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.fchk { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text-dim); cursor: pointer; padding-top: 6px; }
.fchk input { width: 18px; height: 18px; accent-color: var(--gold); }
.img-upload { border: 1px dashed rgba(201,168,76,0.3); padding: 36px; text-align: center; cursor: pointer; transition: all 0.3s; background: var(--bg); position: relative; }
.img-upload:hover { border-color: var(--gold); background: rgba(201,168,76,0.03); }
.img-upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.img-upload-icon { font-size: 34px; margin-bottom: 10px; opacity: 0.35; }
.img-upload-text { font-size: 13px; color: var(--text-muted); letter-spacing: 1px; }
.img-preview { position: relative; display: inline-block; }
.img-preview img { max-width: 100%; max-height: 200px; border: 1px solid var(--border); object-fit: contain; background: #fff; }
.img-preview-rm { position: absolute; top: -8px; right: -8px; width: 24px; height: 24px; border-radius: 50%; background: #d64545; color: #fff; border: none; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; }

/* ── CARRITO ── */
.cart-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 200; backdrop-filter: blur(6px); animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.cart-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 400px; background: var(--bg2); border-left: 1px solid var(--border); z-index: 201; display: flex; flex-direction: column; animation: slideIn 0.4s cubic-bezier(0.25,0.46,0.45,0.94); }
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
.cart-hdr { padding: 24px 28px; border-bottom: 1px solid rgba(0,0,0,0.08); display: flex; justify-content: space-between; align-items: center; background: var(--bg3); }
.cart-title { font-family: var(--serif); font-size: 28px; font-weight: 400; letter-spacing: 1px; }
.cart-x { background: none; border: none; color: var(--text-muted); font-size: 20px; cursor: pointer; line-height: 1; transition: color 0.2s; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; }
.cart-x:hover { color: var(--text); }
.cart-body { flex: 1; overflow-y: auto; padding: 8px 16px; }
.ci { display: flex; gap: 16px; padding: 18px 8px; border-bottom: 1px solid rgba(0,0,0,0.07); }
.ci-img { width: 62px; height: 78px; background: #fff; border: 1px solid var(--border); flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.ci-real-img { width: 100%; height: 100%; object-fit: contain; padding: 5px; }
.ci-info { flex: 1; }
.ci-name { font-family: var(--serif); font-size: 18px; margin-bottom: 5px; line-height: 1.1; }
.ci-sz { font-size: 12px; color: var(--text-muted); letter-spacing: 1.5px; text-transform: uppercase; }
.ci-price { font-family: var(--serif); font-size: 16px; font-weight: 500; color: var(--gold-d); margin-top: 7px; }
.ci-rm { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 15px; line-height: 1; transition: color 0.2s; align-self: flex-start; padding: 4px; }
.ci-rm:hover { color: #d64545; }
.cart-foot { padding: 22px 28px; border-top: 1px solid rgba(0,0,0,0.08); background: var(--bg3); }
.cart-tr { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid rgba(0,0,0,0.08); }
.cart-tl { font-size: 12px; color: var(--text-muted); letter-spacing: 3px; text-transform: uppercase; }
.cart-ta { font-family: var(--serif); font-size: 31px; font-weight: 500; color: var(--gold-d); }
.cart-note { font-size: 12px; color: var(--text-muted); text-align: center; margin-top: 12px; letter-spacing: 0.5px; line-height: 1.6; }
.cart-keep { display: block; width: 100%; background: none; border: none; color: var(--text-muted); font-family: var(--sans); font-size: 11px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; padding: 14px 0 2px; transition: color 0.2s; }
.cart-keep:hover { color: var(--gold-d); }
.empty-cart { text-align: center; padding: 80px 24px; color: var(--text-muted); }
.empty-icon { font-size: 48px; margin-bottom: 18px; opacity: 0.25; }

/* ── TOAST ── */
.toast { position: fixed; bottom: 36px; left: 50%; transform: translateX(-50%); background: var(--gold); color: #000; padding: 15px 36px; font-size: 12px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; z-index: 400; white-space: nowrap; animation: toastIn 0.35s cubic-bezier(0.25,0.46,0.45,0.94); box-shadow: 0 8px 48px rgba(201,168,76,0.3); }
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

/* ── BOTÓN FLOTANTE WHATSAPP ── */
.wa-float { position: fixed; right: 24px; bottom: 24px; width: 62px; height: 62px; border-radius: 50%; background: var(--wa); color: #fff; display: flex; align-items: center; justify-content: center; z-index: 150; text-decoration: none; box-shadow: 0 8px 26px rgba(0,0,0,0.22); transition: transform 0.25s, background 0.25s; animation: waFade 0.4s ease both, waRing 2.6s ease-out infinite; }
.wa-float svg { width: 33px; height: 33px; }
.wa-float:hover { transform: scale(1.09); background: #17924a; }
@keyframes waFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes waRing {
  0%   { box-shadow: 0 8px 26px rgba(0,0,0,0.22), 0 0 0 0 rgba(31,168,85,0.5); }
  70%  { box-shadow: 0 8px 26px rgba(0,0,0,0.22), 0 0 0 16px rgba(31,168,85,0); }
  100% { box-shadow: 0 8px 26px rgba(0,0,0,0.22), 0 0 0 0 rgba(31,168,85,0); }
}
@media (max-width: 768px) {
  .wa-float { right: 16px; bottom: 16px; width: 56px; height: 56px; }
  .wa-float svg { width: 30px; height: 30px; }
}

/* ── LOGIN ── */
.login-wrap { max-width: 390px; margin: 90px auto; text-align: center; padding: 0 28px; }
.login-title { font-family: var(--serif); font-size: 42px; margin-bottom: 10px; font-weight: 300; }
.login-sub { color: var(--text-muted); font-size: 12px; margin-bottom: 36px; letter-spacing: 3.5px; text-transform: uppercase; }
.login-form { display: flex; flex-direction: column; gap: 14px; }
.hint { font-size: 13px; color: var(--text-muted); margin-top: 8px; }

/* ── APP FADE ── */
.app-root { opacity: 0; transition: opacity 0.35s ease; }
.app-root.ready { opacity: 1; }

/* ════════ RESPONSIVE ════════ */
@media (max-width: 1200px) {
  .nav { padding: 0 32px; }
  .hero-carousel { padding: 22px 32px 6px; }
  .featured { padding: 24px 32px 6px; }
  .products-wrap { padding: 48px 32px 72px; }
  .filters { padding: 0 32px; }
  .pd-wrap { padding: 40px 32px 72px; }
  .pd-grid { gap: 48px; }
  .coll-sec { padding: 72px 32px; }
  .footer-bot { padding: 40px 32px; }
  .admin-wrap { padding: 40px 32px; }
}
@media (max-width: 1024px) {
  .pgrid { grid-template-columns: repeat(2,1fr); }
  .pd-grid { grid-template-columns: 1fr 1fr; gap: 40px; }
  .pd-name { font-size: 46px; }
  .footer-trust { grid-template-columns: repeat(2,1fr); }
  .sec-title { font-size: 36px; }
  .coll-title { font-size: 40px; }
}
@media (max-width: 768px) {
  .nav { padding: 0 18px; position: relative; height: 64px; }
  .nav-sep { display: none; }
  .nav-links { display: none; }
  .hamburger { display: flex; }
  .mobile-menu { top: 64px; }
  .ann-i { padding: 0 24px; }
  .announce::before, .announce::after { width: 50px; }

  .hero-carousel { padding: 14px 14px 4px; }
  .hc-viewport { border-radius: 10px; }
  .hc-arrow { width: 38px; height: 38px; font-size: 22px; }
  .hc-prev { left: 10px; } .hc-next { right: 10px; }
  .hc-dots { bottom: 10px; }

  .featured { padding: 24px 16px 6px; gap: 22px 18px; }
  .feat-badge { width: 42%; min-width: 120px; }
  .feat-ring { width: 72px; height: 72px; }
  .feat-cap { font-size: 11px; letter-spacing: 1.5px; }

  .filters { padding: 0 14px; overflow-x: auto; scrollbar-width: none; }
  .filters::-webkit-scrollbar { display: none; }
  .ftab { padding: 14px 16px; font-size: 11px; }

  .products-wrap { padding: 32px 16px 56px; }
  .pgrid { grid-template-columns: repeat(2,1fr); }
  .sec-title { font-size: 31px; }
  .pcard-img { height: 220px; }
  .pcard-body { padding: 16px 16px 8px; }
  .pcard-name { font-size: 20px; min-height: 42px; }
  .pcard-price { font-size: 22px; }
  .pcard-foot { padding: 12px 16px; }

  .pd-wrap { padding: 22px 16px 56px; }
  .bc { margin-bottom: 24px; }
  .pd-grid { grid-template-columns: 1fr; gap: 28px; }
  .pd-name { font-size: 40px; }
  .pd-price { font-size: 34px; }
  .feats { grid-template-columns: repeat(2,1fr); }
  .add-row { gap: 10px; }
  .add-btn { min-width: 0; }

  .coll-sec { padding: 48px 16px; }
  .coll-grid { grid-template-columns: 1fr; gap: 14px; }
  .coll-card { height: 220px; }
  .coll-title { font-size: 34px; }

  .footer-trust { grid-template-columns: repeat(2,1fr); }
  .ft-item { padding: 28px 16px; }
  .footer-bot { padding: 36px 18px; }

  .admin-wrap { padding: 20px 14px; }
  .admin-title { font-size: 31px; }
  .atbl { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; white-space: nowrap; }
  .form-g { grid-template-columns: 1fr; }

  .cart-drawer { width: 100%; }
}
@media (max-width: 480px) {
  .pgrid { grid-template-columns: repeat(2,1fr); }
  .pd-name { font-size: 34px; }
  .coll-title { font-size: 28px; }
  .sec-title { font-size: 25px; }
  .hc-arrow { width: 32px; height: 32px; font-size: 18px; }
  .feat-badge { width: 45%; }
  .pcard-img { height: 172px; }
  .pcard-real-img { padding: 16px; }
  .pcard-body { padding: 13px 13px 6px; }
  .pcard-name { font-size: 17px; min-height: 40px; }
  .pcard-sub { margin-bottom: 10px; letter-spacing: 1.5px; }
  .pcard-price { font-size: 19px; }
  .pcard-foot { padding: 11px 13px; }
  .quick-buy { padding: 8px 12px; font-size: 10px; letter-spacing: 1px; }
  .pcard-orig { font-size: 10px; letter-spacing: 1px; }
  .icon-btn { font-size: 16px; padding: 6px 7px; }
}
@media (max-width: 360px) {
  .l-rey { font-size: 22px; letter-spacing: 4px; }
  .l-da { letter-spacing: 4px; }
  .nav { padding: 0 12px; }
}

/* ── PROGRESO DEL CARRUSEL ── */
.hc-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: rgba(255,255,255,0.16); z-index: 3; }
.hc-progress-bar { height: 100%; width: 0; background: var(--gold); }
.hc-progress-bar.run { animation: hcfill 4500ms linear forwards; }
.hc-progress-bar.paused { width: 0; }
@keyframes hcfill { from { width: 0; } to { width: 100%; } }

/* ── BOTONES DE COMPRA ── */
.buy-now-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; height: 56px; background: var(--gold); color: #000; border: none; font-size: 13px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; cursor: pointer; transition: all 0.3s; }
.buy-now-btn:hover { background: var(--gold-l); box-shadow: 0 12px 34px rgba(201,168,76,0.35); transform: translateY(-2px); }
.co-checkout-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; height: 54px; background: #1a1a18; color: var(--gold-l); border: none; font-size: 13px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; cursor: pointer; transition: all 0.3s; }
.co-checkout-btn:hover { background: #000; box-shadow: 0 12px 30px rgba(0,0,0,0.28); }

/* ── CHECKOUT ── */
.co-wrap { padding: 48px 52px 96px; background: var(--bg); max-width: 1180px; margin: 0 auto; }
.co-grid { display: grid; grid-template-columns: 1.45fr 1fr; gap: 56px; align-items: start; }
.co-main { min-width: 0; }
.co-title { font-family: var(--serif); font-size: 46px; font-weight: 300; letter-spacing: 0.5px; margin-bottom: 8px; }
.co-title span { color: var(--gold); font-style: italic; }
.co-lead { font-size: 14px; color: var(--text-dim); letter-spacing: 0.3px; margin-bottom: 32px; line-height: 1.6; }
.co-sec-t { font-size: 12px; font-weight: 600; letter-spacing: 4px; color: var(--gold); text-transform: uppercase; margin-bottom: 16px; }
.co-form { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.co-form .fg.full { grid-column: 1/-1; }

.pay-methods { display: flex; flex-direction: column; gap: 12px; }
.pay-card { position: relative; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 16px; text-align: left; background: var(--bg2); border: 1px solid rgba(0,0,0,0.1); padding: 18px 20px; cursor: pointer; transition: all 0.25s; font-family: var(--sans); }
.pay-card:hover { border-color: var(--border-h); background: #f6f6f2; }
.pay-card.act { border-color: var(--gold); background: rgba(201,168,76,0.06); box-shadow: inset 0 0 0 1px var(--gold); }
.pay-logo { font-weight: 700; font-size: 15px; letter-spacing: 0.5px; padding: 8px 13px; border-radius: 5px; color: #fff; white-space: nowrap; }
.pay-wompi { background: #4c2cc9; }
.pay-addi { background: #16131f; }
.pay-sistecredito { background: #e30613; }
.pay-desc { font-size: 13px; color: var(--text-dim); letter-spacing: 0.3px; }
.pay-badge { font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted); border: 1px solid var(--border); padding: 5px 10px; border-radius: 3px; white-space: nowrap; }
.pay-check { position: absolute; top: 12px; right: 12px; width: 22px; height: 22px; border-radius: 50%; background: var(--gold); color: #000; font-size: 13px; font-weight: 700; display: none; align-items: center; justify-content: center; }
.pay-card.act .pay-check { display: flex; }
.pay-card.act .pay-badge { visibility: hidden; }

.co-summary { background: var(--bg2); border: 1px solid var(--border); padding: 28px 26px; position: sticky; top: 92px; }
.co-sum-t { font-family: var(--serif); font-size: 28px; font-weight: 400; margin-bottom: 18px; letter-spacing: 0.5px; }
.co-items { display: flex; flex-direction: column; margin-bottom: 6px; max-height: 340px; overflow-y: auto; }
.co-item { display: flex; gap: 14px; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
.co-item-img { width: 50px; height: 62px; flex-shrink: 0; background: #fff; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.co-item-img img { width: 100%; height: 100%; object-fit: contain; padding: 5px; }
.co-item-info { flex: 1; min-width: 0; }
.co-item-name { font-family: var(--serif); font-size: 18px; line-height: 1.15; }
.co-item-sub { font-size: 12px; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase; margin-top: 5px; }
.co-item-price { font-family: var(--serif); font-size: 16px; font-weight: 500; color: var(--gold-d); white-space: nowrap; }
.co-total-row { display: flex; justify-content: space-between; align-items: baseline; padding: 18px 0; border-top: 1px solid rgba(0,0,0,0.1); margin: 8px 0 16px; }
.co-total-row > span:first-child { font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: var(--text-muted); }
.co-total { font-family: var(--serif); font-size: 34px; font-weight: 500; color: var(--gold-d); }
.co-pay-btn { width: 100%; min-height: 58px; padding: 17px 18px; background: var(--gold); color: #000; border: none; font-size: 13px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; cursor: pointer; transition: all 0.3s; line-height: 1.4; }
.co-pay-btn:hover { background: var(--gold-l); box-shadow: 0 12px 34px rgba(201,168,76,0.35); transform: translateY(-2px); }
.co-pay-btn:disabled { opacity: 0.55; cursor: default; transform: none; box-shadow: none; }
.co-secure { font-size: 12px; color: var(--text-muted); text-align: center; letter-spacing: 1px; margin-top: 16px; }
.co-help { display: block; text-align: center; margin-top: 14px; font-size: 12px; letter-spacing: 1.5px; color: var(--text-muted); text-decoration: none; text-transform: uppercase; transition: color 0.2s; }
.co-help:hover { color: var(--gold); }
.co-empty { text-align: center; padding: 110px 24px; color: var(--text-muted); }

@media (max-width: 1200px) {
  .co-wrap { padding: 40px 32px 80px; }
}
@media (max-width: 1024px) {
  .co-grid { grid-template-columns: 1fr; gap: 36px; }
  .co-summary { position: static; }
  .co-title { font-size: 40px; }
}
@media (max-width: 768px) {
  .co-wrap { padding: 24px 16px 64px; }
  .co-title { font-size: 34px; }
  .co-form { grid-template-columns: 1fr; }
  .pay-card { padding: 15px 14px; gap: 12px; grid-template-columns: auto 1fr; }
  .pay-badge { display: none; }
  .co-summary { padding: 22px 18px; }
}

/* ── BARRA DE BÚSQUEDA (LUPA) ── */
.search-bar { position: sticky; top: 72px; z-index: 99; background: rgba(12,12,11,0.98); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); padding: 14px 52px; animation: searchDrop 0.25s ease; }
@keyframes searchDrop { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
.search-inner { max-width: 760px; margin: 0 auto; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.07); border: 1px solid var(--border); border-radius: 4px; padding: 4px 8px 4px 16px; transition: border-color 0.2s, box-shadow 0.2s; }
.search-inner:focus-within { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); }
.search-ic { font-size: 16px; opacity: 0.8; flex-shrink: 0; }
.search-input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: #fff; font-family: var(--sans); font-size: 15px; font-weight: 300; padding: 12px 0; letter-spacing: 0.3px; }
.search-input::placeholder { color: rgba(255,255,255,0.45); }
.search-clear { background: none; border: none; color: rgba(255,255,255,0.6); font-size: 14px; cursor: pointer; width: 30px; height: 30px; border-radius: 50%; transition: all 0.2s; flex-shrink: 0; line-height: 1; }
.search-clear:hover { color: #fff; background: rgba(255,255,255,0.12); }
.search-close { background: var(--gold); color: #000; border: none; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; padding: 10px 16px; cursor: pointer; border-radius: 3px; transition: all 0.25s; white-space: nowrap; flex-shrink: 0; }
.search-close:hover { background: var(--gold-l); }
@media (max-width: 768px) { .search-bar { top: 64px; padding: 12px 14px; } .search-input { font-size: 14px; padding: 11px 0; } .search-close { padding: 9px 12px; } }

/* ── SUSCRIPCIÓN (al final de la página) ── */
.newsletter { background: var(--bg2); border-top: 1px solid var(--border); padding: 66px 52px; }
.nl-inner { max-width: 640px; margin: 0 auto; text-align: center; }
.nl-eyebrow { font-size: 12px; font-weight: 500; letter-spacing: 6px; color: var(--gold); text-transform: uppercase; margin-bottom: 14px; }
.nl-title { font-family: var(--serif); font-size: 42px; font-weight: 300; margin-bottom: 12px; letter-spacing: 0.5px; }
.nl-title span { color: var(--gold); font-style: italic; }
.nl-text { font-size: 14px; color: var(--text-dim); line-height: 1.7; margin-bottom: 28px; font-weight: 300; }
.nl-form { display: flex; gap: 10px; max-width: 480px; margin: 0 auto; }
.nl-input { flex: 1; min-width: 0; background: var(--bg3); border: 1px solid rgba(0,0,0,0.12); color: var(--text); padding: 15px 18px; font-size: 15px; outline: none; transition: border-color 0.25s, box-shadow 0.25s; font-family: var(--sans); font-weight: 300; }
.nl-input:focus { border-color: var(--gold); box-shadow: 0 0 0 1px rgba(201,168,76,0.4); }
.nl-btn { background: var(--gold); color: #000; border: none; padding: 0 30px; font-size: 12px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; cursor: pointer; transition: all 0.3s; white-space: nowrap; }
.nl-btn:hover { background: var(--gold-l); box-shadow: 0 10px 28px rgba(201,168,76,0.3); transform: translateY(-2px); }
.nl-note { font-size: 12px; color: var(--text-muted); letter-spacing: 0.5px; margin-top: 14px; }
@media (max-width: 768px) { .newsletter { padding: 48px 16px; } .nl-title { font-size: 30px; } .nl-form { flex-direction: column; } .nl-btn { padding: 14px; } }
`;

/* ──────────────────────────────────────────────────────────────
   LOGO CORONA (SVG)
────────────────────────────────────────────────────────────── */
const Crown = ({ size = 38 }) => (
  <svg width={size} height={size * 0.86} viewBox="0 0 110 95" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cg" x1="0" y1="0" x2="110" y2="95" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f0d060" />
        <stop offset="45%" stopColor="#c9a84c" />
        <stop offset="100%" stopColor="#8b6010" />
      </linearGradient>
    </defs>
    <path d="M8 68 L18 22 L30 50 Z" fill="url(#cg)" />
    <path d="M27 68 L37 27 L48 54 Z" fill="url(#cg)" />
    <path d="M44 68 L55 4 L66 68 Z" fill="url(#cg)" />
    <path d="M62 54 L73 27 L83 68 Z" fill="url(#cg)" />
    <path d="M80 50 L92 22 L102 68 Z" fill="url(#cg)" />
    <path d="M22 55 L55 34 L88 55" stroke="url(#cg)" strokeWidth="5" fill="none" opacity="0.5" />
    <path d="M55 20 C55 20 49 31 49 37.5 C49 41 51.7 44 55 44 C58.3 44 61 41 61 37.5 C61 31 55 20 55 20Z" fill="#6a4800" opacity="0.9" />
    <rect x="6" y="71" width="98" height="10" rx="3" fill="url(#cg)" />
  </svg>
);

/* placeholder cuando un producto no tiene imagen */
const NoImg = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: 0.4 }}>
    <Crown size={40} />
    <span style={{ fontSize: 11, letterSpacing: 3, color: "#999", textTransform: "uppercase" }}>Rey del Aroma</span>
  </div>
);

const EMPTY_FORM = {
  name: "", brand: "", subtitle: "", size: "", price: "",
  category: "Para Él", collection: "Árabes", promo: false,
  description: "", image: "",
};

const FILTER_TABS = ["Todos", "Para Él", "Para Ella", "Unisex", "Destacados", "Diseñador", "Árabes", "2 × $300.000"];
const GENDERS = ["Para Él", "Para Ella", "Unisex"];
const PROMO_LABEL = "2 X $300.000";

/* Selección curada de "Productos destacados" (por slug del catálogo original) */
const FEATURED_SLUGS = [
  "dior-sauvage-649999",
  "valentino-uomo-born-in-roma-649999",
  "jean-paul-gaultier-le-male-elixir-479999",
  "ariana-grande-cloud-299999",
  "azzaro-chrome-azure-229900",
  "lacoste-blanc-319999",
  "lattafa-khamrah-190000",
  "lattafa-asad-190000",
  "lattafa-yara-190000",
  "armaf-club-de-nuit-intense-man-190000",
];

function matchFilter(p, f) {
  if (f === "Todos") return true;
  if (f === "Destacados") return FEATURED_SLUGS.includes(p.slug);
  if (GENDERS.includes(f)) return p.category === f;
  if (f === "2 × $300.000") return !!p.promo;
  if (f === "Diseñador" || f === "Árabes") return p.collection === f;
  return true;
}

function describe(p) {
  const parts = [];
  parts.push(`Descubre ${p.name} de ${p.brand}, una fragancia 100% original disponible en Rey del Aroma.`);
  if (p.promo) parts.push("Incluida en nuestra promoción 2 × $300.000: arma tu combo de dos perfumes árabes.");
  parts.push("Págalo en línea de forma segura con Wompi, Addi o Sistecrédito, con envío a toda Colombia.");
  return parts.join(" ");
}

/* ──────────────────────────────────────────────────────────────
   COMPONENTE PRINCIPAL
────────────────────────────────────────────────────────────── */
export default function ReyDelAroma() {
  const [view, setView] = useState("store");
  const [products, setProducts] = useState(PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [catFilter, setCatFilter] = useState("Todos");
  const [toast, setToast] = useState(null);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminView, setAdminView] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [slide, setSlide] = useState(0);
  const [pauseSlide, setPauseSlide] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [subEmail, setSubEmail] = useState("");

  /* ── CHECKOUT / PAGO ── */
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [payMethod, setPayMethod] = useState("wompi");
  const [coForm, setCoForm] = useState({ name: "", phone: "", email: "", city: "", address: "" });
  const [placing, setPlacing] = useState(false);

  const banners = [
    { src: banner1, alt: "Más de 50 referencias disponibles", filter: "Todos" },
    { src: banner2, alt: "2 perfumes por $300.000", filter: "2 × $300.000" },
    { src: banner3, alt: "Los mejores perfumes árabes", filter: "Árabes" },
  ];

  /* cargar catálogo guardado (localStorage) */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          // re-resolver imágenes originales por nombre de archivo (robusto entre builds)
          setProducts(parsed.map((p) => ({ ...p, image: (p.img && imageForFile(p.img)) || p.image || "" })));
        }
      }
    } catch (_) {}
    setLoaded(true);
  }, []);

  /* guardar cambios */
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify(products)); } catch (_) {}
  }, [products, loaded]);

  useEffect(() => { const t = requestAnimationFrame(() => setAppReady(true)); return () => cancelAnimationFrame(t); }, []);

  /* auto-avance del carrusel */
  useEffect(() => {
    if (pauseSlide || view !== "store") return;
    const t = setInterval(() => setSlide((s) => (s + 1) % banners.length), 4500);
    return () => clearInterval(t);
  }, [pauseSlide, view, banners.length]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const goCatalog = () => document.getElementById("cat")?.scrollIntoView({ behavior: "smooth" });
  const quickFilter = (f) => { setView("store"); setCatFilter(f); setSearch(""); setSearchOpen(false); setMenuOpen(false); setTimeout(goCatalog, 80); };
  const submitSearch = () => { setView("store"); setMenuOpen(false); setTimeout(goCatalog, 80); };
  const subscribe = () => {
    const v = subEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return showToast("Escribe un correo válido");
    setSubEmail("");
    showToast("¡Gracias por suscribirte! 👑");
  };

  const openProduct = (p) => {
    setSelectedProduct(p);
    setSelectedSize(p.size || "");
    setQty(1);
    setView("product");
    window.scrollTo({ top: 0 });
  };

  const addToCart = (p, size, q) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === p.id && i.size === size);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + q };
        return next;
      }
      return [...prev, { ...p, size, qty: q }];
    });
    setCartOpen(true);
  };

  const removeFromCart = (id, size) => setCart((prev) => prev.filter((i) => !(i.id === id && i.size === size)));
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const q = search.trim().toLowerCase();
  const filtered = q
    ? products.filter((p) =>
        [p.name, p.fullName, p.brand, p.collection, p.category, p.subtitle]
          .filter(Boolean).join(" ").toLowerCase().includes(q)
      )
    : products.filter((p) => matchFilter(p, catFilter));

  /* ── PAGO / CHECKOUT ── */
  const goCheckout = (items) => {
    if (!items || !items.length) return;
    setCheckoutItems(items);
    setCartOpen(false);
    setMenuOpen(false);
    const first = ["wompi", "addi", "sistecredito"].find((m) => PAYMENTS[m]?.enabled);
    setPayMethod(first || "wompi");
    setView("checkout");
    window.scrollTo({ top: 0 });
  };
  const buyNow = (p, size, q) => goCheckout([{ ...p, size, qty: q }]);
  const setCo = (key) => (e) => setCoForm((f) => ({ ...f, [key]: e.target.value }));

  const placeOrder = async () => {
    if (!coForm.name.trim() || !coForm.phone.trim() || !coForm.city.trim() || !coForm.address.trim())
      return showToast("Completa tus datos de envío");

    const total = checkoutItems.reduce((s, i) => s + i.price * i.qty, 0);
    const reference = newReference();
    try {
      localStorage.setItem("rda-last-order", JSON.stringify({
        reference, method: payMethod, total, items: checkoutItems, ...coForm, date: new Date().toISOString(),
      }));
    } catch (_) {}

    if (payMethod === "wompi") {
      if (!PAYMENTS.wompi.publicKey) return showToast("Falta configurar la llave de Wompi");
      setPlacing(true);
      try {
        const url = await buildWompiUrl({ amount: total, reference, email: coForm.email, phone: coForm.phone, fullName: coForm.name });
        window.location.href = url;
      } catch (_) {
        setPlacing(false);
        showToast("No se pudo iniciar el pago");
      }
      return;
    }
    if (payMethod === "addi") {
      if (!PAYMENTS.addi.url) return showToast("Falta configurar el enlace de Addi");
      openWithParams(PAYMENTS.addi.url, { amount: total, reference });
      showToast("Te llevamos a Addi para terminar el pago");
      return;
    }
    if (payMethod === "sistecredito") {
      if (!PAYMENTS.sistecredito.url) return showToast("Falta configurar el enlace de Sistecrédito");
      openWithParams(PAYMENTS.sistecredito.url, { amount: total, reference });
      showToast("Te llevamos a Sistecrédito para terminar el pago");
      return;
    }
  };

  /* ── ADMIN ── */
  const adminLogin = () => {
    if (adminPw === ADMIN_PASSWORD) { setAdminAuth(true); setAdminPw(""); }
    else showToast("Contraseña incorrecta");
  };
  const startAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setAdminView("form"); };
  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({ name: p.name || "", brand: p.brand || "", subtitle: p.subtitle || "", size: p.size || "", price: String(p.price || ""), category: p.category || "Para Él", collection: p.collection || "Árabes", promo: !!p.promo, description: p.description || "", image: p.image || "", img: p.img || "" });
    setAdminView("form");
  };
  const deleteProduct = (id) => {
    if (!confirm("¿Eliminar este producto?")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast("Producto eliminado");
  };
  const resetCatalog = () => {
    if (!confirm("¿Restaurar el catálogo original con los 45 productos? Se perderán tus cambios.")) return;
    try { localStorage.removeItem(LS_KEY); } catch (_) {}
    setProducts(PRODUCTS);
    showToast("Catálogo original restaurado");
  };
  const saveProduct = () => {
    if (!form.name.trim() || !form.price) return showToast("Nombre y precio son obligatorios");
    const data = {
      name: form.name.trim(),
      brand: form.brand.trim() || "Rey del Aroma",
      subtitle: form.subtitle.trim(),
      size: form.size.trim(),
      price: parseInt(String(form.price).replace(/[^\d]/g, "")) || 0,
      category: form.category,
      collection: form.collection,
      promo: form.promo ? PROMO_LABEL : "",
      description: form.description.trim(),
      image: form.image || "",
      img: form.img || "",
    };
    if (editingId) {
      setProducts((prev) => prev.map((p) => (p.id === editingId ? { ...data, id: editingId } : p)));
      showToast("Producto actualizado");
    } else {
      setProducts((prev) => [{ ...data, id: Date.now() }, ...prev]);
      showToast("Producto agregado");
    }
    setAdminView("list");
  };
  const setF = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return showToast("Solo se permiten imágenes");
    if (file.size > 4 * 1024 * 1024) return showToast("La imagen no debe superar 4MB");
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, image: ev.target.result, img: "" }));
    reader.readAsDataURL(file);
  };

  /* ── DATOS UI ── */
  const announceItems = [
    { icon: "🚚", text: "Envíos a toda Colombia" },
    { icon: "🔒", text: "Pago en línea 100% seguro" },
    { icon: "💎", text: "Fragancias 100% originales" },
    { icon: "🔥", text: "Promo 2 × $300.000" },
    { icon: "💳", text: "Paga a cuotas con Addi y Sistecrédito" },
  ];
  const featBadges = [
    { img: feat1, cap: "Hombre", filter: "Para Él" },
    { img: feat2, cap: "Mujer", filter: "Para Ella" },
    { img: feat4, cap: "Promo", filter: "2 × $300.000" },
    { img: feat3, cap: "Productos Destacados", filter: "Destacados" },
  ];
  const collections = [
    { cat: "Colección", name: "Diseñador", tag: "Las casas más reconocidas del mundo.", img: banner1, filter: "Diseñador" },
    { cat: "Promoción", name: "2 × $300.000", tag: "Lleva 2 perfumes árabes por $300.000.", img: banner2, filter: "2 × $300.000" },
    { cat: "Colección", name: "Árabes", tag: "Lattafa, Armaf, Maison Alhambra y más.", img: banner3, filter: "Árabes" },
  ];

  /* ── FOOTER ── */
  const Footer = () => (
    <footer className="footer">
      <div className="footer-trust">
        {[
          { icon: "💎", title: "100% Originales", sub: "Garantizamos autenticidad" },
          { icon: "🚚", title: "Envíos Rápidos", sub: "A toda Colombia" },
          { icon: "💳", title: "Pago en Línea", sub: "Wompi · Addi · Sistecrédito" },
          { icon: "📱", title: "Atención Directa", sub: "Te asesoramos por WhatsApp" },
        ].map((f, i) => (
          <div key={i} className="ft-item">
            <div className="ft-icon">{f.icon}</div>
            <div className="ft-title">{f.title}</div>
            <div className="ft-sub">{f.sub}</div>
          </div>
        ))}
      </div>
      <div className="footer-bot">
        <div className="footer-logo">REY DEL AROMA</div>
        <div className="footer-tag">Tu esencia, tu reino</div>
        <a className="footer-wa" href={waLink("Hola Rey del Aroma 👑, quiero más información sobre sus perfumes.")} target="_blank" rel="noreferrer">
          💬 Escríbenos por WhatsApp
        </a>
        <div className="footer-divider" />
        <div className="footer-copy">© {new Date().getFullYear()} Rey del Aroma · Perfumería · Colombia<br />Todos los derechos reservados</div>
      </div>
    </footer>
  );

  /* ── VISTA TIENDA ── */
  const StoreView = () => (
    <>
      {/* Carrusel de banners */}
      <section className="hero-carousel" onMouseEnter={() => setPauseSlide(true)} onMouseLeave={() => setPauseSlide(false)}>
        <div className="hc-viewport">
          <div className="hc-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
            {banners.map((b, i) => (
              <button key={i} className="hc-slide" onClick={() => quickFilter(b.filter)} aria-label={b.alt}>
                <img src={b.src} alt={b.alt} loading={i === 0 ? "eager" : "lazy"} />
              </button>
            ))}
          </div>
          <button className="hc-arrow hc-prev" onClick={() => setSlide((s) => (s - 1 + banners.length) % banners.length)} aria-label="Anterior">‹</button>
          <button className="hc-arrow hc-next" onClick={() => setSlide((s) => (s + 1) % banners.length)} aria-label="Siguiente">›</button>
          <div className="hc-dots">
            {banners.map((_, i) => (
              <button key={i} className={`hc-dot${i === slide ? " act" : ""}`} onClick={() => setSlide(i)} aria-label={`Banner ${i + 1}`} />
            ))}
          </div>
          <div className="hc-progress">
            <div className={`hc-progress-bar${pauseSlide ? " paused" : " run"}`} key={slide} />
          </div>
        </div>
      </section>

      {/* Destacados (íconos dorados) */}
      <section className="featured">
        {featBadges.map((b, i) => (
          <button key={i} className={`feat-badge${b.filter ? " clk" : ""}`} onClick={() => b.filter && quickFilter(b.filter)} disabled={!b.filter} style={!b.filter ? { cursor: "default" } : undefined}>
            <span className="feat-ring"><img src={b.img} alt={b.cap} loading="lazy" /></span>
            <span className="feat-cap">{b.cap}</span>
          </button>
        ))}
      </section>

      {/* Filtros por categoría */}
      <div className="filters">
        {FILTER_TABS.map((c) => (
          <button key={c} className={`ftab${!q && catFilter === c ? " act" : ""}`} onClick={() => { setSearch(""); setCatFilter(c); }}>{c}</button>
        ))}
      </div>

      {/* Productos */}
      <div className="products-wrap" id="cat">
        <div className="sec-hdr">
          <h2 className="sec-title">
            {q ? <>Resultados para <span>«{search.trim()}»</span></>
              : catFilter === "Todos" ? <>Nuestra <span>Colección</span></>
              : catFilter === "Destacados" ? <>Productos <span>Destacados</span></>
              : <><span>{catFilter}</span></>}
          </h2>
          <span className="sec-cnt">{filtered.length} fragancia{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="pgrid">
          {filtered.map((p) => (
            <div key={p.id} className="pcard" onClick={() => openProduct(p)}>
              <div className="pcard-img">
                {p.promo && <span className="pcard-badge">2 × $300.000</span>}
                {p.image ? <img src={p.image} alt={p.name} className="pcard-real-img" loading="lazy" /> : <NoImg />}
              </div>
              <div className="pcard-body">
                <div className="pcard-cat">{p.brand}</div>
                <div className="pcard-name">{p.name}</div>
                <div className="pcard-sub">{p.subtitle || p.size || p.collection}</div>
                <div className="pcard-price">{cop(p.price)} <span className="pcard-curr">COP</span></div>
              </div>
              <div className="pcard-foot">
                <span className="pcard-orig">Original</span>
                <button className="quick-buy" onClick={(e) => { e.stopPropagation(); addToCart(p, p.size || "", 1); }}>+ Agregar</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🫙</div>
              <p>{q ? `No encontramos perfumes para «${search.trim()}»` : "No hay productos en esta categoría"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Colecciones */}
      <div className="coll-sec">
        <div className="coll-hdr">
          <div className="coll-eyebrow">Descubre</div>
          <div className="coll-title">Nuestras <span>Colecciones</span></div>
          <div className="coll-sub">Encuentra tu fragancia ideal</div>
        </div>
        <div className="coll-grid">
          {collections.map((c, i) => (
            <div key={i} className="coll-card" onClick={() => quickFilter(c.filter)}>
              <img className="coll-img" src={c.img} alt={c.name} loading="lazy" />
              <div className="coll-overlay">
                <div className="coll-cat">{c.cat}</div>
                <div className="coll-name">{c.name}</div>
                <div className="coll-tag">{c.tag}</div>
                <div className="coll-cta">Ver colección</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suscripción — al final de la página, sin ventana emergente */}
      <section className="newsletter">
        <div className="nl-inner">
          <div className="nl-eyebrow">Únete al reino</div>
          <h3 className="nl-title">Recibe <span>ofertas</span> y novedades</h3>
          <p className="nl-text">Suscríbete y entérate antes que nadie de lanzamientos, descuentos y promociones exclusivas de Rey del Aroma.</p>
          <div className="nl-form">
            <input
              className="nl-input"
              type="email"
              placeholder="Tu correo electrónico"
              value={subEmail}
              onChange={(e) => setSubEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && subscribe()}
              aria-label="Correo para suscripción"
            />
            <button className="nl-btn" onClick={subscribe}>Suscribirme</button>
          </div>
          <div className="nl-note">No compartimos tu correo. Cancela cuando quieras.</div>
        </div>
      </section>

      <Footer />
    </>
  );

  /* ── VISTA DETALLE ── */
  const ProductDetailView = () => {
    if (!selectedProduct) return null;
    const p = selectedProduct;
    const words = p.name.split(" ");
    const last = words.pop();
    return (
      <div className="pd-wrap">
        <div className="bc">
          <span className="bc-lnk" onClick={() => setView("store")}>Inicio</span>
          <span className="bc-sep">›</span>
          <span className="bc-lnk" onClick={() => quickFilter("Todos")}>Catálogo</span>
          <span className="bc-sep">›</span>
          <span className="cur">{p.name}</span>
        </div>
        <div className="pd-grid">
          <div>
            <div className="pd-main">
              {p.image ? <img src={p.image} alt={p.name} className="pd-real-img" /> : <NoImg />}
            </div>
          </div>

          <div className="pd-info">
            {p.promo && <div className="pd-badge">2 × $300.000</div>}
            <div className="pd-name">{words.join(" ")}{words.length > 0 ? " " : ""}<b>{last}</b></div>
            {p.subtitle && <div className="pd-sub">{p.subtitle}</div>}

            <div className="pd-chips">
              <span className="pd-chip gold">{p.brand}</span>
              <span className="pd-chip">{p.category}</span>
              <span className="pd-chip">{p.collection}</span>
              {p.size && <span className="pd-chip">{p.size}</span>}
            </div>

            <div className="pd-price">{cop(p.price)} <span className="pd-curr">COP</span></div>

            {p.promo && (
              <div className="pd-promo">
                <b>2 × $300.000</b>
                <span>Combina este perfume con cualquier otro de la promo y llévate ambos por $300.000.</span>
              </div>
            )}

            <div className="pd-desc">{p.description || describe(p)}</div>

            {p.size && (
              <>
                <div className="pd-sec-t">Presentación</div>
                <div className="sizes-row">
                  <button className="size-btn act">{p.size}</button>
                </div>
              </>
            )}

            <div className="add-row">
              <div className="qty-ctrl">
                <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                <span className="qty-n">{qty}</span>
                <button className="qty-btn" onClick={() => setQty((q) => q + 1)}>+</button>
              </div>
              <button className="add-btn" onClick={() => addToCart(p, p.size || "", qty)}>Agregar al carrito 🛒</button>
            </div>
            <div className="pd-buy">
              <button className="buy-now-btn" onClick={() => buyNow(p, p.size || "", qty)}>Comprar ahora →</button>
            </div>

            <div className="feats">
              {[
                { ic: "💎", lbl: "Autenticidad", val: "100% Original" },
                { ic: "🚚", lbl: "Envío", val: "A toda Colombia" },
                { ic: "💳", lbl: "Pago", val: "Wompi · Addi · Sistecrédito" },
                { ic: "🔒", lbl: "Compra", val: "Rápida y segura" },
              ].map((f, i) => (
                <div key={i} className="feat">
                  <div className="feat-ic">{f.ic}</div>
                  <div className="feat-lbl">{f.lbl}</div>
                  <div className="feat-val">{f.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── VISTA CHECKOUT / PAGO ── */
  const CheckoutView = () => {
    if (!checkoutItems.length) {
      return (
        <div className="co-empty">
          <div className="empty-icon">🛒</div>
          <p style={{ fontSize: 15, letterSpacing: 1 }}>No hay productos para pagar.</p>
          <button className="btn-g" onClick={() => { setView("store"); quickFilter("Todos"); }} style={{ marginTop: 20, justifyContent: "center" }}>Ver catálogo →</button>
        </div>
      );
    }
    const total = checkoutItems.reduce((s, i) => s + i.price * i.qty, 0);
    const methods = [
      { id: "wompi", name: "Wompi", desc: "Tarjeta · PSE · Nequi · Bancolombia", badge: "Pago inmediato" },
      { id: "addi", name: "Addi", desc: "Paga a cuotas, sin tarjeta", badge: "A cuotas" },
      { id: "sistecredito", name: "Sistecrédito", desc: "Crédito en cuotas fijas", badge: "A crédito" },
    ].filter((m) => PAYMENTS[m.id]?.enabled);
    const activeName = methods.find((m) => m.id === payMethod)?.name || "";

    return (
      <div className="co-wrap">
        <div className="bc">
          <span className="bc-lnk" onClick={() => setView("store")}>Inicio</span>
          <span className="bc-sep">›</span>
          <span className="cur">Finalizar compra</span>
        </div>

        <div className="co-grid">
          {/* IZQUIERDA — datos + método de pago */}
          <div className="co-main">
            <h2 className="co-title">Finalizar <span>compra</span></h2>
            <p className="co-lead">Solo tus datos de envío y listo — una compra rápida y 100% segura.</p>

            <div className="co-sec-t">Tus datos de envío</div>
            <div className="co-form">
              <div className="fg full"><label className="fl">Nombre completo *</label><input className="fi" value={coForm.name} onChange={setCo("name")} placeholder="Ej. Ana Gómez" /></div>
              <div className="fg"><label className="fl">Celular / WhatsApp *</label><input className="fi" type="tel" value={coForm.phone} onChange={setCo("phone")} placeholder="300 123 4567" /></div>
              <div className="fg"><label className="fl">Correo (opcional)</label><input className="fi" type="email" value={coForm.email} onChange={setCo("email")} placeholder="tu@correo.com" /></div>
              <div className="fg"><label className="fl">Ciudad *</label><input className="fi" value={coForm.city} onChange={setCo("city")} placeholder="Ej. Medellín" /></div>
              <div className="fg"><label className="fl">Dirección de envío *</label><input className="fi" value={coForm.address} onChange={setCo("address")} placeholder="Calle 00 # 00-00, barrio" /></div>
            </div>

            <div className="co-sec-t" style={{ marginTop: 30 }}>¿Cómo quieres pagar?</div>
            <div className="pay-methods">
              {methods.map((m) => (
                <button key={m.id} type="button" className={`pay-card${payMethod === m.id ? " act" : ""}`} onClick={() => setPayMethod(m.id)}>
                  <span className={`pay-logo pay-${m.id}`}>{m.name}</span>
                  <span className="pay-desc">{m.desc}</span>
                  <span className="pay-badge">{m.badge}</span>
                  <span className="pay-check">✓</span>
                </button>
              ))}
            </div>
          </div>

          {/* DERECHA — resumen del pedido */}
          <aside className="co-summary">
            <div className="co-sum-t">Tu pedido</div>
            <div className="co-items">
              {checkoutItems.map((it, i) => (
                <div key={i} className="co-item">
                  <div className="co-item-img">{it.image ? <img src={it.image} alt={it.name} /> : <NoImg />}</div>
                  <div className="co-item-info">
                    <div className="co-item-name">{it.name}</div>
                    <div className="co-item-sub">{it.brand}{it.size ? ` · ${it.size}` : ""} · x{it.qty}</div>
                  </div>
                  <div className="co-item-price">{cop(it.price * it.qty)}</div>
                </div>
              ))}
            </div>
            <div className="co-total-row"><span>Total a pagar</span><span className="co-total">{cop(total)}</span></div>
            <button className="co-pay-btn" onClick={placeOrder} disabled={placing}>
              {placing ? "Redirigiendo a la pasarela…" : `Pagar con ${activeName}`}
            </button>
            <div className="co-secure">🔒 Pago seguro · Envíos a toda Colombia</div>
            <a className="co-help" href={waLink("Hola Rey del Aroma 👑, tengo una duda con mi compra.")} target="_blank" rel="noreferrer">¿Tienes dudas? Escríbenos</a>
          </aside>
        </div>
      </div>
    );
  };

  /* ── VISTA ADMIN ── */
  const AdminView = () => {
    if (!adminAuth) {
      return (
        <div className="login-wrap">
          <Crown size={50} />
          <div className="login-title" style={{ marginTop: 20 }}>Panel <span style={{ color: "var(--gold)", fontStyle: "italic" }}>Admin</span></div>
          <div className="login-sub">Ingresa la contraseña para continuar</div>
          <div className="login-form">
            <input className="fi" type="password" placeholder="Contraseña" value={adminPw} onChange={(e) => setAdminPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && adminLogin()} />
            <button className="btn-g" onClick={adminLogin} style={{ justifyContent: "center" }}>Ingresar →</button>
            <div className="hint">Contraseña por defecto: admin123</div>
          </div>
        </div>
      );
    }

    if (adminView === "form") {
      return (
        <div className="admin-wrap">
          <div className="admin-hdr">
            <div className="admin-title">{editingId ? "Editar" : "Agregar"} <span>Producto</span></div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-o" onClick={() => setAdminView("list")}>← Volver</button>
              <button className="btn-g" onClick={saveProduct}>Guardar</button>
            </div>
          </div>
          <div className="form-g">
            <div className="fg"><label className="fl">Nombre *</label><input className="fi" placeholder="ej. Sauvage" value={form.name} onChange={setF("name")} /></div>
            <div className="fg"><label className="fl">Marca</label><input className="fi" placeholder="ej. Dior" value={form.brand} onChange={setF("brand")} /></div>
            <div className="fg"><label className="fl">Precio (COP) *</label><input className="fi" type="number" placeholder="190000" value={form.price} onChange={setF("price")} /></div>
            <div className="fg"><label className="fl">Subtítulo</label><input className="fi" placeholder="ej. Eau de Parfum" value={form.subtitle} onChange={setF("subtitle")} /></div>
            <div className="fg"><label className="fl">Presentación</label><input className="fi" placeholder="ej. 100 ml" value={form.size} onChange={setF("size")} /></div>
            <div className="fg">
              <label className="fl">Categoría</label>
              <select className="fsel" value={form.category} onChange={setF("category")}>
                <option>Para Él</option><option>Para Ella</option><option>Unisex</option>
              </select>
            </div>
            <div className="fg">
              <label className="fl">Colección</label>
              <select className="fsel" value={form.collection} onChange={setF("collection")}>
                <option>Diseñador</option><option>Árabes</option>
              </select>
            </div>
            <div className="fg">
              <label className="fl">Promoción</label>
              <label className="fchk"><input type="checkbox" checked={form.promo} onChange={(e) => setForm((f) => ({ ...f, promo: e.target.checked }))} /> Incluir en 2 × $300.000</label>
            </div>
            <div className="fg full">
              <label className="fl">Imagen del producto</label>
              {form.image ? (
                <div className="img-preview">
                  <img src={form.image} alt="Vista previa" />
                  <button className="img-preview-rm" onClick={() => setForm((f) => ({ ...f, image: "", img: "" }))}>✕</button>
                </div>
              ) : (
                <div className="img-upload">
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                  <div className="img-upload-icon">📷</div>
                  <div className="img-upload-text">Haz clic o arrastra una imagen</div>
                  <div className="img-upload-text" style={{ marginTop: 4, fontSize: 12, opacity: 0.6 }}>JPG, PNG, WebP · Máx 4MB</div>
                </div>
              )}
            </div>
            <div className="fg full"><label className="fl">Descripción</label><textarea className="fta" placeholder="Descripción de la fragancia (opcional)" value={form.description} onChange={setF("description")} /></div>
          </div>
          <div style={{ marginTop: 28, display: "flex", gap: 12 }}>
            <button className="btn-o" onClick={() => setAdminView("list")}>Cancelar</button>
            <button className="btn-g" onClick={saveProduct}>Guardar producto</button>
          </div>
        </div>
      );
    }

    return (
      <div className="admin-wrap">
        <div className="admin-hdr">
          <div className="admin-title">Panel de <span>Administración</span></div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn-o" onClick={resetCatalog}>Restaurar catálogo</button>
            <button className="btn-o" onClick={() => { setAdminAuth(false); setView("store"); }}>Salir</button>
            <button className="btn-g" onClick={startAdd}>+ Agregar</button>
          </div>
        </div>
        <div className="admin-info"><b>{products.length}</b> productos en catálogo · Los cambios se guardan automáticamente en este navegador (localStorage).</div>
        <table className="atbl">
          <thead>
            <tr><th></th><th>Producto</th><th>Precio</th><th>Categoría</th><th>Colección</th><th>Promo</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.image ? <img className="athumb" src={p.image} alt={p.name} /> : <div className="athumb" />}</td>
                <td><div className="atn">{p.name}</div><div className="ats">{p.brand}{p.subtitle ? ` · ${p.subtitle}` : ""}</div></td>
                <td className="atp">{cop(p.price)}</td>
                <td className="atc">{p.category}</td>
                <td className="atc">{p.collection}</td>
                <td>{p.promo ? <span style={{ background: "rgba(201,168,76,.12)", color: "var(--gold-d)", fontSize: 11, padding: "4px 8px", letterSpacing: 1, fontWeight: 700, whiteSpace: "nowrap" }}>2×300K</span> : <span style={{ color: "#bbb" }}>—</span>}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="abtn abtn-e" onClick={() => startEdit(p)}>Editar</button>
                  <button className="abtn abtn-d" onClick={() => deleteProduct(p.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px", color: "#999" }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📦</div>
            <p>No hay productos. Agrega el primero o restaura el catálogo.</p>
          </div>
        )}
      </div>
    );
  };

  /* ── RENDER ── */
  return (
    <div className={`app-root${appReady ? " ready" : ""}`} style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {view !== "admin" && (
        <div className="announce">
          <div className="ann-track">
            {[...announceItems, ...announceItems].map((item, i) => (
              <div key={i} className="ann-i"><span>{item.icon}</span><em>{item.text}</em><div className="ann-sep" /></div>
            ))}
          </div>
        </div>
      )}

      <nav className="nav">
        <div className="nav-logo" onClick={() => { setView("store"); setCatFilter("Todos"); setMenuOpen(false); window.scrollTo({ top: 0 }); }}>
          <img className="nav-logo-img" src={logoPrincipal} alt="Rey del Aroma" />
          <div className="nav-logo-text"><span className="l-rey">REY</span><span className="l-da">DEL AROMA</span></div>
        </div>

        {view !== "admin" ? (
          <>
            <div className="nav-sep" />
            <div className="nav-links">
              <button className="nl" onClick={() => { setView("store"); setCatFilter("Todos"); window.scrollTo({ top: 0 }); }}>Inicio</button>
              <button className="nl" onClick={() => quickFilter("Todos")}>Catálogo</button>
              <button className="nl" onClick={() => quickFilter("Para Él")}>Para Él</button>
              <button className="nl" onClick={() => quickFilter("Para Ella")}>Para Ella</button>
              <button className="nl" onClick={() => quickFilter("Unisex")}>Unisex</button>
              <button className="nl" onClick={() => quickFilter("2 × $300.000")}>2 × $300.000</button>
            </div>
            <div className="nav-r">
              <button className={`icon-btn${searchOpen ? " act" : ""}`} onClick={() => { setSearchOpen((o) => !o); setMenuOpen(false); }} aria-label="Buscar">🔍</button>
              <button className="icon-btn" onClick={() => setCartOpen(true)} aria-label="Carrito">🛒 {cartCount > 0 && <span className="cbadge">{cartCount}</span>}</button>
              <button className="icon-btn" onClick={() => setView("admin")} title="Panel Admin" aria-label="Admin">⚙️</button>
              <button className={`hamburger${menuOpen ? " open" : ""}`} onClick={() => { setMenuOpen((o) => !o); setSearchOpen(false); }} aria-label="Menú">
                <span className="ham-line" /><span className="ham-line" /><span className="ham-line" />
              </button>
            </div>
            <div className={`mobile-menu${menuOpen ? " open" : ""}`}>
              <button className="nl" onClick={() => { setView("store"); setCatFilter("Todos"); setMenuOpen(false); window.scrollTo({ top: 0 }); }}>Inicio</button>
              <button className="nl" onClick={() => quickFilter("Todos")}>Catálogo</button>
              <button className="nl" onClick={() => quickFilter("Para Él")}>Para Él</button>
              <button className="nl" onClick={() => quickFilter("Para Ella")}>Para Ella</button>
              <button className="nl" onClick={() => quickFilter("Unisex")}>Unisex</button>
              <button className="nl" onClick={() => quickFilter("Diseñador")}>Diseñador</button>
              <button className="nl" onClick={() => quickFilter("Árabes")}>Árabes</button>
              <button className="nl" onClick={() => quickFilter("2 × $300.000")}>2 × $300.000</button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ fontSize: 12, color: "#aaa", letterSpacing: 2.5, textTransform: "uppercase" }}>Administración</span>
            <button className="nl" onClick={() => setView("store")}>← Volver a la tienda</button>
          </div>
        )}
      </nav>

      {view !== "admin" && searchOpen && (
        <div className="search-bar">
          <div className="search-inner">
            <span className="search-ic" aria-hidden="true">🔍</span>
            <input
              className="search-input"
              autoFocus
              type="text"
              placeholder="Buscar perfume, marca…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSearch();
                if (e.key === "Escape") { setSearch(""); setSearchOpen(false); }
              }}
              aria-label="Buscar productos"
            />
            {search && <button className="search-clear" onClick={() => setSearch("")} aria-label="Limpiar">✕</button>}
            <button className="search-close" onClick={() => setSearchOpen(false)} aria-label="Cerrar búsqueda">Cerrar</button>
          </div>
        </div>
      )}

      {view === "store" && StoreView()}
      {view === "product" && ProductDetailView()}
      {view === "checkout" && CheckoutView()}
      {view === "admin" && AdminView()}

      {cartOpen && (
        <>
          <div className="cart-overlay" onClick={() => setCartOpen(false)} />
          <div className="cart-drawer">
            <div className="cart-hdr">
              <div className="cart-title">Carrito {cartCount > 0 && <span style={{ color: "var(--gold)", fontSize: 17 }}>({cartCount})</span>}</div>
              <button className="cart-x" onClick={() => setCartOpen(false)}>✕</button>
            </div>
            <div className="cart-body">
              {cart.length === 0 ? (
                <div className="empty-cart"><div className="empty-icon">🛒</div><p style={{ fontSize: 15, letterSpacing: 1 }}>Tu carrito está vacío</p></div>
              ) : cart.map((item, i) => (
                <div key={i} className="ci">
                  <div className="ci-img">{item.image ? <img src={item.image} alt={item.name} className="ci-real-img" /> : <NoImg />}</div>
                  <div className="ci-info">
                    <div className="ci-name">{item.name}</div>
                    <div className="ci-sz">{item.brand}{item.size ? ` · ${item.size}` : ""} · Cant: {item.qty}</div>
                    <div className="ci-price">{cop(item.price * item.qty)} COP</div>
                  </div>
                  <button className="ci-rm" onClick={() => removeFromCart(item.id, item.size)}>✕</button>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="cart-foot">
                <div className="cart-tr"><span className="cart-tl">Total</span><span className="cart-ta">{cop(cartTotal)}</span></div>
                <button className="co-checkout-btn" onClick={() => goCheckout(cart)}>Finalizar compra →</button>
                <button className="cart-keep" onClick={() => setCartOpen(false)}>← Seguir comprando</button>
                <div className="cart-note">Paga seguro con Wompi, Addi o Sistecrédito.</div>
              </div>
            )}
          </div>
        </>
      )}

      {view !== "admin" && !cartOpen && (
        <a
          className="wa-float"
          href={waLink("Hola Rey del Aroma 👑, quiero más información sobre sus perfumes.")}
          target="_blank"
          rel="noreferrer"
          aria-label="Escríbenos por WhatsApp"
          title="Escríbenos por WhatsApp"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
        </a>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
