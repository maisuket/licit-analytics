/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ativa o Strict Mode do React para detetar problemas no ciclo de vida
  reactStrictMode: true,

  // A MÁGICA DE SÉNIOR: 'standalone'
  // O Next.js vai analisar os imports e criar uma pasta '.next/standalone'
  // contendo apenas os ficheiros estritamente necessários (node_modules mínimos).
  // Isto reduz a imagem Docker de ~1.5GB para ~150MB.
  output: "standalone",

  // Configuração para permitir domínios de imagens externos (se necessário no futuro)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.portaldatransparencia.gov.br",
      },
    ],
  },
};

export default nextConfig;
