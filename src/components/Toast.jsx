const Toast = ({ message, variant = 'dark' }) => {
  if (!message) return null;

  if (variant === 'green') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
        <div className="bg-green-500 text-white text-sm font-semibold px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 max-w-[85vw] text-center">
          <span className="text-lg leading-none">✅</span>
          <span>{message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-[#050505cc] text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap pointer-events-none">
      {message}
    </div>
  );
};

export default Toast;
