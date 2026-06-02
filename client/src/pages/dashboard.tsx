import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Store, MessageSquare, AlertTriangle, ClipboardList, Phone, Database } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ title, value, icon: Icon, color, href }: {
  title: string; value?: number; icon: any; color: string; href?: string;
}) {
  const content = (
    <Card className="hover-elevate cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-md ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {value === undefined ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-3xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
        )}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function CallTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant={type === "inbound" ? "secondary" : "default"} className="capitalize text-xs">
      <Phone className="h-3 w-3 mr-1" />
      {type}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    initiated: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[status] || "bg-muted text-muted-foreground"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<any>({ queryKey: ["/api/stats"] });
  const { data: health } = useQuery<any>({ queryKey: ["/api/health"], refetchInterval: 10000 });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm">MediVoice AI — Pharmacy Intelligence Overview</p>
      </div>

      {health && !health.mongoConnected && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800 p-4 text-sm" data-testid="banner-db-disconnected">
          <Database className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800 dark:text-yellow-400">Database not connected</p>
            <p className="text-yellow-700 dark:text-yellow-500">Add your <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">MONGODB_URI</code> in Secrets to connect to MongoDB Atlas. The app will work with live data once connected.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard title="Pharmacies" value={stats?.pharmacies} icon={Building2} color="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400" href="/pharmacist" />
        <StatCard title="Dealers" value={stats?.dealers} icon={Store} color="bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400" href="/dealer" />
        <StatCard title="Total Calls" value={stats?.conversations} icon={MessageSquare} color="bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400" href="/conversations" />
        <StatCard title="Low Stock Items" value={stats?.lowStock} icon={AlertTriangle} color="bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400" href="/inventory" />
        <StatCard title="Pending Orders" value={stats?.pendingOrders} icon={ClipboardList} color="bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400" href="/stock-requests" />
      </div>

      <div>
        <h2 className="font-semibold mb-3 text-base">Recent Calls</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
          </div>
        ) : stats?.recentCalls?.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No call logs yet. Conversations will appear here once MediVoice AI starts receiving calls.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {stats?.recentCalls?.map((call: any) => (
              <Link key={call._id} href={`/conversations/${call._id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-call-${call._id}`}>
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div className="flex items-center gap-3">
                      <CallTypeBadge type={call.type} />
                      <div>
                        <p className="font-medium text-sm">{call.pharmacy_name || call.pharmacyName || "Unknown Pharmacy"}</p>
                        <p className="text-xs text-muted-foreground">{call.ai_response?.slice(0, 60) || call.trigger || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {call.status && <StatusBadge status={call.status} />}
                      <span className="text-xs text-muted-foreground">
                        {new Date(call.timestamp || call.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Inbound Call Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {[
              "Pharmacist calls the MediVoice AI bot",
              "OpenAI Whisper converts speech to text",
              "Bot checks MongoDB for pharmacy data",
              "AI responds conversationally using personalization",
              "Conversation stored in database",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Outbound Call Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {[
              "Raspberry Pi microphone detects keywords",
              "Keywords (low stock, check stock) sent to Whisper",
              "Bot triggers outbound Twilio call to pharmacy",
              "AI discusses medicine reorder & available offers",
              "Conversation + order stored, dealer notified",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
