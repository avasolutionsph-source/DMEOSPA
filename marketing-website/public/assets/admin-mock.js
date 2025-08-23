// Mock data for admin dashboard when backend is not available
const mockAdminData = {
    stats: {
        totalUsers: 3,
        activeUsers: 3,
        totalRevenue: 25000,
        planDistribution: [
            { _id: 'unpaid', count: 1 },
            { _id: 'basic', count: 1 },
            { _id: 'professional', count: 1 },
            { _id: 'enterprise', count: 0 }
        ]
    },
    users: [
        {
            _id: 'user-1',
            id: 'user-1',
            email: 'john@example.com',
            firstName: 'John',
            lastName: 'Doe',
            businessName: 'John\'s Spa',
            subscriptionPlan: 'professional',
            subscriptionStatus: 'active',
            createdAt: new Date('2024-01-15').toISOString(),
            businessMetrics: {
                lastActiveDate: new Date('2024-12-20').toISOString()
            }
        },
        {
            _id: 'user-2',
            id: 'user-2',
            email: 'jane@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            businessName: 'Wellness Center',
            subscriptionPlan: 'basic',
            subscriptionStatus: 'active',
            createdAt: new Date('2024-02-20').toISOString(),
            businessMetrics: {
                lastActiveDate: new Date('2024-12-19').toISOString()
            }
        },
        {
            _id: 'user-3',
            id: 'user-3',
            email: 'demo@spa.com',
            firstName: 'Demo',
            lastName: 'User',
            businessName: 'Demo Business',
            subscriptionPlan: 'unpaid',
            subscriptionStatus: 'active',
            createdAt: new Date('2024-03-10').toISOString(),
            businessMetrics: {
                lastActiveDate: new Date('2024-12-18').toISOString()
            }
        }
    ]
};

// Override fetch for admin endpoints to use mock data
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const url = args[0];
    
    // Check if this is an admin API call
    if (typeof url === 'string') {
        if (url.includes('/api/admin/stats')) {
            console.log('Using mock data for admin stats');
            return Promise.resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Headers({'content-type': 'application/json'}),
                json: () => Promise.resolve({ success: true, stats: mockAdminData.stats }),
                text: () => Promise.resolve(JSON.stringify({ success: true, stats: mockAdminData.stats })),
                clone: function() { return this; }
            });
        }
        
        if (url.includes('/api/admin/users')) {
            console.log('Using mock data for admin users');
            return Promise.resolve({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: new Headers({'content-type': 'application/json'}),
                json: () => Promise.resolve({ 
                    success: true, 
                    users: mockAdminData.users,
                    total: mockAdminData.users.length
                }),
                text: () => Promise.resolve(JSON.stringify({ 
                    success: true, 
                    users: mockAdminData.users,
                    total: mockAdminData.users.length
                })),
                clone: function() { return this; }
            });
        }
        
        if (url.includes('/api/admin/user/')) {
            const parts = url.split('/');
            const userId = parts[parts.length - 1];
            const user = mockAdminData.users.find(u => u.id === userId);
            
            if (user) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ success: true, user })
                });
            } else {
                return Promise.resolve({
                    ok: false,
                    status: 404,
                    json: () => Promise.resolve({ success: false, error: 'User not found' })
                });
            }
        }
    }
    
    // For all other requests, use the original fetch
    return originalFetch.apply(this, args);
};

console.log('Admin mock data loaded - using local data until backend is deployed');