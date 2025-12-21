"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Eye, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { certificatesApi, CertificateTemplate, CertificateDesign, CreateCertificateTemplateDto, Certificate } from "@/lib/api/certificates";
import { CertificateRenderer } from "./certificate-renderer";
import { exportCertificateToPDF } from "@/lib/utils/pdf-export";

interface CertificateTemplateFormProps {
  template?: CertificateTemplate;
  isEditing?: boolean;
}

const defaultDesign: CertificateDesign = {
  backgroundColor: "#FFFFFF",
  primaryColor: "#000000",
  secondaryColor: "#333333",
  fontFamily: "serif",
  borderStyle: "simple",
  borderThickness: 4,
  borderColor: "#000000",
  layout: "classic",
};

const defaultBodyTemplate = `This is to certify that

{{studentName}}

has successfully completed the course

{{courseName}}

on {{completionDate}}`;

const fontOptions = [
  { value: "serif", label: "Serif (Classic)" },
  { value: "sans-serif", label: "Sans Serif (Modern)" },
  { value: "Georgia", label: "Georgia" },
  { value: "Palatino", label: "Palatino" },
  { value: "Times New Roman", label: "Times New Roman" },
];

const layoutOptions = [
  { value: "classic", label: "Classic - Traditional certificate look" },
  { value: "modern", label: "Modern - Clean and minimal" },
  { value: "minimal", label: "Minimal - Simple and elegant" },
  { value: "elegant", label: "Elegant - Decorative with flourishes" },
  { value: "swedish", label: "Swedish Professional - Official training certificate style" },
];

const borderOptions = [
  { value: "none", label: "None" },
  { value: "simple", label: "Simple Line" },
  { value: "ornate", label: "Ornate" },
  { value: "modern", label: "Modern" },
  { value: "all-around", label: "All Around" },
];

