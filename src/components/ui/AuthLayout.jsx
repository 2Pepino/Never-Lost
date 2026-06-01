// Shared light shell for all login/onboarding screens (customer and manager).
// manager login look identical (violet brand accent).
// `logo` = icon/emblem at the top, `title`/`subtitle` = heading, `footer` = links
// at the bottom (e.g. "back to customer login"). `wide` for the wider signup flow.
export default function AuthLayout({ logo, title, subtitle, children, footer, wide = false }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-5 py-10">
      <div className={`w-full space-y-5 ${wide ? 'max-w-md' : 'max-w-sm'}`}>
        <div className="flex flex-col items-center gap-3 text-center">
          {logo}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>

        {children}

        {footer && <div className="text-center text-xs text-slate-400">{footer}</div>}
      </div>
    </div>
  )
}

// Reusable violet brand emblem for the auth headers.
export function AuthLogo({ children }) {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
      {children}
    </div>
  )
}
