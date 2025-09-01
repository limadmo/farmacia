/**
 * Declarações de tipos para módulos externos
 */

// Declaração para react-hot-toast
declare module 'react-hot-toast' {
  export function toast(message: string): void;
  export function toast(options: { message: string; type: 'success' | 'error' | 'loading' }): void;
  
  // Componente Toaster
  export function Toaster(props?: any): JSX.Element;
  
  // Funções de utilidade
  export function useToaster(): any;
  export function useToasterStore(): any;
  
  // Métodos específicos
  export const success: (message: string) => void;
  export const error: (message: string) => void;
  export const loading: (message: string) => void;
  export const dismiss: (toastId?: string) => void;
}