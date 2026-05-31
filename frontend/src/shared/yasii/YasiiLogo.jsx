export default function YasiiLogo({
  size = 32,
  color = "#020617",
  dotColor = "#2563EB",
  animated = false,
  title = "ЯСИИ",
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M84 28C76 16 63 10 49 10C28 10 11 27 11 50C11 73 28 90 50 90C71 90 87 74 89 54"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M26 63C32 80 42 90 50 90C58 90 68 80 74 63"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M50 68V90"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
      />

      <rect
        x="37"
        y="36"
        width="8"
        height="18"
        rx="4"
        fill={color}
      />

      <rect
        x="59"
        y="36"
        width="8"
        height="18"
        rx="4"
        fill={color}
      />

      <path
        d="M42 60C45 65 49 67 52 67C56 67 60 64 63 60"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <g
        style={{
          transformOrigin: "50px 50px",
          animation: animated ? "yasiiOrbit 3.6s linear infinite" : "none",
        }}
      >
        <circle cx="88" cy="35" r="8" fill={dotColor} />
      </g>

      <style>
        {`
          @keyframes yasiiOrbit {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </svg>
  );
}
