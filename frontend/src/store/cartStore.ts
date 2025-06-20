import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, Cart } from '@/types';
import { toast } from 'react-hot-toast';

interface CartState extends Cart {
  isLoading: boolean;
}

interface CartActions {
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
  isInCart: (productId: string) => boolean;
  getTotalItems: () => number;
  getTotalAmount: () => number;
}

type CartStore = CartState & CartActions;

const initialState: CartState = {
  items: [],
  totalItems: 0,
  totalAmount: 0,
  isLoading: false,
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addItem: (product: Product, quantity: number = 1) => {
        const { items } = get();
        const existingItemIndex = items.findIndex(item => item.product._id === product._id);

        let newItems: CartItem[];

        if (existingItemIndex >= 0) {
          // Update existing item
          newItems = items.map((item, index) => {
            if (index === existingItemIndex) {
              const newQuantity = item.quantity + quantity;
              
              // Check stock availability
              if (newQuantity > product.stock) {
                toast.error(`Only ${product.stock} items available in stock`);
                return item;
              }
              
              return {
                ...item,
                quantity: newQuantity,
              };
            }
            return item;
          });
        } else {
          // Add new item
          if (quantity > product.stock) {
            toast.error(`Only ${product.stock} items available in stock`);
            return;
          }
          
          newItems = [
            ...items,
            {
              product,
              quantity,
            },
          ];
        }

        const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = newItems.reduce(
          (sum, item) => sum + (item.product.discountedPrice || item.product.price) * item.quantity,
          0
        );

        set({
          items: newItems,
          totalItems,
          totalAmount,
        });

        toast.success(`${product.name} added to cart`);
      },

      removeItem: (productId: string) => {
        const { items } = get();
        const newItems = items.filter(item => item.product._id !== productId);

        const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = newItems.reduce(
          (sum, item) => sum + (item.product.discountedPrice || item.product.price) * item.quantity,
          0
        );

        set({
          items: newItems,
          totalItems,
          totalAmount,
        });

        toast.success('Item removed from cart');
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        const { items } = get();
        const newItems = items.map(item => {
          if (item.product._id === productId) {
            // Check stock availability
            if (quantity > item.product.stock) {
              toast.error(`Only ${item.product.stock} items available in stock`);
              return item;
            }
            
            return {
              ...item,
              quantity,
            };
          }
          return item;
        });

        const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = newItems.reduce(
          (sum, item) => sum + (item.product.discountedPrice || item.product.price) * item.quantity,
          0
        );

        set({
          items: newItems,
          totalItems,
          totalAmount,
        });
      },

      clearCart: () => {
        set({
          items: [],
          totalItems: 0,
          totalAmount: 0,
        });
        
        toast.success('Cart cleared');
      },

      getItemQuantity: (productId: string) => {
        const { items } = get();
        const item = items.find(item => item.product._id === productId);
        return item ? item.quantity : 0;
      },

      isInCart: (productId: string) => {
        const { items } = get();
        return items.some(item => item.product._id === productId);
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalAmount: () => {
        const { items } = get();
        return items.reduce(
          (sum, item) => sum + (item.product.discountedPrice || item.product.price) * item.quantity,
          0
        );
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        totalItems: state.totalItems,
        totalAmount: state.totalAmount,
      }),
    }
  )
);

// Recalculate totals on hydration
if (typeof window !== 'undefined') {
  const store = useCartStore.getState();
  const totalItems = store.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = store.items.reduce(
    (sum, item) => sum + (item.product.discountedPrice || item.product.price) * item.quantity,
    0
  );
  
  useCartStore.setState({
    totalItems,
    totalAmount,
  });
}
