const TwoCatsIcon = ({ className }) => (
  <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="64" height="64" rx="32" fill="#4267B2"/>
    {/* Left cat (white) */}
    <polygon points="14,26 12,18 20,24" fill="white"/>
    <polygon points="30,26 32,18 24,24" fill="white"/>
    <polygon points="15,25 13.5,20 19,23.5" fill="#ffc0cb"/>
    <polygon points="29,25 30.5,20 25,23.5" fill="#ffc0cb"/>
    <ellipse cx="22" cy="34" rx="10" ry="9" fill="white"/>
    <circle cx="18.5" cy="33" r="1.5" fill="#4267B2"/>
    <circle cx="25.5" cy="33" r="1.5" fill="#4267B2"/>
    <path d="M20,36 Q22,38 24,36" stroke="#4267B2" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    {/* Right cat (gold) */}
    <polygon points="34,26 32,18 40,24" fill="#f5a623"/>
    <polygon points="50,26 52,18 44,24" fill="#f5a623"/>
    <polygon points="35,25 33.5,20 39,23.5" fill="#ffda85"/>
    <polygon points="49,25 50.5,20 45,23.5" fill="#ffda85"/>
    <ellipse cx="42" cy="34" rx="10" ry="9" fill="#f5a623"/>
    <circle cx="38.5" cy="33" r="1.5" fill="white"/>
    <circle cx="45.5" cy="33" r="1.5" fill="white"/>
    <path d="M40,36 Q42,38 44,36" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
  </svg>
);

export default TwoCatsIcon;
