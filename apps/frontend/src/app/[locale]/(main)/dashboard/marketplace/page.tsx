"use client";

import { useState, useEffect } from "react";
import { Search, ShoppingCart, Clock, Users, Award, BookOpen, BarChart3, Check, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "sonner";

import { useTranslations } from "@/components/intl-provider";
import { useAuth } from "@/hooks/use-auth";
import { marketplaceApi, paymentApi } from "@/lib/api/marketplace";
import { coursesApi } from "@/lib/api/courses";
import {
  MarketplaceCourse,
  LicenseType,
  CourseLevel,
  LicenseOption,
  UserRole,
} from "@repo/shared";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

export default function MarketplacePage() {
  const t = useTranslations();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const [courses, setCourses] = useState<MarketplaceCourse[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  
  // Purchase dialog state
  const [selectedCourse, setSelectedCourse] = useState<MarketplaceCourse | null>(null);
  const [selectedLicenseOption, setSelectedLicenseOption] = useState<LicenseOption | null>(null);
  const [seatCount, setSeatCount] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());

  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;
  const [hasFetched, setHasFetched] = useState(false);

  // Wait for authentication before fetching data
  useEffect(() => {
    if (!isAuthLoading && !hasFetched) {
      setHasFetched(true);
      fetchCourses();
      fetchCategories();
    }
  }, [isAuthLoading, hasFetched]);

  // Re-fetch when filters change (only after initial fetch)
  useEffect(() => {
    if (hasFetched) {
      fetchCourses();
    }
  }, [selectedCategory, selectedLevel, searchQuery]);

  // Fetch user's enrollments to check which courses they're already enrolled in
  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!user || isAuthLoading) return;
      try {
        const enrollments = await coursesApi.getMyEnrollments();
        const courseIds = new Set(enrollments.map(e => e.courseId));
        setEnrolledCourseIds(courseIds);
      } catch (error) {
        console.error("Failed to fetch enrollments:", error);
      }
    };
    fetchEnrollments();
  }, [user, isAuthLoading]);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const data = await marketplaceApi.getPublishedCourses({
        category: selectedCategory || undefined,
        level: selectedLevel || undefined,
        search: searchQuery || undefined,
      });
      setCourses(data.courses);
    } catch (error) {
      console.error("Failed to fetch courses:", error);
      toast.error(t("marketplace.failedToLoadCourses"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await marketplaceApi.getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handlePurchase = async () => {
    if (!selectedCourse) return;

    setIsPurchasing(true);
    try {
      // For regular users (non-admins), always use SEAT license with 1 seat
      const licenseType = isAdmin && selectedLicenseOption 
        ? selectedLicenseOption.type 
        : LicenseType.SEAT;
      const seats = isAdmin && selectedLicenseOption?.type === LicenseType.SEAT 
        ? seatCount 
        : 1;

      const response = await paymentApi.createCheckoutSession({
        marketplaceCourseId: selectedCourse.id,
        licenseType: licenseType,
        seatCount: licenseType === LicenseType.SEAT ? seats : undefined,
      });

      if (response.isFree) {
        toast.success(t("marketplace.freeCourseAdded"));
        setSelectedCourse(null);
        return;
      }

      // Redirect to Stripe Checkout
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error: any) {
      console.error("Failed to create checkout:", error);
      toast.error(error.message || t("marketplace.purchaseFailed"));
    } finally {
      setIsPurchasing(false);
    }
  };

  const openPurchaseDialog = (course: MarketplaceCourse) => {
    setSelectedCourse(course);
    setSelectedLicenseOption(course.licenseOptions[0] || null);
    setSeatCount(course.licenseOptions[0]?.seatCount || 1);
  };

  // Check if user is enrolled in a course (by sourceCourseId)
  const isEnrolledInCourse = (course: MarketplaceCourse): boolean => {
    if (!course.sourceCourseId) return false;
    return enrolledCourseIds.has(course.sourceCourseId);
  };

  // Direct enrollment (for superadmins or free courses)
  const handleDirectEnroll = async (course: MarketplaceCourse) => {
    if (!course.sourceCourseId) {
      toast.error(t("marketplace.courseNotAvailable"));
      return;
    }

    // Double check - don't allow enrollment if already enrolled
    if (isEnrolledInCourse(course)) {
      toast.info(t("marketplace.alreadyEnrolled"));
      return;
    }

    setIsEnrolling(true);
    try {
      await coursesApi.enrollInCourse(course.sourceCourseId);
      // Add the course to enrolled list immediately
      setEnrolledCourseIds(prev => new Set([...prev, course.sourceCourseId!]));
      toast.success(t("marketplace.enrolledSuccessfully"));
    } catch (error: any) {
      console.error("Failed to enroll:", error);
      // Handle "already enrolled" as a success case
      if (error.message?.toLowerCase().includes("already enrolled")) {
        // Update the enrolled list since they are enrolled
        setEnrolledCourseIds(prev => new Set([...prev, course.sourceCourseId!]));
        toast.info(t("marketplace.alreadyEnrolled"));
      } else {
        toast.error(error.message || t("marketplace.enrollmentFailed"));
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getLevelColor = (level: CourseLevel) => {
    switch (level) {
      case CourseLevel.BEGINNER:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case CourseLevel.INTERMEDIATE:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case CourseLevel.ADVANCED:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getLicenseTypeLabel = (type: LicenseType) => {
    switch (type) {
      case LicenseType.SEAT:
        return t("marketplace.perSeatLicense");
      case LicenseType.UNLIMITED:
        return t("marketplace.unlimitedLicense");
      case LicenseType.TIME_LIMITED:
        return t("marketplace.timeLimitedLicense");
      default:
        return type;
    }
  };

  // Format duration with translation
  const formatDuration = (hours: number) => {
    if (!hours || hours === 0) return "-";
    const rounded = Math.round(hours);
    if (rounded === 1) return `1 ${t("common.hour")}`;
    return `${rounded} ${t("common.hours")}`;
  };

  const calculateTotalPrice = () => {
    if (!selectedLicenseOption) return 0;
    if (selectedLicenseOption.type === LicenseType.SEAT) {
      return selectedLicenseOption.price * seatCount;
    }
    return selectedLicenseOption.price;
  };

  // Check if user has admin access (can purchase licenses for organization)
  const isAdmin = user?.role === "SUPERADMIN" || user?.role === "ADMIN";

  if (isAuthLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">{t("common.accessDenied")}</h2>
        <p className="text-muted-foreground mt-2">{t("auth.loginToAccount")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("marketplace.title")}</h1>
        <p className="text-muted-foreground">{t("marketplace.description")}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("marketplace.searchCourses")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder={t("marketplace.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("marketplace.allCategories")}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedLevel || "all"} onValueChange={(v) => setSelectedLevel(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder={t("marketplace.allLevels")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("marketplace.allLevels")}</SelectItem>
            <SelectItem value={CourseLevel.BEGINNER}>{t("courses.beginner")}</SelectItem>
            <SelectItem value={CourseLevel.INTERMEDIATE}>{t("courses.intermediate")}</SelectItem>
            <SelectItem value={CourseLevel.ADVANCED}>{t("courses.advanced")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <p className="text-muted-foreground">{t("marketplace.noCoursesFound")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div 
              key={course.id} 
              className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg"
            >
              {/* Course Thumbnail Image */}
              <div className="relative h-48 w-full overflow-hidden bg-muted">
                {course.thumbnailUrl ? (
                  <Image
                    src={course.thumbnailUrl}
                    alt={course.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <BookOpen className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                {/* Free badge */}
                {course.isFree && (
                  <Badge className="absolute top-2 right-2 bg-green-500 text-white">
                    {t("marketplace.free")}
                  </Badge>
                )}
                {/* Certificate badge */}
                {course.includesCertificate && !course.isFree && (
                  <Badge className="absolute top-2 right-2 bg-blue-500 text-white">
                    <Award className="h-3 w-3 mr-1" />
                    {t("courses.certificate")}
                  </Badge>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-6">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <Link 
                    href={`/dashboard/courses/${course.sourceCourseId}`}
                    className="line-clamp-2 text-lg font-semibold hover:text-primary hover:underline transition-colors"
                  >
                    {course.title}
                  </Link>
                  <Badge className={getLevelColor(course.level)} variant="secondary">
                    {course.level}
                  </Badge>
                </div>

                <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">{course.description}</p>

                <div className="text-muted-foreground mb-4 flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDuration(course.durationHours)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>{course.totalEnrollments} {t("courses.students")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{course.lessonsCount} {t("courses.lessons")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span>{course.quizzesCount} {t("courses.quizzes")}</span>
                  </div>
                </div>

                {course.category && (
                  <div className="mb-4">
                    <Badge variant="outline" className="text-xs">{course.category}</Badge>
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between pt-4 border-t">
                  <div>
                    {isSuperAdmin ? (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                        {t("marketplace.freeAccess")}
                      </Badge>
                    ) : course.isFree ? (
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {t("marketplace.free")}
                      </span>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground">{t("marketplace.from")}</p>
                        <span className="text-lg font-bold">
                          {formatPrice(course.basePrice, course.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* View Course button - for all users to see course details */}
                    <Button 
                      size="sm" 
                      variant="outline"
                      asChild
                    >
                      <Link href={`/dashboard/courses/${course.sourceCourseId}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        {t("marketplace.viewCourse")}
                      </Link>
                    </Button>
                    {/* Already enrolled - show Enrolled badge */}
                    {isEnrolledInCourse(course) ? (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        disabled
                        className="cursor-not-allowed opacity-60"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {t("marketplace.enrolled")}
                      </Button>
                    ) : isSuperAdmin ? (
                      // SuperAdmin: Direct enroll for any course
                      <Button 
                        size="sm" 
                        onClick={() => handleDirectEnroll(course)}
                        disabled={isEnrolling}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        {isEnrolling ? t("common.loading") : t("marketplace.enroll")}
                      </Button>
                    ) : isAdmin ? (
                      // Admin: Can purchase licenses for organization
                      <Button size="sm" onClick={() => openPurchaseDialog(course)}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {course.isFree ? t("marketplace.getForFree") : t("marketplace.purchase")}
                      </Button>
                    ) : course.isFree ? (
                      // Regular user + Free course: Direct enroll
                      <Button 
                        size="sm" 
                        onClick={() => handleDirectEnroll(course)}
                        disabled={isEnrolling}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        {isEnrolling ? t("common.loading") : t("marketplace.getForFree")}
                      </Button>
                    ) : (
                      // Regular user + Paid course: Buy course
                      <Button size="sm" onClick={() => openPurchaseDialog(course)}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {t("marketplace.buyCourse")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Dialog */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("marketplace.purchaseCourse")}</DialogTitle>
            <DialogDescription>
              {selectedCourse?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedCourse && (
            <div className="space-y-6 py-4">
              {/* Course details summary */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(selectedCourse.durationHours)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{selectedCourse.lessonsCount} {t("courses.lessons")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  <span>{selectedCourse.quizzesCount} {t("courses.quizzes")}</span>
                </div>
                {selectedCourse.includesCertificate && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <Award className="h-4 w-4" />
                    <span>{t("courses.certificate")}</span>
                  </div>
                )}
              </div>

              {selectedCourse.isFree ? (
                <p className="text-center text-green-600 dark:text-green-400 font-medium">
                  {isAdmin ? t("marketplace.freeForOrganization") : t("marketplace.freeForYou")}
                </p>
              ) : isAdmin ? (
                <>
                  {/* License Type Selection - Only for Admins */}
                  <div className="space-y-3">
                    <Label>{t("marketplace.selectLicenseType")}</Label>
                    <RadioGroup
                      value={selectedLicenseOption?.type}
                      onValueChange={(value) => {
                        const option = selectedCourse.licenseOptions.find(
                          (o) => o.type === value
                        );
                        setSelectedLicenseOption(option || null);
                        if (option?.seatCount) {
                          setSeatCount(option.seatCount);
                        }
                      }}
                    >
                      {selectedCourse.licenseOptions.map((option) => (
                        <div
                          key={option.type}
                          className="flex items-center space-x-3 rounded-lg border p-4"
                        >
                          <RadioGroupItem value={option.type} id={option.type} />
                          <Label htmlFor={option.type} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{getLicenseTypeLabel(option.type)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {option.type === LicenseType.SEAT && t("marketplace.seatDescription")}
                                  {option.type === LicenseType.UNLIMITED && t("marketplace.unlimitedDescription")}
                                  {option.type === LicenseType.TIME_LIMITED && 
                                    t("marketplace.timeLimitedDescription", { months: option.durationMonths })}
                                </p>
                                {option.isSubscription && (
                                  <Badge variant="outline" className="mt-1">
                                    {t("marketplace.subscription")}
                                  </Badge>
                                )}
                              </div>
                              <span className="font-bold">
                                {formatPrice(option.price, selectedCourse.currency)}
                                {option.type === LicenseType.SEAT && `/${t("marketplace.seat")}`}
                                {option.isSubscription && `/${t("marketplace.month")}`}
                              </span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Seat Count (for seat-based licenses) */}
                  {selectedLicenseOption?.type === LicenseType.SEAT && (
                    <div className="space-y-3">
                      <Label>{t("marketplace.numberOfSeats")}</Label>
                      <Input
                        type="number"
                        min={selectedLicenseOption.seatCount || 1}
                        value={seatCount}
                        onChange={(e) => setSeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <p className="text-sm text-muted-foreground">
                        {t("marketplace.minimumSeats", { min: selectedLicenseOption.seatCount || 1 })}
                      </p>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>{t("marketplace.total")}</span>
                      <span>{formatPrice(calculateTotalPrice(), selectedCourse.currency)}</span>
                    </div>
                    {selectedLicenseOption?.isSubscription && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("marketplace.billedMonthly")}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                /* Regular user purchasing course - show price and buy option */
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">{t("marketplace.personalAccess")}</p>
                    <div className="text-3xl font-bold">
                      {formatPrice(selectedCourse.basePrice, selectedCourse.currency)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("marketplace.oneTimePurchase")}
                    </p>
                  </div>
                  <div className="border-t pt-4">
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {t("marketplace.fullCourseAccess")}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {t("marketplace.lifetimeAccess")}
                      </li>
                      {selectedCourse.includesCertificate && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          {t("marketplace.certificateIncluded")}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCourse(null)}>
              {t("common.cancel")}
            </Button>
            {selectedCourse?.isFree ? (
              <Button 
                onClick={() => {
                  handleDirectEnroll(selectedCourse);
                  setSelectedCourse(null);
                }} 
                disabled={isEnrolling}
              >
                {isEnrolling ? t("common.loading") : t("marketplace.enrollNow")}
              </Button>
            ) : (
              <Button onClick={handlePurchase} disabled={isPurchasing}>
                {isPurchasing ? t("marketplace.processing") : t("marketplace.proceedToPayment")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

