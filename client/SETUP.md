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
  user_id UUID NOT NULL,
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

## Next Steps

1. **Connect Supabase**: Update all `TODO` comments in hook files to use real Supabase queries
2. **Implement Auth**: Integrate Supabase Auth in loginStore and signupPage
3. **Add Charts**: Use Recharts for mood trends and screen time analytics
4. **Push Notifications**: Integrate Supabase Edge Functions for push notifications
5. **PWA**: Configure service worker for offline support
6. **Testing**: Add test suite with Vitest

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
