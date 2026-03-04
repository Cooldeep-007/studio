'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/firebase/provider';
import {
  Users,
  LogIn,
  UserPlus,
  Activity,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Clock,
  Globe,
  Monitor,
} from 'lucide-react';

interface Stats {
  activeUsersCount: number;
  totalLogins: number;
  totalSignups: number;
  recentChanges: number;
  loginsByDay: { date: string; event_type: string; count: string }[];
  topUsers: { email: string; login_count: string }[];
}

interface ActiveUser {
  firebase_uid: string;
  email: string;
  display_name: string;
  current_page: string;
  last_heartbeat: string;
  started_at: string;
}

interface AuthEvent {
  id: number;
  firebase_uid: string;
  email: string;
  display_name: string;
  event_type: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

interface AuditEntry {
  id: number;
  firebase_uid: string;
  email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  changes: Record<string, any>;
  created_at: string;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString();
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '-';
  const now = new Date();
  const d = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getEventBadge(type: string) {
  switch (type) {
    case 'login':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Login</Badge>;
    case 'signup':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Signup</Badge>;
    case 'logout':
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Logout</Badge>;
    case 'login_failed':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Login Failed</Badge>;
    case 'signup_failed':
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Signup Failed</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

export default function AdminDashboard() {
  const auth = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [authPage, setAuthPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [authTotal, setAuthTotal] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);
  const [authFilter, setAuthFilter] = useState<string>('all');
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getHeaders = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return {};
      const token = await user.getIdToken();
      return { 'Authorization': `Bearer ${token}` };
    } catch {
      return {};
    }
  }, [auth]);

