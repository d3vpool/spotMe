import EventCard from "../components/EventCard"
import EventForm from "../components/EventForm"

export function CreateEvent() {
  return (
    <div>
        <EventForm/>
        <EventCard title="Car Show" description="Weekly meet-up, for car enthusiasts" photosCount={6} icon="carImage.png"/>

    </div>
  )
}
