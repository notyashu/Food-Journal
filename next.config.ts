
import type {NextConfig} from 'next';
import path from 'path';
import fs from 'fs';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
   // Add webpack configuration to copy the service worker
   webpack: (config, { isServer, buildId, dev, config: nextConfigWebpack }) => {
    if (!isServer && !dev) { // Only run for client-side production build
        const swSrc = path.join(__dirname, 'public', 'firebase-messaging-sw.js');
        const swDest = path.join(__dirname, '.next', 'static', buildId, 'firebase-messaging-sw.js'); // Place it alongside other static build assets

        // Read environment variables needed by the SW
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
        const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
        const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Optional

         // Basic check if essential variables are present
        if (!apiKey || !authDomain || !projectId || !messagingSenderId || !appId) {
             console.warn(`
            ****************************************************************************************
            * WARNING: Missing Firebase config for Service Worker build!                           *
            * Some NEXT_PUBLIC_FIREBASE_* environment variables are not set.                     *
            * The firebase-messaging-sw.js will likely fail to initialize.                         *
            * Please ensure all required Firebase configuration variables are present in .env      *
            ****************************************************************************************
            `);
            // Proceed with copying but the SW will be broken
        }


        try {
            // Read the source SW file
            let swContent = fs.readFileSync(swSrc, 'utf8');

            // Replace placeholders with actual environment variable values
             swContent = swContent.replace('YOUR_API_KEY', apiKey || '');
             swContent = swContent.replace('YOUR_AUTH_DOMAIN', authDomain || '');
             swContent = swContent.replace('YOUR_PROJECT_ID', projectId || '');
             swContent = swContent.replace('YOUR_STORAGE_BUCKET', storageBucket || '');
             swContent = swContent.replace('YOUR_MESSAGING_SENDER_ID', messagingSenderId || '');
             swContent = swContent.replace('YOUR_APP_ID', appId || '');
             swContent = swContent.replace('YOUR_MEASUREMENT_ID', measurementId || ''); // Replace even if optional


            // Ensure destination directory exists
            const destDir = path.dirname(swDest);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            // Write the modified content to the destination
            fs.writeFileSync(swDest, swContent, 'utf8');
            console.log(`Copied and configured firebase-messaging-sw.js to ${swDest}`);

        } catch (error) {
             console.error('Error processing firebase-messaging-sw.js:', error);
             // Optionally fail the build here if SW is critical
             // throw new Error('Failed to process service worker');
        }


         // Configure Workbox or other SW generation if needed (example commented out)
         /*
         const workboxPlugin = new WorkboxPlugin.InjectManifest({
           swSrc: swSrc, // Your source service worker
           swDest: path.join('.next', 'static', 'firebase-messaging-sw.js'), // Output path in .next/static
           // You might need additional configuration here
         });
         config.plugins.push(workboxPlugin);
         */
    }
     // Important: return the modified config
    return config;
   },
};

export default nextConfig;
