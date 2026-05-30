const NavButton = ({ icon: Icon, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`h-full px-2 md:px-6 flex items-center justify-center relative transition-colors border-b-[3px]
      ${active ? 'border-[#f5a623] text-[#f5a623]' : 'border-transparent text-white hover:bg-white/10'}`}
  >
    <div className="relative">
      <Icon className="w-6 h-6 md:w-7 md:h-7" />
      {badge && (
        <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#4267B2]">
          {badge}
        </span>
      )}
    </div>
  </button>
);

export default NavButton;
