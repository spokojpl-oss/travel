import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border-default bg-bg-soft">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 font-display text-lg font-bold text-white">
                T
              </div>
              <span className="font-display text-xl font-bold text-text-primary">
                Travel<span className="text-accent-500">.</span>app
              </span>
            </div>
            <p className="text-sm leading-relaxed text-text-secondary">
              Twoje narzędzie do planowania wyjazdów rodzinnych.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-text-primary">
              Narzędzia
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/app/search"
                  className="text-text-secondary transition-colors hover:text-brand-700"
                >
                  Wyszukiwarka
                </Link>
              </li>
              <li>
                <Link
                  href="/app/trips"
                  className="text-text-secondary transition-colors hover:text-brand-700"
                >
                  Moje wyjazdy
                </Link>
              </li>
              <li>
                <Link
                  href="/app/compare"
                  className="text-text-secondary transition-colors hover:text-brand-700"
                >
                  Porównaj
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-text-primary">
              Konto
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/app/profile"
                  className="text-text-secondary transition-colors hover:text-brand-700"
                >
                  Profil
                </Link>
              </li>
              <li>
                <Link
                  href="/app/groups"
                  className="text-text-secondary transition-colors hover:text-brand-700"
                >
                  Grupy podróżne
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-text-primary">
              Pomoc
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <span className="text-text-tertiary">FAQ (wkrótce)</span>
              </li>
              <li>
                <span className="text-text-tertiary">Prywatność (wkrótce)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border-default pt-6 text-sm text-text-tertiary">
          © {new Date().getFullYear()} Travel.app · Personal tool
        </div>
      </div>
    </footer>
  );
}
