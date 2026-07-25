export const LandingPage = {
  title: "Ārogyam | Connected Care",
  render() {
    return `
      <main class="landing-page">
        <section class="landing-hero">
          <header class="landing-nav">
            <a class="brand" href="/" data-link>
              <span class="brand-mark" aria-hidden="true"><span></span></span>
              <span class="brand-name">Ārogyam</span>
            </a>
            <div class="landing-actions">
              <a class="small-button" href="/login" data-link>Sign in</a>
              <a class="primary-button" href="/signup" data-link>Create account</a>
            </div>
          </header>

          <div class="landing-content">
            <p class="eyebrow">Virtual care, thoughtfully organised</p>
            <h1>Ārogyam</h1>
            <p class="landing-lead">A calmer way for patients, doctors, and care teams to coordinate consultations and appointments.</p>
            <div class="landing-actions landing-actions-main">
              <a class="primary-button" href="/signup" data-link>Get started</a>
              <a class="link-button" href="/login" data-link>Access your portal</a>
            </div>
          </div>

          <div class="portal-preview-grid" aria-label="Ārogyam workspaces">
            <article class="portal-preview patient-preview">
              <span class="metric-icon"><svg><use href="#icon-prescription"></use></svg></span>
              <strong>Patient Portal</strong>
              <span>Find doctors, manage appointments, and keep care details together.</span>
            </article>
            <article class="portal-preview doctor-preview">
              <span class="metric-icon"><svg><use href="#icon-video"></use></svg></span>
              <strong>Doctor Portal</strong>
              <span>Manage availability, appointments, and patient records with focus.</span>
            </article>
            <article class="portal-preview admin-preview">
              <span class="metric-icon"><svg><use href="#icon-report"></use></svg></span>
              <strong>Admin Console</strong>
              <span>Oversee provider approvals, bookings, and platform operations.</span>
            </article>
          </div>
        </section>
      </main>
    `;
  }
};
