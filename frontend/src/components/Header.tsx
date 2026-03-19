import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Search } from 'lucide-react'

const Header = () => {
  return (
    <header className='flex items-center justify-between px-12 py-4 border-b bg-white'>
        <div className='flex items-center gap-10'>
            <Link to="/" className='text-2xl cursor-pointer font-semibold italic hover:opacity-80'>grabPic</Link>

            <nav className='flex gap-8 text-gray-600 font-medium'>

                <NavLink 
                to="/createEvent"
                className={({isActive}) => isActive
                    ?"text-amber-400 border-b-2 border-amber-400 pb-1"
                    :"hover:text-black"    
                }
                >Create Event</NavLink>
                <NavLink 
                to="/uploadPhotos"
                className={({isActive}) => isActive
                    ?"text-amber-400 border-b-2 border-amber-400 pb-1"
                    :"hover:text-black"    
                }
                >Upload Photos</NavLink>
                <NavLink 
                to="/findMyPhotos"
                className={({isActive}) => isActive
                    ?"text-amber-400 border-b-2 border-amber-400 pb-1"
                    :"hover:text-black"    
                }
                >Find my Photos</NavLink>
            </nav>
        </div>
        <div className='flex items-center gap-6'>
            <Search className="cursor-pointer text-gray-600 hover:text-black w-5 h-5" />
            <div className='w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 font-semibold'>U</div>
        </div>
    </header>
  )
}

export default Header