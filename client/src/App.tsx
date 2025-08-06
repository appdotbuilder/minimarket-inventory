
import { useState, useEffect, useCallback } from 'react';
import { trpc } from './utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShoppingCart, Package, Users, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import type { User, LoginInput } from '../../server/src/schema';

// Import feature components
import { Dashboard } from './components/Dashboard';
import { ProductManagement } from './components/ProductManagement';
import { PurchaseManagement } from './components/PurchaseManagement';
import { SalesManagement } from './components/SalesManagement';
import { SupplierManagement } from './components/SupplierManagement';
import { UserManagement } from './components/UserManagement';
import { StockManagement } from './components/StockManagement';
import { ReportsSection } from './components/ReportsSection';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [loginData, setLoginData] = useState<LoginInput>({
    username: '',
    password: ''
  });
  const [activeTab, setActiveTab] = useState('dashboard');

  const verifyUserToken = useCallback(async (token: string) => {
    try {
      const userData = await trpc.verifyToken.query(token);
      if (userData) {
        setUser(userData);
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('auth_token');
    }
  }, []);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      verifyUserToken(token);
    }
  }, [verifyUserToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await trpc.login.mutate(loginData);
      // The API returns { user: User; token: string }
      if (result.user && result.token) {
        localStorage.setItem('auth_token', result.token);
        setUser(result.user);
        setLoginData({ username: '', password: '' });
      } else {
        setError('Login failed - invalid response');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await trpc.logout.mutate(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      setActiveTab('dashboard');
    }
  };

  const hasPermission = (requiredRoles: string[]) => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  // Login form
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <Card className="shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                🏪 Minimarket Inventory
              </CardTitle>
              <p className="text-gray-600">Sign in to manage your store</p>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <Input
                    type="text"
                    value={loginData.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLoginData((prev: LoginInput) => ({ ...prev, username: e.target.value }))
                    }
                    placeholder="Enter your username"
                    required
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={loginData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLoginData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="Enter your password"
                    required
                    className="w-full"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
              
              <div className="mt-6 text-center text-xs text-gray-500">
                Demo Accounts: admin/admin123, manager/manager123, cashier/cashier123
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main application
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">🏪 Minimarket Inventory</h1>
                <p className="text-sm text-gray-600">Welcome, {user.username}!</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Role: <span className="font-medium capitalize">{user.role}</span>
              </div>
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            
            {hasPermission(['admin', 'manager', 'warehouse']) && (
              <TabsTrigger value="products" className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>Products</span>
              </TabsTrigger>
            )}
            
            {hasPermission(['admin', 'manager', 'warehouse']) && (
              <TabsTrigger value="purchases" className="flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4" />
                <span>Purchases</span>
              </TabsTrigger>
            )}
            
            <TabsTrigger value="sales" className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span>Sales</span>
            </TabsTrigger>
            
            {hasPermission(['admin', 'manager']) && (
              <TabsTrigger value="suppliers" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Suppliers</span>
              </TabsTrigger>
            )}
            
            {hasPermission(['admin', 'manager', 'warehouse']) && (
              <TabsTrigger value="stock" className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>Stock</span>
              </TabsTrigger>
            )}
            
            {hasPermission(['admin', 'manager']) && (
              <TabsTrigger value="reports" className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Reports</span>
              </TabsTrigger>
            )}
            
            {hasPermission(['admin']) && (
              <TabsTrigger value="users" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Users</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <Dashboard />
          </TabsContent>

          {hasPermission(['admin', 'manager', 'warehouse']) && (
            <TabsContent value="products" className="mt-6">
              <ProductManagement />
            </TabsContent>
          )}

          {hasPermission(['admin', 'manager', 'warehouse']) && (
            <TabsContent value="purchases" className="mt-6">
              <PurchaseManagement />
            </TabsContent>
          )}

          <TabsContent value="sales" className="mt-6">
            <SalesManagement userRole={user.role} />
          </TabsContent>

          {hasPermission(['admin', 'manager']) && (
            <TabsContent value="suppliers" className="mt-6">
              <SupplierManagement />
            </TabsContent>
          )}

          {hasPermission(['admin', 'manager', 'warehouse']) && (
            <TabsContent value="stock" className="mt-6">
              <StockManagement />
            </TabsContent>
          )}

          {hasPermission(['admin', 'manager']) && (
            <TabsContent value="reports" className="mt-6">
              <ReportsSection />
            </TabsContent>
          )}

          {hasPermission(['admin']) && (
            <TabsContent value="users" className="mt-6">
              <UserManagement />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

export default App;
