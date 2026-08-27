# Family OS - Setup Guide

A comprehensive childcare management platform built with React, Vite, and Supabase.

## Quick Start

### 1. Prerequisites
- Node.js 16+ and pnpm
- Supabase account (free tier works)

### 2. Installation

```bash
# Install dependencies
pnpm install

# Create .env.local file
cp .env.example .env.local
```

### 3. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Copy your project URL and anon key
3. Add to `.env.local`:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Database Setup

Run the SQL migration to create tables:

```sql
-- Families
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Family Members
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id),
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'parent',
  permissions JSONB DEFAULT '{}'::JSONB,
  invited_at TIMESTAMP,
  joined_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Children
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id),
  name TEXT NOT NULL,
  dob DATE NOT NULL,
  school_name TEXT,
  photo_url TEXT,
  color_hex TEXT DEFAULT '#2D1B8E',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id),
  title TEXT NOT NULL,
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  child_ids UUID[] DEFAULT '{}',
  responsible_member_id UUID,
  backup_member_id UUID,
  notes TEXT,
  recurrence_rule TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id),
  title TEXT NOT NULL,
  assigned_to UUID,
  due_date DATE,
  status TEXT DEFAULT 'open',
  child_id UUID REFERENCES children(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Mood Logs
CREATE TABLE mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id),
  logged_by UUID,
  mood INTEGER NOT NULL,
  note TEXT,
  logged_at TIMESTAMP DEFAULT NOW()
);

-- Screen Time Logs
CREATE TABLE screen_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id),
  logged_by UUID,
  date DATE NOT NULL,
  hours_manual NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Homework
CREATE TABLE homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id),
  subject TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exams
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id),
  subject TEXT NOT NULL,
  exam_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PTMs (Parent Teacher Meetings)
CREATE TABLE ptms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id),
  teacher_name TEXT NOT NULL,
  ptm_date DATE NOT NULL,
  notes TEXT,
  followup_items JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- School Notices
CREATE TABLE school_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id),
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  extracted_events JSONB DEFAULT '[]'::JSONB
);

-- Activities
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id),
  name TEXT NOT NULL,
  schedule JSONB,
  location TEXT,
  responsible_member_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insights
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id),
  type TEXT NOT NULL,
  headline TEXT,
  body TEXT,
  action_type TEXT,
  action_payload JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  dismissed_at TIMESTAMP
);

-- Push Subscriptions
CREATE TABLE user_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Run the App

```bash
pnpm dev
```

Visit `http://localhost:3000` and start using Family OS!

## Architecture

### Frontend Stack
- **Framework**: React 19 with Vite
- **Routing**: React Router v6
- **State**: Zustand (global state) + React Query (server state)
- **UI**: Tailwind CSS with custom design tokens
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Backend**: Supabase (Postgres + Auth)

### Project Structure
```
src/
├── pages/           # Page components (route-based)
├── components/      # Reusable UI components
├── layouts/         # Layout wrappers (AppLayout, AuthLayout)
├── stores/          # Zustand stores for global state
├── hooks/           # Custom React hooks for data fetching
├── lib/             # Utilities and Supabase client
└── globals.css      # Design tokens and typography
```

### Design System
- **Colors**: 5-color palette (primary purple, teal, coral, amber, neutrals)
- **Typography**: 2 font families (DM Serif Display, DM Sans)
- **Spacing**: 4px base unit, flexbox-first layout
- **Components**: 15+ reusable components with variants

## Key Features Implemented

### Auth & Onboarding
- ✅ Login/Signup pages
- ✅ 5-step onboarding flow
- ✅ Mock authentication (replace with Supabase)

### Home Page
- ✅ Daily greeting and date
- ✅ Today's events section
- ✅ Due today tasks
- ✅ Quick action buttons
- ✅ Weekly calendar strip

### Family Management
- ✅ Calendar view (Month/Week tabs)
- ✅ Tasks management (My Tasks / Partner's Tasks)
- ✅ Family members list
- ✅ Event creation and details

### Children Management
- ✅ Child selection with chips
- ✅ Child overview page
- ✅ School tracking (Homework, Exams, PTMs, Notices)
- ✅ Activities management
- ✅ Wellbeing tracking (Mood, Trends, Notes)
- ✅ Screen time logging

### Insights
- ✅ Alerts section
- ✅ Family balance tracking
- ✅ Child trend cards
- ✅ Balance detail page
- ✅ Child trend analytics

### Profile & Settings
- ✅ Profile page with user info
- ✅ Family settings
- ✅ Member permissions
- ✅ Notification settings
- ✅ Sign out

## Push Notification Setup

Push notifications use **Firebase Cloud Messaging (FCM v1)** for delivery and a **Supabase Edge Function** for server-side dispatch.

### 1. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com) → Project `orbit-46b13`
2. Project Settings → **Cloud Messaging** → Enable the Cloud Messaging API (if not already)
3. Project Settings → **Cloud Messaging** → Web Push certificates → Copy the **Key pair** value
4. Paste it in `.env.local` as `VITE_VAPID_PUBLIC_KEY`

### 2. Firebase Service Account
1. Firebase Console → Project Settings → **Service Accounts**
2. Click **Generate new private key** → download the JSON file
3. Set it as a Supabase secret:
```bash
supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat path/to/serviceAccountKey.json)"
```

### 3. Database Migration (if table already exists)
If `user_push_subscriptions` already exists without the UNIQUE constraint:
```sql
ALTER TABLE user_push_subscriptions
ADD CONSTRAINT user_push_subscriptions_user_id_key UNIQUE (user_id);
```

### 4. Deploy Edge Function
```bash
cd Orbit
supabase functions deploy push-notify --project-ref innyndztbmrynnzmwgdt
```

### 5. Verify
- Assign a task to another family member → the assignee should receive a push notification
- Check Supabase Dashboard → Edge Functions → `push-notify` logs for errors

## Next Steps

1. **Testing**: Add test suite with Vitest
2. **Notification Preferences**: Wire up `notification_prefs` from user metadata to filter dispatches in the Edge Function

## Environment Variables

```
VITE_SUPABASE_URL          # Supabase project URL
VITE_SUPABASE_ANON_KEY     # Supabase anonymous key
```

## Deployment

Deploy to Vercel:

```bash
vercel deploy
```

Or build for production:

```bash
pnpm build
pnpm preview
```

## Support

For issues or questions, check the spec in the project root or contact support.
