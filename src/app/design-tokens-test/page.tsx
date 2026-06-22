/**
 * Design Tokens Test Page
 * DELETE THIS FILE after verifying all tokens render correctly.
 */
export default function DesignTokensTest() {
  return (
    <div className="min-h-screen bg-canvas p-8">
      <h1 className="text-2xl font-bold text-heading mb-8">
        Design Tokens Verification
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Primary */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-lg bg-primary" />
          <span className="text-sm text-muted">primary (#f97316)</span>
        </div>

        {/* Primary Hover */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-lg bg-primary-hover" />
          <span className="text-sm text-muted">primary-hover (#ea580c)</span>
        </div>

        {/* Alert */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-lg bg-alert" />
          <span className="text-sm text-muted">alert (#f59e0b)</span>
        </div>

        {/* Canvas */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-lg bg-canvas border border-slate-200" />
          <span className="text-sm text-muted">canvas (#f8fafc)</span>
        </div>

        {/* Card */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-lg bg-card border border-slate-200" />
          <span className="text-sm text-muted">card (#ffffff)</span>
        </div>

        {/* Heading */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-lg bg-heading" />
          <span className="text-sm text-muted">heading (#0f172a)</span>
        </div>

        {/* Muted */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-lg bg-muted" />
          <span className="text-sm text-muted">muted (#94a3b8)</span>
        </div>
      </div>

      {/* Typography test */}
      <div className="mt-8 space-y-2">
        <p className="text-heading font-semibold">
          Text Heading — slate-900
        </p>
        <p className="text-muted">Text Muted — slate-400</p>
      </div>

      {/* Button test */}
      <div className="mt-8 flex gap-4">
        <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors">
          Primary Button
        </button>
        <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">
          Secondary Button
        </button>
        <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">
          Danger Button
        </button>
      </div>

      <p className="mt-8 text-sm text-red-500 font-medium">
        ⚠️ DELETE this page after verification!
      </p>
    </div>
  );
}
