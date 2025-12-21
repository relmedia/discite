'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/components/intl-provider';
import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import {
  Mail,
  Server,
  Bell,
  BarChart3,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  getEmailSettings,
  saveEmailSettings,
  verifyConnection,
  sendTestEmail,
  getEmailStats,
  getEmailLogs,
  EmailSettings,
  EmailStats,
  EmailLog,
  EmailStatus,
  EmailProvider,
  EMAIL_STATUS_LABELS,
} from '@/lib/api/email';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function EmailSettingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);

  // Provider selection
  const [provider, setProvider] = useState<EmailProvider>(EmailProvider.RESEND);

  // Resend settings
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromName, setResendFromName] = useState('');
  const [resendFromEmail, setResendFromEmail] = useState('');
  const [resendReplyTo, setResendReplyTo] = useState('');

  // SMTP settings
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpReplyTo, setSmtpReplyTo] = useState('');

  // Common settings
  const [isEnabled, setIsEnabled] = useState(true);
  const [testEmailAddress, setTestEmailAddress] = useState('');

  // Notification settings
  const [notifyCourseEnrolled, setNotifyCourseEnrolled] = useState(true);
  const [notifyCourseCompleted, setNotifyCourseCompleted] = useState(true);
  const [notifyQuizResult, setNotifyQuizResult] = useState(true);
  const [notifyCertificateIssued, setNotifyCertificateIssued] = useState(true);
  const [notifyLicenseAssigned, setNotifyLicenseAssigned] = useState(true);
  const [notifyNewMessage, setNotifyNewMessage] = useState(false);

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [settingsData, statsData, logsData] = await Promise.all([
          getEmailSettings(),
          getEmailStats(30),
          getEmailLogs({ limit: 10 }),
        ]);

        if (settingsData) {
          setSettings(settingsData);
          setProvider(settingsData.provider || EmailProvider.RESEND);
          setIsEnabled(settingsData.isEnabled);

          // Load Resend settings
          if (settingsData.resend) {
            setResendApiKey(settingsData.resend.apiKey || '');
            setResendFromName(settingsData.resend.fromName || '');
            setResendFromEmail(settingsData.resend.fromEmail || '');
            setResendReplyTo(settingsData.resend.replyToEmail || '');
          }

          // Load SMTP settings
          if (settingsData.smtp) {
            setSmtpHost(settingsData.smtp.host || '');
            setSmtpPort(settingsData.smtp.port || 587);
            setSmtpSecure(settingsData.smtp.secure || false);
            setSmtpUser(settingsData.smtp.auth?.user || '');
            setSmtpPass(settingsData.smtp.auth?.pass || '');
            setSmtpFromName(settingsData.smtp.fromName || '');
            setSmtpFromEmail(settingsData.smtp.fromEmail || '');
            setSmtpReplyTo(settingsData.smtp.replyToEmail || '');
          }

          if (settingsData.notificationSettings) {
            setNotifyCourseEnrolled(settingsData.notificationSettings.courseEnrolled);
            setNotifyCourseCompleted(settingsData.notificationSettings.courseCompleted);
            setNotifyQuizResult(settingsData.notificationSettings.quizResult);
            setNotifyCertificateIssued(settingsData.notificationSettings.certificateIssued);
            setNotifyLicenseAssigned(settingsData.notificationSettings.licenseAssigned);
            setNotifyNewMessage(settingsData.notificationSettings.newMessage);
          }
        }

        setStats(statsData);
        setLogs(logsData.logs);
      } catch (error) {
        console.error('Failed to load email settings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      const settingsPayload: any = {
        provider,
        isEnabled,
        notificationSettings: {
          courseEnrolled: notifyCourseEnrolled,
          courseCompleted: notifyCourseCompleted,
          quizResult: notifyQuizResult,
          certificateIssued: notifyCertificateIssued,
          licenseAssigned: notifyLicenseAssigned,
          newMessage: notifyNewMessage,
        },
      };

      if (provider === EmailProvider.RESEND) {
        settingsPayload.resend = {
          apiKey: resendApiKey.includes('••••') ? settings?.resend?.apiKey || '' : resendApiKey,
          fromName: resendFromName,
          fromEmail: resendFromEmail,
          replyToEmail: resendReplyTo || undefined,
        };
      } else {
        settingsPayload.smtp = {
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass.includes('••••') ? settings?.smtp?.auth?.pass || '' : smtpPass,
          },
          fromName: smtpFromName,
          fromEmail: smtpFromEmail,
          replyToEmail: smtpReplyTo || undefined,
        };
      }

      const savedSettings = await saveEmailSettings(settingsPayload);
      setSettings(savedSettings);
      toast.success('Email settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyConnection = async () => {
    try {
      setVerifying(true);
      const result = await verifyConnection();

      if (result.success) {
        toast.success('Connection verified successfully');
        const settingsData = await getEmailSettings();
        if (settingsData) setSettings(settingsData);
      } else {
        toast.error(result.error || 'Verification failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setSendingTest(true);
      const result = await sendTestEmail(testEmailAddress);

      if (result.success) {
        toast.success('Test email sent successfully');
      } else {
        toast.error(result.error || 'Failed to send test email');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  const getStatusBadge = (status: EmailStatus) => {
    const variants: Record<EmailStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      [EmailStatus.QUEUED]: { variant: 'secondary', icon: AlertCircle },
      [EmailStatus.SENDING]: { variant: 'secondary', icon: Loader2 },
      [EmailStatus.SENT]: { variant: 'default', icon: CheckCircle2 },
      [EmailStatus.DELIVERED]: { variant: 'default', icon: CheckCircle2 },
      [EmailStatus.OPENED]: { variant: 'default', icon: Eye },
      [EmailStatus.CLICKED]: { variant: 'default', icon: CheckCircle2 },
      [EmailStatus.BOUNCED]: { variant: 'destructive', icon: XCircle },
      [EmailStatus.FAILED]: { variant: 'destructive', icon: XCircle },
      [EmailStatus.UNSUBSCRIBED]: { variant: 'outline', icon: XCircle },
    };

    const config = variants[status] || { variant: 'secondary' as const, icon: AlertCircle };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {EMAIL_STATUS_LABELS[status]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="h-full p-4 md:p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Settings</h1>
          <p className="text-muted-foreground">
            Configure email provider and notification preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/settings/email/templates')}>
            <FileText className="mr-2 h-4 w-4" />
            Email Templates
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sent (30 days)</p>
                  <p className="text-2xl font-bold">{stats.sent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                  <p className="text-2xl font-bold">{stats.openRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Click Rate</p>
                  <p className="text-2xl font-bold">{stats.clickRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bounced/Failed</p>
                  <p className="text-2xl font-bold">{stats.bounced + stats.failed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="provider" className="space-y-4">
        <TabsList>
          <TabsTrigger value="provider" className="gap-2">
            <Mail className="h-4 w-4" />
            Email Provider
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="h-4 w-4" />
            Recent Logs
          </TabsTrigger>
        </TabsList>

        {/* Provider Settings Tab */}
        <TabsContent value="provider">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Provider Configuration</CardTitle>
                  <CardDescription>
                    Choose your email provider and configure the settings
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {settings?.isVerified ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Not Verified
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base font-medium">Enable Email Sending</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn on to start sending emails
                  </p>
                </div>
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              </div>

              {/* Provider Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Email Provider</Label>
                <RadioGroup
                  value={provider}
                  onValueChange={(v) => setProvider(v as EmailProvider)}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem value={EmailProvider.RESEND} id="resend" className="peer sr-only" />
                    <Label
                      htmlFor="resend"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Zap className="mb-3 h-6 w-6 text-orange-500" />
                      <span className="font-semibold">Resend</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        Recommended. Easy setup, handles SPF/DKIM automatically
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value={EmailProvider.SMTP} id="smtp" className="peer sr-only" />
                    <Label
                      htmlFor="smtp"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Server className="mb-3 h-6 w-6" />
                      <span className="font-semibold">Custom SMTP</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        Use your own SMTP server (requires DNS setup)
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Resend Settings */}
              {provider === EmailProvider.RESEND && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-orange-500" />
                    <h3 className="font-semibold">Resend Configuration</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get your API key from{' '}
                    <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      resend.com/api-keys
                    </a>
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="resendApiKey">API Key</Label>
                      <div className="relative">
                        <Input
                          id="resendApiKey"
                          type={showApiKey ? 'text' : 'password'}
                          value={resendApiKey}
                          onChange={(e) => setResendApiKey(e.target.value)}
                          placeholder="re_xxxxxxxxxx"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resendFromName">From Name</Label>
                      <Input
                        id="resendFromName"
                        value={resendFromName}
                        onChange={(e) => setResendFromName(e.target.value)}
                        placeholder="Discite"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resendFromEmail">From Email</Label>
                      <Input
                        id="resendFromEmail"
                        type="email"
                        value={resendFromEmail}
                        onChange={(e) => setResendFromEmail(e.target.value)}
                        placeholder="noreply@yourdomain.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be a verified domain in Resend
                      </p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="resendReplyTo">Reply-To Email (optional)</Label>
                      <Input
                        id="resendReplyTo"
                        type="email"
                        value={resendReplyTo}
                        onChange={(e) => setResendReplyTo(e.target.value)}
                        placeholder="support@yourdomain.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SMTP Settings */}
              {provider === EmailProvider.SMTP && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Server className="h-5 w-5" />
                    <h3 className="font-semibold">SMTP Configuration</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">SMTP Host</Label>
                      <Input
                        id="smtpHost"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">Port</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                        placeholder="587"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpUser">Username</Label>
                      <Input
                        id="smtpUser"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="your@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPass">Password</Label>
                      <div className="relative">
                        <Input
                          id="smtpPass"
                          type={showPassword ? 'text' : 'password'}
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          placeholder="••••••••"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpFromName">From Name</Label>
                      <Input
                        id="smtpFromName"
                        value={smtpFromName}
                        onChange={(e) => setSmtpFromName(e.target.value)}
                        placeholder="Discite"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpFromEmail">From Email</Label>
                      <Input
                        id="smtpFromEmail"
                        type="email"
                        value={smtpFromEmail}
                        onChange={(e) => setSmtpFromEmail(e.target.value)}
                        placeholder="noreply@yourdomain.com"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="smtpReplyTo">Reply-To Email (optional)</Label>
                      <Input
                        id="smtpReplyTo"
                        type="email"
                        value={smtpReplyTo}
                        onChange={(e) => setSmtpReplyTo(e.target.value)}
                        placeholder="support@yourdomain.com"
                      />
                    </div>
                    <div className="flex items-center space-x-2 md:col-span-2">
                      <Switch
                        id="smtpSecure"
                        checked={smtpSecure}
                        onCheckedChange={setSmtpSecure}
                      />
                      <Label htmlFor="smtpSecure">Use SSL/TLS (port 465)</Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Email */}
              <div className="p-4 border rounded-lg space-y-4">
                <Label>Test Your Configuration</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="Enter email to send test"
                    className="max-w-md"
                  />
                  <Button
                    variant="outline"
                    onClick={handleSendTestEmail}
                    disabled={sendingTest || (!resendApiKey && provider === EmailProvider.RESEND) || (!smtpHost && provider === EmailProvider.SMTP)}
                  >
                    {sendingTest ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send Test
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={handleVerifyConnection}
                  disabled={verifying || (!resendApiKey && provider === EmailProvider.RESEND) || (!smtpHost && provider === EmailProvider.SMTP)}
                >
                  {verifying ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Verify Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose which events should trigger email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Course Enrollment</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email when a user is enrolled in a course
                    </p>
                  </div>
                  <Switch checked={notifyCourseEnrolled} onCheckedChange={setNotifyCourseEnrolled} />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Course Completion</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email when a user completes a course
                    </p>
                  </div>
                  <Switch checked={notifyCourseCompleted} onCheckedChange={setNotifyCourseCompleted} />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Quiz Results</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email when a user completes a quiz
                    </p>
                  </div>
                  <Switch checked={notifyQuizResult} onCheckedChange={setNotifyQuizResult} />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Certificate Issued</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email when a certificate is issued
                    </p>
                  </div>
                  <Switch checked={notifyCertificateIssued} onCheckedChange={setNotifyCertificateIssued} />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base font-medium">License Assigned</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email when a user gets access to a course
                    </p>
                  </div>
                  <Switch checked={notifyLicenseAssigned} onCheckedChange={setNotifyLicenseAssigned} />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base font-medium">New Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email when a user receives a new message
                    </p>
                  </div>
                  <Switch checked={notifyNewMessage} onCheckedChange={setNotifyNewMessage} />
                </div>
              </div>

              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Email Logs</CardTitle>
              <CardDescription>
                View the latest email sending activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No emails sent yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{log.recipientEmail}</p>
                          {getStatusBadge(log.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{log.subject}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.createdAt), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/dashboard/settings/email/logs')}
                  >
                    View All Logs
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
