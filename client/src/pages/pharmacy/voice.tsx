import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Phone, PhoneOff, Mic, Info, Bot,
  Clock, ArrowRight, ChevronRight, CalendarClock, CheckCircle2
} from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { usePharmacyContext } from "@/lib/pharmacy-context";

function PulseRing() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div className="absolute h-20 w-20 rounded-full border-2 border-emerald-300/40 animate-ping" style={{ animationDuration: "2s" }} />
      <div className="absolute h-28 w-28 rounded-full border border-emerald-300/20 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.3s" }} />
    </div>
  );
}

const TIME_SLOTS = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
];

function ScheduleForm({ twilioNumber, pharmacyName }: { twilioNumber: string; pharmacyName: string | null }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { mutate: schedule, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/schedule-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time: slot, note, pharmacyName }),
      });
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
    onError: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/25 text-center space-y-3">
        <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-7 w-7 text-white" />
        </div>
        <p className="text-white font-black text-lg">Call Scheduled!</p>
        <p className="text-emerald-100 text-sm">
          Your call is booked for <span className="font-bold">{date}</span> at <span className="font-bold">{slot}</span>.
          We'll call you on <span className="font-bold">{twilioNumber}</span>.
        </p>
        <button
          onClick={() => { setSubmitted(false); setSlot(""); setNote(""); }}
          className="text-xs text-emerald-200 underline underline-offset-2 hover:text-white transition-colors"
        >
          Schedule another
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 space-y-4 border border-white/25">
      <p className="text-emerald-200 text-xs uppercase tracking-widest font-semibold">
        Schedule a Callback
      </p>

      {/* Date */}
      <div>
        <label className="block text-white/70 text-xs font-semibold mb-1.5">Select date</label>
        <input
          type="date"
          value={date}
          min={today}
          onChange={e => setDate(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40 transition-all [color-scheme:dark]"
        />
      </div>

      {/* Time slots */}
      <div>
        <label className="block text-white/70 text-xs font-semibold mb-2">Select time slot</label>
        <div className="grid grid-cols-3 gap-2">
          {TIME_SLOTS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setSlot(t)}
              className={`py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                slot === t
                  ? "bg-white text-emerald-700 shadow-md"
                  : "bg-white/10 text-white/70 border border-white/15 hover:bg-white/20"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="block text-white/70 text-xs font-semibold mb-1.5">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. Asking about Amoxicillin stock"
          className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/40 transition-all"
        />
      </div>

      <Button
        onClick={() => schedule()}
        disabled={!slot || !date || isPending}
        className="w-full gap-2 bg-white text-emerald-700 hover:bg-emerald-50 font-black py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-base disabled:opacity-50"
      >
        {isPending ? (
          <div className="h-4 w-4 rounded-full border-2 border-emerald-600/30 border-t-emerald-600 animate-spin" />
        ) : (
          <>
            <CalendarClock className="h-5 w-5" />
            Confirm Schedule
          </>
        )}
      </Button>
    </div>
  );
}

function CallBotHero({ twilioNumber, pharmacyName }: { twilioNumber: string; pharmacyName: string | null }) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 shadow-2xl animate-scale-in">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3 animate-float" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3 animate-float delay-300" />
      </div>

      <div className="relative z-10 p-8">
        <div className="flex items-start justify-between gap-4 mb-7">
          <div>
            <h2 className="text-3xl font-black text-white mb-2 leading-tight">
              MediVoice AI
            </h2>
            <p className="text-emerald-100 text-sm leading-relaxed max-w-sm">
              Schedule a callback from the AI bot — it will call you at your chosen time and help with stock, pricing, and orders.
            </p>
          </div>
          <div className="relative flex-shrink-0">
            <PulseRing />
            <div className="relative h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl z-10">
              <Mic className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>

        {/* Hotline number — for direct dialing */}
        <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-3 mb-5">
          <Phone className="h-4 w-4 text-emerald-300 flex-shrink-0" />
          <span className="text-white/70 text-xs font-semibold">Direct hotline:</span>
          <a href={`tel:${twilioNumber}`} className="text-white font-bold text-sm tracking-widest hover:text-emerald-200 transition-colors ml-auto">
            {twilioNumber}
          </a>
        </div>

        <ScheduleForm twilioNumber={twilioNumber} pharmacyName={pharmacyName} />
      </div>
    </div>
  );
}

function RecentCalls({ pharmacyName, pharmacyCode }: { pharmacyName: string | null; pharmacyCode: string | null }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/conversations", pharmacyName, pharmacyCode],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "5" });
      if (pharmacyName) params.set("pharmacy", pharmacyName);
      const res = await fetch(`/api/conversations?${params}`);
      return res.json();
    },
  });

  const calls = data?.conversations || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Recent Calls</h3>
        <div className="flex-1 h-px bg-border" />
        <Link href="/pharmacy/conversations">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 font-semibold">
            View all <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : calls.length === 0 ? (
        <div className="bg-card border-2 border-dashed border-border rounded-2xl p-10 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Phone className="h-7 w-7 text-muted-foreground opacity-30" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">No calls yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Schedule a call above — it will appear here after it completes.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((c: any, i: number) => (
            <Link key={c._id} href={`/pharmacy/conversations/${c._id}`}>
              <div
                className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 hover-elevate cursor-pointer hover:border-emerald-400 transition-all duration-200 animate-fade-in-up group"
                style={{ animationDelay: `${i * 50}ms` }}
                data-testid={`card-call-${c._id}`}
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{c.pharmacy_name || "MediVoice AI Call"}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.pharmacist_text?.slice(0, 70) || c.ai_response?.slice(0, 70) || "—"}</p>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{c.timestamp ? new Date(c.timestamp).toLocaleDateString() : "—"}</span>
                  </div>
                  {c.type && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${c.type === "inbound" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"}`}>
                      {c.type}
                    </span>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 text-center py-20 animate-scale-in">
      <div className="h-24 w-24 rounded-3xl bg-muted flex items-center justify-center">
        <PhoneOff className="h-12 w-12 text-muted-foreground opacity-30" />
      </div>
      <div>
        <p className="text-xl font-black">AI Hotline Not Configured</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
          Twilio credentials have not been set up yet. Contact your dealer or admin to enable the MediVoice AI call bot.
        </p>
      </div>
      <div className="bg-muted rounded-xl p-4 text-xs text-muted-foreground max-w-sm space-y-1.5 text-left border border-border">
        <p className="font-bold text-foreground mb-2 flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> Required setup:</p>
        <p>• TWILIO_ACCOUNT_SID</p>
        <p>• TWILIO_AUTH_TOKEN</p>
        <p>• TWILIO_PHONE_NUMBER</p>
      </div>
    </div>
  );
}

