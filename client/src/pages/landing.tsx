import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Mic, Store, Building2, Eye, EyeOff, ArrowRight
} from "lucide-react";
import { usePharmacyContext } from "@/lib/pharmacy-context";

/* Pharmacy hero image — medicine shelves / prescription bottles */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=1920&q=80";

/* Floating capsule/pill decorations */
const CAPSULES = [
  { top: "8%",  left: "6%",   size: 54, rot: -12, dx: 22,  dy: -30, dur: "9s",  delay: "0s",   colorA: "#34d399", colorB: "#a7f3d0" },
  { top: "18%", left: "86%",  size: 44, rot: 18,  dx: -18, dy: 22,  dur: "11s", delay: "0.6s", colorA: "#14b8a6", colorB: "#99f6e4" },
  { top: "62%", left: "4%",   size: 62, rot: 35,  dx: 26,  dy: -18, dur: "10s", delay: "1.1s", colorA: "#10b981", colorB: "#6ee7b7" },
  { top: "74%", left: "88%",  size: 48, rot: -24, dx: -22, dy: -26, dur: "12s", delay: "0.3s", colorA: "#2dd4bf", colorB: "#ccfbf1" },
  { top: "40%", left: "92%",  size: 36, rot: 8,   dx: -14, dy: 18,  dur: "8s",  delay: "1.4s", colorA: "#5eead4", colorB: "#f0fdfa" },
  { top: "48%", left: "3%",   size: 40, rot: -42, dx: 18,  dy: 22,  dur: "10s", delay: "0.9s", colorA: "#0d9488", colorB: "#5eead4" },
];

