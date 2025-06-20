import React from 'react';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Layout } from '@/components/Layout/Layout';
import { Button } from '@/components/UI/Button';
import { Product } from '@/types';
import { apiClient } from '@/lib/api';

interface HomePageProps {
  featuredProducts: Product[];
  categories: string[];
}

const HomePage: React.FC<HomePageProps> = ({ featuredProducts, categories }) => {
  return (
    <Layout title="MicroPulse - Modern E-commerce Platform">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to MicroPulse
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Experience the future of e-commerce with our modern microservice platform
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <Button size="lg" variant="secondary">
                  Shop Now
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="ghost" className="text-white border-white hover:bg-white hover:text-primary-600">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose MicroPulse?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built with modern microservice architecture for scalability, reliability, and performance
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
              <p className="text-gray-600">
                Optimized performance with microservice architecture and modern caching strategies
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Reliable</h3>
              <p className="text-gray-600">
                Built-in fault tolerance with circuit breakers and automatic failover mechanisms
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">User-Friendly</h3>
              <p className="text-gray-600">
                Intuitive interface with real-time updates and seamless shopping experience
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Shop by Category
            </h2>
            <p className="text-lg text-gray-600">
              Discover our wide range of product categories
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category}
                href={`/products?category=${encodeURIComponent(category)}`}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 text-center group"
              >
                <div className="bg-primary-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-200 transition-colors">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 capitalize">
                  {category}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Featured Products
            </h2>
            <p className="text-lg text-gray-600">
              Check out our most popular items
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <Link
                key={product._id}
                href={`/products/${product._id}`}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden group"
              >
                <div className="aspect-w-1 aspect-h-1 bg-gray-200">
                  {product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      width={300}
                      height={300}
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-48 bg-gray-200">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary-600">
                      ${product.discountedPrice || product.price}
                    </span>
                    {product.pricing?.compareAtPrice && (
                      <span className="text-sm text-gray-500 line-through">
                        ${product.pricing.compareAtPrice}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link href="/products">
              <Button size="lg">
                View All Products
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  try {
    // Fetch featured products and categories
    const [productsResponse, categoriesResponse] = await Promise.all([
      apiClient.products.getAll({ limit: 8, sortBy: 'createdAt', sort: 'desc' }),
      apiClient.products.getCategories(),
    ]);

    return {
      props: {
        featuredProducts: productsResponse.data.data || [],
        categories: categoriesResponse.data.data || [],
      },
      revalidate: 3600, // Revalidate every hour
    };
  } catch (error) {
    console.error('Error fetching home page data:', error);
    
    return {
      props: {
        featuredProducts: [],
        categories: [],
      },
      revalidate: 60, // Retry after 1 minute
    };
  }
};

export default HomePage;
