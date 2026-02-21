
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-50 text-foreground relative">
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] " />
      <div className="relative flex flex-col items-center justify-center z-10 w-full max-w-md p-4">
        <div className="flex items-center gap-2 mb-8 text-white">
             <svg
                className="h-8 w-8 text-white"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 7L12 12L22 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 22V12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-2xl font-bold tracking-widest uppercase">
                Accounting
              </span>
        </div>
        {children}
      </div>
    </div>
  );
}
