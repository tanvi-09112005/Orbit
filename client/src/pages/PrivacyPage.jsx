export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-5 py-12 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-display text-primary font-serif mb-1">Privacy Policy</h1>
        <p className="text-caption text-text-secondary">Last updated: June 2026</p>
      </div>

      <div className="space-y-8 text-body text-foreground leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">What we collect</h2>
          <p>Family OS collects information you provide directly: your name, email address, and the family data you enter (events, tasks, children's details, mood logs, school notices, and screen time records). We also collect basic usage data to improve the app.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">How we use it</h2>
          <p>Your data is used solely to provide the Family OS service — coordinating your family schedule, tracking children's wellbeing, and generating insights for your household. We do not sell your data, use it for advertising, or share it with third parties except as necessary to operate the service (our database provider, Supabase).</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">Children's data</h2>
          <p>Family OS is designed for parents and guardians managing their families. Children's data (mood logs, school records, screen time) is entered by parents and stored securely. We do not market to children or knowingly collect data directly from minors.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">Data storage</h2>
          <p>All data is stored on Supabase infrastructure with row-level security, meaning each family's data is isolated and accessible only to authenticated members of that family. Files (school notices) are stored in private Supabase Storage buckets with the same access controls.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">Your rights</h2>
          <p>You can delete your account and all associated data at any time from Profile → Delete my account. This permanently removes your family's data from our systems. You can also export your data by contacting us.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">Cookies & tracking</h2>
          <p>Family OS uses only functional cookies required to maintain your login session. We do not use advertising cookies or third-party tracking.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">Contact</h2>
          <p>Questions about your privacy? Email us at <span className="text-primary font-semibold">privacy@familyos.app</span></p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-border">
        <a href="/home" className="text-primary text-body font-semibold hover:underline">← Back to app</a>
      </div>
    </div>
  )
}
// work please