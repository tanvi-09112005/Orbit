export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-5 py-12 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-display text-primary font-serif mb-1">Terms of Service</h1>
        <p className="text-caption text-text-secondary">Last updated: June 2026</p>
      </div>

      <div className="space-y-8 text-body text-foreground leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">Acceptance</h2>
          <p>By using Family OS you agree to these terms. If you don't agree, please don't use the app. We may update these terms — continued use after changes means you accept them.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">What Family OS is</h2>
          <p>Family OS is a family coordination tool for managing schedules, tasks, children's school activities, and wellbeing. It is provided as-is for personal, non-commercial use by families.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">Your account</h2>
          <p>You are responsible for keeping your login credentials secure. Each family account should be used only by that family's members. You must be at least 18 years old to create an account. Parents may create child accounts for minors in their care.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">Your data</h2>
          <p>You own your family's data. We store it on your behalf. You can delete it at any time. By using Family OS you grant us a limited licence to store and process your data solely to provide the service.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">Acceptable use</h2>
          <p>Don't use Family OS for anything illegal, harmful, or abusive. Don't attempt to access other families' data. Don't use automated tools to scrape or overload the service.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">Availability</h2>
          <p>We aim for high availability but cannot guarantee uninterrupted service. We are not liable for data loss caused by outages, though we take reasonable precautions against it.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">Limitation of liability</h2>
          <p>Family OS is provided without warranty. We are not liable for any indirect or consequential damages arising from use of the service. Our total liability is limited to the amount you paid us in the past 12 months.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">Termination</h2>
          <p>You can stop using Family OS and delete your account at any time. We reserve the right to suspend accounts that violate these terms.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-h2 font-semibold text-primary">Contact</h2>
          <p>Questions? Email <span className="text-primary font-semibold">hello@familyos.app</span></p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-border">
        <a href="/home" className="text-primary text-body font-semibold hover:underline">← Back to app</a>
      </div>
    </div>
  )
}