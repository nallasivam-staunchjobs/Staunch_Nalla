import React from 'react';
import Widget_1 from '../components/widgets/Widget-1';
import Calendar from '../ui/Calendar';
import { BarChart, DonutChart, LineChart } from '../components/Charts';
import profileImg from '../assets/profile.jpg';
// import Profile from '../components/widgets/Profile in-out/Profile';
import {
  BanknoteArrowUp,
  BookCheck,
  CalendarCheck,
  FileChartColumn,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../Redux/hooks'; // Import the useAuth hook

function Home() {
  const { user } = useAuth(); // Get the user object from the authentication hook

  const statsData = [
    {
      icon: <CalendarCheck className="w-5 h-5" />,
      title: 'Attendance Overview',
      value: '120',
      total: '/154',
      change: '▲ +2.1%',
      changeColor: 'text-green-500',
      iconBg: 'bg-orange-500',
    },
    {
      icon: <CalendarCheck className="w-5 h-5" />,
      title: "Total No of Project's",
      value: '90',
      total: '/125',
      change: '▼ -2.1%',
      changeColor: 'text-red-500',
      iconBg: 'bg-[#396a6f]',
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Total No of Clients's",
      value: '69',
      total: '/86',
      change: '▼ -11.2%',
      changeColor: 'text-red-500',
      iconBg: 'bg-blue-500',
    },
    {
      icon: <BookCheck className="w-5 h-5" />,
      title: "Total No of task's",
      value: '225',
      total: '/28',
      change: '▲ +11.2%',
      changeColor: 'text-green-500',
      iconBg: 'bg-pink-500',
    },
    {
      icon: <BanknoteArrowUp className="w-5 h-5" />,
      title: 'Earnings',
      value: '$21445',
      change: '▲ +10.2%',
      changeColor: 'text-green-500',
      iconBg: 'bg-violet-500',
    },
    {
      icon: <FileChartColumn className="w-5 h-5" />,
      title: 'Profile This Week',
      value: '$5,554',
      change: '▲ +2.1%',
      changeColor: 'text-green-500',
      iconBg: 'bg-red-500',
    },
    {
      icon: <UsersRound className="w-5 h-5" />,
      title: 'Job Applicants',
      value: '98',
      change: '▲ +2.1%',
      changeColor: 'text-green-500',
      iconBg: 'bg-green-500',
    },
    {
      icon: <UserPlus className="w-5 h-5" />,
      title: 'New Hire',
      value: '45',
      total: '/48',
      change: '▲ -11.2%',
      changeColor: 'text-red-500',
      iconBg: 'bg-black',
    },
  ];

  // Display firstName only, fallback to "Loggers" if not available
  const displayUserName = user?.firstName ;

  return (
    <div className="">
      {/* Welcome Section */}
      <div className="bg-white px-2 py-1 rounded-lg mb-3 text-black/80">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <img
            src={profileImg}
            alt="avatar"
            className="w-16 h-16 rounded-full object-cover"
          />
          <div className="leading-6 text-center md:text-left">
            <h1 className="text-2xl font-bold mb-1">Welcome back {displayUserName}</h1>
            <p className="text-sm text-gray-600">
              Here's what's happening with your dashboard today.
            </p>
          </div>
        </div>
      </div>

      {/* Stats & Widget Section */}
      <div className="flex flex-col lg:flex-row mb-3 gap-4">
        {/* Left: Stat Cards (8/12) */}
        <div className="w-full lg:w-8/12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {statsData.map((item, index) => (
              <div
                key={index}
                className="bg-white p-2 rounded-lg shadow-md h-[130px] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <div
                      className={`${item.iconBg} text-white p-2 rounded-full`}
                    >
                      {item.icon}
                    </div>
                    <h2 className="text-sm font-medium text-gray-600">
                      {item.title}
                    </h2>
                  </div>
                  <div className="text-md font-bold text-gray-900 flex items-center">
                    {item.value}
                    {item.total && (
                      <span className="text-gray-500 ml-1">{item.total}</span>
                    )}
                    <span className={`ml-2 text-xs ${item.changeColor}`}>
                      {item.change}
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <a href="#" className="text-xs text-blue-600 hover:underline">
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Widget_1 (4/12) */}
        <div className="w-full lg:w-4/12">
          <div className="h-[280px] bg-white p-4 rounded-lg shadow-md">
            {/* 130px x 2 rows + gap = 280px */}
            <Widget_1 />
          </div>
        </div>
      </div>

      {/* BarChart + Calendar */}
      <div className="flex flex-col md:flex-row gap-4 mb-3 ">
        <div className="w-full md:w-8/12 bg-white  rounded-lg shadow-md">
          <BarChart />
        </div>
        <div className="w-full md:w-4/12   rounded-lg shadow-md">
          <Calendar />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-3 ">
         {/* <div className="w-full md:w-8/12  bg-white  rounded-lg shadow-md">
          <LineChart />
        </div>  */}
        <div className="w-full md:w-4/12 h-[100%] bg-white rounded-lg shadow-md">
          <DonutChart />
        </div>
      </div>
      
      {/* <div className="flex flex-col md:flex-row gap-4 mb-3 ">
        <div className="w-full bg-white rounded-lg shadow-md">
          <Profile />
        </div>
      </div> */}
    </div>
  );
}

export default Home;
