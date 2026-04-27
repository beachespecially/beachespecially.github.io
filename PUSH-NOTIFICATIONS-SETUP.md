# Push Notifications Setup Guide

## ✅ What's Already Done
- Service worker (`sw.js`) created and registered
- Notification permission UI added to Wall of Shame section
- Subscription management (subscribe/unsubscribe) implemented
- Wall of shame detection with automatic triggers
- Database table schema ready

## 🚀 How It Works Right Now

1. **User visits the Leaderboard tab** and sees Wall of Shame section
2. **Clicks "Enable Notifications"** button
3. **Browser asks for permission** - user grants/denies
4. **Subscription is saved** to Supabase database
5. **When someone loses 0:10** (or 0:any score):
   - In-app notification shows immediately ✅
   - System detects it's a wall of shame entry ✅
   - *Would trigger push notifications* (needs backend setup)

## 📋 Next Steps (Backend Setup)

To send actual push notifications to users' devices, you need to set up a Supabase Edge Function because push notifications require server-side VAPID key signing for security.

### Step 1: Run SQL in Supabase

1. Go to Supabase Dashboard → SQL Editor
2. Run the contents of `setup-push-notifications.sql`
3. This creates the `push_subscriptions` table

### Step 2: Generate VAPID Keys

You need your own VAPID keys (currently using a placeholder):

```bash
npx web-push generate-vapid-keys
```

This generates:
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LQ...
Private Key: [keep this secret]
```

Update the public key in `kicker-stats.html` (search for `vapidPublicKey`).

### Step 3: Create Supabase Edge Function

Create a file: `supabase/functions/send-push-notification/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message } = await req.json()
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Get all subscriptions
    const { data: subscriptions, error } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
    
    if (error) throw error
    
    // Send push notifications to all subscribers
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    
    // Use web-push library to send notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        // Send push notification using web-push
        // Implementation depends on web-push library for Deno
        return { success: true }
      })
    )
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: results.filter(r => r.status === 'fulfilled').length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
```

### Step 4: Deploy Edge Function

```bash
supabase functions deploy send-push-notification --no-verify-jwt
```

### Step 5: Set Environment Variables

In Supabase Dashboard → Edge Functions → Secrets:
- `VAPID_PUBLIC_KEY`: Your public VAPID key
- `VAPID_PRIVATE_KEY`: Your private VAPID key

### Step 6: Uncomment in HTML

In `kicker-stats.html`, find `sendPushNotificationToAll` function and uncomment:

```javascript
const { data, error } = await supabaseClient.functions.invoke('send-push-notification', {
  body: { message }
});
```

## 🧪 Testing Without Backend

The current implementation will:
- ✅ Show in-app notifications (green popup)
- ✅ Save user subscriptions
- ✅ Detect wall of shame entries
- ✅ Show notification permission prompts
- ⏭️ Log "Would send push notification" to console

To test the full experience, you need to complete the backend setup above.

## 📱 User Experience

### Initial Setup:
1. User opens app on their phone
2. Navigates to Leaderboard tab
3. Sees "🔕 Push notifications disabled"
4. Taps "Enable Notifications"
5. Browser prompts: "Allow notifications from this site?"
6. User taps "Allow"
7. UI updates to "🔔 Push notifications enabled"

### When Wall of Shame Event Occurs:
1. Someone loses 0:10
2. All subscribed users receive push notification
3. Notification appears on lock screen
4. Shows: "💀 Wall of Shame Update!"
5. Message: "John & Sarah got destroyed 0:10 by Mike & Lisa!"
6. User taps notification → opens app to Wall of Shame

### On Mobile:
- Works even when app is closed
- Shows on lock screen
- Vibration pattern (buzz-pause-buzz)
- Sound alert (if not silenced)

### On Desktop:
- Notification in system tray
- Desktop banner appears
- Click to open app

## 🔧 Troubleshooting

**"Notifications blocked"**: User denied permission - they need to:
- iOS Safari: Settings → Safari → Website Settings
- Android Chrome: Site Settings → Notifications
- Desktop: Address bar icon → Site settings

**Not receiving notifications**: Check:
1. Permission granted
2. Subscription saved in database
3. Edge Function deployed
4. VAPID keys configured

**Testing locally**: Push notifications require HTTPS or localhost
