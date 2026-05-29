import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the Clinic app.
 *
 * Because this project uses TanStack Start with server functions
 * (running on Cloudflare Workers), the native shell loads the
 * already-deployed site instead of bundling static files.
 *
 * Any update you publish on Lovable appears instantly inside the
 * Android app — no rebuild required.
 *
 * If you later want a fully offline app, remove the `server` block
 * and migrate the project to a static build.
 */
const config: CapacitorConfig = {
  appId: 'com.myclinic.app',
  appName: 'my-clinic',
  webDir: 'dist/client',
  server: {
    url: 'https://clinic-87.lovable.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#ffffff',
  },
};

export default config;
