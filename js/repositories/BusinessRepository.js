// Business Repository
// Centralizes all business-related data operations
// Works with both online (MongoDB) and offline (IndexedDB) storage

class BusinessRepository {
    constructor() {
        this.dataService = window.dataService;
        this.db = window.db;
        this.apiClient = window.apiClient;
    }

    // CREATE Operations
    async createBusiness(businessData) {
        try {
            // Save locally first
            if (this.db) {
                await this.db.put('settings', {
                    key: 'businessInfo',
                    value: businessData
                });
            }

            // Sync to server if online
            if (this.apiClient) {
                const response = await this.apiClient.post('/api/businesses', businessData);
                if (response.ok) {
                    const data = await response.json();
                    return { success: true, data };
                }
            }

            return { success: true, data: businessData };
        } catch (error) {
            console.error('Create business error:', error);
            return { success: false, error: error.message };
        }
    }

    // READ Operations
    async getBusinessById(businessId) {
        try {
            // Check cache first
            if (this.dataService) {
                const cached = await this.dataService.getBusinessInfo(businessId);
                if (cached) return { success: true, data: cached };
            }

            // Try API
            if (this.apiClient) {
                const response = await this.apiClient.get(`/api/businesses/${businessId}`);
                if (response.ok) {
                    const data = await response.json();
                    return { success: true, data };
                }
            }

            // Fallback to local storage
            if (this.db) {
                const local = await this.db.get('settings', 'businessInfo');
                if (local?.value) {
                    return { success: true, data: local.value };
                }
            }

            return { success: false, error: 'Business not found' };
        } catch (error) {
            console.error('Get business error:', error);
            return { success: false, error: error.message };
        }
    }

    async getPublishedBusinesses() {
        try {
            const config = window.appConfig || { getApiUrl: () => 'https://ava-pwa-backend.onrender.com/api' };
            const apiUrl = config.getApiUrl('pwa');
            
            // Try API first
            const response = await fetch(`${apiUrl}/auth/public/businesses`);
            if (response.ok) {
                const data = await response.json();
                return { success: true, data: data.data || [] };
            }

            // Fallback to demo data
            return {
                success: true,
                data: [
                    { id: 'demo-1', name: 'Serenity Wellness Spa', businessType: 'spa' },
                    { id: 'demo-2', name: 'Zen Garden Massage', businessType: 'massage' },
                    { id: 'demo-3', name: 'Harmony Health Center', businessType: 'wellness' }
                ]
            };
        } catch (error) {
            console.error('Get published businesses error:', error);
            // Return demo data on error
            return {
                success: true,
                data: [
                    { id: 'demo-1', name: 'Serenity Wellness Spa', businessType: 'spa' },
                    { id: 'demo-2', name: 'Zen Garden Massage', businessType: 'massage' },
                    { id: 'demo-3', name: 'Harmony Health Center', businessType: 'wellness' }
                ]
            };
        }
    }

