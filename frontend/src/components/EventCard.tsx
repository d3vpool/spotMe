import { useState } from 'react'

type EventCardProps = {
    title: string 
    description: string 
    icon: string 
    photosCount: number 
} 
    const EventCard = ({title, description, icon, photosCount} : EventCardProps)=> {

    const [imageCount, setImageCount] = useState(photosCount);

    return (
        <div className='m-2 relative flex items-start gap-4 border p-7 rounded-xl shadoww bg-white w-96'>
            <img className='w-26 h-26 object-cover rounded-2xl' src={icon}/>
            <div className='flex flex-col'>
                <b className='font-semibold text-2xl text-gray-800'>{title}</b>
                <p className='text-gray-600 text-md'>{description}</p>
            </div>
            <div className='absolute rounded-md bg-amber-400 top-3 right-3 text-black text-xs px-2 py-1'>{imageCount}</div>
        </div>
    )
}

export default EventCard