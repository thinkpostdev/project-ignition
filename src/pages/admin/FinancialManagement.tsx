import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, ExternalLink, CheckCircle, Clock, XCircle, Building2 } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';

interface FinancialRow {
  influencer_id: string;
  influencer_name: string | null;
  influencer_phone: string | null;
  campaign_id: string;
  campaign_name: string | null;
  invitation_id: string;
  amount_to_pay: number | null;
  uploaded_link: string | null;
  has_uploaded_link: boolean | null;
  payment_completed: boolean | null;
  owner_approved_link: boolean | null;
  proof_status: string | null;
  link_submitted_at: string | null;
  link_approved_at: string | null;
}

interface BankInfo {
  bank_name: string | null;
  iban: string | null;
}

type ProofFilter = 'all' | 'pending_upload' | 'submitted' | 'approved' | 'pending_payment';
type PaymentFilter = 'all' | 'paid' | 'unpaid';

export default function FinancialManagement() {
  const [financialData, setFinancialData] = useState<FinancialRow[]>([]);
  const [filteredData, setFilteredData] = useState<FinancialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [proofFilter, setProofFilter] = useState<ProofFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [selectedBankInfo, setSelectedBankInfo] = useState<{ name: string; info: BankInfo | null } | null>(null);
  const [bankInfoCache, setBankInfoCache] = useState<Record<string, BankInfo>>({});
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
  const [updatingApproval, setUpdatingApproval] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFinancialData();
  }, []);

  useEffect(() => {
    filterData();
  }, [financialData, searchTerm, proofFilter, paymentFilter]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      // Only fetch accepted invitations with payment information
      const { data, error } = await supabase
        .from('developer_tracking_view')
        .select('*')
        .eq('invitation_status', 'accepted')
        .order('invitation_created_at', { ascending: false });

      if (error) throw error;

      setFinancialData(data || []);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load financial data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...financialData];

    // Apply proof filter
    if (proofFilter === 'pending_upload') {
      filtered = filtered.filter(row => !row.has_uploaded_link);
    } else if (proofFilter === 'submitted') {
      filtered = filtered.filter(row => row.has_uploaded_link && !isApproved(row));
    } else if (proofFilter === 'approved') {
      filtered = filtered.filter(row => isApproved(row));
    } else if (proofFilter === 'pending_payment') {
      filtered = filtered.filter(row => isApproved(row) && !row.payment_completed);
    }

    // Apply payment filter
    if (paymentFilter === 'paid') {
      filtered = filtered.filter(row => row.payment_completed);
    } else if (paymentFilter === 'unpaid') {
      filtered = filtered.filter(row => !row.payment_completed);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        row.influencer_name?.toLowerCase().includes(search) ||
        row.campaign_name?.toLowerCase().includes(search) ||
        row.influencer_phone?.includes(search)
      );
    }

    setFilteredData(filtered);
  };

  // Check if content is approved (either explicitly or auto-approved after 24h)
  const isApproved = (row: FinancialRow): boolean => {
    if (row.owner_approved_link) return true;
    
    // Auto-approve if 24 hours have passed since submission and owner hasn't rejected
    if (row.has_uploaded_link && row.link_submitted_at && row.proof_status !== 'rejected') {
      const submittedAt = new Date(row.link_submitted_at);
      const hoursSinceSubmission = differenceInHours(new Date(), submittedAt);
      return hoursSinceSubmission >= 24;
    }
    
    return false;
  };

  // Get approval status display
  const getApprovalStatus = (row: FinancialRow): { label: string; color: string; icon: React.ReactNode } => {
    if (!row.has_uploaded_link) {
      return { label: 'Awaiting Upload', color: 'text-gray-500', icon: <Clock className="h-4 w-4" /> };
    }
    
    if (row.proof_status === 'rejected') {
      return { label: 'Rejected', color: 'text-red-600', icon: <XCircle className="h-4 w-4" /> };
    }
    
    if (row.owner_approved_link) {
      return { label: 'Owner Approved', color: 'text-green-600', icon: <CheckCircle className="h-4 w-4" /> };
    }
    
    if (row.link_submitted_at) {
      const submittedAt = new Date(row.link_submitted_at);
      const hoursSinceSubmission = differenceInHours(new Date(), submittedAt);
      
      if (hoursSinceSubmission >= 24) {
        return { label: 'Auto-Approved (24h)', color: 'text-green-600', icon: <CheckCircle className="h-4 w-4" /> };
      } else {
        const hoursRemaining = 24 - hoursSinceSubmission;
        return { 
          label: `Pending (${hoursRemaining}h left)`, 
          color: 'text-yellow-600', 
          icon: <Clock className="h-4 w-4" /> 
        };
      }
    }
    
    return { label: 'Pending', color: 'text-yellow-600', icon: <Clock className="h-4 w-4" /> };
  };

  const handlePaymentToggle = async (invitationId: string, currentStatus: boolean) => {
    try {
      setUpdatingPayment(invitationId);
      
      const { error } = await supabase
        .from('influencer_invitations')
        .update({ payment_completed: !currentStatus })
        .eq('id', invitationId);

      if (error) throw error;

      // Update local state
      setFinancialData(prev => prev.map(row => 
        row.invitation_id === invitationId 
          ? { ...row, payment_completed: !currentStatus }
          : row
      ));

      toast({
        title: 'Success',
        description: `Payment marked as ${!currentStatus ? 'completed' : 'pending'}`,
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingPayment(null);
    }
  };

  const handleApprovalStatusChange = async (invitationId: string, newStatus: string) => {
    try {
      setUpdatingApproval(invitationId);
      
      const updateData: { proof_status: 'pending_submission' | 'submitted' | 'approved' | 'rejected'; proof_approved_at?: string | null } = {
        proof_status: newStatus as 'pending_submission' | 'submitted' | 'approved' | 'rejected',
      };
      
      // Set approval timestamp if approved
      if (newStatus === 'approved') {
        updateData.proof_approved_at = new Date().toISOString();
      } else {
        updateData.proof_approved_at = null;
      }
      
      const { error } = await supabase
        .from('influencer_invitations')
        .update(updateData)
        .eq('id', invitationId);

      if (error) throw error;

      // Update local state
      setFinancialData(prev => prev.map(row => 
        row.invitation_id === invitationId 
          ? { ...row, proof_status: newStatus, owner_approved_link: newStatus === 'approved' }
          : row
      ));

      toast({
        title: 'Success',
        description: `Approval status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update approval status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingApproval(null);
    }
  };

  // Fetch bank info for an influencer
  const fetchBankInfo = async (influencerId: string, influencerName: string | null) => {
    // Check cache first
    if (bankInfoCache[influencerId]) {
      setSelectedBankInfo({ name: influencerName || 'N/A', info: bankInfoCache[influencerId] });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('influencer_profiles')
        .select('bank_name, iban')
        .eq('id', influencerId)
        .single();

      if (error) throw error;

      const bankInfo: BankInfo = {
        bank_name: data?.bank_name || null,
        iban: data?.iban || null,
      };

      // Cache the result
      setBankInfoCache(prev => ({ ...prev, [influencerId]: bankInfo }));
      setSelectedBankInfo({ name: influencerName || 'N/A', info: bankInfo });
    } catch (error) {
      console.error('Error fetching bank info:', error);
      setSelectedBankInfo({ name: influencerName || 'N/A', info: null });
    }
  };

  // Calculate summary stats
  const totalPending = filteredData.filter(row => isApproved(row) && !row.payment_completed).length;
  const totalPaid = filteredData.filter(row => row.payment_completed).length;
  const totalPendingAmount = filteredData
    .filter(row => isApproved(row) && !row.payment_completed)
    .reduce((sum, row) => sum + (row.amount_to_pay || 0), 0);

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
          <h2 className="text-2xl font-bold text-gray-900">Financial Management</h2>
          <p className="text-gray-600 mt-1">Track influencer payments and content approvals</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm text-yellow-700 font-medium">Pending Payments</div>
            <div className="text-2xl font-bold text-yellow-900">{totalPending}</div>
            <div className="text-sm text-yellow-600">SAR {totalPendingAmount.toLocaleString()}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700 font-medium">Completed Payments</div>
            <div className="text-2xl font-bold text-green-900">{totalPaid}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 font-medium">Total Records</div>
            <div className="text-2xl font-bold text-blue-900">{filteredData.length}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by influencer name, phone, or campaign..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={proofFilter} onValueChange={(value) => setProofFilter(value as ProofFilter)}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Proof Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending_upload">Pending Upload</SelectItem>
              <SelectItem value="submitted">Submitted (Pending Review)</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending_payment">Ready for Payment</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as PaymentFilter)}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
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
                  <TableHead>Campaign ID</TableHead>
                  <TableHead>Content Proof</TableHead>
                  <TableHead>Approval Status</TableHead>
                  <TableHead>Bank Info</TableHead>
                  <TableHead>Fees (SAR)</TableHead>
                  <TableHead className="text-center">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No financial records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row) => {
                    const approvalStatus = getApprovalStatus(row);
                    const canMarkPaid = isApproved(row);
                    
                    return (
                      <TableRow key={row.invitation_id}>
                        <TableCell className="font-medium">
                          {row.influencer_name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {row.influencer_phone || 'N/A'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-500 break-all">
                          {row.campaign_id || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {row.has_uploaded_link ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                              onClick={() => setSelectedProofUrl(row.uploaded_link)}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View Content
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">Not uploaded</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1 ${approvalStatus.color}`}>
                              {approvalStatus.icon}
                              <span className="text-sm">{approvalStatus.label}</span>
                            </span>
                            <Select
                              value={row.proof_status || 'pending_submission'}
                              onValueChange={(value) => handleApprovalStatusChange(row.invitation_id, value)}
                              disabled={updatingApproval === row.invitation_id}
                            >
                              <SelectTrigger className="w-24 h-7 text-xs">
                                <SelectValue placeholder="Change" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending_submission">Pending Upload</SelectItem>
                                <SelectItem value="submitted">Submitted</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary/80 p-0 h-auto"
                            onClick={() => fetchBankInfo(row.influencer_id, row.influencer_name)}
                          >
                            <Building2 className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {row.amount_to_pay ? row.amount_to_pay.toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">
                          {updatingPayment === row.invitation_id ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          ) : (
                            <Checkbox
                              checked={row.payment_completed || false}
                              disabled={!canMarkPaid}
                              onCheckedChange={() => handlePaymentToggle(row.invitation_id, row.payment_completed || false)}
                              className={!canMarkPaid ? 'opacity-50 cursor-not-allowed' : ''}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary */}
        <div className="text-sm text-gray-600">
          Showing {filteredData.length} of {financialData.length} records
        </div>
      </div>

      {/* Content Preview Dialog */}
      <Dialog open={!!selectedProofUrl} onOpenChange={() => setSelectedProofUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Content Proof</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <a
                href={selectedProofUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                {selectedProofUrl}
              </a>
            </div>
            <Button
              className="w-full"
              onClick={() => window.open(selectedProofUrl || '', '_blank')}
            >
              Open in New Tab
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Info Dialog */}
      <Dialog open={!!selectedBankInfo} onOpenChange={() => setSelectedBankInfo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bank Information
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Influencer: <span className="font-medium text-gray-900">{selectedBankInfo?.name}</span>
            </div>
            {selectedBankInfo?.info?.bank_name || selectedBankInfo?.info?.iban ? (
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Bank Name</div>
                  <div className="font-medium">{selectedBankInfo?.info?.bank_name || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">IBAN</div>
                  <div className="font-mono text-sm">{selectedBankInfo?.info?.iban || 'Not provided'}</div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-700 text-sm">
                  Bank information not yet provided by the influencer.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
