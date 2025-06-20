import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  ShoppingCartIcon, 
  UserIcon, 
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/UI/Button';
import { SearchBar } from '@/components/UI/SearchBar';
import { CartDropdown } from '@/components/Cart/CartDropdown';
import { UserDropdown } from '@/components/User/UserDropdown';

export const Header: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { totalItems } = useCartStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Products', href: '/products' },
    { name: 'Categories', href: '/categories' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="text-2xl font-bold text-primary-600">
                MicroPulse
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors ${
                  router.pathname === item.href ? 'text-primary-600' : ''
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <div className="hidden md:block flex-1 max-w-lg mx-8">
            <SearchBar onSearch={handleSearch} />
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Search icon for mobile */}
            <button className="md:hidden p-2 text-gray-700 hover:text-primary-600">
              <MagnifyingGlassIcon className="h-6 w-6" />
            </button>

            {/* Cart */}
            <div className="relative">
              <button
                onClick={() => setIsCartOpen(!isCartOpen)}
                className="p-2 text-gray-700 hover:text-primary-600 relative"
              >
                <ShoppingCartIcon className="h-6 w-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
              
              {isCartOpen && (
                <CartDropdown onClose={() => setIsCartOpen(false)} />
              )}
            </div>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-2 text-gray-700 hover:text-primary-600"
                >
                  <UserIcon className="h-6 w-6" />
                  <span className="hidden sm:block text-sm font-medium">
                    {user?.firstName}
                  </span>
                </button>
                
                {isUserMenuOpen && (
                  <UserDropdown onClose={() => setIsUserMenuOpen(false)} />
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-primary-600"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 ${
                    router.pathname === item.href ? 'text-primary-600' : ''
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile search */}
              <div className="px-3 py-2">
                <SearchBar onSearch={handleSearch} />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
