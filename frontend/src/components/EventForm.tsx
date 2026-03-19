

const EventForm = () => {
  return (
    <div className="border p-6 rounded-xl shadow-md bg-white max-w-xl">
        <form className="flex flex-col gap-6">
            <div id='eventTitle'>
                <label className="font-semibold">Event Title</label>
                <input className="border rounded-md p-2 w-full mt-1" placeholder='Event Title'/><br/>
            </div>
            <div id='eventDesc'>
                <label className="font-semibold">Description</label>
                <textarea className="border rounded-md p-2 w-full mt-1" placeholder='Add any description'/><br/>
            </div>
            <div id='iconImg'>
                <p className="font-semibold mb-2">Upload Icon Image</p>

                <div className="self-center border-2 border-dashed border-gray-300 rounded-lg p-6 w-52 flex flex-col items-center justify-center">  
                    
                    <span className="text-8xl mb-2 text-amber-400">+</span>

                    <input id="iconUpload" className="hidden" type="file" accept="image/*"/>
                    
                    <label htmlFor="iconUpload" className="bg-amber-400 hover:bg-amber-500 text-black px-4 py-1 rounded-md text-sm cursor-pointer transition">Browse Image</label>

                    <p className="text-sm text-gray-500 mt-2">Supported formats: JPG, PNG</p>
                </div>
            </div>
            <button className="bg-amber-400 text-black px-4 py-2 rounded-md w-fit">Create Event</button>
        </form>
    </div>
  )
}

export default EventForm