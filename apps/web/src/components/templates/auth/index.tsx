export const AuthTemplate = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray50 flex items-center justify-center px-4">
    <div className="bg-white w-full max-w-md p-10 rounded-3xl shadow-xl">
      {children}
    </div>
  </div>
);
