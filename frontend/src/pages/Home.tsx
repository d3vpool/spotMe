import { Link } from "react-router-dom";

export function Home() {


    return <>
    <br/>
        <h1 className="flex justify-center text-3xl font-bold">HOME PAGE</h1>
        <br/>
        <ul className="flex justify-between">
            <li>
                <Link className="text-white bg-amber-500 bg-brand box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none" to="/">Home</Link>
            </li>
            <br/>
            <li>
                <Link className="text-white bg-blue-500 bg-brand box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none" to="/createEvent">Create Event</Link>
            </li>
            <br/>
            <li>
                <Link className="text-white bg-green-500 bg-brand box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none" to="/uploadPhotos">Upload Photos</Link>
            </li>
            <br/>
            <li>
                <Link className="text-white bg-red-500 bg-brand box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none" to="/findMyPhotos">Find my Photos</Link>
            </li>
        </ul>
    </>
}