import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { useDispatch } from "react-redux";
import { useEffect } from "react";

const menuItems = [
  {
    title: "Active Directory",
    path: "/admin-console/add-jobs/active-directory",
  },
  { title: "AWS EC2", path: "/admin-console/add-jobs/aws-vm" },
  { title: "Azure", path: "/admin-console/add-jobs/azure" },
  { title: "Flat File", path: "/admin-console/add-jobs/flat-file-csv" },
  { title: "FlexeraOne", path: "/admin-console/add-jobs/flexera" },
  { title: "Google Cloud", path: "/admin-console/add-jobs/google-cloud" },
  { title: "Intune", path: "/admin-console/add-jobs/itune" },
  { title: "Microsoft Defender", path: "/admin-console/add-jobs/ms-defender" },
  { title: "ServiceNow", path: "/admin-console/add-jobs/service-now" },
  { title: "Database SQL/MySQL", path: "/admin-console/add-jobs/sql" },
  { title: "Custom API", path: "/admin-console/add-jobs/custom-api" },
];

const ApplicationMenu = ({ routeName }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { permissionType, permissionList } = useSelector(
    (state) => state.permission
  );
  const handleNavigate = (path) => {
    navigate(path);
  };

  useEffect(() => {
    dispatch(setHeadingTitle("Add Job"));
  }, []);

  return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {menuItems.map((item, index) => (
          <Link key={index} to={item.path}>
            <div className="flex w-[100%] rounded-[20px] justify-between p-4 items-center bg-[#ffffff] shadow-md">
              <img
                src="https://cdn.paperpile.com/guides/img/find-credible-illustr-400x400.png?v=351"
                alt="job"
                className="w-20 h-20 object-cover rounded-full"
              />
              <div className="w-[75%] ml-2">
                <h1 className="font-semibold text-[0.96rem] leading-[25px]">
                  {item.title}
                </h1>
              </div>
            </div>
          </Link>
        ))}
      </div>
  );
};

export default ApplicationMenu;
