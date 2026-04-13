/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8081/api/:path*',
      },
    ];
  },
  images: {
    // /public/images/r/*.png 를 요청 시점에 WebP/AVIF 로 자동 변환.
    // next/image 가 브라우저 Accept 헤더에 따라 가장 효율적인 포맷을 응답한다.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [52, 96, 160, 220, 320, 500],
  },
};

module.exports = nextConfig;