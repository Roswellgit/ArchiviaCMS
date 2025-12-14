import LoginForm from '../../components/LoginForm';

export default function LoginPage() {
  return (
    <main 
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: 'var(--background-color)' }}
    >
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/30 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10 space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Archivia Access
          </h1>
          <p className="text-slate-500 text-sm">
            Secure Repository Login
          </p>
        </header>

        <LoginForm />
      </div>
    </main>
  );
}