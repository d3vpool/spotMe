import EventCard from "../components/EventCard"
import EventForm from "../components/EventForm"

export function CreateEvent() {
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-3 gap-8 p-8">

        <div className="col-span-2">
          <div className="text-3xl font-semibold p-2">Create New Events</div>
          <EventForm/>
        </div>
        <div id="eventCards" className="w-96 space-y-4">
          <div className="text-3xl font-semibold p-2">My Events</div>
          <EventCard title="Car Show" description="Weekly meet-up, for car enthusiasts" photosCount={6} icon="carImage.png"/>
          <EventCard title="Music Festival" description="A two-day music festival with famous bands" photosCount={12} icon="carImage.png"/>
          <EventCard title="Digital Art Exhibition" description="Showcasing the works of digital artists" photosCount={143} icon="carImage.png"/>
        </div>

    </div>
  )
}