function Capsule({ size, colorA, colorB }: { size: number; colorA: string; colorB: string }) {
  return (
    <svg width={size} height={size * 0.42} viewBox="0 0 120 50" className="drop-shadow-[0_4px_18px_rgba(16,185,129,0.35)]">
      <defs>
        <linearGradient id={`capA-${colorA}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={colorA} />
          <stop offset="100%" stopColor={colorB} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="116" height="46" rx="23" fill={`url(#capA-${colorA})`} opacity="0.85" />
      <rect x="2" y="2" width="58"  height="46" rx="23" fill="white" opacity="0.18" />
      <rect x="58" y="4" width="2"  height="42" fill="white" opacity="0.25" />
    </svg>
  );
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const { setPharmacy } = usePharmacyContext();
  const [role, setRole] = useState<"dealer" | "pharmacy">("pharmacy");
  const [pharmacyId, setPharmacyId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: pharmacies = [] } = useQuery<any[]>({
    queryKey: ["/api/pharmacies"],
    queryFn: async () => (await fetch("/api/pharmacies")).json(),
    enabled: role === "pharmacy",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (role === "pharmacy") {
      if (!pharmacyId)            { setError("Please select your pharmacy first."); return; }
      if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); return; }
      const selected = pharmacies.find((p: any) => p._id === pharmacyId);
      if (!selected)              { setError("Selected pharmacy is no longer available. Pick another."); return; }
      setLoading(true);
      await new Promise(r => setTimeout(r, 600));
      setPharmacy(selected._id, selected.name, selected.pharmacy_id || selected._id);
      setLocation("/pharmacy");
      return;
    }

    if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setLocation("/dealer");
  };

  const isDealer = role === "dealer";
  const accent = isDealer
    ? { from: "violet-500", to: "indigo-600", shadow: "violet", ring: "violet" }
    : { from: "emerald-500", to: "teal-600", shadow: "emerald", ring: "emerald" };

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative">

      {/* ── Pharmacy hero image with Ken Burns live zoom ── */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="bg-kenburns absolute inset-[-4%] bg-cover bg-center"
          style={{
            backgroundImage: `url('${HERO_IMAGE}')`,
            filter: "brightness(0.38) saturate(1.2) contrast(1.05)",
          }}
        />
      </div>

      {/* Emerald-tinted atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-emerald-950/55 to-teal-950/70" />

      {/* Subtle grid texture for depth */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(2,6,23,0.75) 100%)" }}
      />

      {/* Floating ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: "4s" }} />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: "5s", animationDelay: "1s" }} />
      <div className="absolute top-2/3 left-1/3 w-48 h-48 rounded-full bg-emerald-400/8 blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: "6s", animationDelay: "2s" }} />

      {/* Floating capsules (pharmacy-themed decoration) */}
      {CAPSULES.map((c, i) => (
        <div
          key={i}
          className="absolute animate-capsule pointer-events-none hidden sm:block"
          style={{
            top: c.top,
            left: c.left,
            // CSS vars consumed by capsuleDrift keyframes
            ['--rot' as any]: `${c.rot}deg`,
            ['--drift-x' as any]: `${c.dx}px`,
            ['--drift-y' as any]: `${c.dy}px`,
            ['--dur' as any]: c.dur,
            animationDelay: c.delay,
            opacity: 0.6,
          } as React.CSSProperties}
        >
          <Capsule size={c.size} colorA={c.colorA} colorB={c.colorB} />
        </div>
      ))}

      {/* Sparkle dots */}
      {[
        { top: "15%", left: "10%", size: 3, delay: "0s",   dur: "3s" },
        { top: "25%", left: "85%", size: 2, delay: "0.5s", dur: "4s" },
        { top: "70%", left: "8%",  size: 4, delay: "1s",   dur: "3.5s" },
        { top: "80%", left: "88%", size: 2, delay: "1.5s", dur: "5s" },
        { top: "45%", left: "92%", size: 3, delay: "2s",   dur: "4s" },
        { top: "60%", left: "5%",  size: 2, delay: "0.8s", dur: "3s" },
      ].map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-emerald-300/50 pointer-events-none"
          style={{
            top: d.top, left: d.left,
            width: d.size, height: d.size,
            animation: `ping ${d.dur} ${d.delay} infinite`,
          }}
        />
      ))}

      {/* ── Login column ── */}
      <div className="relative z-10 w-full max-w-[420px] px-5">

        {/* Logo */}
        <div className="flex flex-col items-center mb-7 animate-fade-in-down">
          <div className="relative mb-3">
            <div className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-emerald-400 to-teal-500 blur-xl opacity-70 animate-pulse" />
            <div className="relative h-16 w-16 rounded-[20px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/50 animate-pulse-ring">
              <Mic className="h-7 w-7 text-white drop-shadow" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">MediVoice</h1>
        </div>

        {/* Card */}
        <div
          className="group relative rounded-2xl border border-white/12 bg-white/[0.06] backdrop-blur-2xl shadow-2xl overflow-hidden animate-scale-in hover:border-white/20 hover:shadow-emerald-500/10 transition-all duration-500"
          style={{ animationDelay: "240ms" }}
        >
          {/* Animated top border sheen */}
          <div
            className={`h-[3px] w-full animate-border-sweep ${
              isDealer
                ? "bg-gradient-to-r from-violet-500 via-purple-400 to-indigo-500"
                : "bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500"
            }`}
          />

          {/* Soft inner glow on hover */}
          <div className={`pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
            isDealer ? "bg-gradient-to-br from-violet-500/5 to-indigo-500/5" : "bg-gradient-to-br from-emerald-500/5 to-teal-500/5"
          }`} />

          <div className="relative p-7">
            <div className="mb-5">
              <h2 className="text-lg font-black text-white">Sign in</h2>
            </div>

            {/* Role toggle */}
            <div className="flex rounded-xl bg-white/[0.05] border border-white/8 p-1 mb-5 gap-1">
              <button
                type="button"
                onClick={() => { setRole("dealer"); setError(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                  isDealer
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30 scale-[1.02]"
                    : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
                }`}
              >
                <Store className="h-3.5 w-3.5" /> Dealer
              </button>
              <button
                type="button"
                onClick={() => { setRole("pharmacy"); setError(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                  !isDealer
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]"
                    : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" /> Pharmacist
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {!isDealer && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Select pharmacy
                  </label>
                  <select
                    value={pharmacyId}
                    onChange={e => { setPharmacyId(e.target.value); setError(""); }}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-400/70 focus:bg-white/[0.1] focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200 appearance-none hover:border-white/20"
                    data-testid="select-pharmacy-login"
                  >
                    <option value="" className="bg-slate-900">Choose your pharmacy…</option>
                    {pharmacies.map((p: any) => (
                      <option key={p._id} value={p._id} className="bg-slate-900">
                        {p.name}{p.location ? ` — ${p.location}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={`w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:bg-white/[0.1] focus:ring-4 transition-all duration-200 hover:border-white/20 ${
                    isDealer ? "focus:border-violet-400/70 focus:ring-violet-500/10" : "focus:border-emerald-400/70 focus:ring-emerald-500/10"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`w-full px-4 py-3 pr-11 rounded-xl bg-white/[0.07] border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:bg-white/[0.1] focus:ring-4 transition-all duration-200 hover:border-white/20 ${
                      isDealer ? "focus:border-violet-400/70 focus:ring-violet-500/10" : "focus:border-emerald-400/70 focus:ring-emerald-500/10"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200 transition-colors"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 animate-fade-in">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`btn-shimmer relative w-full py-3.5 rounded-xl text-sm font-black text-white shadow-xl transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden ${
                  isDealer
                    ? "bg-gradient-to-br from-violet-500 via-violet-500 to-indigo-600 shadow-violet-500/30 hover:shadow-violet-500/60 hover:-translate-y-0.5 active:translate-y-0"
                    : "bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-600 shadow-emerald-500/30 hover:shadow-emerald-500/60 hover:-translate-y-0.5 active:translate-y-0"
                } disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0`}
              >
                {loading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin relative z-10" />
                ) : (
                  <span className="relative z-10 flex items-center gap-2">
                    {isDealer ? <Store className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
