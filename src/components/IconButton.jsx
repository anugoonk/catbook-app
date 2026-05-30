const IconButton = ({ icon: Icon, onClick, badge }) => (
  <button
    onClick={onClick}
    className="relative bg-white/10 hover:bg-white/20 p-2.5 rounded-full text-white transition-colors flex items-center justify-center"
  >
    <Icon className="w-5 h-5" />
    {badge && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </button>
);

export default IconButton;
