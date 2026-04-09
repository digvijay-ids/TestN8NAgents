import { SearchForm } from '@/components/SearchForm';

const Index = () => {
  return (
    <div className="flex items-center justify-center p-4 min-h-[calc(100vh-3rem)]">
      <div className="w-full max-w-md">
        <SearchForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Enter your PCT number to search and download document.
        </p>
      </div>
    </div>
  );
};

export default Index;
