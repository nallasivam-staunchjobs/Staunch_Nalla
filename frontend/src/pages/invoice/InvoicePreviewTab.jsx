import React from 'react';

const InvoicePreviewTab = ({ formData }) => {
  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toFixed(2);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice Preview - ${formData.invoiceNumber}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white !important; }
          .print-shadow { box-shadow: none !important; }
        }
        .glass-effect {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .smooth-shadow {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .elegant-shadow {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      </style>
    </head>
    <body class="bg-gray-50 min-h-screen">
      <!-- Clean Toolbar -->
      <div class="no-print sticky top-0 z-50 bg-white/80 glass-effect border-b border-gray-200/50">
        <div class="max-w-6xl mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <h1 class="text-lg font-semibold text-gray-900">Invoice Preview</h1>
                <p class="text-sm text-gray-500">${formData.invoiceNumber}</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <button onclick="window.print()" class="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-200 hover-lift smooth-shadow">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                </svg>
                Print
              </button>
              <button onclick="navigator.share ? navigator.share({title: 'Invoice ${formData.invoiceNumber}', url: window.location.href}) : alert('Share feature not supported')" class="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 hover-lift">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
                </svg>
                Share
              </button>
              <button onclick="window.close()" class="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 hover-lift">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Invoice Content -->
      <div class="max-w-4xl mx-auto p-8">
        <div class="bg-white rounded-2xl elegant-shadow print-shadow overflow-hidden">
          <!-- Company Header -->
          <div class="bg-gradient-to-r from-gray-50 to-blue-50/30 px-8 py-6 border-b border-gray-100">
            <div class="flex justify-between items-start">
              <div class="flex items-center space-x-4">
                <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center">
                  <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                </div>
                <div>
                  <h1 class="text-2xl font-bold text-gray-900">Staunch Jobs1234567</h1>
                  <p class="text-gray-600 text-sm">Professional Recruitment Services</p>
                </div>
              </div>
              <div class="text-right text-sm text-gray-600 leading-relaxed">
                <div class="font-semibold text-gray-900 mb-1">Staunch Jobs Pvt Ltd</div>
                <div>311, 1st Floor, 9th Street (Ext)</div>
                <div>Gandhipuram, Coimbatore - 641012</div>
                <div class="mt-2 text-blue-600">www.staunchjobs.com</div>
              </div>
            </div>
          </div>

          <!-- Invoice Header -->
          <div class="px-8 py-6 bg-gradient-to-r from-red-50 to-pink-50 border-b border-gray-100">
            <div class="text-center">
              <h2 class="text-3xl font-bold text-red-600 mb-2">TAX INVOICE</h2>
              <div class="w-24 h-1 bg-red-500 mx-auto rounded-full"></div>
            </div>
          </div>

          <!-- Invoice Details -->
          <div class="px-8 py-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <!-- Bill To -->
              <div class="space-y-4">
                <h3 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Bill To</h3>
                <div class="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div class="font-semibold text-gray-900 text-lg">${formData.clientName || 'Client Name'}</div>
                  <div class="text-sm text-gray-600 leading-relaxed">
                    ${formData.clientAddress || '6th Floor, Tower 3, Wing B, Kohinoor City Mall, Kohinoor City, Kirol Road, Kurla, Mumbai Suburban, Maharashtra-400070'}
                  </div>
                  <div class="grid grid-cols-2 gap-4 pt-2">
                    <div class="bg-white rounded-lg p-3 border border-gray-200">
                      <div class="text-xs text-gray-500 uppercase tracking-wide">PAN</div>
                      <div class="font-mono font-semibold text-gray-900">${formData.clientPAN || 'AACCE2709H'}</div>
                    </div>
                    <div class="bg-white rounded-lg p-3 border border-gray-200">
                      <div class="text-xs text-gray-500 uppercase tracking-wide">GSTIN</div>
                      <div class="font-mono font-semibold text-gray-900">${formData.clientGST || '27AACCE2709H2ZT'}</div>
                    </div>
                  </div>
                  <div class="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div class="text-xs text-blue-600 uppercase tracking-wide">Place of Supply</div>
                    <div class="font-semibold text-blue-900">${formData.state || 'Chennai - Tamil Nadu'}</div>
                  </div>
                </div>
              </div>

              <!-- Invoice Info -->
              <div class="space-y-4">
                <h3 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Invoice Details</h3>
                <div class="space-y-3">
                  <div class="flex justify-between items-center py-2 border-b border-gray-100">
                    <span class="text-gray-600">Invoice Number</span>
                    <span class="font-semibold text-gray-900">${formData.invoiceNumber}</span>
                  </div>
                  <div class="flex justify-between items-center py-2 border-b border-gray-100">
                    <span class="text-gray-600">Invoice Date</span>
                    <span class="font-semibold text-gray-900">${formatDate(formData.invoiceDate)}</span>
                  </div>
                  <div class="flex justify-between items-center py-2 border-b border-gray-100">
                    <span class="text-gray-600">Client ID</span>
                    <span class="font-semibold text-gray-900">${formData.empCode}</span>
                  </div>
                  <div class="flex justify-between items-center py-2 border-b border-gray-100">
                    <span class="text-gray-600">SAC Code</span>
                    <span class="font-mono font-semibold text-gray-900">00440060</span>
                  </div>
                  <div class="flex justify-between items-center py-2">
                    <span class="text-gray-600">Service Category</span>
                    <span class="font-semibold text-gray-900">Manpower Recruitment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Service Details -->
          <div class="px-8 py-6 bg-gradient-to-r from-green-50 to-emerald-50 border-y border-gray-100">
            <h3 class="text-lg font-semibold text-green-800 mb-4">Service Description</h3>
            <div class="bg-white rounded-xl p-6 border border-green-200">
              <div class="text-center mb-6">
                <h4 class="text-xl font-bold text-gray-900 mb-2">Professional Recruitment Services</h4>
                <p class="text-gray-600">Employee Placement & Consultation</p>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div class="text-xs text-blue-600 uppercase tracking-wide mb-1">Employee Name</div>
                  <div class="font-semibold text-blue-900">${formData.candidateName || 'V VISHAL'}</div>
                </div>
                <div class="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div class="text-xs text-green-600 uppercase tracking-wide mb-1">Date of Joining</div>
                  <div class="font-semibold text-green-900">${formatDate(formData.invoiceDate)}</div>
                </div>
                <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div class="text-xs text-purple-600 uppercase tracking-wide mb-1">Employee Code</div>
                  <div class="font-semibold text-purple-900">${formData.empCode}</div>
                </div>
                <div class="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div class="text-xs text-orange-600 uppercase tracking-wide mb-1">Location</div>
                  <div class="font-semibold text-orange-900">${formData.state || 'Chennai'}</div>
                </div>
              </div>
              
              <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Annual CTC</span>
                  <span class="text-2xl font-bold text-gray-900">₹ ${formatCurrency(formData.ctc)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Amount Calculation -->
          <div class="px-8 py-6">
            <div class="max-w-md ml-auto">
              <div class="space-y-3">
                <div class="flex justify-between items-center py-2">
                  <span class="text-gray-600">Service Amount</span>
                  <span class="font-semibold text-gray-900">₹ ${formatCurrency(formData.placementAmount)}</span>
                </div>
                
                ${formData.state === "Tamil Nadu" ? `
                <div class="flex justify-between items-center py-2 text-sm">
                  <span class="text-gray-600">SGST (9%)</span>
                  <span class="text-gray-900">₹ ${formatCurrency(formData.sgst)}</span>
                </div>
                <div class="flex justify-between items-center py-2 text-sm">
                  <span class="text-gray-600">CGST (9%)</span>
                  <span class="text-gray-900">₹ ${formatCurrency(formData.cgst)}</span>
                </div>
                ` : `
                <div class="flex justify-between items-center py-2 text-sm">
                  <span class="text-gray-600">IGST (18%)</span>
                  <span class="text-gray-900">₹ ${formatCurrency(formData.igst)}</span>
                </div>
                `}
                
                <div class="border-t border-gray-200 pt-3">
                  <div class="flex justify-between items-center">
                    <span class="text-lg font-semibold text-gray-900">Total Amount</span>
                    <span class="text-2xl font-bold text-blue-600">₹ ${formatCurrency(formData.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Amount in Words -->
          <div class="px-8 py-4 bg-blue-50 border-y border-blue-200">
            <div class="text-sm">
              <span class="font-semibold text-blue-900">Amount in Words: </span>
              <span class="text-blue-800">${numberToWords(Math.floor(parseFloat(formData.totalAmount || 0)))}</span>
            </div>
          </div>

          <!-- Payment & Bank Details -->
          <div class="px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Payment Instructions</h3>
              <div class="bg-gray-50 rounded-xl p-4 space-y-3">
                <div class="text-sm text-gray-600">
                  <strong>Cheque:</strong> Please issue in favor of <strong>Staunch Jobs</strong>
                </div>
                <div class="text-sm text-gray-600">
                  <strong>Online Transfer:</strong> Use the bank details provided
                </div>
              </div>
            </div>
            
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Bank Details</h3>
              <div class="bg-gray-50 rounded-xl p-4 space-y-3">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide">Account No</div>
                    <div class="font-mono font-semibold text-gray-900">50200043382324</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide">Bank</div>
                    <div class="font-semibold text-gray-900">HDFC Bank</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide">IFSC Code</div>
                    <div class="font-mono font-semibold text-gray-900">HDFC0000269</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide">Branch</div>
                    <div class="font-semibold text-gray-900">R.S Puram, Coimbatore</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-8 py-6 bg-gray-50 border-t border-gray-200">
            <div class="flex justify-between items-end">
              <div class="text-sm text-gray-600">
                <div>Thank you for your business!</div>
                <div class="mt-1">Generated on ${formatDate(new Date())}</div>
              </div>
              <div class="text-right">
                <div class="text-sm font-semibold text-gray-900 mb-8">For Staunch Jobs Pvt Ltd</div>
                <div class="w-32 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500 mb-2">
                  [Digital Signature]
                </div>
                <div class="text-sm text-gray-600">Authorized Signatory</div>
              </div>
            </div>
          </div>

          <!-- Contact Footer -->
          <div class="px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
            <div class="flex justify-center items-center space-x-8 text-sm">
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                </svg>
                <span>82204-16176</span>
              </div>
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                <span>cv@staunchjobs.in</span>
              </div>
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"></path>
                </svg>
                <span>www.staunchjobs.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default InvoicePreviewTab;
