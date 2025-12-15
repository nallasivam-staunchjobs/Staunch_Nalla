import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast, ToastContainer } from 'react-toastify';
import {
  Pencil,
  Eye,
  Download,
  PlusSquare,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { invoiceService } from '../../api/invoiceService';
import InvoicePreview from './InvoicePreview';
import logo from '/Logo.png?url';
import DigitalSign from '/DigitalSign.png?url';
import Loading from '../../components/Loading';

const InvoiceView = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Load invoices from backend API
  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await invoiceService.getAll();

      // Transform backend data to match component structure
      const transformedInvoices = response.map(invoice => {
        console.log('Backend invoice data:', invoice); // Debug log
        return {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          invoiceDate: invoice.invoice_date,
          candidateName: invoice.candidate_name,
          clientName: invoice.client_name,
          placementAmount: parseFloat(invoice.placement_amount || 0) || 0,
          totalAmount: parseFloat(invoice.total_amount || 0) || 0,
          status: invoice.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : 'Draft',
          state: invoice.state,
          empCode: invoice.emp_code,
          ctc: parseFloat(invoice.ctc || 0) || 0,
          createdAt: invoice.created_at
        };
      });

      setInvoices(transformedInvoices);
    } catch (err) {
      console.error('Error loading invoices:', err);
      setError('Failed to load invoices');
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  // Filter invoices based on search term and date range
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.clientName && invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDateRange = (() => {
      if (!fromDate && !toDate) return true;

      const itemDate = new Date(invoice.invoiceDate);
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;

      if (from && to) {
        return itemDate >= from && itemDate <= to;
      } else if (from) {
        return itemDate >= from;
      } else if (to) {
        return itemDate <= to;
      }
      return true;
    })();

    return matchesSearch && matchesDateRange;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / entriesPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  // Calculate statistics
  const paidCount = invoices.filter(inv => inv.status.toLowerCase() === 'paid').length;
  const pendingCount = invoices.filter(inv => inv.status.toLowerCase() === 'draft' || inv.status.toLowerCase() === 'generated').length;
  const overdueCount = invoices.filter(inv => inv.status.toLowerCase() === 'cancelled').length;

  // Calculate total amount
  const totalAmount = invoices.reduce((total, invoice) => total + invoice.totalAmount, 0);
  const formatAmount = (amount) => `₹${amount.toLocaleString('en-IN')}`;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleEdit = async (invoiceId) => {
    try {
      // Fetch complete invoice data from backend
      const fullInvoiceData = await invoiceService.getById(invoiceId);

      // Transform backend data to match frontend structure
      const invoiceToEdit = {
        id: fullInvoiceData.id,
        candidateName: fullInvoiceData.candidate_name,
        clientName: fullInvoiceData.client_name,
        state: fullInvoiceData.state,
        empCode: fullInvoiceData.emp_code,
        ctc: fullInvoiceData.ctc,
        placementType: fullInvoiceData.placement_type || 'percentage',
        placementPercent: fullInvoiceData.placement_percent,
        placementFixed: fullInvoiceData.placement_fixed,
        placementAmount: fullInvoiceData.placement_amount,
        cgst: fullInvoiceData.cgst,
        sgst: fullInvoiceData.sgst,
        igst: fullInvoiceData.igst,
        totalGst: fullInvoiceData.total_gst,
        invoiceNumber: fullInvoiceData.invoice_number,
        invoiceDate: fullInvoiceData.invoice_date,
        clientAddress: fullInvoiceData.client_address,
        clientGST: fullInvoiceData.client_gst,
        clientPAN: fullInvoiceData.client_pan,
        totalAmount: fullInvoiceData.total_amount,
      };

      // Navigate to invoice page with edit mode and complete data
      const editUrl = `/invoice?mode=edit&invoiceId=${invoiceId}&invoiceData=${encodeURIComponent(JSON.stringify(invoiceToEdit))}`;
      navigate(editUrl);
    } catch (error) {
      console.error('Error fetching invoice for edit:', error);
      toast.error('Failed to load invoice data for editing');
    }
  };

  const handleDownload = async (invoiceId) => {
    try {
      await invoiceService.downloadInvoice(invoiceId);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const handlePreview = async (invoiceId) => {
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice) {
        // Get full invoice data from backend
        const fullInvoiceData = await invoiceService.getById(invoiceId);

        // Transform the data
        const previewData = {
          candidateName: fullInvoiceData.candidate_name || invoice.candidateName,
          clientName: fullInvoiceData.client_name || invoice.clientName,
          state: fullInvoiceData.state || invoice.state,
          empCode: fullInvoiceData.emp_code || invoice.empCode,
          ctc: fullInvoiceData.ctc || invoice.ctc,
          placementAmount: fullInvoiceData.placement_amount || invoice.placementAmount,
          cgst: fullInvoiceData.cgst || 0,
          sgst: fullInvoiceData.sgst || 0,
          igst: fullInvoiceData.igst || 0,
          totalGst: fullInvoiceData.total_gst || 0,
          invoiceNumber: fullInvoiceData.invoice_number || invoice.invoiceNumber,
          invoiceDate: fullInvoiceData.invoice_date || invoice.invoiceDate,
          clientAddress: fullInvoiceData.client_address || '',
          clientGST: fullInvoiceData.client_gst || '',
          clientPAN: fullInvoiceData.client_pan || '',
          totalAmount: fullInvoiceData.total_amount || invoice.totalAmount,
        };

        // Open preview in new tab with clean UI
        const previewWindow = window.open('', '_blank');

        const formatCurrency = (amount) => parseFloat(amount || 0).toFixed(2);
        const formatDate = (date) => {
          if (!date) return '';
          return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          });
        };

        const numberToWords = (num) => {
          const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
          const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
          const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

          const convertHundreds = (n) => {
            let result = '';
            if (n > 99) {
              result += ones[Math.floor(n / 100)] + ' Hundred ';
              n %= 100;
            }
            if (n > 19) {
              result += tens[Math.floor(n / 10)] + ' ';
              n %= 10;
            } else if (n > 9) {
              result += teens[n - 10] + ' ';
              return result;
            }
            if (n > 0) {
              result += ones[n] + ' ';
            }
            return result;
          };

          if (num === 0) return 'Zero';

          let crores = Math.floor(num / 10000000);
          let lakhs = Math.floor((num % 10000000) / 100000);
          let thousands = Math.floor((num % 100000) / 1000);
          let hundreds = num % 1000;

          let result = '';
          if (crores > 0) result += convertHundreds(crores) + 'Crore ';
          if (lakhs > 0) result += convertHundreds(lakhs) + 'Lakh ';
          if (thousands > 0) result += convertHundreds(thousands) + 'Thousand ';
          if (hundreds > 0) result += convertHundreds(hundreds);

          return result.trim() + ' Only';
        };

        // Create simple, compact invoice preview
        previewWindow.document.write(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${previewData.candidateName}-${previewData.clientName.includes('Max Life Insurance') ? 'Max' : previewData.clientName}-${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '').toUpperCase()}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
              body { background: #f8fafc; color: #1e293b; line-height: 1.3; font-size: 13px; }
              .container { max-width: 800px; margin: 0 auto; background: white; min-height: 100vh; }
              .toolbar { position: sticky; top: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-bottom: 1px solid #e2e8f0; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; z-index: 100; }
              .btn { padding: 6px 12px; border: none; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
              .btn-primary { background: #3b82f6; color: white; }
              
              /* Print-specific styles for single page layout */
              @media print {
                body { background: white !important; font-size: 11px !important; line-height: 1.2 !important; }
                .toolbar { display: none !important; }
                .container { max-width: none !important; margin: 0 !important; padding: 10px !important; }
                .invoice-content { padding: 8px !important; }
                .section-spacing { margin: 6px 0 !important; padding: 6px 0 !important; }
                .header-section { padding: 8px !important; }
                .details-grid { gap: 8px !important; }
                .amount-section { padding: 6px !important; }
                .footer-section { padding: 6px !important; margin-top: 8px !important; }
                .contact-footer { padding: 4px !important; font-size: 10px !important; }
                h1, h2, h3 { font-size: 14px !important; margin: 4px 0 !important; }
                .text-lg { font-size: 13px !important; }
                .text-xl { font-size: 14px !important; }
                .text-2xl { font-size: 16px !important; }
                .text-3xl { font-size: 18px !important; }
                .py-6 { padding-top: 6px !important; padding-bottom: 6px !important; }
                .py-4 { padding-top: 4px !important; padding-bottom: 4px !important; }
                .px-8 { padding-left: 8px !important; padding-right: 8px !important; }
                .mb-4 { margin-bottom: 4px !important; }
                .mb-6 { margin-bottom: 6px !important; }
                .space-y-3 > * + * { margin-top: 3px !important; }
                .space-y-4 > * + * { margin-top: 4px !important; }
                .gap-8 { gap: 8px !important; }
                .signature-area { height: 40px !important; }
              }
              .btn-primary:hover { background: #2563eb; }
              .btn-secondary { background: #f1f5f9; color: #64748b; }
              .btn-secondary:hover { background: #e2e8f0; }
              .invoice { padding: 24px; }
              .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0; }
              .company { font-size: 24px; font-weight: 700; color: #1e40af; margin-bottom: 4px; }
              .company-sub { color: #64748b; font-size: 12px; }
              .company-address { text-align: right; font-size: 11px; color: #64748b; line-height: 1.4; }
              .invoice-title { text-align: center; font-size: 28px; font-weight: 700; color: #dc2626; margin: 16px 0; letter-spacing: 1px; }
              .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px; }
              .section-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #1e293b; }
              .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
              .info-label { color: #64748b; }
              .info-value { font-weight: 500; }
              .service-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0; text-align: center; }
              .service-title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
              .employee-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
              .employee-item { background: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; font-size: 11px; }
              .employee-label { color: #64748b; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
              .employee-value { font-weight: 600; margin-top: 2px; }
              .amount-section { display: flex; justify-content: flex-end; margin: 16px 0; }
              .amount-box { width: 250px; }
              .amount-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
              .total-row { border-top: 2px solid #e2e8f0; padding-top: 8px; font-size: 14px; font-weight: 600; }
              .total-amount { color: #1e40af; font-size: 16px; }
              .words { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 8px; font-size: 11px; margin: 12px 0; }
              .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
              .footer-section { background: #f8fafc; border-radius: 4px; padding: 12px; }
              .footer-title { font-weight: 600; margin-bottom: 6px; font-size: 12px; }
              .footer-content { font-size: 10px; color: #64748b; line-height: 1.4; }
              .signature-section { display: flex; justify-content: space-between; align-items: end; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
              .signature-box { text-align: right; }
              .signature-placeholder { width: 120px; height: 40px; border: 1px dashed #cbd5e1; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; margin: 8px 0; }
              .contact-bar { background: #1e40af; color: white; padding: 8px 24px; text-align: center; font-size: 10px; display: flex; justify-content: center; gap: 16px; }
              
              /* Watermark styles */
              .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 80px;
                font-weight: 100;
                color: rgba(59, 130, 246, 0.08);
                z-index: 1000;
                pointer-events: none;
                user-select: none;
                font-family: 'Times New Roman', sans-serif;
                letter-spacing: 8px;
                white-space: nowrap;
              }
              
              .invoice-content {
                position: relative;
                z-index: 2;
              }
              @media print {
                .toolbar { display: none !important; }
                body { background: white !important; }
                .container { box-shadow: none !important; margin: 0 !important; max-width: none !important; }
                .invoice { padding: 16px !important; }
                .header { margin-bottom: 16px !important; }
                .invoice-title { margin: 12px 0 !important; }
                .details { margin-bottom: 12px !important; }
                .service-box { margin: 12px 0 !important; }
                .amount-section { margin: 12px 0 !important; }
                .footer-grid { margin: 12px 0 !important; }
                .signature-section { margin-top: 16px !important; }
              }
            </style>
          </head>
          <body>
            <!-- Watermark -->
            
            
            <div class="container">
              <!-- Toolbar -->
              <div class="toolbar">
                <h1 style="font-size: 16px; font-weight: 600; color: #1e40af;">Invoice Preview</h1>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-primary flex gap-2" onclick="window.print()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download-icon lucide-download"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>
                  Download</button>
                  <button class="btn btn-secondary" onclick="window.close()">✕ Close</button>
                </div>
              </div>

              <!-- Invoice Content -->
              <div class="invoice-content" style="padding: 16px;">
                <div class="watermark">STAUNCH JOBS</div>
                <!-- Compact Header -->
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">
                  <div>
                    <div style="display: flex; align-items: center;">
                      <img src=${logo} alt="Staunch Jobs" style="height: 32px; margin-right: 8px;" />
                      <div style="font-size: 20px; font-weight: 700; color: #1e40af; margin-bottom: 2px;">Staunch Jobs</div>
                    </div>
                    <div style="color: #64748b; font-size: 11px;">Strong Career, Stronger Future</div>
                  </div>
                  <div style="text-align: right; font-size: 10px; color: #64748b; line-height: 1.3;">
                    <strong>Staunch Jobs</strong><br>
                    311, 1st Floor, 9th Street (Ext)<br>
                    Gandhipuram, Coimbatore - 641012<br>
                    Mobile No : 82204-16176
                    
                  </div>
                </div>

                <!-- Compact Invoice Title -->
                <div style="text-align: center; font-size: 22px; font-weight: 700; color: #dc2626; margin: 8px 0; letter-spacing: 1px;">TAX INVOICE</div>

                <!-- Compact Details Grid -->
                <div class="details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                  <!-- Bill To -->
                  <div>
                    <h3 style="font-weight: 600; margin-bottom: 6px; color: #374151; font-size: 12px;">Bill To</h3>
                    <div style="background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
                      <div style="font-weight: 600; margin-bottom: 4px; font-size: 12px;">${previewData.clientName || 'Client Name'}</div>
                      <div style="font-size: 9px; color: #64748b; margin-bottom: 6px; line-height: 1.2;">
                        ${previewData.clientAddress || '6th Floor, Tower 3, Wing B, Kohinoor City Mall, Kohinoor City, Kirol Road, Kurla, Mumbai Suburban, Maharashtra-400070'}
                      </div>
                      <div style="display: grid; grid-template-columns: 1fr; gap: 4px;">
                        <div style="background: white; padding: 4px; border-radius: 3px; border: 1px solid #e2e8f0;">
                          <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">PAN</div>
                          <div style="font-family: monospace; font-weight: 600; font-size: 10px;">${previewData.clientPAN || 'AACCE2709H'}</div>
                        </div>
                        <div style="background: white; padding: 4px; border-radius: 3px; border: 1px solid #e2e8f0;">
                          <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">GSTIN</div>
                          <div style="font-family: monospace; font-weight: 600; font-size: 10px;">${previewData.clientGST || '27AACCE2709H2ZT'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Invoice Info -->
                  <div>
                    <h3 style="font-weight: 600; margin-bottom: 6px; color: #374151; font-size: 12px;">Invoice Details</h3>
                    <div style="background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
                      <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 10px;">
                        <span style="color: #64748b;">Invoice Number</span>
                        <span style="font-weight: 600;">${previewData.invoiceNumber}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 10px;">
                        <span style="color: #64748b;">Invoice Date</span>
                        <span style="font-weight: 600;">${formatDate(previewData.invoiceDate)}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 10px;">
                        <span style="color: #64748b;">Client ID</span>
                        <span style="font-weight: 600;">${previewData.empCode}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 10px;">
                        <span style="color: #64748b;">GSTIN</span>
                        <span style="font-family: monospace; font-weight: 600;">22AACCE2709H2ZT</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 10px;">
                        <span style="color: #64748b;">PAN</span>
                        <span style="font-family: monospace; font-weight: 600;">AACCE2709H</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 10px;">
                        <span style="color: #64748b;">SAC Code</span>
                        <span style="font-family: monospace; font-weight: 600;">00440060</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Compact Service Description -->
                <div style="background: #f0fdf4; padding: 10px; border-radius: 4px; margin: 10px 0; border: 1px solid #dcfce7;">
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 2px;">
                  <h3 style="font-weight: 600; color: #166534; margin-bottom: 6px; font-size: 12px;">Service Description</h3>
                  <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">Professional Recruitment Services</div>
                </div>
                 

                <!-- Compact Amount Section -->
                <div class="amount-section" style="display: flex; justify-content: space-between; align-items: start; margin: 12px 0;">
                  <!-- Amount in Words -->
                  <div style="flex: 1;align-self:end; margin-right: 12px;">
                    <div style="text-align: start; margin-bottom: 8px;">
                      
                      <div style="color: #64748b; font-size: 10px; grid-template-columns: 1fr; gap: 4px; display: grid;">
                      <div>
                      Candidate Name: ${previewData.candidateName}
                      </div>
                      <div>
                      Location: ${previewData.state || 'N/A'}
                      </div>
                      <div>
                      CTC: ₹ ${formatCurrency(previewData.ctc)}
                      </div>
                      <div>
                      Joining Date: ${formatDate(previewData.invoiceDate)}
                      </div>
                    </div>
                </div>
                    <div style="background: #dbeafe; padding: 6px; border-radius: 4px; border: 1px solid #bfdbfe; font-size: 10px;">
                      <span style="font-weight: 600; color: #1e40af;">Amount in Words: </span>
                      <span style="color: #1e40af;">${numberToWords(Math.floor(parseFloat(previewData.totalAmount || 0)))}</span>
                    </div>
                  </div>
                  
                  <!-- Amount Calculation -->
                  <div style="min-width: 250px;">
                    <div style="background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
                      <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px;">
                        <span style="color: #64748b;">Service Amount</span>
                        <span style="font-weight: 600;">₹ ${formatCurrency(previewData.placementAmount)}</span>
                      </div>
                      
                      ${previewData.state === "Tamil Nadu" ? `
                      <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 10px;">
                        <span style="color: #64748b;">SGST (9%)</span>
                        <span>₹ ${formatCurrency(previewData.sgst)}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 10px;">
                        <span style="color: #64748b;">CGST (9%)</span>
                        <span>₹ ${formatCurrency(previewData.cgst)}</span>
                      </div>
                      ` : `
                      <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 10px;">
                        <span style="color: #64748b;">IGST (18%)</span>
                        <span>₹ ${formatCurrency(previewData.igst)}</span>
                      </div>
                      `}
                      
                      <div style="border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                          <span style="font-weight: 600; font-size: 12px;">Total Amount</span>
                          <span style="font-weight: 700; font-size: 16px; color: #3b82f6;">₹ ${formatCurrency(previewData.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Compact Payment & Bank Details -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0;">
                  <div>
                    <h3 style="font-weight: 600; margin-bottom: 4px; color: #374151; font-size: 11px;">Payment Instructions</h3>
                    <div style="background: #f8fafc; padding: 6px; border-radius: 3px; border: 1px solid #e2e8f0; font-size: 9px;">
                      <div style="margin-bottom: 2px;"><strong>Cheque:</strong> Favor of Staunch Jobs</div>
                      <div><strong>Online:</strong> Use bank details provided</div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 style="font-weight: 600; margin-bottom: 4px; color: #374151; font-size: 11px;">Bank Details</h3>
                    <div style="background: #f8fafc; padding: 6px; border-radius: 3px; border: 1px solid #e2e8f0; font-size: 9px;">
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <div><span style="color: #64748b;">A/c:</span> <strong>50200043382324</strong></div>
                        <div><span style="color: #64748b;">Bank:</span> <strong>HDFC Bank</strong></div>
                        <div><span style="color: #64748b;">IFSC:</span> <strong>HDFC0000269</strong></div>
                        <div><span style="color: #64748b;">Branch:</span> <strong>R.S Puram</strong></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Compact Footer -->
                <div class="footer-section" style="display: flex; justify-content: space-between; align-items: end; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                  <div style="font-size: 9px; color: #64748b;">
                    <div>Thank you for your business!</div>
                    <div>Generated on ${formatDate(new Date())}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 10px; font-weight: 600; margin-bottom: 12px;">For Staunch Jobs Pvt Ltd</div>
                    <div class="signature-area" style="width: 100px; height: 40px; background: #f1f5f9; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #64748b; margin-bottom: 2px;">
                      <img src=${DigitalSign} alt="Staunch Jobs" style="height: 32px; margin-right: 8px;" />
                    </div>
                    <div style="font-size: 9px; color: #64748b;">Authorized Signatory</div>
                  </div>
                </div>
                
                <!-- Compact Contact Footer -->
                <div class="contact-footer" style="background: linear-gradient(to right, #3b82f6, #06b6d4); color: white; padding: 6px; text-align: center; margin-top: 8px; border-radius: 3px;">
                  <div style="display: flex; justify-content: center; align-items: center; gap: 16px; font-size: 9px;">
                    <span>✉ info@staunchjobs.in</span>
                    <span>🌐 www.staunchjobs.com</span>
                  </div>
                </div>
                <!-- Genrated By -->
                <div class="text-center text-gray-500 text-xs mt-8"><span class="text-drak"></span> This File Genrated By Systematic <span class="text-drak"></span></div>
              </div>
            </div>
          </body>
          </html>
        `);

        previewWindow.document.close();
      }
    } catch (error) {
      console.error('Error loading invoice for preview:', error);
      toast.error('Failed to load invoice preview');
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-content');
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setSelectedInvoice(null);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Paid': 'bg-green-100 text-green-800',
      'Draft': 'bg-gray-100 text-gray-800',
      'Generated': 'bg-blue-100 text-blue-800',
      'Sent': 'bg-yellow-100 text-yellow-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return null;
  }

  return (
    <div className="text-black">
      <div className="bg-white p-[15px] rounded-[10px] shadow-sm flex justify-between mb-4">
        <h1 className="text-lg font-bold">Invoice Management</h1>
        <div>
          <span className='text-xs sm:text-sm font-medium'>
            Total Amount: <span className="text-blue-600 font-bold">{formatAmount(totalAmount)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium">
              Paid: <span className="text-green-600">{paidCount}</span>
            </span>
            <span className="text-xs sm:text-sm font-medium">
              Draft/Generated: <span className="text-yellow-600">{pendingCount}</span>
            </span>
            <span className="text-xs sm:text-sm font-medium">
              Cancelled: <span className="text-red-600">{overdueCount}</span>
            </span>
          </div>
          <button
            onClick={() => navigate('/invoice')}
            className="flex items-center gap-1 px-2 sm:px-3 py-1 text-xs sm:text-sm bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            <PlusSquare size={14} />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow px-4 py-2">
        <div className="flex flex-col sm:flex-row justify-between mb-2 items-start sm:items-center px-2 gap-2">
          <div className="text-gray-600 text-xs">
            Show{' '}
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="mx-2 border border-gray-300 rounded focus:outline-0 px-2 py-1"
            >
              {[10, 25, 50, 100].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>{' '}
            entries
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full sm:w-auto">
            <div className="flex gap-2 items-center">
              <label className="text-xs text-gray-600 font-medium">From:</label>
              <DatePicker
                selected={fromDate}
                onChange={(date) => {
                  setFromDate(date);
                  setCurrentPage(1);
                }}
                dateFormat="dd/MM/yyyy"
                className="border border-gray-300 rounded px-2 py-1 text-xs text-black focus:outline-0 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholderText="Select from date"
                showPopperArrow={false}
                isClearable
              />
            </div>

            <div className="flex gap-2 items-center">
              <label className="text-xs text-gray-600 font-medium">To:</label>
              <DatePicker
                selected={toDate}
                onChange={(date) => {
                  setToDate(date);
                  setCurrentPage(1);
                }}
                dateFormat="dd/MM/yyyy"
                className="border border-gray-300 rounded px-2 py-1 text-xs text-black focus:outline-0 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholderText="Select to date"
                showPopperArrow={false}
                isClearable
              />
            </div>

            <input
              type="text"
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-2 sm:px-3 py-1 text-xs sm:text-sm text-black placeholder:text-gray-500 focus:outline-0 w-full sm:w-auto"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-full max-h-[calc(100vh-300px)] sm:max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-desktop">
            <table className="w-full text-sm sm:text-sm text-left border border-gray-200">
              <thead className="bg-white text-xs uppercase text-black border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-2 sm:px-2 py-2 text-start w-[8%]">S.No</th>
                  <th className="px-2 sm:px-4 py-2 text-start w-[15%]">Invoice Number</th>
                  <th className="px-2 sm:px-4 py-2 text-center w-[12%]">Invoice Date</th>
                  <th className="px-2 sm:px-4 py-2 text-start w-[15%]">Candidate Name</th>
                  <th className="px-2 sm:px-4 py-2 text-center w-[12%]">Placement Amount</th>
                  <th className="px-2 sm:px-4 py-2 text-center w-[12%]">Total Amount</th>
                  <th className="px-2 sm:px-4 py-2 text-center w-[10%]">Status</th>
                  <th className="px-2 sm:px-4 py-2 text-end w-[16%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-gray-500">
                      <p className="text-md font-medium">
                        No invoices found
                      </p>
                      <p className="text-xs">
                        Try adjusting your search or filter criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((invoice, index) => (
                    <tr
                      key={invoice.id}
                      className="text-black border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-2 sm:px-2 py-1.5">
                        {(currentPage - 1) * entriesPerPage + index + 1}
                      </td>
                      <td className="px-2 sm:px-4 py-1.5 text-xs font-medium text-blue-600">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-2 sm:px-4 py-1.5 text-center text-xs">
                        {formatDate(invoice.invoiceDate)}
                      </td>
                      <td className="px-2 sm:px-4 py-1.5 text-xs font-medium">
                        {invoice.candidateName}
                      </td>
                      <td className="px-2 sm:px-4 py-1.5 text-center text-xs font-medium text-green-600">
                        ₹ {invoice.placementAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-2 sm:px-4 py-1.5 text-center text-xs font-bold text-blue-600">
                        ₹ {invoice.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-2 sm:px-4 py-1.5 text-center">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-2 sm:px-4 py-1.5 text-end">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEdit(invoice.id)}
                            className="p-1 rounded-full transition-all duration-300 hover:bg-blue-100/50 hover:scale-110 group"
                            title="Edit Invoice"
                          >
                            <Pencil className="w-4 h-4 text-blue-600 transition-all duration-300 group-hover:text-blue-700 group-hover:scale-110" />
                          </button>
                          <button
                            onClick={() => handlePreview(invoice.id)}
                            className="p-1 rounded-full transition-all duration-300 hover:bg-indigo-100/50 hover:scale-110 group"
                            title="Preview Invoice"
                          >
                            <FileText className="w-4 h-4 text-indigo-600 transition-all duration-300 group-hover:text-indigo-700 group-hover:scale-110" />
                          </button>
                          <button
                            onClick={() => handleDownload(invoice.id)}
                            className="p-1 rounded-full transition-all duration-300 hover:bg-purple-100/50 hover:scale-110 group"
                            title="Download Invoice"
                          >
                            <Download className="w-4 h-4 text-purple-600 transition-all duration-300 group-hover:text-purple-700 group-hover:scale-110" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredInvoices.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-2 py-2 sm:px-4 sm:py-3">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <div className="text-xs text-gray-500 mx-2 my-auto">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>

            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-gray-500">
                  Showing{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * entriesPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium text-gray-700">
                    {Math.min(
                      currentPage * entriesPerPage,
                      filteredInvoices.length
                    )}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{filteredInvoices.length}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-1.5 py-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">First</span>
                    <ChevronLeft className="size-3 sm:size-4" />
                    <ChevronLeft className="size-3 sm:size-4 -ml-1 sm:-ml-2" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="size-3 sm:size-4" />
                  </button>

                  {(() => {
                    const pages = [];
                    const siblings = 1;

                    const showLeftEllipsis = currentPage > siblings + 2;
                    const showRightEllipsis =
                      currentPage < totalPages - (siblings + 1);

                    const startPage = Math.max(2, currentPage - siblings);
                    const endPage = Math.min(
                      totalPages - 1,
                      currentPage + siblings
                    );

                    pages.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        className={`relative inline-flex items-center px-2.5 text-xs sm:text-sm font-semibold ${currentPage === 1
                          ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                          : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                          }`}
                      >
                        1
                      </button>
                    );

                    if (showLeftEllipsis) {
                      pages.push(
                        <span
                          key="left-ellipsis"
                          className="relative inline-flex items-center px-2.5 text-xs sm:text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
                        >
                          ...
                        </span>
                      );
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`relative inline-flex items-center px-2.5 text-xs sm:text-sm font-semibold ${i === currentPage
                            ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                            : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                            }`}
                        >
                          {i}
                        </button>
                      );
                    }

                    if (showRightEllipsis) {
                      pages.push(
                        <span
                          key="right-ellipsis"
                          className="relative inline-flex items-center px-2.5 text-xs sm:text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
                        >
                          ...
                        </span>
                      );
                    }

                    if (totalPages > 1) {
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className={`relative inline-flex items-center px-2.5 text-xs sm:text-sm font-semibold ${currentPage === totalPages
                            ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                            : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                            }`}
                        >
                          {totalPages}
                        </button>
                      );
                    }

                    return pages;
                  })()}

                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="size-3 sm:size-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-1.5 py-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Last</span>
                    <ChevronRight className="size-3 sm:size-4" />
                    <ChevronRight className="size-3 sm:size-4 -ml-1 sm:-ml-2" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Preview Modal */}
      {showPreview && selectedInvoice && (
        <InvoicePreview
          formData={selectedInvoice}
          onPrint={handlePrint}
          onClose={handleClosePreview}
        />
      )}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default InvoiceView;