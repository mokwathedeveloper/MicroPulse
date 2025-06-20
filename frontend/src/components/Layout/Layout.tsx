import React from 'react';
import Head from 'next/head';
import { Header } from './Header';
import { Footer } from './Footer';
import { Toaster } from 'react-hot-toast';
import { useWebSocket } from '@/hooks/useWebSocket';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  title = 'MicroPulse - Modern E-commerce Platform',
  description = 'A modern microservice-based e-commerce platform built with Next.js and Node.js',
}) => {
  // Initialize WebSocket connection for real-time updates
  useWebSocket({
    onOrderUpdate: (update) => {
      console.log('Order update received:', update);
    },
    onInventoryUpdate: (update) => {
      console.log('Inventory update received:', update);
    },
  });

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        
        <main className="flex-1">
          {children}
        </main>
        
        <Footer />
      </div>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
};
