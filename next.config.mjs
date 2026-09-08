/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Para que la librería PDF funcione en el servidor
  serverExternalPackages: ['@react-pdf/renderer'],

  // 2. Para evitar el error de 'canvas' en Linux
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },

  // 3. ¡ESTA LÍNEA CALMA EL ERROR QUE TE SALIÓ EN VS CODE!
  turbopack: {}, 
};

export default nextConfig;