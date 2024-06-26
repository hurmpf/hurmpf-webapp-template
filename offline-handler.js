
const OfflineHandler = (function()
{
	const VERSION = "8";
	const SW_FILENAME = 'offline.php';
	const CHANNEL_NAME = 'offline-sw';
	let workerStatus = "unknown";
	
	function fireEvent (type, data) { window.dispatchEvent(new CustomEvent(type,{detail:data})) };

	
	const init = async function ()
	{
		// listen for broadcast messages
		(new BroadcastChannel(CHANNEL_NAME)).addEventListener('message', event =>
		{
			switch(event.data.type)
			{
				case "message" : console.log('Received', event.data.value); break;
				case "installed" : workerStatus="ready"; fireEvent("cacheUpdate",{type:'installed'}); break;
				case "downloading" : workerStatus="downloading"; fireEvent("cacheUpdate",{type:'progress', progress:event.data.value}); break;
				case "updated" : workerStatus="updated"; fireEvent("cacheUpdate",{type:'updated'}); break;
				case "error" : workerStatus="error"; fireEvent("cacheUpdate",{type:'error', error:event.data.value}); break;
				default: console.log("unknown message : "+event.data.type+" : "+event.data.value); 
			}
		});
	}


	// when install button pressed
	const workerInstall = async function ()
	{
		try {
			const reg = await navigator.serviceWorker.register(SW_FILENAME)
			console.log('Service worker registered.', reg);
			workerStatus = "ready";
		}
		catch (error) { currentStatus = "failed"; throw new Error('Service worker registration failed : '+error); }
	}

	
	return {
		getVersion: () => VERSION,
		init: init,
		workerStatus: () => workerStatus,
		workerInstall: workerInstall,
	}

})();