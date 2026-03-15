import { BrowserRouter, Link, Routes, useNavigate } from "react-router-dom";

export function Home() {


    return <>
        <h1>HOME PAGE</h1>
        <ul>
            <li>
                <Link to="/">Home</Link>
            </li>
            <li>
                <Link to="/createEvent">Create Event</Link>
            </li>
            <li>
                <Link to="/uploadPhotos">Upload Photos</Link>
            </li>
            <li>
                <Link to="/findMyPhotos">Find my Photos</Link>
            </li>
        </ul>
    </>
}