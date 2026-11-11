import { FormCardSkeleton } from '@/components/ui/skeletons';

export default function Loading() {
  return (
    <div className="w-full max-w-3xl space-y-6">
      <FormCardSkeleton fields={2} />
      <FormCardSkeleton fields={2} />
      <FormCardSkeleton fields={1} />
      <FormCardSkeleton fields={1} />
    </div>
  );
}
