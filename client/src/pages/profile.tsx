import { useState, useEffect } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Edit3, Save, X, Camera, Mail, Calendar } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب").max(50, "الاسم طويل جداً"),
  age: z.coerce.number().min(1, "العمر يجب أن يكون أكبر من 0").max(120, "العمر غير صحيح").optional(),
  avatarUrl: z.string().url("رابط الصورة غير صحيح").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || "",
      age: profile?.age || undefined,
      avatarUrl: profile?.avatarUrl || "",
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name,
        age: profile.age || undefined,
        avatarUrl: profile.avatarUrl || "",
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile.mutateAsync(data);
      setIsEditing(false);
      toast({
        title: "تم التحديث بنجاح",
        description: "تم حفظ التغييرات في ملفك الشخصي",
      });
    } catch (error) {
      toast({
        title: "خطأ في التحديث",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    if (profile) {
      form.reset({
        name: profile.name,
        age: profile.age || undefined,
        avatarUrl: profile.avatarUrl || "",
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className={`min-h-screen pb-20 md:pb-0 transition-all duration-300 ${sidebarOpen ? 'md:mr-64 lg:mr-72' : ''}`}>
        <Header
          onToggleSidebar={() => setSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="p-4 max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold gradient-text" data-testid="profile-title">
                الملف الشخصي
              </h1>
            </div>
            <p className="text-muted-foreground">
              إدارة معلوماتك الشخصية وتفضيلاتك
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Skeleton className="w-24 h-24 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6 fade-in">
              {/* Profile Information Card */}
              <Card className="border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl" data-testid="profile-info-title">معلومات الملف الشخصي</CardTitle>
                  <Button
                    variant={isEditing ? "destructive" : "outline"}
                    size="sm"
                    onClick={isEditing ? handleCancel : () => setIsEditing(true)}
                    data-testid={isEditing ? "cancel-edit-button" : "edit-profile-button"}
                  >
                    {isEditing ? <X className="w-4 h-4 mr-1" /> : <Edit3 className="w-4 h-4 mr-1" />}
                    {isEditing ? "إلغاء" : "تعديل"}
                  </Button>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <Avatar className="w-24 h-24 border-4 border-primary">
                          <AvatarImage 
                            src={form.watch("avatarUrl") || profile?.avatarUrl || undefined} 
                            alt="صورة المستخدم" 
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                            <User className="w-10 h-10" />
                          </AvatarFallback>
                        </Avatar>
                        {isEditing && (
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full"
                            data-testid="change-avatar-button"
                          >
                            <Camera className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold" data-testid="profile-display-name">
                          {profile?.name}
                        </h2>
                        <div className="flex items-center gap-4 text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            <span data-testid="profile-email">{profile?.email}</span>
                          </div>
                          {profile?.age && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span data-testid="profile-age-display">{profile.age} سنة</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">الاسم</Label>
                        <Input
                          id="name"
                          {...form.register("name")}
                          disabled={!isEditing}
                          className="bg-input border-border"
                          data-testid="name-input"
                        />
                        {form.formState.errors.name && (
                          <p className="text-destructive text-sm" data-testid="name-error">
                            {form.formState.errors.name.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="age">العمر</Label>
                        <Input
                          id="age"
                          type="number"
                          {...form.register("age", { 
                            setValueAs: (value) => value ? parseInt(value) : undefined 
                          })}
                          disabled={!isEditing}
                          className="bg-input border-border"
                          data-testid="age-input"
                        />
                        {form.formState.errors.age && (
                          <p className="text-destructive text-sm" data-testid="age-error">
                            {form.formState.errors.age.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="avatarUrl">رابط الصورة الشخصية</Label>
                      <Input
                        id="avatarUrl"
                        {...form.register("avatarUrl")}
                        disabled={!isEditing}
                        placeholder="https://example.com/avatar.jpg"
                        className="bg-input border-border"
                        data-testid="avatar-url-input"
                      />
                      {form.formState.errors.avatarUrl && (
                        <p className="text-destructive text-sm" data-testid="avatar-url-error">
                          {form.formState.errors.avatarUrl.message}
                        </p>
                      )}
                    </div>

                    {isEditing && (
                      <Button
                        type="submit"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={updateProfile.isPending}
                        data-testid="save-profile-button"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateProfile.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
                      </Button>
                    )}
                  </form>
                </CardContent>
              </Card>

              {/* Account Statistics */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-xl" data-testid="account-stats-title">إحصائيات الحساب</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="text-3xl font-bold text-primary mb-2" data-testid="total-favorites">0</div>
                      <div className="text-sm text-muted-foreground">إجمالي المفضلة</div>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="text-3xl font-bold text-green-500 mb-2" data-testid="completed-watches">0</div>
                      <div className="text-sm text-muted-foreground">مكتملة المشاهدة</div>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="text-3xl font-bold text-blue-500 mb-2" data-testid="watch-hours">0</div>
                      <div className="text-sm text-muted-foreground">ساعات المشاهدة</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Settings */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-xl" data-testid="account-settings-title">إعدادات الحساب</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/10 rounded-lg">
                      <div>
                        <h3 className="font-medium">الإشعارات</h3>
                        <p className="text-sm text-muted-foreground">استقبال إشعارات الحلقات والأفلام الجديدة</p>
                      </div>
                      <Button variant="outline" size="sm" data-testid="notifications-settings-button">
                        إدارة
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-muted/10 rounded-lg">
                      <div>
                        <h3 className="font-medium">الخصوصية</h3>
                        <p className="text-sm text-muted-foreground">إعدادات الخصوصية وأمان الحساب</p>
                      </div>
                      <Button variant="outline" size="sm" data-testid="privacy-settings-button">
                        إدارة
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/10 rounded-lg">
                      <div>
                        <h3 className="font-medium">تفضيلات اللغة</h3>
                        <p className="text-sm text-muted-foreground">اختيار لغة الواجهة والترجمة</p>
                      </div>
                      <Button variant="outline" size="sm" data-testid="language-settings-button">
                        العربية
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        {isMobile && <BottomNav />}
      </div>
    </div>
  );
}