  const fetchStats = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/admin/stats', { headers });
      const data = await res.json();
      setStats(data);
    } catch (e) {}
  }, [getHeaders]);

  const fetchActiveUsers = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/admin/active-users', { headers });
      const data = await res.json();
      setActiveUsers(data.users || []);
    } catch (e) {}
  }, [getHeaders]);

  const fetchAuthEvents = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const params = new URLSearchParams({ page: authPage.toString(), limit: '25' });
      if (authFilter !== 'all') params.set('eventType', authFilter);
      const res = await fetch(`/api/admin/auth-events?${params}`, { headers });
      const data = await res.json();
      setAuthEvents(data.events || []);
      setAuthTotal(data.total || 0);
    } catch (e) {}
  }, [authPage, authFilter, getHeaders]);

  const fetchAuditLog = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const params = new URLSearchParams({ page: auditPage.toString(), limit: '25' });
      if (auditFilter !== 'all') params.set('entityType', auditFilter);
      const res = await fetch(`/api/admin/audit-log?${params}`, { headers });
      const data = await res.json();
      setAuditLog(data.logs || []);
      setAuditTotal(data.total || 0);
    } catch (e) {}
  }, [auditPage, auditFilter, getHeaders]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchActiveUsers(), fetchAuthEvents(), fetchAuditLog()]);
    setRefreshing(false);
  }, [fetchStats, fetchActiveUsers, fetchAuthEvents, fetchAuditLog]);

  useEffect(() => {
    setLoading(true);
    refreshAll().then(() => setLoading(false));
    const interval = setInterval(() => {
      fetchActiveUsers();
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchAuthEvents();
  }, [authPage, authFilter]);

  useEffect(() => {
    fetchAuditLog();
  }, [auditPage, auditFilter]);

  const handleExport = async (reportType: string, format: string) => {
    try {
      const headers = await getHeaders();

      if (format === 'csv') {
        const res = await fetch(`/api/admin/reports/export?type=${reportType}&format=csv`, { headers });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        const res = await fetch(`/api/admin/reports/export?type=${reportType}&format=json`, { headers });
        const data = await res.json();

        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');

        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(16);
        doc.text(data.title || reportType, 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

        const tableData = data.rows.map((row: any) =>
          data.keys.map((key: string) => String(row[key] ?? ''))
        );

        autoTable(doc, {
          head: [data.headers],
          body: tableData,
          startY: 35,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
        });

        doc.save(`${reportType}-${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (e) {
      console.error('Export error:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor users, activity, and system events in real-time</p>
        </div>
        <Button onClick={refreshAll} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.activeUsersCount || 0}</div>
            <p className="text-xs text-muted-foreground">Currently online</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
            <LogIn className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLogins || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
            <UserPlus className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSignups || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Changes</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recentChanges || 0}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active-users" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active-users">
            <Monitor className="h-4 w-4 mr-2" />
            Active Users ({activeUsers.length})
          </TabsTrigger>
          <TabsTrigger value="auth-events">
            <LogIn className="h-4 w-4 mr-2" />
            Auth Events
          </TabsTrigger>
          <TabsTrigger value="audit-log">
            <Activity className="h-4 w-4 mr-2" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active-users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Real-Time Active Users</CardTitle>
                  <CardDescription>Users who have been active in the last 5 minutes</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExport('active-users', 'csv')}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport('active-users', 'pdf')}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activeUsers.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No active users right now</div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {activeUsers.map((u) => (
                      <div key={u.firebase_uid} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                          <div>
                            <p className="font-medium text-sm">{u.display_name || 'Unknown User'}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <span>{u.current_page || '/'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{timeAgo(u.last_heartbeat)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth-events">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Authentication Events</CardTitle>
                  <CardDescription>All login, signup, and logout activity ({authTotal} total)</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={authFilter} onValueChange={(v) => { setAuthFilter(v); setAuthPage(1); }}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      <SelectItem value="login">Logins</SelectItem>
                      <SelectItem value="signup">Signups</SelectItem>
                      <SelectItem value="logout">Logouts</SelectItem>
                      <SelectItem value="login_failed">Failed Logins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => handleExport('auth-events', 'csv')}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport('auth-events', 'pdf')}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {authEvents.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No authentication events recorded yet</div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {authEvents.map((e) => (
                      <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          {getEventBadge(e.event_type)}
                          <div>
                            <p className="font-medium text-sm">{e.display_name || e.email || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{e.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{e.ip_address}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(e.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {authTotal > 25 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {authPage} of {Math.ceil(authTotal / 25)}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={authPage <= 1} onClick={() => setAuthPage(p => p - 1)}>
                      Previous
                    </Button>
                    <Button size="sm" variant="outline" disabled={authPage >= Math.ceil(authTotal / 25)} onClick={() => setAuthPage(p => p + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-log">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Audit Log</CardTitle>
                  <CardDescription>All changes and updates across the system ({auditTotal} total)</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={auditFilter} onValueChange={(v) => { setAuditFilter(v); setAuditPage(1); }}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="ledger">Ledger</SelectItem>
                      <SelectItem value="voucher">Voucher</SelectItem>
                      <SelectItem value="settings">Settings</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => handleExport('audit-log', 'csv')}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport('audit-log', 'pdf')}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {auditLog.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No audit entries recorded yet</div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {auditLog.map((entry) => (
                      <div key={entry.id} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{entry.action}</Badge>
                            <Badge variant="secondary">{entry.entity_type}</Badge>
                            <span className="text-sm font-medium">{entry.entity_name || entry.entity_id || '-'}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">by {entry.email || 'Unknown'}</span>
                        </div>
                        {entry.changes && Object.keys(entry.changes).length > 0 && (
                          <div className="mt-2 p-2 rounded bg-muted text-xs font-mono whitespace-pre-wrap max-h-24 overflow-auto">
                            {JSON.stringify(entry.changes, null, 2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {auditTotal > 25 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {auditPage} of {Math.ceil(auditTotal / 25)}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={auditPage <= 1} onClick={() => setAuditPage(p => p - 1)}>
                      Previous
                    </Button>
                    <Button size="sm" variant="outline" disabled={auditPage >= Math.ceil(auditTotal / 25)} onClick={() => setAuditPage(p => p + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Downloadable Reports</CardTitle>
              <CardDescription>Generate and download reports in Excel (CSV) or PDF format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <LogIn className="h-5 w-5 text-blue-600" />
                      Authentication Report
                    </CardTitle>
                    <CardDescription>All login, signup, and logout events with timestamps and IP addresses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button className="flex-1" variant="outline" onClick={() => handleExport('auth-events', 'csv')}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (CSV)
                      </Button>
                      <Button className="flex-1" variant="outline" onClick={() => handleExport('auth-events', 'pdf')}>
                        <FileText className="h-4 w-4 mr-2" /> PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-orange-600" />
                      Audit Log Report
                    </CardTitle>
                    <CardDescription>All system changes, updates, and modifications with user details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button className="flex-1" variant="outline" onClick={() => handleExport('audit-log', 'csv')}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (CSV)
                      </Button>
                      <Button className="flex-1" variant="outline" onClick={() => handleExport('audit-log', 'pdf')}>
                        <FileText className="h-4 w-4 mr-2" /> PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      Active Users Report
                    </CardTitle>
                    <CardDescription>Snapshot of currently active users with session details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button className="flex-1" variant="outline" onClick={() => handleExport('active-users', 'csv')}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (CSV)
                      </Button>
                      <Button className="flex-1" variant="outline" onClick={() => handleExport('active-users', 'pdf')}>
                        <FileText className="h-4 w-4 mr-2" /> PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {stats?.topUsers && stats.topUsers.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="font-semibold mb-3">Top Users (Last 30 Days)</h3>
                    <div className="space-y-2">
                      {stats.topUsers.map((u, i) => (
                        <div key={u.email} className="flex items-center justify-between p-2 rounded border">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-muted-foreground w-6">#{i + 1}</span>
                            <span className="text-sm">{u.email}</span>
                          </div>
                          <Badge variant="secondary">{u.login_count} logins</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
