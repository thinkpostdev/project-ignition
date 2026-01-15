import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Users, Megaphone, Code, DollarSign, Building2 } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const adminSections = [
    {
      title: 'Influencers Approval',
      titleAr: 'الموافقة على المؤثرين',
      description: 'Review and approve influencer registrations',
      descriptionAr: 'مراجعة والموافقة على تسجيلات المؤثرين',
      icon: Users,
      path: '/admin/influencers',
      color: 'bg-blue-500',
    },
    {
      title: 'Campaigns Management',
      titleAr: 'إدارة الحملات',
      description: 'View and edit all campaigns',
      descriptionAr: 'عرض وتعديل جميع الحملات',
      icon: Megaphone,
      path: '/admin/campaigns',
      color: 'bg-green-500',
    },
    {
      title: 'Financial Management',
      titleAr: 'الإدارة المالية',
      description: 'Track influencer payments and content approvals',
      descriptionAr: 'تتبع مدفوعات المؤثرين والموافقات على المحتوى',
      icon: DollarSign,
      path: '/admin/financial',
      color: 'bg-amber-500',
    },
    {
      title: 'Developer Tracking',
      titleAr: 'تتبع المطورين',
      description: 'Monitor invitations, payments, and proof submissions',
      descriptionAr: 'مراقبة الدعوات والمدفوعات وتقديم الإثباتات',
      icon: Code,
      path: '/admin/developer-tracking',
      color: 'bg-purple-500',
    },
    {
      title: 'Owners Management',
      titleAr: 'إدارة أصحاب المطاعم',
      description: 'Manage owner accounts and service fees',
      descriptionAr: 'إدارة حسابات الملاك ونسب العمولات',
      icon: Building2,
      path: '/admin/owners',
      color: 'bg-orange-500',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-600 mt-2">Welcome to the admin control panel</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.path}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary"
                onClick={() => navigate(section.path)}
              >
                <div className="space-y-4">
                  <div className={`${section.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {section.description}
                    </p>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(section.path);
                    }}
                  >
                    Open
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Admin Access</h3>
          <p className="text-blue-800">
            You have full administrative access to all platform features. Use the navigation above or the sidebar to access different admin sections.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}

