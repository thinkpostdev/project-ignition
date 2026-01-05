import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';

interface InfluencerProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  instagram_handle: string | null;
  tiktok_username: string | null;
  snapchat_username: string | null;
  is_approved: boolean | null;
  agreement_accepted: boolean | null;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  user_email: string | null;
  min_price: number | null;
  max_price: number | null;
}

type FilterStatus = 'all' | 'pending' | 'approved';

export default function InfluencersApproval() {
  const [influencers, setInfluencers] = useState<InfluencerProfile[]>([]);
  const [filteredInfluencers, setFilteredInfluencers] = useState<InfluencerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [savingPriceIds, setSavingPriceIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchInfluencers();
  }, []);

  useEffect(() => {
    filterInfluencers();
  }, [influencers, searchTerm, filterStatus]);

  const fetchInfluencers = async () => {
    try {
      setLoading(true);
      
      // Fetch influencer profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('influencer_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch profiles to get full names and phone numbers
      const userIds = profilesData?.map(p => p.user_id) || [];
      
      const { data: profilesInfo } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds);

      // Create a map of user_id -> profile info
      const profileMap = new Map(
        profilesInfo?.map(p => [p.id, { full_name: p.full_name, phone: p.phone }]) || []
      );

      // Transform data to match expected interface
      const transformedData: InfluencerProfile[] = profilesData?.map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        display_name: profile.display_name,
        instagram_handle: profile.instagram_handle,
        tiktok_username: profile.tiktok_username,
        snapchat_username: profile.snapchat_username,
        is_approved: profile.is_approved,
        agreement_accepted: profile.agreement_accepted,
        created_at: profile.created_at,
        full_name: profileMap.get(profile.user_id)?.full_name || null,
        phone: profileMap.get(profile.user_id)?.phone || null,
        user_email: null,
        min_price: profile.min_price,
        max_price: profile.max_price,
      })) || [];

      setInfluencers(transformedData);
    } catch (error) {
      console.error('Error fetching influencers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load influencers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterInfluencers = () => {
    let filtered = [...influencers];

    // Apply status filter
    if (filterStatus === 'pending') {
      filtered = filtered.filter(inf => !inf.is_approved);
    } else if (filterStatus === 'approved') {
      filtered = filtered.filter(inf => inf.is_approved);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(inf => 
        inf.display_name?.toLowerCase().includes(search) ||
        inf.full_name?.toLowerCase().includes(search) ||
        inf.phone?.toLowerCase().includes(search) ||
        inf.user_email?.toLowerCase().includes(search) ||
        inf.instagram_handle?.toLowerCase().includes(search) ||
        inf.tiktok_username?.toLowerCase().includes(search)
      );
    }

    setFilteredInfluencers(filtered);
  };

  const handleApprove = async (influencerId: string, userId: string) => {
    try {
      setApprovingIds(prev => new Set(prev).add(influencerId));

      const { error } = await supabase
        .from('influencer_profiles')
        .update({ is_approved: true })
        .eq('id', influencerId);

      if (error) throw error;

      // Update local state
      setInfluencers(prev =>
        prev.map(inf =>
          inf.id === influencerId ? { ...inf, is_approved: true } : inf
        )
      );

      toast({
        title: 'Success',
        description: 'Influencer approved successfully',
      });
    } catch (error) {
      console.error('Error approving influencer:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve influencer',
        variant: 'destructive',
      });
    } finally {
      setApprovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(influencerId);
        return newSet;
      });
    }
  };

  const handlePriceChange = async (influencerId: string, field: 'min_price' | 'max_price', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    
    // Update local state immediately for responsive UI
    setInfluencers(prev =>
      prev.map(inf =>
        inf.id === influencerId ? { ...inf, [field]: numValue } : inf
      )
    );
  };

  const handlePriceSave = async (influencerId: string, field: 'min_price' | 'max_price', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    
    try {
      setSavingPriceIds(prev => new Set(prev).add(`${influencerId}-${field}`));

      const { error } = await supabase
        .from('influencer_profiles')
        .update({ [field]: numValue })
        .eq('id', influencerId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${field === 'min_price' ? 'Minimum' : 'Maximum'} price updated`,
      });
    } catch (error) {
      console.error('Error updating price:', error);
      toast({
        title: 'Error',
        description: 'Failed to update price',
        variant: 'destructive',
      });
      // Revert on error
      fetchInfluencers();
    } finally {
      setSavingPriceIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${influencerId}-${field}`);
        return newSet;
      });
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
          <h2 className="text-2xl font-bold text-gray-900">Influencers Approval</h2>
          <p className="text-gray-600 mt-1">Manage and approve influencer registrations</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, phone, email, or handle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Social Handles</TableHead>
                <TableHead>Min Price (SAR)</TableHead>
                <TableHead>Max Price (SAR)</TableHead>
                <TableHead>Registration Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Agreement</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInfluencers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    No influencers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInfluencers.map((influencer) => (
                  <TableRow key={influencer.id}>
                    <TableCell className="font-medium">
                      {influencer.display_name || influencer.full_name || 'N/A'}
                    </TableCell>
                    <TableCell>{influencer.phone || 'N/A'}</TableCell>
                    <TableCell>{influencer.user_email || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {influencer.instagram_handle && (
                          <div className="text-gray-600">IG: @{influencer.instagram_handle}</div>
                        )}
                        {influencer.tiktok_username && (
                          <div className="text-gray-600">TT: @{influencer.tiktok_username}</div>
                        )}
                        {influencer.snapchat_username && (
                          <div className="text-gray-600">SC: @{influencer.snapchat_username}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={influencer.min_price ?? ''}
                        onChange={(e) => handlePriceChange(influencer.id, 'min_price', e.target.value)}
                        onBlur={(e) => handlePriceSave(influencer.id, 'min_price', e.target.value)}
                        className="w-24 h-8 text-sm"
                        placeholder="0"
                        disabled={savingPriceIds.has(`${influencer.id}-min_price`)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={influencer.max_price ?? ''}
                        onChange={(e) => handlePriceChange(influencer.id, 'max_price', e.target.value)}
                        onBlur={(e) => handlePriceSave(influencer.id, 'max_price', e.target.value)}
                        className="w-24 h-8 text-sm"
                        placeholder="0"
                        disabled={savingPriceIds.has(`${influencer.id}-max_price`)}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(influencer.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {influencer.is_approved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {influencer.agreement_accepted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          Accepted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Not Accepted
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!influencer.is_approved && (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(influencer.id, influencer.user_id)}
                          disabled={approvingIds.has(influencer.id)}
                        >
                          {approvingIds.has(influencer.id) ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Approving...
                            </>
                          ) : (
                            'Approve'
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="text-sm text-gray-600">
          Showing {filteredInfluencers.length} of {influencers.length} influencers
        </div>
      </div>
    </AdminLayout>
  );
}

