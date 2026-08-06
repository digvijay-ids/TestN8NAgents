import { UsptoForm } from '@/components/UsptoForm';

const UsptoPage = () => {
  return (
    <div className="flex items-center justify-center p-4 min-h-[calc(100vh-3rem)]">
      <div className="w-full max-w-md">
        <UsptoForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Enter a USPTO application number to generate ADS, Power of Attorney, and Inventor documents.
        </p>
      </div>
    </div>
  );
};

export default UsptoPage;
