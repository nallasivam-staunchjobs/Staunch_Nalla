import { API_URL, ENDPOINTS } from './config.js';

class InvoiceService {
    constructor() {
        this.baseURL = `${API_URL}${ENDPOINTS.INVOICES}`;
    }

    // Get all invoices with optional filters
    async getAll(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.candidate_id) queryParams.append('candidate_id', filters.candidate_id);
            if (filters.client_name) queryParams.append('client_name', filters.client_name);
            if (filters.search) queryParams.append('search', filters.search);
            
            const url = queryParams.toString() ? `${this.baseURL}?${queryParams}` : `${this.baseURL}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching invoices:', error);
            throw error;
        }
    }

    // Get single invoice by ID
    async getById(id) {
        try {
            const response = await fetch(`${this.baseURL}/${id}/`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching invoice:', error);
            throw error;
        }
    }

    // Create new invoice
    async create(invoiceData) {
        try {
            const response = await fetch(`${this.baseURL}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(invoiceData),
            });
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    // Try to get response as text first
                    const responseText = await response.text();
                    
                    // Try to parse as JSON
                    try {
                        const errorData = JSON.parse(responseText);
                        errorMessage = JSON.stringify(errorData);
                    } catch (jsonError) {
                        // If not JSON, log the HTML/text response
                        console.error('Server returned non-JSON response:', responseText);
                        errorMessage = `Server error: ${response.status} ${response.statusText}`;
                    }
                } catch (textError) {
                    console.error('Could not read response:', textError);
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw error;
        }
    }

    // Create new invoice (alias for compatibility)
    async createInvoice(invoiceData) {
        return this.create(invoiceData);
    }

    // Update invoice (alias for compatibility)
    async updateInvoice(id, invoiceData) {
        return this.update(id, invoiceData);
    }

    // Update existing invoice
    async update(id, invoiceData) {
        try {
            const response = await fetch(`${this.baseURL}/${id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(invoiceData),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error updating invoice:', error);
            throw error;
        }
    }

    // Partial update invoice
    async partialUpdate(id, invoiceData) {
        try {
            const response = await fetch(`${this.baseURL}/${id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(invoiceData),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error updating invoice:', error);
            throw error;
        }
    }

    // Delete invoice
    async delete(id) {
        try {
            const response = await fetch(`${this.baseURL}/${id}/`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error deleting invoice:', error);
            throw error;
        }
    }

    // Get dashboard statistics
    async getDashboardStats() {
        try {
            const response = await fetch(`${this.baseURL}/dashboard_stats/`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    }

    // Change invoice status
    async changeStatus(id, status) {
        try {
            const response = await fetch(`${this.baseURL}/${id}/change_status/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error changing invoice status:', error);
            throw error;
        }
    }

    // Generate unique invoice number
    async generateInvoiceNumber() {
        try {
            const response = await fetch(`${this.baseURL}/generate_invoice_number/`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error generating invoice number:', error);
            throw error;
        }
    }

    // Get candidates for invoice
    async getCandidatesForInvoice() {
        try {
            const response = await fetch(`${this.baseURL}/candidates_for_invoice/`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching candidates:', error);
            throw error;
        }
    }

    // Download invoice file
    async downloadInvoice(id) {
        try {
            const response = await fetch(`${this.baseURL}/${id}/download_invoice/`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `invoice_${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            return true;
        } catch (error) {
            console.error('Error downloading invoice:', error);
            throw error;
        }
    }
}

export const invoiceService = new InvoiceService();
