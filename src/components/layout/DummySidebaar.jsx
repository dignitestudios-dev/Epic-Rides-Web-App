import { NavLink } from "react-router";
import { sidebarData } from "../../static/Sidebar";

const DummySidebaar = () => {
  return (
    <div className="w-full h-full overflow-y-auto px-3 py-4 flex flex-col gap-3 justify-start items-start">
      {sidebarData?.map((sidebar) => {
        return (
          <NavLink
            key={sidebar?.link}
            className={({ isActive }) =>
              isActive
                ? "text-sm border w-full h-10 flex items-center justify-center border-orange-500 bg-orange-500 text-white rounded-full font-medium "
                : "text-sm border w-full h-10 flex items-center justify-center border-orange-500 rounded-full font-medium  text-orange-500 "
            }
            to={sidebar?.link}
          >
            {sidebar?.title}
          </NavLink>
        );
      })}
    </div>
  );
};

export default DummySidebaar;
