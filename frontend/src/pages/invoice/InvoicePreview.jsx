import React from 'react';

const InvoicePreview = ({ formData, onPrint, onClose }) => {
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

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header Controls */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Invoice Preview</h2>
          <div className="flex gap-2">
            <button
              onClick={onPrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Print Invoice
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div id="invoice-content" className="p-8 bg-white relative overflow-hidden">
          {/* Watermarks */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <div className="text-6xl font-bold text-blue-600 transform rotate-45">Staunch Jobs1234567</div>
          </div>
          
          {/* Company Header */}
          <table className="w-full mb-6">
            <tbody>
              <tr>
                <td className="w-2/3 align-top">
                  <div className="w-48 h-24 bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-500 text-sm">
                    [Company Logo]
                  </div>
                </td>
                <td className="w-1/3 align-top text-left">
                  <div className="text-sm leading-relaxed">
                    <div>Staunch Jobs 311,</div>
                    <div>1st floor,</div>
                    <div>9th street (ext),</div>
                    <div>Gandhipuram,</div>
                    <div>Coimbatore-641012</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Main Invoice Table */}
          <table className="w-full border border-gray-800" style={{lineHeight: '1.5'}}>
            <tbody>
              {/* Tax Invoice Header */}
              <tr>
                <th colSpan="3" className="text-center text-lg border-none py-2">
                  <h4 className="text-red-600 font-bold text-xl">TAX INVOICE</h4>
                </th>
              </tr>
              
              {/* Bill To and Invoice Details */}
              <tr>
                <td rowSpan="7" className="align-top p-3 border-r border-gray-800 w-1/2">
                  <div className="text-sm">
                    <div className="mb-2">To,</div>
                    <div className="font-semibold">{formData.clientName || 'Client Name'}</div>
                    <div className="text-xs mt-1 mb-3">
                      {formData.clientAddress || '6th Floor,Tower 3, Wing B,Kohinoor City Mall, Kohinoor City, Kirol Road,Kurla,Mumbai Suburban,Maharashtra-400070'}
                    </div>
                    <div className="mb-1"><strong>Place of Supply:</strong> {formData.state || 'Chennai - Tamil Nadu'}</div>
                    <div className="mt-4 space-y-1">
                      <div><strong>PAN:</strong> {formData.clientPAN || 'AACCE2709H'}</div>
                      <div><strong>GSTIN:</strong> {formData.clientGST || '27AACCE2709H2ZT'}</div>
                    </div>
                  </div>
                </td>
                <td className="p-2 border-r border-gray-800 text-sm">Invoice No</td>
                <td className="p-2 text-right text-sm">{formData.invoiceNumber}</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-gray-800 text-sm">Invoice Date</td>
                <td className="p-2 text-right text-sm">{formatDate(formData.invoiceDate)}</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-gray-800 text-sm">Client ID</td>
                <td className="p-2 text-right text-sm">{formData.empCode}</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-gray-800 text-sm">GSTIN</td>
                <td className="p-2 text-right text-sm">33ACZFS8740G1ZH</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-gray-800 text-sm">PAN NO</td>
                <td className="p-2 text-right text-sm">ACZFS8740G</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-gray-800 text-sm">SAC Code</td>
                <td className="p-2 text-right text-sm">00440060</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-gray-800 text-sm">Category of Service</td>
                <td className="p-2 text-right text-sm">Manpower Recruitment Agency</td>
              </tr>

              {/* Service Description Header */}
              <tr>
                <th colSpan="2" className="text-center p-2 border-t border-gray-800 font-bold">Description</th>
                <th className="text-center p-2 border-t border-gray-800 font-bold">Amount</th>
              </tr>
              
              {/* Service Details */}
              <tr>
                <td colSpan="2" className="p-3 text-xs border-t border-gray-800">
                  <p className="text-center mb-2 underline font-semibold">Service Charges for the Recruitment</p>
                  <p className="text-center mb-3 italic">Details of the Employee</p>
                  <div className="space-y-1">
                    <div>Name of the Employee: {formData.candidateName || 'V VISHAL'}</div>
                    <div>Date of Joining: {formatDate(formData.invoiceDate)}</div>
                    <div>Emp Code: {formData.empCode}</div>
                    <div>Location: {formData.state || 'Chennai'}</div>
                    <div>CTC: {formatCurrency(formData.ctc)}</div>
                  </div>
                </td>
                <td className="text-center p-3 border-t border-gray-800">{formatCurrency(formData.placementAmount)}</td>
              </tr>

              {/* Tax Rows */}
              <tr className={formData.state !== "Tamil Nadu" ? "" : "hidden"}>
                <td colSpan="2" className="text-right p-2 border-t border-gray-800">IGST - 18%</td>
                <td className="text-center p-2 border-t border-gray-800">{formatCurrency(formData.igst)}</td>
              </tr>
              <tr className={formData.state === "Tamil Nadu" ? "" : "hidden"}>
                <td colSpan="2" className="text-right p-2 border-t border-gray-800">SGST - 9%</td>
                <td className="text-center p-2 border-t border-gray-800">{formatCurrency(formData.sgst)}</td>
              </tr>
              <tr className={formData.state === "Tamil Nadu" ? "" : "hidden"}>
                <td colSpan="2" className="text-right p-2 border-t border-gray-800">CGST - 9%</td>
                <td className="text-center p-2 border-t border-gray-800">{formatCurrency(formData.cgst)}</td>
              </tr>
              <tr>
                <td colSpan="2" className="text-right p-2 border-t border-gray-800 font-bold">Total</td>
                <td className="text-center p-2 border-t border-gray-800 font-bold">{formatCurrency(formData.totalAmount)}</td>
              </tr>

              {/* Amount in Words */}
              <tr>
                <td colSpan="3" className="p-3 border-t border-gray-800">
                  <strong>Total in Words:</strong>
                  <span className="ml-2">{numberToWords(Math.floor(parseFloat(formData.totalAmount || 0)))}</span>
                </td>
              </tr>
              
              {/* Payment Instructions */}
              <tr>
                <td colSpan="3" className="p-3 border-t border-gray-800">
                  <strong><u>Payment Instructions</u></strong><br/>
                  Cheque: Please issue in favor of Staunch Jobs
                </td>
              </tr>
              
              {/* Bank Details Header */}
              <tr>
                <th rowSpan="5" className="w-1/2 p-3 border-t border-gray-800 align-top">
                  RTGS / NEFT :
                </th>
              </tr>
              <tr>
                <th className="p-2 border-t border-gray-800"><u>Code Details</u></th>
                <th className="p-2 border-t border-gray-800"><u>Bank Address</u></th>
              </tr>
              
              {/* Bank Details */}
              <tr>
                <td className="p-2 border-t border-gray-800">Account No 50200043382324</td>
                <td className="p-2 border-t border-gray-800">HDFC Bank,</td>
              </tr>
              <tr>
                <td className="p-2 border-t border-gray-800">IFSC Code HDFC0000269</td>
                <td className="p-2 border-t border-gray-800">DB Road, R.S Puram,</td>
              </tr>
              <tr>
                <td className="p-2 border-t border-gray-800">MICR Code 641240003</td>
                <td className="p-2 border-t border-gray-800">Coimbatore - 641002</td>
              </tr>
              
              {/* Signature */}
              <tr>
                <th colSpan="3" className="text-left p-4 border-t border-gray-800">
                  For Staunch Jobs<br/>
                  <div className="w-64 h-20 bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-500 text-sm my-2">
                    [Signature Image]
                  </div>
                  Authorized Signatory
                </th>
              </tr>
            </tbody>
          </table>
          
          {/* Contact Information */}
          <div className="mt-6 text-center">
            <span className="text-blue-600">Contact us: </span>
            <span className="text-red-600">82204-16176 || E-mail: </span>
            <span className="text-blue-600">cv@staunchjobs.in</span>
            <span className="text-red-600"> || </span>
            <span className="text-blue-800">www.staunchjobs.com</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreview;
