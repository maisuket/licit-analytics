import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Reduz a imagem Docker de ~1.5GB para ~150MB em produção
  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.portaldatransparencia.gov.br",
      },
    ],
  },

  // Security headers — aplicados em todas as rotas
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Impede que o site seja carregado em iframes (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },

          // Impede que o browser interprete o MIME type de forma diferente do declarado
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Ativa proteção XSS no browser (legado, mas inofensivo)
          { key: "X-XSS-Protection", value: "1; mode=block" },

          // Força HTTPS por 1 ano, incluindo subdomínios
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },

          // Controla quais informações de referência são enviadas
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Restringe permissões de browser APIs desnecessárias
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },

          // Content Security Policy básica — restringe origens de scripts e estilos
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval necessário para Next.js dev
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}`,
              "img-src 'self' data: https://api.portaldatransparencia.gov.br",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
