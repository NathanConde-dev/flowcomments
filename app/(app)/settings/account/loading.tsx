import { FormCardSkeleton } from '@/components/ui/skeletons';

export default function Loading() {
  return (
    <div className="w-full space-y-6">
      <FormCardSkeleton fields={4} />
      <FormCardSkeleton fields={3} />
    </div>
  );
}
