import { logo } from "../../assets/export";

const DummyNavbar = () => {
  return (
    <div className="w-full h-full px-4 flex justify-between items-center">
      <img src={logo} loading="lazy" alt="logo-organization" className="h-8" />

      <span className="w-12 h-8 rounded-full bg-[#45c4f9]/20 flex items-center px-1 justify-start gap-1">
        <img
          src={logo}
          alt="user-avatar"
          className="w-6 h-6 object-scale-down bg-gray-700 rounded-full"
        />
        <button className="text-gray-200 text-md mr-2">
          <svg
            stroke="currentColor"
            fill="none"
            strokeWidth="0"
            viewBox="0 0 15 15"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M4.18179 6.18181C4.35753 6.00608 4.64245 6.00608 4.81819 6.18181L7.49999 8.86362L10.1818 6.18181C10.3575 6.00608 10.6424 6.00608 10.8182 6.18181C10.9939 6.35755 10.9939 6.64247 10.8182 6.81821L7.81819 9.81821C7.73379 9.9026 7.61934 9.95001 7.49999 9.95001C7.38064 9.95001 7.26618 9.9026 7.18179 9.81821L4.18179 6.81821C4.00605 6.64247 4.00605 6.35755 4.18179 6.18181Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </span>
    </div>
  );
};

export default DummyNavbar;