    async getBusinessCatalog(businessId) {
        try {
            // Use data service for caching
            if (this.dataService) {
                const services = await this.dataService.getServices(businessId);
                const employees = await this.dataService.getEmployees(businessId);
                
                return {
                    success: true,
                    data: {
                        services,
                        employees,
                        businessId
                    }
                };
            }

            // Direct API call
            const config = window.appConfig || { getApiUrl: () => 'https://ava-pwa-backend.onrender.com/api' };
            const apiUrl = config.getApiUrl('pwa');
            
            const response = await fetch(`${apiUrl}/auth/public/business-catalog/${businessId}`);
            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            }

            // Fallback to local data
            if (this.db) {
                const products = await this.db.getAll('products');
                const employees = await this.db.getAll('employees');
                
                return {
                    success: true,
                    data: {
                        services: products.filter(p => p.category === 'service'),
                        employees
                    }
                };
            }

            return { success: false, error: 'Catalog not found' };
        } catch (error) {
            console.error('Get business catalog error:', error);
            return { success: false, error: error.message };
        }
    }

    // UPDATE Operations
    async updateBusiness(businessId, updates) {
        try {
            // Update locally first
            if (this.db) {
                const existing = await this.db.get('settings', 'businessInfo');
                if (existing?.value) {
                    const updated = { ...existing.value, ...updates };
                    await this.db.put('settings', {
                        key: 'businessInfo',
                        value: updated
                    });
                }
            }

            // Sync to server if online
            if (this.apiClient) {
                const response = await this.apiClient.put(`/api/businesses/${businessId}`, updates);
                if (response.ok) {
                    const data = await response.json();
                    return { success: true, data };
                }
            }

            return { success: true, data: updates };
        } catch (error) {
            console.error('Update business error:', error);
            return { success: false, error: error.message };
        }
    }

    async publishCatalog(businessId, catalog) {
        try {
            // Use data service for publishing
            if (this.dataService) {
                const result = await this.dataService.publishCatalog(
                    catalog.services || [],
                    catalog.employees || []
                );
                return { success: true, data: result };
            }

            // Direct API call
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                return { success: false, error: 'Authentication required' };
            }

            const config = window.appConfig || { getApiUrl: () => 'https://ava-pwa-backend.onrender.com/api' };
            const apiUrl = config.getApiUrl('pwa');
            
            const response = await fetch(`${apiUrl}/auth/publish-catalog`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    products: catalog.services || [],
                    employees: catalog.employees || []
                })
            });

            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            console.error('Publish catalog error:', error);
            return { success: false, error: error.message };
        }
    }

    // DELETE Operations
    async deleteBusiness(businessId) {
        try {
            // Remove from local storage
            if (this.db) {
                await this.db.delete('settings', 'businessInfo');
            }

            // Delete on server if online
            if (this.apiClient) {
                const response = await this.apiClient.delete(`/api/businesses/${businessId}`);
                if (response.ok) {
                    return { success: true };
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Delete business error:', error);
            return { success: false, error: error.message };
        }
    }

    // SEARCH Operations
    async searchBusinesses(query) {
        try {
            // Search online if available
            if (this.apiClient) {
                const response = await this.apiClient.get(`/api/businesses/search?q=${encodeURIComponent(query)}`);
                if (response.ok) {
                    const data = await response.json();
                    return { success: true, data: data.data || [] };
                }
            }

            // Search locally
            if (this.db) {
                const allBusinesses = await this.getPublishedBusinesses();
                if (allBusinesses.success) {
                    const filtered = allBusinesses.data.filter(b => 
                        b.name?.toLowerCase().includes(query.toLowerCase()) ||
                        b.businessName?.toLowerCase().includes(query.toLowerCase())
                    );
                    return { success: true, data: filtered };
                }
            }

            return { success: true, data: [] };
        } catch (error) {
            console.error('Search businesses error:', error);
            return { success: false, error: error.message };
        }
    }

    // STATISTICS Operations
    async getBusinessStats(businessId) {
        try {
            const stats = {
                totalServices: 0,
                totalEmployees: 0,
                totalBookings: 0,
                totalRevenue: 0
            };

            // Get catalog
            const catalog = await this.getBusinessCatalog(businessId);
            if (catalog.success) {
                stats.totalServices = catalog.data.services?.length || 0;
                stats.totalEmployees = catalog.data.employees?.length || 0;
            }

            // Get bookings count
            if (this.db) {
                const bookings = await this.db.getAll('bookings');
                stats.totalBookings = bookings.length;
                
                // Calculate revenue from transactions
                const transactions = await this.db.getAll('transactions');
                stats.totalRevenue = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
            }

            return { success: true, data: stats };
        } catch (error) {
            console.error('Get business stats error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const businessRepository = new BusinessRepository();

// Export for use
window.businessRepository = businessRepository;

export default businessRepository;