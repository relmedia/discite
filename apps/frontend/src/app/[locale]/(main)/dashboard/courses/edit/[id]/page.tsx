"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Award, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { coursesApi } from "@/lib/api/courses";
import { certificatesApi, CertificateTemplate } from "@/lib/api/certificates";
import { marketplaceAdminApi } from "@/lib/api/marketplace";
import { toast } from "sonner";
import { CourseLevel, LicenseType, LicenseOption, MarketplaceCourse, MarketplaceCourseStatus } from "@repo/shared";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/components/intl-provider";

const CATEGORIES = [
  "Energiteknik",
  "Fallskyddsutbildningar",
  "Heta arbeten",
  "Liftutbildning",
  "Säkra lyft utbildningar",
  "Travers och minikran",
  "Truck och maskinutbildning",
];

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "SEK", label: "SEK (kr)" },
  { value: "NOK", label: "NOK (kr)" },
  { value: "GBP", label: "GBP (£)" },
];

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { user, isLoading: isAuthLoading } = useAuth();
  const t = useTranslations();
  
  // Check if current user is a superadmin
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    level: CourseLevel.BEGINNER,
    durationHours: "",
    thumbnailUrl: "",
    tags: "",
    // Certificate settings
    enableCertificate: false,
    certificateTemplateId: "",
    certificateExpiryMonths: "",
    includeGradeOnCertificate: false,
  });

  // Marketplace fields
  const [marketplaceCourse, setMarketplaceCourse] = useState<MarketplaceCourse | null>(null);
  const [listOnMarketplace, setListOnMarketplace] = useState(false);
  const [category, setCategory] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isFree, setIsFree] = useState(false);
  const [includesCertificate, setIncludesCertificate] = useState(false);
  const [licenseOptions, setLicenseOptions] = useState<LicenseOption[]>([
    { type: LicenseType.SEAT, price: 0, seatCount: 1, isSubscription: false },
  ]);

  // Redirect non-superadmins (but not if user is logged out)
  useEffect(() => {
    if (!isAuthLoading && !user) {
      return; // Let middleware handle redirect for logged out users
    }
    if (!isAuthLoading && !isSuperAdmin) {
      toast.error(t('common.noPermission'));
      router.push('/dashboard/courses/all');
    }
  }, [isAuthLoading, isSuperAdmin, user, router, t]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCourse();
      fetchTemplates();
      fetchMarketplaceCourse();
    }
  }, [courseId, isSuperAdmin]);

  const fetchCourse = async () => {
    try {
      setIsLoading(true);
      const course = await coursesApi.getCourseById(courseId);
      setFormData({
        title: course.title,
        description: course.description,
        level: course.level,
        durationHours: course.durationHours?.toString() || "",
        thumbnailUrl: course.thumbnailUrl || "",
        tags: course.tags.join(", "),
        // Certificate settings
        enableCertificate: course.enableCertificate || false,
        certificateTemplateId: course.certificateTemplateId || "",
        certificateExpiryMonths: course.certificateExpiryMonths?.toString() || "",
        includeGradeOnCertificate: course.includeGradeOnCertificate || false,
      });
    } catch (error: any) {
      toast.error(error.message || t("courses.failedToFetch"));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await certificatesApi.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Failed to load certificate templates:", error);
    }
  };

  const fetchMarketplaceCourse = async () => {
    try {
      const mpCourse = await marketplaceAdminApi.getCourseBySourceId(courseId);
      if (mpCourse) {
        setMarketplaceCourse(mpCourse);
        setListOnMarketplace(true);
        setCategory(mpCourse.category || "");
        setBasePrice(mpCourse.basePrice ? Math.floor(mpCourse.basePrice).toString() : "0");
        setCurrency(mpCourse.currency || "USD");
        setIsFree(mpCourse.isFree || false);
        setIncludesCertificate(mpCourse.includesCertificate || false);
        setLicenseOptions(mpCourse.licenseOptions?.length > 0 
          ? mpCourse.licenseOptions 
          : [{ type: LicenseType.SEAT, price: 0, seatCount: 1, isSubscription: false }]
        );
      }
    } catch (error) {
      // Marketplace course doesn't exist, that's fine
      console.log("No marketplace course found for this course");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate marketplace fields if listing on marketplace
    if (listOnMarketplace && !isFree) {
      if (!basePrice || parseFloat(basePrice) <= 0) {
        toast.error(t("courses.priceRequired"));
        return;
      }
      if (licenseOptions.length === 0) {
        toast.error(t("courses.licenseOptionsRequired"));
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const tags = formData.tags
        ? formData.tags.split(",").map((t) => t.trim())
        : [];

      // Update the course
      await coursesApi.updateCourse(courseId, {
        title: formData.title,
        description: formData.description,
        level: formData.level,
        durationHours: formData.durationHours ? parseFloat(formData.durationHours) : undefined,
        thumbnailUrl: formData.thumbnailUrl,
        tags,
        // Certificate settings
        enableCertificate: formData.enableCertificate,
        certificateTemplateId: formData.certificateTemplateId || undefined,
        certificateExpiryMonths: formData.certificateExpiryMonths 
          ? parseInt(formData.certificateExpiryMonths) 
          : undefined,
        includeGradeOnCertificate: formData.includeGradeOnCertificate,
      });

      // Handle marketplace course
      if (listOnMarketplace) {
        const marketplaceData = {
          title: formData.title,
          description: formData.description,
          thumbnailUrl: formData.thumbnailUrl || undefined,
          durationHours: formData.durationHours ? parseFloat(formData.durationHours) : 0,
          level: formData.level,
          tags,
          category: category || undefined,
          basePrice: isFree ? 0 : parseFloat(basePrice) || 0,
          currency,
          isFree,
          licenseOptions: isFree ? [] : licenseOptions,
          includesCertificate,
        };

        if (marketplaceCourse) {
          // Update existing marketplace course
          await marketplaceAdminApi.updateCourse(marketplaceCourse.id, marketplaceData);
        } else {
          // Create new marketplace course
          await marketplaceAdminApi.createCourse({
            ...marketplaceData,
            sourceCourseId: courseId,
          });
        }
      }

      toast.success(t("courses.courseUpdatedSuccess") || "Course updated successfully!");
      router.push("/dashboard/courses/all");
    } catch (error: any) {
      toast.error(error.message || t("courses.failedToUpdate") || "Failed to update course. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addLicenseOption = () => {
    setLicenseOptions([
      ...licenseOptions,
      { type: LicenseType.UNLIMITED, price: 0, isSubscription: false },
    ]);
  };

  const removeLicenseOption = (index: number) => {
    setLicenseOptions(licenseOptions.filter((_, i) => i !== index));
  };

  const updateLicenseOption = (index: number, updates: Partial<LicenseOption>) => {
    setLicenseOptions(
      licenseOptions.map((option, i) =>
        i === index ? { ...option, ...updates } : option
      )
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Course</h1>
        <p className="text-muted-foreground mt-2">
          Update course information and settings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Course Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Introduction to Web Development"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              required
              minLength={5}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 5 characters, maximum 200 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what students will learn in this course..."
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              required
              minLength={20}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 20 characters. Be descriptive and engaging.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Difficulty Level *</Label>
              <Select
                value={formData.level}
                onValueChange={(value) =>
                  handleChange("level", value as CourseLevel)
                }
              >
                <SelectTrigger id="level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CourseLevel.BEGINNER}>Beginner</SelectItem>
                  <SelectItem value={CourseLevel.INTERMEDIATE}>
                    Intermediate
                  </SelectItem>
                  <SelectItem value={CourseLevel.ADVANCED}>Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationHours">{t("courses.duration")} ({t("common.hours")})</Label>
              <Input
                id="durationHours"
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g., 8"
                value={formData.durationHours}
                onChange={(e) => handleChange("durationHours", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("courses.durationDescription") || "Total course duration in hours"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">Thumbnail URL (optional)</Label>
            <Input
              id="thumbnailUrl"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={formData.thumbnailUrl}
              onChange={(e) => handleChange("thumbnailUrl", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              URL to course thumbnail image (Unsplash or S3)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (optional)</Label>
            <Input
              id="tags"
              placeholder="React, JavaScript, Frontend, Web Development"
              value={formData.tags}
              onChange={(e) => handleChange("tags", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated tags for categorization
            </p>
          </div>
        </div>

        {/* Certificate Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              <CardTitle>{t("certificates.settings") || "Certificate Settings"}</CardTitle>
            </div>
            <CardDescription>
              {t("certificates.configureIssuance") || "Configure certificate issuance for course completion"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableCertificate">{t("certificates.enable") || "Enable Certificate"}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("certificates.enableDescription") || "Issue certificates when students complete this course"}
                </p>
              </div>
              <Switch
                id="enableCertificate"
                checked={formData.enableCertificate}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, enableCertificate: checked }))
                }
              />
            </div>

            {formData.enableCertificate && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="certificateTemplateId">{t("certificates.template") || "Certificate Template"} *</Label>
                  <Select
                    value={formData.certificateTemplateId}
                    onValueChange={(value) => handleChange("certificateTemplateId", value)}
                  >
                    <SelectTrigger id="certificateTemplateId">
                      <SelectValue placeholder={t("certificates.selectTemplate") || "Select a template"} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} {template.isDefault && "(Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templates.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("certificates.noTemplates") || "No templates available."}{" "}
                      <a 
                        href="/dashboard/certificates/templates/new" 
                        className="text-primary underline"
                      >
                        {t("certificates.createOne") || "Create one"}
                      </a>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificateExpiryMonths">{t("certificates.validity") || "Certificate Validity (months)"}</Label>
                  <Input
                    id="certificateExpiryMonths"
                    type="number"
                    min="0"
                    placeholder={t("certificates.noExpiry") || "Leave empty for no expiry"}
                    value={formData.certificateExpiryMonths}
                    onChange={(e) => handleChange("certificateExpiryMonths", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("certificates.validityDescription") || "How long the certificate remains valid. Leave empty for certificates that never expire."}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="includeGradeOnCertificate">{t("certificates.includeGrade") || "Include Grade"}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("certificates.includeGradeDescription") || "Show final grade/score on the certificate"}
                    </p>
                  </div>
                  <Switch
                    id="includeGradeOnCertificate"
                    checked={formData.includeGradeOnCertificate}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, includeGradeOnCertificate: checked }))
                    }
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Marketplace Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("marketplace.listOnMarketplace")}</CardTitle>
                <CardDescription>{t("marketplace.listOnMarketplaceDescription")}</CardDescription>
              </div>
              <Switch
                checked={listOnMarketplace}
                onCheckedChange={setListOnMarketplace}
              />
            </div>
            {marketplaceCourse && (
              <div className="flex items-center gap-3 mt-4 p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">
                  ✓ {t("marketplace.alreadyListed")}
                </span>
                <Badge 
                  variant={marketplaceCourse.status === MarketplaceCourseStatus.PUBLISHED ? "default" : "secondary"}
                  className={marketplaceCourse.status === MarketplaceCourseStatus.PUBLISHED ? "bg-green-500" : ""}
                >
                  {marketplaceCourse.status === MarketplaceCourseStatus.PUBLISHED 
                    ? t("common.published")
                    : t("common.draft")}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {t("marketplace.publishedWithCourse") || "Status syncs with course publish/unpublish"}
                </span>
              </div>
            )}
          </CardHeader>

          {listOnMarketplace && (
            <CardContent className="space-y-6">
              {/* Category */}
              <div className="space-y-2">
                <Label>{t("marketplace.category")}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("marketplace.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Free Course Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>{t("marketplace.offerForFree")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("marketplace.offerForFreeDescription")}
                  </p>
                </div>
                <Switch checked={isFree} onCheckedChange={setIsFree} />
              </div>

              {/* Pricing (only if not free) */}
              {!isFree && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("marketplace.basePrice")} *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("marketplace.currency")}</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* License Options */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>{t("marketplace.licenseOptions")}</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addLicenseOption}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t("marketplace.addOption")}
                      </Button>
                    </div>

                    {licenseOptions.map((option, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>{t("marketplace.licenseType")}</Label>
                            {licenseOptions.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLicenseOption(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>

                          <Select
                            value={option.type}
                            onValueChange={(value) =>
                              updateLicenseOption(index, { type: value as LicenseType })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={LicenseType.SEAT}>
                                {t("marketplace.perSeatLicense")}
                              </SelectItem>
                              <SelectItem value={LicenseType.UNLIMITED}>
                                {t("marketplace.unlimitedLicense")}
                              </SelectItem>
                              <SelectItem value={LicenseType.TIME_LIMITED}>
                                {t("marketplace.timeLimitedLicense")}
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>{t("marketplace.price")}</Label>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={option.price}
                                onChange={(e) =>
                                  updateLicenseOption(index, {
                                    price: parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>

                            {option.type === LicenseType.SEAT && (
                              <div className="space-y-2">
                                <Label>{t("marketplace.minimumSeatsLabel")}</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={option.seatCount || 1}
                                  onChange={(e) =>
                                    updateLicenseOption(index, {
                                      seatCount: parseInt(e.target.value) || 1,
                                    })
                                  }
                                />
                              </div>
                            )}

                            {option.type === LicenseType.TIME_LIMITED && (
                              <div className="space-y-2">
                                <Label>{t("marketplace.durationMonths")}</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={option.durationMonths || 12}
                                  onChange={(e) =>
                                    updateLicenseOption(index, {
                                      durationMonths: parseInt(e.target.value) || 12,
                                    })
                                  }
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={option.isSubscription}
                              onCheckedChange={(checked) =>
                                updateLicenseOption(index, { isSubscription: checked })
                              }
                            />
                            <Label>{t("marketplace.recurringSubscription")}</Label>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* Certificate Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>{t("marketplace.includesCertificate")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("marketplace.includesCertificateDescription")}
                  </p>
                </div>
                <Switch
                  checked={includesCertificate}
                  onCheckedChange={setIncludesCertificate}
                />
              </div>
            </CardContent>
          )}
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("common.saving") : t("common.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
