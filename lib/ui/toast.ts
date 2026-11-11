import { toast as sonnerToast } from 'sonner';

export const toast = {
  success(message: string, description?: string) {
    return sonnerToast.success(message, description ? { description } : undefined);
  },
  error(message: string, description?: string) {
    return sonnerToast.error(message, description ? { description } : undefined);
  },
  info(message: string, description?: string) {
    return sonnerToast.message(message, description ? { description } : undefined);
  },
  warning(message: string, description?: string) {
    return sonnerToast.warning(message, description ? { description } : undefined);
  },
  promise: sonnerToast.promise,
};
