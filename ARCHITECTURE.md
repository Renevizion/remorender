# Architecture Diagrams

## Webhook Approach (Recommended)

### Full Flow Diagram

```
┌─────────────────┐
│   Client App    │
│  (Lovable/Web)  │
└────────┬────────┘
         │ 1. POST render request
         │    { planId, code, composition }
         ▼
┌─────────────────────────┐
│  Supabase Edge Function │
│     render-video        │
└────────┬────────────────┘
         │ 2. Update status: 'rendering'
         │    in video_plans table
         ▼
┌─────────────────────────┐
│  Supabase Database      │
│    video_plans table    │
└─────────────────────────┘
         │
         │ 3. Send render job with webhook URL
         │    { code, composition, webhookUrl }
         ▼
┌─────────────────────────┐
│   Railway Server        │
│  (Node.js + Remotion)   │
└────────┬────────────────┘
         │ 4. Render video
         │ 5. Upload to Supabase Storage
         │ 6. Call webhook with video URL
         ▼
┌─────────────────────────┐
│  Supabase Edge Function │
│    render-webhook       │
└────────┬────────────────┘
         │ 7. Update status: 'completed'
         │    and final_video_url
         ▼
┌─────────────────────────┐
│  Supabase Database      │
│    video_plans table    │
└────────┬────────────────┘
         │ 8. Real-time subscription
         │    or polling update
         ▼
┌─────────────────┐
│   Client App    │
│  (Gets video URL)│
└─────────────────┘
```

### Security Model

```
┌──────────────────────────────────────────────────────────┐
│                    Lovable Cloud                         │
│  ┌────────────────────────────────────────────────┐     │
│  │         Supabase Edge Functions                │     │
│  │  ┌──────────────────┐  ┌──────────────────┐   │     │
│  │  │  render-video    │  │  render-webhook  │   │     │
│  │  │                  │  │                  │   │     │
│  │  │ Has:             │  │ Has:             │   │     │
│  │  │ ✅ Service Key   │  │ ✅ Service Key   │   │     │
│  │  │ ✅ DB Access     │  │ ✅ DB Access     │   │     │
│  │  └──────────────────┘  └──────────────────┘   │     │
│  └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS
                           │
┌──────────────────────────┼────────────────────────────────┐
│                    Railway Server                         │
│  ┌─────────────────────────────────────────────────┐     │
│  │         Render Server (Node.js)                 │     │
│  │                                                  │     │
│  │ Has:                                             │     │
│  │ ✅ Storage credentials (for uploads)            │     │
│  │ ❌ NO database access                           │     │
│  │ ❌ NO service role key for database             │     │
│  │                                                  │     │
│  │ Only needs:                                      │     │
│  │ • SUPABASE_URL (for storage)                    │     │
│  │ • SUPABASE_SERVICE_KEY (for storage uploads)    │     │
│  └─────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

## Legacy Direct API Approach

```
┌─────────────────┐
│   Client App    │
└────────┬────────┘
         │ 1. POST render request
         │    { code, composition }
         ▼
┌─────────────────────────┐
│   Railway Server        │
│  (Node.js + Remotion)   │
│                         │
│ Has:                    │
│ ✅ SUPABASE_URL         │
│ ✅ SUPABASE_SERVICE_KEY │
│ ✅ Database Access      │
│ ✅ Storage Access       │
└────────┬────────────────┘
         │ 2. Render video
         │ 3. Upload to Supabase Storage
         │ 4. Return video URL
         ▼
┌─────────────────┐
│   Client App    │
│  (Gets video URL)│
└─────────────────┘
```

## Comparison

### Webhook Approach
**Pros:**
- ✅ Railway never needs database credentials
- ✅ Service keys secured in edge function environment
- ✅ Scalable (async processing)
- ✅ Real-time updates via Supabase subscriptions
- ✅ Better separation of concerns

**Cons:**
- ⚠️ Slightly more complex setup
- ⚠️ Requires edge function deployment
- ⚠️ Additional network hop

### Direct API Approach
**Pros:**
- ✅ Simple setup
- ✅ Synchronous response
- ✅ No edge functions needed

**Cons:**
- ❌ Railway needs full Supabase credentials
- ❌ Less secure (credentials in Railway)
- ❌ Synchronous blocking
- ❌ No real-time updates

## Data Flow

### Webhook: Database Update Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    video_plans table                        │
├─────────────┬───────────────┬──────────────┬───────────────┤
│   Status    │  Updated By   │  Has Video?  │  Error?       │
├─────────────┼───────────────┼──────────────┼───────────────┤
│  pending    │  Initial      │      ❌      │      ❌       │
│             │               │              │               │
│  rendering  │  render-video │      ❌      │      ❌       │
│             │  edge function│              │               │
│             │               │              │               │
│  completed  │  render-      │      ✅      │      ❌       │
│             │  webhook      │  (URL set)   │               │
│             │               │              │               │
│  failed     │  render-      │      ❌      │      ✅       │
│             │  webhook      │              │  (error msg)  │
└─────────────┴───────────────┴──────────────┴───────────────┘
```

### Real-time Updates

```
┌─────────────────┐
│   Client App    │
│                 │
│ Subscribes to:  │
│ video_plans     │
│ WHERE id = X    │
└────────┬────────┘
         │
         │ WebSocket connection
         │ (Supabase Realtime)
         │
         ▼
┌─────────────────────────┐
│  Supabase Database      │
│    video_plans table    │
│                         │
│  Status changes:        │
│  pending → rendering    │
│  rendering → completed  │
└─────────────────────────┘
         │
         │ Push notification
         │ (instant update)
         ▼
┌─────────────────┐
│   Client App    │
│  (Status update)│
└─────────────────┘
```

## Environment Variables Flow

### Webhook Approach

```
┌──────────────────────────────────────────┐
│  Lovable/Supabase Edge Function Secrets  │
├──────────────────────────────────────────┤
│  RAILWAY_RENDER_URL                      │
│  SUPABASE_URL (auto)                     │
│  SUPABASE_SERVICE_ROLE_KEY (auto)        │
└──────────────────────────────────────────┘
                     │
                     │ Edge functions use these
                     ▼
          ┌─────────────────────┐
          │  render-video       │
          │  render-webhook     │
          └─────────────────────┘

┌──────────────────────────────────────────┐
│  Railway Environment Variables           │
├──────────────────────────────────────────┤
│  SUPABASE_URL (for storage)              │
│  SUPABASE_SERVICE_KEY (for storage)      │
│  PORT (optional)                         │
└──────────────────────────────────────────┘
                     │
                     │ Server uses these
                     ▼
          ┌─────────────────────┐
          │  Render Server      │
          │  (server.js)        │
          └─────────────────────┘
```

## Error Handling Flow

```
┌─────────────────┐
│   Client App    │
└────────┬────────┘
         │
         ▼
    ┌─────────┐
    │ Success?│────── Yes ──────┐
    └────┬────┘                 │
         │                      │
        No                      ▼
         │              ┌──────────────┐
         │              │ Return video │
         │              │     URL      │
         │              └──────────────┘
         │
         ▼
┌──────────────────┐
│  Error Type?     │
└────┬────┬────┬───┘
     │    │    │
     │    │    └─── Network Error
     │    │         (retry with backoff)
     │    │
     │    └──────── Render Error
     │              (call webhook with error)
     │
     └───────────── Validation Error
                    (return 400 immediately)
```
