const SimpleInvoicePreview = (previewData, formatCurrency, formatDate, numberToWords) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice - ${previewData.invoiceNumber}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        body { background: #f8fafc; color: #1e293b; line-height: 1.4; }
        .container { max-width: 800px; margin: 0 auto; background: white; min-height: 100vh; }
        .toolbar { position: sticky; top: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-bottom: 1px solid #e2e8f0; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; z-index: 100; }
        .btn { padding: 8px 16px; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: #3b82f6; color: white; }
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
      <div class="container">
        <div class="toolbar">
          <div style="font-weight: 600; color: #1e293b;">Invoice ${previewData.invoiceNumber}</div>
          <div>
            <button onclick="window.print()" class="btn btn-primary">Print</button>
            <button onclick="window.close()" class="btn btn-secondary">Close</button>
          </div>
        </div>
        
        <div class="invoice">
          <div class="header">
            <div>
              <div class="company">Staunch Jobs 1234567</div>
              <div class="company-sub">Professional Recruitment Services</div>
            </div>
            <div class="company-address">
              <div><strong>Staunch Jobs Pvt Ltd</strong></div>
              <div>311, 1st Floor, 9th Street (Ext)</div>
              <div>Gandhipuram, Coimbatore - 641012</div>
              <div style="color: #3b82f6; margin-top: 4px;">www.staunchjobs.com</div>
            </div>
          </div>
          
          <div class="invoice-title">TAX INVOICE</div>
          
          <div class="details">
            <div>
              <div class="section-title">Bill To</div>
              <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div style="font-weight: 600; margin-bottom: 6px;">${previewData.clientName}</div>
                <div style="font-size: 11px; color: #64748b; line-height: 1.4; margin-bottom: 8px;">
                  ${previewData.clientAddress || '6th Floor, Tower 3, Wing B, Kohinoor City Mall, Kohinoor City, Kirol Road, Kurla, Mumbai Suburban, Maharashtra-400070'}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                  <div style="background: white; padding: 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
                    <div style="font-size: 9px; color: #64748b;">PAN</div>
                    <div style="font-weight: 600; font-size: 10px;">${previewData.clientPAN || 'AACCE2709H'}</div>
                  </div>
                  <div style="background: white; padding: 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
                    <div style="font-size: 9px; color: #64748b;">GSTIN</div>
                    <div style="font-weight: 600; font-size: 10px;">${previewData.clientGST || '27AACCE2709H2ZT'}</div>
                  </div>
                </div>
                <div style="background: #eff6ff; padding: 6px; border-radius: 4px; margin-top: 6px; border: 1px solid #bfdbfe;">
                  <div style="font-size: 9px; color: #3b82f6;">Place of Supply</div>
                  <div style="font-weight: 600; color: #1e40af; font-size: 10px;">${previewData.state}</div>
                </div>
              </div>
            </div>
            
            <div>
              <div class="section-title">Invoice Details</div>
              <div class="info-row">
                <span class="info-label">Invoice Number</span>
                <span class="info-value">${previewData.invoiceNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Invoice Date</span>
                <span class="info-value">${formatDate(previewData.invoiceDate)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Client ID</span>
                <span class="info-value">${previewData.empCode}</span>
              </div>
              <div class="info-row">
                <span class="info-label">SAC Code</span>
                <span class="info-value">00440060</span>
              </div>
              <div class="info-row">
                <span class="info-label">Service Category</span>
                <span class="info-value">Manpower Recruitment</span>
              </div>
            </div>
          </div>
          
          <div class="service-box">
            <div class="service-title">Professional Recruitment Services</div>
            <div style="color: #64748b; font-size: 12px; margin-bottom: 12px;">Employee Placement & Consultation</div>
            
            <div class="employee-grid">
              <div class="employee-item">
                <div class="employee-label">Employee Name</div>
                <div class="employee-value">${previewData.candidateName}</div>
              </div>
              <div class="employee-item">
                <div class="employee-label">Date of Joining</div>
                <div class="employee-value">${formatDate(previewData.invoiceDate)}</div>
              </div>
              <div class="employee-item">
                <div class="employee-label">Employee Code</div>
                <div class="employee-value">${previewData.empCode}</div>
              </div>
              <div class="employee-item">
                <div class="employee-label">Location</div>
                <div class="employee-value">${previewData.state}</div>
              </div>
            </div>
            
            <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0; margin-top: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b; font-size: 12px;">Annual CTC</span>
                <span style="font-weight: 700; font-size: 16px;">₹ ${formatCurrency(previewData.ctc)}</span>
              </div>
            </div>
          </div>
          
          <div class="amount-section">
            <div class="amount-box">
              <div class="amount-row">
                <span>Service Amount</span>
                <span>₹ ${formatCurrency(previewData.placementAmount)}</span>
              </div>
              ${previewData.state === "Tamil Nadu" ? `
              <div class="amount-row">
                <span>SGST (9%)</span>
                <span>₹ ${formatCurrency(previewData.sgst)}</span>
              </div>
              <div class="amount-row">
                <span>CGST (9%)</span>
                <span>₹ ${formatCurrency(previewData.cgst)}</span>
              </div>
              ` : `
              <div class="amount-row">
                <span>IGST (18%)</span>
                <span>₹ ${formatCurrency(previewData.igst)}</span>
              </div>
              `}
              <div class="amount-row total-row">
                <span>Total Amount</span>
                <span class="total-amount">₹ ${formatCurrency(previewData.totalAmount)}</span>
              </div>
            </div>
          </div>
          
          <div class="words">
            <strong>Amount in Words:</strong> ${numberToWords(Math.floor(parseFloat(previewData.totalAmount || 0)))}
          </div>
          
          <div class="footer-grid">
            <div class="footer-section">
              <div class="footer-title">Payment Instructions</div>
              <div class="footer-content">
                <div><strong>Cheque:</strong> Please issue in favor of Staunch Jobs</div>
                <div><strong>Online Transfer:</strong> Use the bank details provided</div>
              </div>
            </div>
            
            <div class="footer-section">
              <div class="footer-title">Bank Details</div>
              <div class="footer-content">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                  <div><strong>Account No:</strong> 50200043382324</div>
                  <div><strong>Bank:</strong> HDFC Bank</div>
                  <div><strong>IFSC:</strong> HDFC0000269</div>
                  <div><strong>Branch:</strong> R.S Puram, Coimbatore</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="signature-section">
            <div style="font-size: 11px; color: #64748b;">
              <div>Thank you for your business!</div>
              <div>Generated on ${formatDate(new Date())}</div>
            </div>
            <div class="signature-box">
              <div style="font-size: 11px; font-weight: 600; margin-bottom: 8px;">For Staunch Jobs Pvt Ltd</div>
              <div class="signature-placeholder">[Digital Signature]</div>
              <div style="font-size: 10px; color: #64748b;">Authorized Signatory</div>
            </div>
          </div>
        </div>
        
        <div class="contact-bar">
          <span>📞 82204-16176</span>
          <span>✉️ cv@staunchjobs.in</span>
          <span>🌐 www.staunchjobs.com</span>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default SimpleInvoicePreview;
