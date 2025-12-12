// import { Heart, LocateIcon, MapPin, MessageCircle, MessageCircleMore } from 'lucide-react'
// import React from 'react'

// function Widget_1() {
//   return (

//         <div
//             className=" flex flex-col justify-center"
//         >
//             <div
//                 className="relative  sm:max-w-xl sm:mx-auto w-full rounded-2xl"
//                 id="widget"
//             >
//                 <img
//                     src="https://images.unsplash.com/photo-1608788524926-41b5181b89a2?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&amp;ixlib=rb-1.2.1&amp;auto=format&amp;fit=crop&amp;w=3150&amp;q=80"
//                     className="rounded-2xl"
//                 />
//                 <div
//                     className="text-sm font-bold text-gray-50 absolute top-6 right-3 glassmorphism-25 p-1 rounded-full px-3"
//                 >
//                     James Bond Island
//                 </div>
//                 <div
//                     className="absolute bottom-0 left-0 right-0 glassmorphism-25 h-16  p-3 px-5 space-y-2 rounded-b-3xl opacity-95 flex justify-between items-center"
//                 >
//                     <div
//                         className="flex space-x-3 text-white font-medium items-center"
//                     >
//                         <img
//                             src="https://images.unsplash.com/profile-1580909319031-f23261ca6127image?dpr=2&amp;auto=format&amp;fit=crop&amp;w=20&amp;h=20&amp;q=60&amp;crop=faces&amp;bg=fff"
//                             className="transform scale-100 hover:scale-105 rounded-full ring-2 ring-offset-white ring-white"
//                         />
//                         <div>
//                             <div>Engin Akyurt</div>
//                             <div className="text-sm flex items-center">
//                                 <MapPin className='w-4 '/>
//                                 Thailand
//                             </div>
//                         </div>
//                     </div>
//                     <div className="flex items-center text-gray-50 space-x-2">
//                         <button className="cursor-pointer">
//                            <MessageCircleMore/>
//                         </button>
//                         <button className="cursor-pointer">
//                             <Heart/>
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </div>

//   )
// }

// export default Widget_1

function Widget_1() {
    const updates = [
        "Today 6 Interviews Scheduled",
        "Today 25 DTR's Done",
        "Hotspot 2958",
        "Today 426 followup's",
        "ERM 38(812)",
        "Invoices 64(17)",
        "Pending Amount 1(2)",
    ];

    return (
        <div className="flex flex-col h-full">
            <h2 className="text-md font-semibold mb-2">Recent Updates</h2>
            <div className="overflow-y-auto scrollbar-desktop space-y-2 pr-2 scrollbar-thin scrollbar-thumb-orange-400">
                {updates.map((item, index) => (
                    <div
                        key={index}
                        className="p-2 border border-gray-200 rounded hover:bg-gray-100 text-sm"
                    >
                        {item}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Widget_1;