export function CertificateTemplateForm({ template, isEditing }: CertificateTemplateFormProps) {
  const router = useRouter();
  const certificateRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [formData, setFormData] = useState({
    name: template?.name || "",
    description: template?.description || "",
    titleText: template?.titleText || "Certificate of Completion",
    bodyTemplate: template?.bodyTemplate || defaultBodyTemplate,
    signatureText: template?.signatureText || "Course Instructor",
    signatureImageUrl: template?.signatureImageUrl || "",
    issuedByText: template?.issuedByText || "",
    isDefault: template?.isDefault || false,
  });

  const [design, setDesign] = useState<CertificateDesign>(template?.design || defaultDesign);

  const handleFormChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  
  // Handle both onChange and onInput for better compatibility with automation
  const handleInputEvent = (field: string, e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = (e.target as HTMLInputElement | HTMLTextAreaElement).value;
    handleFormChange(field, value);
  };

  const handleDesignChange = (field: keyof CertificateDesign, value: string | number) => {
    setDesign((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    // Use defaults if title/body are empty
    const titleText = formData.titleText.trim() || "Certificate of Completion";
    const bodyTemplate = formData.bodyTemplate.trim() || 
      "This is to certify that {{studentName}} has successfully completed the course {{courseName}} on {{completionDate}}.";

    setSaving(true);

    try {
      const data: CreateCertificateTemplateDto = {
        name: formData.name,
        description: formData.description || undefined,
        design,
        titleText,
        bodyTemplate,
        signatureText: formData.signatureText || undefined,
        signatureImageUrl: formData.signatureImageUrl || undefined,
        issuedByText: formData.issuedByText || undefined,
        isDefault: formData.isDefault,
      };

      if (isEditing && template) {
        await certificatesApi.updateTemplate(template.id, data);
        toast.success("Template updated successfully");
      } else {
        await certificatesApi.createTemplate(data);
        toast.success("Template created successfully");
      }

      router.push("/dashboard/certificates/templates");
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!certificateRef.current) {
      toast.error("Certificate element not found");
      return;
    }

    setExporting(true);
    try {
      const filename = `certificate-template-${formData.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      await exportCertificateToPDF(certificateRef.current, filename);
      toast.success("Certificate exported successfully");
    } catch (error) {
      toast.error("Failed to export certificate");
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const renderPreview = () => {
    // Create a mock certificate for preview using current form data
    const mockCertificate: Certificate = {
      id: "preview",
      tenantId: template?.tenantId || "",
      userId: "preview",
      courseId: "preview",
      templateId: template?.id || "",
      certificateNumber: "CERT-2024-001",
      studentName: "John Doe",
      courseName: "Introduction to Web Development",
      instructorName: "Jane Smith",
      completionDate: new Date().toISOString(),
      issueDate: new Date().toISOString(),
      isRevoked: false,
    };

    // Create template object from current form state
    const previewTemplate: CertificateTemplate = {
      id: template?.id || "",
      tenantId: template?.tenantId || "",
      name: formData.name,
      description: formData.description,
      design: design,
      titleText: formData.titleText,
      bodyTemplate: formData.bodyTemplate,
      signatureText: formData.signatureText,
      signatureImageUrl: formData.signatureImageUrl,
      issuedByText: formData.issuedByText,
      isDefault: formData.isDefault,
      isActive: true,
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return (
      <CertificateRenderer ref={certificateRef} certificate={mockCertificate} template={previewTemplate} />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Template" : "Create Template"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update your certificate template" : "Design a new certificate template"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? "Hide Preview" : "Preview"}
          </Button>
          {showPreview && (
            <Button 
              variant="outline" 
              onClick={handleExportPDF}
              disabled={exporting}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {exporting ? "Exporting..." : "Export PDF"}
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      <div className={`grid gap-6 ${showPreview ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
        {/* Form */}
        <div className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Template Information</CardTitle>
                  <CardDescription>Basic details about this template</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleFormChange("name", e.target.value)}
                      onInput={(e) => handleInputEvent("name", e)}
                      placeholder="e.g., Professional Certificate"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleFormChange("description", e.target.value)}
                      onInput={(e) => handleInputEvent("description", e)}
                      placeholder="Describe this template..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="isDefault">Set as Default</Label>
                      <p className="text-sm text-muted-foreground">
                        Use this template for new courses by default
                      </p>
                    </div>
                    <Switch
                      id="isDefault"
                      checked={formData.isDefault}
                      onCheckedChange={(checked) => handleFormChange("isDefault", checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Design Tab */}
            <TabsContent value="design" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Layout & Style</CardTitle>
                  <CardDescription>Choose the overall look of your certificate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Layout Style</Label>
                    <Select
                      value={design.layout}
                      onValueChange={(value) => {
                        handleDesignChange("layout", value as any);
                        // Auto-populate Swedish layout defaults
                        if (value === "swedish") {
                          setDesign((prev) => ({
                            ...prev,
                            layout: value as any,
                            backgroundColor: prev.backgroundColor || "#FFFFFF",
                            primaryColor: prev.primaryColor || "#000000",
                            secondaryColor: prev.secondaryColor || "#333333",
                            fontFamily: prev.fontFamily || "serif",
                            borderStyle: prev.borderStyle || "simple",
                          }));
                          if (!formData.titleText || formData.titleText === "Certificate of Completion") {
                            handleFormChange("titleText", "UTBILDNINGSBEVIS");
                          }
                          if (!formData.issuedByText) {
                            handleFormChange("issuedByText", "UTFÄRDAT AV");
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {layoutOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Border Style</Label>
                    <Select
                      value={design.borderStyle}
                      onValueChange={(value) => handleDesignChange("borderStyle", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {borderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {design.borderStyle !== "none" && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="borderThickness">Border Thickness</Label>
                          <span className="text-sm text-muted-foreground">
                            {design.borderThickness || 4}px
                          </span>
                        </div>
                        <div className="space-y-2">
                          <Slider
                            id="borderThickness"
                            value={[design.borderThickness || 4]}
                            onValueChange={(values) => handleDesignChange("borderThickness", values[0])}
                            min={1}
                            max={40}
                            step={1}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>1px</span>
                            <span>40px</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="borderColor">Border Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            id="borderColor"
                            value={design.borderColor || design.primaryColor || "#000000"}
                            onChange={(e) => handleDesignChange("borderColor", e.target.value)}
                            className="w-12 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={design.borderColor || design.primaryColor || "#000000"}
                            onChange={(e) => handleDesignChange("borderColor", e.target.value)}
                            className="flex-1"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Select
                      value={design.fontFamily}
                      onValueChange={(value) => handleDesignChange("fontFamily", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Colors</CardTitle>
                  <CardDescription>Customize the color scheme</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="backgroundColor">Background</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          id="backgroundColor"
                          value={design.backgroundColor}
                          onChange={(e) => handleDesignChange("backgroundColor", e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={design.backgroundColor}
                          onChange={(e) => handleDesignChange("backgroundColor", e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          id="primaryColor"
                          value={design.primaryColor}
                          onChange={(e) => handleDesignChange("primaryColor", e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={design.primaryColor}
                          onChange={(e) => handleDesignChange("primaryColor", e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondaryColor">Secondary</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          id="secondaryColor"
                          value={design.secondaryColor}
                          onChange={(e) => handleDesignChange("secondaryColor", e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={design.secondaryColor}
                          onChange={(e) => handleDesignChange("secondaryColor", e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Background Image</CardTitle>
                  <CardDescription>Add a background image to your certificate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="backgroundImageUrl">Background Image URL</Label>
                    <Input
                      id="backgroundImageUrl"
                      value={design.backgroundImageUrl || ""}
                      onChange={(e) => handleDesignChange("backgroundImageUrl", e.target.value)}
                      placeholder="https://example.com/background.png"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4">
              {/* Logo */}
              <Card>
                <CardHeader>
                  <CardTitle>Logo</CardTitle>
                  <CardDescription>Add your organization logo to the certificate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      value={design.logoUrl || ""}
                      onChange={(e) => handleDesignChange("logoUrl", e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Certificate Title */}
              <Card>
                <CardHeader>
                  <CardTitle>Certificate Title</CardTitle>
                  <CardDescription>The main heading of your certificate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titleText">Title *</Label>
                    <Input
                      id="titleText"
                      value={formData.titleText}
                      onChange={(e) => handleFormChange("titleText", e.target.value)}
                      onInput={(e) => handleInputEvent("titleText", e)}
                      placeholder="Certificate of Completion"
                    />
                  </div>

                  {/* Issued By Text (for Swedish layout) */}
                  {design.layout === "swedish" && (
                    <div className="space-y-2">
                      <Label htmlFor="issuedByText">Issued By Text</Label>
                      <Input
                        id="issuedByText"
                        value={formData.issuedByText}
                        onChange={(e) => handleFormChange("issuedByText", e.target.value)}
                        onInput={(e) => handleInputEvent("issuedByText", e)}
                        placeholder="e.g., UTFÄRDAT AV AUSAB FÖR"
                      />
                      <p className="text-sm text-muted-foreground">
                        Text that appears before the recipient name
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Body Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Body Content</CardTitle>
                  <CardDescription>The main content of your certificate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bodyTemplate">Body Template *</Label>
                    <Textarea
                      id="bodyTemplate"
                      value={formData.bodyTemplate}
                      onChange={(e) => handleFormChange("bodyTemplate", e.target.value)}
                      onInput={(e) => handleInputEvent("bodyTemplate", e)}
                      rows={8}
                      placeholder="Enter the certificate body text..."
                    />
                    <p className="text-sm text-muted-foreground">
                      Available placeholders: {"{{studentName}}"}, {"{{courseName}}"}, {"{{completionDate}}"}, {"{{instructorName}}"}, {"{{certificateNumber}}"}, {"{{personalNumber}}"}
                    </p>
                  </div>

                  {/* Show Personal Number (for Swedish layout) */}
                  {design.layout === "swedish" && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="showPersonalNumber">Show Personal Number</Label>
                        <p className="text-sm text-muted-foreground">
                          Display personal number field on certificate
                        </p>
                      </div>
                      <Switch
                        id="showPersonalNumber"
                        checked={design.showPersonalNumber || false}
                        onCheckedChange={(checked) => {
                          setDesign((prev) => ({ ...prev, showPersonalNumber: checked }));
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Compliance Text */}
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Text</CardTitle>
                  <CardDescription>Regulatory or compliance information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="complianceText">Compliance / Regulation Text</Label>
                    <Input
                      id="complianceText"
                      value={design.complianceText || ""}
                      onChange={(e) => handleDesignChange("complianceText", e.target.value)}
                      placeholder="e.g., I enlighet med AFS 2023:1, 2023:10, 2023:11"
                    />
                    <p className="text-sm text-muted-foreground">
                      Add any regulatory compliance references (optional)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Completion Date - this is auto-generated but we can add format options */}
              <Card>
                <CardHeader>
                  <CardTitle>Completion Date</CardTitle>
                  <CardDescription>Date format for when the course was completed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    The completion date is automatically generated using the {"{{completionDate}}"} placeholder in your body template.
                    Format: YYYY-MM-DD
                  </p>
                </CardContent>
              </Card>

              {/* Footer - Company Address */}
              <Card>
                <CardHeader>
                  <CardTitle>Footer - Company Information</CardTitle>
                  <CardDescription>Company details displayed at the bottom of the certificate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={design.companyName || ""}
                      onChange={(e) => handleDesignChange("companyName", e.target.value)}
                      placeholder="e.g., Arbetsutbildningar Sverige AB"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Company Address</Label>
                    <Textarea
                      id="companyAddress"
                      value={design.companyAddress || ""}
                      onChange={(e) => handleDesignChange("companyAddress", e.target.value)}
                      placeholder="e.g., Göteborg Analysvägen 7D, 435 33 Mölnlycke&#10;Borås Segloravägen 10, 504 64 Borås"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyContact">Company Contact</Label>
                    <Input
                      id="companyContact"
                      value={design.companyContact || ""}
                      onChange={(e) => handleDesignChange("companyContact", e.target.value)}
                      placeholder="e.g., info@ausab.se 031-788 23 40"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Signature */}
              <Card>
                <CardHeader>
                  <CardTitle>Signature</CardTitle>
                  <CardDescription>Add a signature section to your certificate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signatureText">Signature Label</Label>
                    <Input
                      id="signatureText"
                      value={formData.signatureText}
                      onChange={(e) => handleFormChange("signatureText", e.target.value)}
                      onInput={(e) => handleInputEvent("signatureText", e)}
                      placeholder="Course Instructor"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signatureImageUrl">Signature Image URL</Label>
                    <Input
                      id="signatureImageUrl"
                      value={formData.signatureImageUrl}
                      onChange={(e) => handleFormChange("signatureImageUrl", e.target.value)}
                      onInput={(e) => handleInputEvent("signatureImageUrl", e)}
                      placeholder="https://example.com/signature.png"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>See how your certificate will look</CardDescription>
              </CardHeader>
              <CardContent>{renderPreview()}</CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

