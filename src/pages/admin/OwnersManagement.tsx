import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Save, Percent, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface OwnerProfile {
  id: string;
  user_id: string;
  business_name: string;
  main_type: string | null;
  cities: string[] | null;
  service_fee_percentage: number;
  created_at: string;
  user_email?: string | null;
  phone?: string | null;
}

export default function OwnersManagement() {
  const [owners, setOwners] = useState<OwnerProfile[]>([]);
  const [filteredOwners, setFilteredOwners] = useState<OwnerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [bulkFeeValue, setBulkFeeValue] = useState('20');
  const [applyingBulk, setApplyingBulk] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOwners();
  }, []);

  useEffect(() => {
    filterOwners();
  }, [owners, searchTerm]);

  const fetchOwners = async () => {
    try {
      setLoading(true);
      
      // Fetch owner profiles
      const { data: ownersData, error: ownersError } = await supabase
        .from('owner_profiles')
        .select('id, user_id, business_name, main_type, cities, service_fee_percentage, created_at')
        .order('created_at', { ascending: false });

      if (ownersError) throw ownersError;

      // Fetch user emails from auth.users via profiles table or admin function
      const userIds = ownersData?.map(o => o.user_id) || [];
      
      // Fetch phone numbers from profiles table
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, phone')
        .in('id', userIds);

      const phoneMap = new Map(profilesData?.map(p => [p.id, p.phone]) || []);

      // Transform data
      const transformedData: OwnerProfile[] = (ownersData || []).map(owner => ({
        ...owner,
        phone: phoneMap.get(owner.user_id) || null,
      }));

      setOwners(transformedData);
    } catch (error) {
      console.error('Error fetching owners:', error);
      toast({
        title: 'Error',
        description: 'Failed to load owners',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOwners = () => {
    let filtered = [...owners];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(owner => 
        owner.business_name?.toLowerCase().includes(search) ||
        owner.phone?.toLowerCase().includes(search) ||
        owner.cities?.some(city => city.toLowerCase().includes(search))
      );
    }

    setFilteredOwners(filtered);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredOwners.map(o => o.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (ownerId: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(ownerId);
    } else {
      newSet.delete(ownerId);
    }
    setSelectedIds(newSet);
  };

  const handleFeeChange = (ownerId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const percentage = Math.min(100, Math.max(0, numValue)) / 100;
    
    setOwners(prev =>
      prev.map(owner =>
        owner.id === ownerId ? { ...owner, service_fee_percentage: percentage } : owner
      )
    );
  };

  const handleFeeSave = async (ownerId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const percentage = Math.min(100, Math.max(0, numValue)) / 100;
    
    try {
      setSavingIds(prev => new Set(prev).add(ownerId));

      const { error } = await supabase
        .from('owner_profiles')
        .update({ service_fee_percentage: percentage })
        .eq('id', ownerId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Service fee updated successfully',
      });
    } catch (error) {
      console.error('Error updating service fee:', error);
      toast({
        title: 'Error',
        description: 'Failed to update service fee',
        variant: 'destructive',
      });
      fetchOwners();
    } finally {
      setSavingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(ownerId);
        return newSet;
      });
    }
  };

  const handleBulkApply = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: 'Warning',
        description: 'Please select at least one owner',
        variant: 'destructive',
      });
      return;
    }

    const numValue = parseFloat(bulkFeeValue) || 0;
    const percentage = Math.min(100, Math.max(0, numValue)) / 100;

    setApplyingBulk(true);
    try {
      const selectedArray = Array.from(selectedIds);
      
      const { error } = await supabase
        .from('owner_profiles')
        .update({ service_fee_percentage: percentage })
        .in('id', selectedArray);

      if (error) throw error;

      // Update local state
      setOwners(prev =>
        prev.map(owner =>
          selectedIds.has(owner.id) ? { ...owner, service_fee_percentage: percentage } : owner
        )
      );

      setSelectedIds(new Set());
      
      toast({
        title: 'Success',
        description: `Updated service fee for ${selectedArray.length} owner(s)`,
      });
    } catch (error) {
      console.error('Error applying bulk update:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply bulk update',
        variant: 'destructive',
      });
    } finally {
      setApplyingBulk(false);
    }
  };

  const getMainTypeLabel = (mainType: string | null) => {
    if (!mainType) return 'N/A';
    return mainType === 'restaurant' ? 'Restaurant' : mainType === 'cafe' ? 'Cafe' : mainType;
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
          <h2 className="text-2xl font-bold text-gray-900">Owners Management</h2>
          <p className="text-gray-600 mt-1">Manage owner accounts and service fee percentages</p>
        </div>

        {/* Search and Bulk Actions */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by business name, phone, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Bulk Action */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
            <span className="text-sm text-gray-600 whitespace-nowrap">Bulk Set Fee:</span>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                value={bulkFeeValue}
                onChange={(e) => setBulkFeeValue(e.target.value)}
                className="w-20 h-8 text-sm pr-6"
                placeholder="20"
              />
              <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            </div>
            <Button
              size="sm"
              onClick={handleBulkApply}
              disabled={selectedIds.size === 0 || applyingBulk}
            >
              {applyingBulk ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Apply to {selectedIds.size} selected
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === filteredOwners.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  />
                </TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Cities</TableHead>
                <TableHead>Service Fee %</TableHead>
                <TableHead>Registration Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOwners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No owners found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOwners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(owner.id)}
                        onCheckedChange={(checked) => handleSelectOne(owner.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        {owner.business_name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{owner.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        owner.main_type === 'restaurant' 
                          ? 'bg-orange-100 text-orange-700' 
                          : owner.main_type === 'cafe'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {getMainTypeLabel(owner.main_type)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {owner.cities && owner.cities.length > 0 ? (
                          owner.cities.slice(0, 2).map((city, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {city}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                        {owner.cities && owner.cities.length > 2 && (
                          <span className="text-xs text-gray-500">+{owner.cities.length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={Math.round(owner.service_fee_percentage * 100)}
                          onChange={(e) => handleFeeChange(owner.id, e.target.value)}
                          onBlur={(e) => handleFeeSave(owner.id, e.target.value)}
                          className="w-20 h-8 text-sm"
                          disabled={savingIds.has(owner.id)}
                        />
                        <Percent className="h-3 w-3 text-gray-400" />
                        {savingIds.has(owner.id) && (
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(owner.created_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="text-sm text-gray-600">
          Showing {filteredOwners.length} of {owners.length} owners
          {selectedIds.size > 0 && (
            <span className="ml-2 text-primary font-medium">
              • {selectedIds.size} selected
            </span>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
