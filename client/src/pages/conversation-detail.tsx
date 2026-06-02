import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Clock, Building2, Mic, Bot, User, Phone, Calendar,
  CheckCircle2, Activity, Sparkles, MessageSquare, ShieldCheck
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function ChatBubble({ role, content, timestamp, index }: { role: string; content: string; timestamp?: string; index: number }) {
  const isAI = role !== "user";
  return (
    <div
      className={`flex gap-3 animate-fade-in-up ${isAI ? "flex-row" : "flex-row-reverse"}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${isAI ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}>
        {isAI ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-white" />}
      </div>
      <div className={`max-w-[78%] space-y-1 ${isAI ? "" : "items-end flex flex-col"}`}>
        <p className={`text-[10px] font-bold uppercase tracking-wider ${isAI ? "text-violet-500 dark:text-violet-400" : "text-emerald-600 dark:text-emerald-400"}`}>
          {isAI ? "MediVoice AI" : "Pharmacist"}
        </p>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isAI
            ? "bg-violet-50 dark:bg-violet-950/40 text-foreground border border-violet-100 dark:border-violet-900 rounded-tl-sm"
            : "bg-emerald-50 dark:bg-emerald-950/40 text-foreground border border-emerald-100 dark:border-emerald-900 rounded-tr-sm"
        }`}>
          {content}
        </div>
        {timestamp && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {new Date(timestamp).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}

function MetaBadge({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className={`flex items-center gap-2.5 p-3 rounded-xl border animate-fade-in-up ${color}`}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

export default function ConversationDetail() {
  const { id } = useParams<{ id: string }>();
  const [location] = useLocation();
  const backHref = location.startsWith("/dealer") ? "/dealer/conversations" : location.startsWith("/pharmacy") ? "/pharmacy/conversations" : "/conversations";
  const { data: conversation, isLoading } = useQuery<any>({ queryKey: [`/api/conversations/${id}`] });

  if (isLoading) return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="space-y-1.5"><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-48" /></div>
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
    </div>
  );

  if (!conversation) return (
    <div className="p-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
        <MessageSquare className="h-8 w-8 text-muted-foreground opacity-30" />
      </div>
      <p className="font-semibold text-muted-foreground">Conversation not found.</p>
    </div>
  );

  const pharmacyName = conversation.pharmacy_name || conversation.pharmacy || "Unknown Pharmacy";
  const ts = conversation.timestamp ? new Date(conversation.timestamp) : null;
  const callType = conversation.type || "inbound";

  const confidenceMatch = conversation.ai_response?.match(/Confidence (\d+)%/);
  const durationMatch = conversation.ai_response?.match(/Duration (\d+)s/);
  const confidence = confidenceMatch?.[1];
  const duration = durationMatch?.[1];

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center gap-3 animate-fade-in-down">
        <Link href={backHref}>
          <Button variant="ghost" size="icon" className="rounded-xl hover:scale-110 transition-transform" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Call Detail</h1>
          <p className="text-xs text-muted-foreground font-mono">ID: {String(conversation._id).slice(-12)}</p>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 shadow-xl animate-scale-in">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/3 animate-float-slow" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-black/10 translate-y-1/3 -translate-x-1/4 animate-float" />
        </div>
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${callType === "inbound" ? "bg-blue-500/30 border-blue-400/40 text-blue-200" : "bg-emerald-500/30 border-emerald-400/40 text-emerald-200"}`}>
                <Phone className="h-3 w-3 inline mr-1" />
                {callType.charAt(0).toUpperCase() + callType.slice(1)}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white" data-testid="text-convo-pharmacy">{pharmacyName}</h2>
            {ts && (
              <p className="text-violet-200 text-sm mt-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {ts.toLocaleString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
          <div className="flex gap-3 flex-shrink-0">
            {confidence && (
              <div className="text-center px-4 py-2 bg-white/15 rounded-xl border border-white/20">
                <p className="text-2xl font-black text-white">{confidence}%</p>
                <p className="text-[10px] text-violet-200 font-semibold uppercase">Confidence</p>
              </div>
            )}
            {duration && (
              <div className="text-center px-4 py-2 bg-white/15 rounded-xl border border-white/20">
                <p className="text-2xl font-black text-white">{duration}s</p>
                <p className="text-[10px] text-violet-200 font-semibold uppercase">Duration</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetaBadge icon={Building2} label="Pharmacy" value={pharmacyName}
          color="bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900 text-purple-700 dark:text-purple-300" />
        <MetaBadge icon={Phone} label="Call Type" value={callType.charAt(0).toUpperCase() + callType.slice(1)}
          color={callType === "inbound" ? "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-300" : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"} />
        {conversation.status && (
          <MetaBadge icon={CheckCircle2} label="Status" value={conversation.status}
            color="bg-muted border-border text-muted-foreground" />
        )}
      </div>

      {(conversation.pharmacist_text || conversation.ai_response) && (
        <Card className="border-0 shadow-sm overflow-hidden animate-fade-in-up">
          <CardHeader className="pb-3 pt-4 border-b border-border bg-muted/30">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <Mic className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              Call Content
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {conversation.pharmacist_text && conversation.pharmacist_text !== "CALL_ENDED" && (
              <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                  <User className="h-3 w-3" /> Pharmacist
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-xl p-3.5 text-sm leading-relaxed">
                  {conversation.pharmacist_text}
                </div>
              </div>
            )}
            {conversation.ai_response && (
              <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-2">
                  <Bot className="h-3 w-3" /> MediVoice AI
                </div>
                <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 rounded-xl p-3.5 text-sm leading-relaxed">
                  {conversation.ai_response}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {conversation.summary && (
        <Card className="border-0 shadow-sm animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl p-3.5">{conversation.summary}</p>
          </CardContent>
        </Card>
      )}

      {conversation.transcript && (
        <Card className="border-0 shadow-sm animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Activity className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              Full Transcript
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/40 rounded-xl p-3.5">{conversation.transcript}</p>
          </CardContent>
        </Card>
      )}

      {conversation.messages?.length > 0 && (
        <Card className="border-0 shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          <CardHeader className="pb-3 pt-4 border-b border-border bg-muted/30">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <MessageSquare className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              Conversation · {conversation.messages.length} messages
              <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="h-3 w-3" /> Recorded
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
              {conversation.messages.map((msg: any, i: number) => (
                <ChatBubble
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                  index={i}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
