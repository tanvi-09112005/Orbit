import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Layouts
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import OnboardingLayout from './layouts/OnboardingLayout'

// Auth pages
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Onboarding pages
import OnboardingFamilyPage from './pages/onboarding/OnboardingFamilyPage'
import OnboardingPartnerPage from './pages/onboarding/OnboardingPartnerPage'
import OnboardingChildrenPage from './pages/onboarding/OnboardingChildrenPage'
import OnboardingGuardiansPage from './pages/onboarding/OnboardingGuardiansPage'
import OnboardingDonePage from './pages/onboarding/OnboardingDonePage'
import JoinPage from './pages/JoinPage'

// Static pages
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'

// App pages
import HomePage from './pages/HomePage'
import FamilyPage from './pages/FamilyPage'
import CalendarPage from './pages/CalendarPage'
import MemoriesPage from './pages/MemoriesPage'
import AddEventPage from './pages/events/AddEventPage'
import EventDetailPage from './pages/events/EventDetailPage'
import ImportCalendarPage from './pages/profile/ImportCalendarPage'
import ChildrenPage from './pages/ChildrenPage'
import ChildOverviewPage from './pages/children/ChildOverviewPage'
import SchoolPage from './pages/children/SchoolPage'
import ActivitiesPage from './pages/children/ActivitiesPage'
import WellbeingPage from './pages/children/WellbeingPage'
import ScreenTimePage from './pages/children/ScreenTimePage'
import InsightsPage from './pages/InsightsPage'
import BalanceDetailPage from './pages/insights/BalanceDetailPage'
import ChildTrendPage from './pages/insights/ChildTrendPage'
import ProfilePage from './pages/ProfilePage'
import FamilySettingsPage from './pages/profile/FamilySettingsPage'
import MemberPermissionsPage from './pages/profile/MemberPermissionsPage'
import NotificationSettingsPage from './pages/profile/NotificationSettingsPage'
import SearchPage from './pages/SearchPage'

// inside protected children array

// Child role pages
import ChildSchedulePage from './pages/child/ChildSchedulePage'
import ChildActivitiesPage from './pages/child/ChildActivitiesPage'
import ChildTasksPage from './pages/child/ChildTasksPage'
import ChildMoodPage from './pages/child/ChildMoodPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/home" replace /> },

  // Auth
  { path: '/login', element: <AuthLayout />, children: [{ index: true, element: <LoginPage /> }] },
  { path: '/signup', element: <AuthLayout />, children: [{ index: true, element: <SignupPage /> }] },
  { path: '/forgot-password', element: <AuthLayout />, children: [{ index: true, element: <ForgotPasswordPage /> }] },
  { path: '/reset-password', element: <AuthLayout />, children: [{ index: true, element: <ResetPasswordPage /> }] },

  // Public pages — no auth, no AppLayout
  { path: '/join', element: <JoinPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/terms', element: <TermsPage /> },

  // Onboarding
  {
    path: '/onboarding',
    element: <OnboardingLayout />,
    children: [
      { index: true, element: <Navigate to="family" replace /> },
      { path: 'family', element: <OnboardingFamilyPage /> },
      { path: 'partner', element: <OnboardingPartnerPage /> },
      { path: 'children', element: <OnboardingChildrenPage /> },
      { path: 'guardians', element: <OnboardingGuardiansPage /> },
      { path: 'done', element: <OnboardingDonePage /> },
    ],
  },

  // Protected app routes
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: 'home', element: <HomePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'family', element: <FamilyPage /> },
      { path: 'family/tasks', element: <FamilyPage /> },
      { path: 'family/members', element: <FamilyPage /> },
      { path: 'family/events/new', element: <AddEventPage /> },
      { path: 'family/events/:id', element: <EventDetailPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'memories', element: <MemoriesPage /> },
      { path: 'children', element: <ChildrenPage /> },
      { path: 'children/:childId', element: <ChildOverviewPage /> },
      { path: 'children/:childId/school', element: <SchoolPage /> },
      { path: 'children/:childId/activities', element: <ActivitiesPage /> },
      { path: 'children/:childId/wellbeing', element: <WellbeingPage /> },
      { path: 'children/:childId/screentime', element: <ScreenTimePage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: 'insights/balance', element: <BalanceDetailPage /> },
      { path: 'insights/child/:childId', element: <ChildTrendPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'profile/family-settings', element: <FamilySettingsPage /> },
      { path: 'profile/member/:memberId', element: <MemberPermissionsPage /> },
      { path: 'profile/notifications', element: <NotificationSettingsPage /> },
      { path: 'profile/import-calendar', element: <ImportCalendarPage /> },
      { path: 'child/schedule', element: <ChildSchedulePage /> },
      { path: 'child/activities', element: <ChildActivitiesPage /> },
      { path: 'child/tasks', element: <ChildTasksPage /> },
      { path: 'child/mood', element: <ChildMoodPage /> },
    ],
  },
])

export default router