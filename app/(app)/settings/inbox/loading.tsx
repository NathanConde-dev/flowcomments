import { FormCardSkeleton } from '@/components/ui/skeletons';

export default function Loading() {
  return (
    <div className="w-full max-w-5xl">
      <FormCardSkeleton fields={6} />
    </div>
  );
}
