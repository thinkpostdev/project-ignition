import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Edit, Loader2, Save, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';

import { Database } from '@/integrations/supabase/types';

type CampaignStatus = Database['public']['Enums']['campaign_detailed_status'];
type CampaignGoal = Database['public']['Enums']['campaign_goal'];

interface Campaign {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  budget: number | null;
  target_followers_min: number | null;
  target_followers_max: number | null;
  target_engagement_min: number | null;
  content_requirements: string | null;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
  goal: CampaignGoal | null;
  goal_details: string | null;
  start_date: string | null;
  duration_days: number | null;
  add_bonus_hospitality: boolean | null;
  payment_approved: boolean | null;
  owner_profile?: {
    business_name: string;
  } | null;
}

const statusOptions = [
  'draft',
  'waiting_match_plan',
  'plan_ready',
  'waiting_influencer_responses',
  'in_progress',
  'completed',
  'cancelled'
];

const goalOptions = ['opening', 'promotions', 'new_products', 'other'];

export default function CampaignsManagement() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Campaign>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [campaigns, searchTerm]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      
      // First fetch all campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      // Then fetch owner profiles to get business names
      const ownerIds = [...new Set(campaignsData?.map(c => c.owner_id) || [])];
      
      const { data: ownerProfiles } = await supabase
        .from('owner_profiles')
        .select('user_id, business_name')
        .in('user_id', ownerIds);

      // Create a map of owner_id -> business_name
      const ownerMap = new Map(
        ownerProfiles?.map(p => [p.user_id, p.business_name]) || []
      );

      // Merge the data
      const enrichedData = campaignsData?.map(campaign => ({
        ...campaign,
        owner_profile: {
          business_name: ownerMap.get(campaign.owner_id) || 'N/A'
        }
      })) || [];

      setCampaigns(enrichedData);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaigns',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCampaigns = () => {
    if (!searchTerm) {
      setFilteredCampaigns(campaigns);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = campaigns.filter(campaign => 
      campaign.title?.toLowerCase().includes(search) ||
      campaign.description?.toLowerCase().includes(search) ||
      campaign.owner_profile?.business_name?.toLowerCase().includes(search)
    );

    setFilteredCampaigns(filtered);
  };

  const handleEdit = (campaign: Campaign, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingCampaign(campaign);
    setEditFormData(campaign);
  };

  const handleViewCampaign = (campaignId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(`/admin/campaigns/${campaignId}`);
  };

  const handleSave = async () => {
    if (!editingCampaign) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('campaigns')
        .update({
          title: editFormData.title,
          description: editFormData.description,
          budget: editFormData.budget,
          target_followers_min: editFormData.target_followers_min,
          target_followers_max: editFormData.target_followers_max,
          target_engagement_min: editFormData.target_engagement_min,
          content_requirements: editFormData.content_requirements,
          status: editFormData.status,
          goal: editFormData.goal,
          goal_details: editFormData.goal_details,
          start_date: editFormData.start_date,
          duration_days: editFormData.duration_days,
          add_bonus_hospitality: editFormData.add_bonus_hospitality,
          payment_approved: editFormData.payment_approved,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCampaign.id);

      if (error) throw error;

      // Update local state
      setCampaigns(prev =>
        prev.map(c =>
          c.id === editingCampaign.id ? { ...c, ...editFormData } : c
        )
      );

      toast({
        title: 'Success',
        description: 'Campaign updated successfully',
      });

      setEditingCampaign(null);
      setEditFormData({});
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to update campaign',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Campaigns Management</h2>
          <p className="text-gray-600 mt-1">View and edit all campaigns</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search campaigns by title, description, or business..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Payment Approved</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No campaigns found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <TableRow 
                      key={campaign.id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleViewCampaign(campaign.id)}
                    >
                      <TableCell className="font-mono text-xs text-gray-500">
                        {campaign.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {campaign.title}
                      </TableCell>
                      <TableCell>{campaign.owner_profile?.business_name || 'N/A'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {campaign.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {campaign.budget ? `$${campaign.budget}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {campaign.start_date
                          ? format(new Date(campaign.start_date), 'MMM d, yyyy')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {campaign.payment_approved ? (
                          <span className="text-green-600 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleViewCampaign(campaign.id, e)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleEdit(campaign, e)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary */}
        <div className="text-sm text-gray-600">
          Showing {filteredCampaigns.length} of {campaigns.length} campaigns
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCampaign} onOpenChange={(open) => !open && setEditingCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>
              Make changes to the campaign details below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editFormData.title || ''}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  value={editFormData.budget || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, budget: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration_days">Duration (days)</Label>
                <Input
                  id="duration_days"
                  type="number"
                  value={editFormData.duration_days || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, duration_days: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_followers_min">Min Followers</Label>
                <Input
                  id="target_followers_min"
                  type="number"
                  value={editFormData.target_followers_min || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, target_followers_min: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_followers_max">Max Followers</Label>
                <Input
                  id="target_followers_max"
                  type="number"
                  value={editFormData.target_followers_max || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, target_followers_max: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_engagement_min">Min Engagement Rate</Label>
              <Input
                id="target_engagement_min"
                type="number"
                step="0.01"
                value={editFormData.target_engagement_min || ''}
                onChange={(e) => setEditFormData({ ...editFormData, target_engagement_min: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editFormData.status}
                onValueChange={(value) => setEditFormData({ ...editFormData, status: value as CampaignStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Goal</Label>
              <Select
                value={editFormData.goal || undefined}
                onValueChange={(value) => setEditFormData({ ...editFormData, goal: value as CampaignGoal })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {goalOptions.map((goal) => (
                    <SelectItem key={goal} value={goal}>
                      {goal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal_details">Goal Details</Label>
              <Input
                id="goal_details"
                value={editFormData.goal_details || ''}
                onChange={(e) => setEditFormData({ ...editFormData, goal_details: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={editFormData.start_date || ''}
                onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content_requirements">Content Requirements</Label>
              <Input
                id="content_requirements"
                value={editFormData.content_requirements || ''}
                onChange={(e) => setEditFormData({ ...editFormData, content_requirements: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="add_bonus_hospitality"
                checked={editFormData.add_bonus_hospitality || false}
                onChange={(e) => setEditFormData({ ...editFormData, add_bonus_hospitality: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="add_bonus_hospitality" className="cursor-pointer">
                Add Bonus Hospitality
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="payment_approved"
                checked={editFormData.payment_approved || false}
                onChange={(e) => setEditFormData({ ...editFormData, payment_approved: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="payment_approved" className="cursor-pointer">
                Payment Approved
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCampaign(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

