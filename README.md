
# RootedAI

**Grow Smarter. Stay Rooted.**

A modern web application for RootedAI - Kansas City's trusted AI consultancy helping small businesses grow with Microsoft AI solutions.

## 🌱 About

RootedAI helps Kansas City small businesses implement AI solutions built on Microsoft tools. From awareness to adoption, we're your local growth partners.

## 🚀 Deployment

This project is hosted on [Loveable.dev](https://loveable.dev) with DNS managed by Cloudflare.

**Live Site**: [https://rootedai.tech](https://rootedai.tech)

### Deployment Process

1. Push changes to the `main` branch
2. The site is built and deployed through Loveable.dev
3. DNS is handled by Cloudflare

## 🛠️ Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom RootedAI brand colors
- **UI Components**: shadcn/ui
- **Backend**: Supabase (connected)
- **Deployment**: Hosted on Loveable.dev
- **Build Tool**: Vite

## 🎨 Brand Colors

- **Forest Green** `#2E4F3E` - Trust, growth
- **Earth Brown** `#7C5B45` - Groundedness  
- **Sage** `#A8BCA1` - Calming accents
- **Cream** `#F5F3EA` - Clean background
- **Slate Gray** `#5C5C5C` - Text and contrast

## 📱 Features

- ✅ Responsive design optimized for mobile
- ✅ Smooth animations and transitions
- ✅ SEO optimized with meta tags
- ✅ Contact form with service type selection
- ✅ Team member profiles
- ✅ Service packages with pricing
- ✅ Professional branding throughout

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔔 Push Notifications Setup

1. **Generate VAPID Keys**
   - Run the `generate-vapid-keys` edge function:
     ```bash
     supabase functions invoke generate-vapid-keys
     ```
   - Copy the returned `publicKey` and `privateKey` values.

2. **Store the Private Key**
   - In the Supabase dashboard go to **Project Settings → Functions → Secrets**.
   - Add a secret named `VAPID_PRIVATE_KEY` with the value of your generated private key.

3. **Update the Public Key**
   - Replace the `VAPID_PUBLIC_KEY` constant in `src/hooks/usePushNotifications.tsx`
     and `supabase/functions/send-push-notifications/index.ts` with your new public key.

4. **Deploy Functions**
   - Redeploy your edge functions so they pick up the new secret and public key.

## 📄 License

© 2024 RootedAI. All rights reserved.
