export function CreateEvent() {
    function handleOnClick() {
        console.log("Button Clicked");
    }
    return <>
        <div>
            <b>CREATE AN EVENT</b>
            <br/>
            <button className="bg-amber-500" onClick={handleOnClick}>Create an event</button>
        </div>
    </>
}
