import type { NextConfig } from "next";

// Headers aplicados a todas as respostas. A CSP fica restrita às diretivas que
// não dependem dos scripts do Google Maps (iframe, <base>, formulários, plugins);
// uma política de script-src exigiria nonces e testes com o mapa.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=(), payment=(), usb=()' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: [
    'http://localhost:3001',
    'http://localhost:3000',
    'http://192.168.3.168:3001',
    'http://192.168.3.168:3000',
  ],
  // O app não usa imagens remotas: sem remotePatterns, /_next/image não serve
  // de proxy para domínios arbitrários nem enche o cache em disco.
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
};

export default nextConfig;
