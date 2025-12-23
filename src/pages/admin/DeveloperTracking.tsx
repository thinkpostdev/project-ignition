import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
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
import { Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';

interface DeveloperTrackingRow {
  influencer_id: string;
  influencer_name: string | null;
  influencer_phone: string | null;
  campaign_id: string;
  campaign_name: string | null;
  business_name: string | null;
  invitation_id: string;
  invitation_status: string | null;
  amount_to_pay: number | null;
  uploaded_link: string | null;
  has_uploaded_link: boolean | null;
  payment_completed: boolean | null;
  owner_approved_link: boolean | null;
  proof_status: string | null;
  link_submitted_at: string | null;
  link_approved_at: string | null;
  visit_date: string | null;
  invitation_created_at: string | null;
  invitation_responded_at: string | null;
}

type StatusFilter = 'all' | 'pending' | 'accepted' | 'declined';
type ProofFilter = 'all' | 'pending_submission' | 'submitted' | 'approved' | 'rejected';

export default function DeveloperTracking() {
  const [trackingData, setTrackingData] = useState<DeveloperTrackingRow[]>([]);
  const [filteredData, setFilteredData] = useState<DeveloperTrackingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [proofFilter, setProofFilter] = useState<ProofFilter>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchTrackingData();
  }, []);

  useEffect(() => {
    filterData();
  }, [trackingData, searchTerm, statusFilter, proofFilter]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('developer_tracking_view')
        .select('*')
        .order('invitation_created_at', { ascending: false });

      if (error) throw error;

      setTrackingData(data || []);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load developer tracking data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...trackingData];

    // Apply invitation status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(row => row.invitation_status === statusFilter);
    }

    // Apply proof status filter
    if (proofFilter !== 'all') {
      filtered = filtered.filter(row => row.proof_status === proofFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        row.influencer_name?.toLowerCase().includes(search) ||
        row.campaign_name?.toLowerCase().includes(search) ||
        row.business_name?.toLowerCase().includes(search) ||
        row.influencer_phone?.includes(search)
      );
    }

    setFilteredData(filtered);
  };

  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-700';
      case 'declined':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getProofStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'submitted':
        return 'bg-blue-100 text-blue-700';
      case 'pending_submission':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
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
          <h2 className="text-2xl font-bold text-gray-900">Developer Tracking</h2>
          <p className="text-gray-600 mt-1">Monitor invitations, payments, and proof submissions</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by influencer, campaign, or business..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Invitation Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Invitations</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
          <Select value={proofFilter} onValueChange={(value) => setProofFilter(value as ProofFilter)}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Proof Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Proofs</SelectItem>
              <SelectItem value="pending_submission">Pending</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Influencer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Visit Date</TableHead>
                  <TableHead>Proof Status</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No tracking data found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row) => (
                    <TableRow key={row.invitation_id}>
                      <TableCell className="font-medium">
                        {row.influencer_name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {row.influencer_phone || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {row.campaign_name || 'N/A'}
                      </TableCell>
                      <TableCell>{row.business_name || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(row.invitation_status)}`}>
                          {row.invitation_status || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.amount_to_pay ? `$${row.amount_to_pay}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {row.visit_date
                          ? format(new Date(row.visit_date), 'MMM d, yyyy')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getProofStatusBadgeColor(row.proof_status)}`}>
                          {row.proof_status?.replace('_', ' ') || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.has_uploaded_link ? (
                          <a
                            href={row.uploaded_link || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">No link</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.payment_completed ? (
                          <span className="text-green-600 font-medium text-sm">Paid</span>
                        ) : (
                          <span className="text-gray-400 text-sm">Pending</span>
                        )}
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
          Showing {filteredData.length} of {trackingData.length} records
        </div>
      </div>
    </AdminLayout>
  );
}