export default function VoicePage() {
  const { pharmacyName, pharmacyCode } = usePharmacyContext();
  const { data: twilioStatus, isLoading } = useQuery<any>({ queryKey: ["/api/twilio/status"] });
  const { data: convsData } = useQuery<any>({ queryKey: ["/api/conversations"] });
  const totalCalls = convsData?.total || 0;

  return (
    <div className="p-6 space-y-7 max-w-3xl mx-auto">
      <div className="animate-fade-in-down">
        <div className="flex items-center gap-2 mb-1">
          {twilioStatus?.configured && <div className="h-2 w-2 rounded-full bg-emerald-500 animate-blink" />}
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">MediVoice AI</span>
          {totalCalls > 0 && (
            <span className="ml-auto bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-2 py-0.5 rounded-full">
              {totalCalls} call{totalCalls !== 1 ? "s" : ""} recorded
            </span>
          )}
        </div>
        <h1 className="text-2xl font-black tracking-tight">Call Bot</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Schedule a callback or dial directly — AI-powered, available 24/7
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : twilioStatus?.configured ? (
        <>
          <CallBotHero twilioNumber={twilioStatus.phoneNumber} pharmacyName={pharmacyName} />
          <RecentCalls pharmacyName={pharmacyName} pharmacyCode={pharmacyCode} />
        </>
      ) : (
        <NotConfigured />
      )}
    </div>
  );
}
