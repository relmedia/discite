"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
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
import { coursesApi } from "@/lib/api/courses";
import { toast } from "sonner";
import { CourseLevel, LicenseType, LicenseOption } from "@repo/shared";
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

export default function CreateCoursePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const t = useTranslations();
  
  // Check if current user is a superadmin
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    level: CourseLevel.BEGINNER,
    durationHours: "",
    thumbnailUrl: "",
    tags: "",
  });

  // Marketplace fields
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
    if (!isLoading && !user) {
      return; // Let middleware handle redirect for logged out users
    }
    if (!isLoading && !isSuperAdmin) {
      toast.error(t('courses.noPermission'));
      router.push('/dashboard/courses/all');
    }
  }, [isLoading, isSuperAdmin, user, router, t]);

  // Don't render for non-superadmins
  if (isLoading || !isSuperAdmin) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error(t("courses.loginToCreate"));
      return;
    }

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
        ? formData.tags.split(",").map((tag) => tag.trim())
        : [];

      await coursesApi.createCourse({
        title: formData.title,
        description: formData.description,
        instructorId: user.id,
        level: formData.level,
        durationHours: formData.durationHours ? parseFloat(formData.durationHours) : undefined,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        tags,
        // Marketplace fields
        listOnMarketplace,
        category: listOnMarketplace ? category : undefined,
        basePrice: listOnMarketplace ? parseFloat(basePrice) || 0 : undefined,
        currency: listOnMarketplace ? currency : undefined,
        isFree: listOnMarketplace ? isFree : undefined,
        licenseOptions: listOnMarketplace && !isFree ? licenseOptions : undefined,
        includesCertificate: listOnMarketplace ? includesCertificate : undefined,
      });

      toast.success(t("courses.courseCreatedSuccess"));
      router.push("/dashboard/courses/all");
    } catch (error: any) {
      toast.error(error.message || t("courses.failedToCreate"));
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
    return <div>{t("common.loading")}</div>;
  }

  if (!user) {
    return <div>{t("courses.pleaseLoginToCreate")}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("courses.createCourse")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("courses.createNewCourse")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("courses.courseTitle")} *</Label>
            <Input
              id="title"
              placeholder={t("courses.courseTitlePlaceholder")}
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              required
              minLength={5}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {t("courses.minMaxChars")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("courses.description")} *</Label>
            <Textarea
              id="description"
              placeholder={t("courses.descriptionPlaceholder")}
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              required
              minLength={20}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {t("courses.descriptionHelper")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">{t("courses.difficultyLevel")} *</Label>
              <Select
                value={formData.level}
                onValueChange={(value) =>
                  handleChange("level", value as CourseLevel)
                }
              >
                <SelectTrigger id="level">
                  <SelectValue placeholder={t("courses.selectLevel")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CourseLevel.BEGINNER}>{t("courses.beginner")}</SelectItem>
                  <SelectItem value={CourseLevel.INTERMEDIATE}>
                    {t("courses.intermediate")}
                  </SelectItem>
                  <SelectItem value={CourseLevel.ADVANCED}>{t("courses.advanced")}</SelectItem>
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
            <Label htmlFor="thumbnailUrl">{t("courses.thumbnailUrl")} ({t("common.optional")})</Label>
            <Input
              id="thumbnailUrl"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={formData.thumbnailUrl}
              onChange={(e) => handleChange("thumbnailUrl", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("courses.thumbnailUrlHelper")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">{t("courses.tags")} ({t("common.optional")})</Label>
            <Input
              id="tags"
              placeholder={t("courses.tagsPlaceholder")}
              value={formData.tags}
              onChange={(e) => handleChange("tags", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("courses.tagsHelper")}
            </p>
          </div>
        </div>

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
            {isSubmitting ? t("courses.creating") : t("courses.createCourse")}
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
