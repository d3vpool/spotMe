

const EventForm = () => {
  return (
    <div className="p-5 bg-red-500">
        <form>
            <div id='eventTitle'>
                <b>Event Title</b><br/>
                <input className="border" placeholder='Event Title'/><br/>
            </div>
            <div id='eventDesc'>
                <b>Description</b><br/>
                <input className="border" placeholder='Add any description'/><br/>
            </div>
            <div id='iconImg'>
                <b>Upload Icon Image</b>
                <p className="text-5xl">+</p>
                <input type="file" accept="image/*"/>
                <p className="text-sm">Supported formats: JPG, PNG</p>
            </div>
            <button >Create Event</button>
        </form>
    </div>
  )
}

export default EventForm