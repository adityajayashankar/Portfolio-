import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "frame-src 'none'",
  'upgrade-insecure-requests'
].join('; ');

export default defineConfig({
  base: './',
  plugins: [react()],
  preview: {
    headers: {
      'Content-Security-Policy': contentSecurityPolicy,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': [
        'accelerometer=()',
        'autoplay=()',
        'camera=()',
        'display-capture=()',
        'geolocation=()',
        'gyroscope=()',
        'magnetometer=()',
        'microphone=()',
        'midi=()',
        'payment=()',
        'publickey-credentials-get=()',
        'usb=()'
      ].join(', '),
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Origin-Agent-Cluster': '?1'
    }
  }
});
