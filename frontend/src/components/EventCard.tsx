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
        <div>
            <img className='w-20' src={icon}/>
            <b>{title}</b>
            <p>{description}</p>
            <div>{imageCount}</div>
        </div>
    )
}

export default EventCard