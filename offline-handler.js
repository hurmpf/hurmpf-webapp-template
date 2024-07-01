
const OfflineHandler = (function()
{
	const VERSION = "8";
	const SW_FILENAME = 'offline.php';
	const CHANNEL_NAME = 'offline-sw';
	let workerStatus = "unknown";
	const useSW = (location.search.indexOf("nocache")==-1) && ('serviceWorker' in window || 'serviceWorker' in navigator) && ('caches' in window || 'caches' in navigator);
	
	function fireEvent (type, data) { window.dispatchEvent(new CustomEvent(type,{detail:data})) };

	/*
		<div id="SWbuttons">
			<input type="button" id="SWinstallButton" value="Installer" onclick="App.install()" />
			<div id="SWinstalling">⏳ Installation...<span id="SWinstallPrc"></span></div>
			<div id="SWready">✅ Installé</div>
			<input type="button" id="SWrestartButton" value="Mise à jour disponible !" onclick="location.reload()" />
		</div>
	*/
	
	const init = async function ()
	{
		if(document.getElementById('SWbuttons')) document.getElementById('SWbuttons').style.display = useSW ? "block" : "none";
		if(!useSW)
		{
			// remove service worker
			if(navigator.serviceWorker)
				navigator.serviceWorker.getRegistrations().then(
					function(registrations) { console.log("Removing Service Worker"); for(let registration of registrations) registration.unregister(); }
				);
		}
		if(useSW)
		{
			// listen to OfflineHandler messages
			window.addEventListener("cacheUpdate", cacheEventHandler);
		}

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
		if(document.getElementById('SWinstallButton')) document.getElementById('SWinstallButton').addEventListener("click", workerInstall);
		updateSWbuttons();
	}
	

	const updateSWbuttons = function ()
	{
		const reg = useSW && navigator.serviceWorker.controller;
		const downloading = (OfflineHandler && OfflineHandler.workerStatus()=="downloading")
		const updated = (OfflineHandler && OfflineHandler.workerStatus()=="updated")
		if(document.getElementById('SWinstallButton')) document.getElementById('SWinstallButton').style.display = !reg ? "inline-block" : "none";
		if(document.getElementById('SWinstalling')) document.getElementById('SWinstalling').style.display = (reg && downloading) ? "inline-block" : "none";
		if(document.getElementById('SWready')) document.getElementById('SWready').style.display = (reg && !downloading) ? "inline-block" : "none";
		if(document.getElementById('SWrestartButton')) document.getElementById('SWrestartButton').style.display = updated ? "inline-block" : "none";
	}


	const cacheEventHandler = function (event)
	{
		const e = event.detail;
		if(e.type=='error') console.log("Erreur de cache : "+e.error);
		if(e.type=='progress') console.log("Téléchargement : "+e.progress);
		if(e.type=='updated') console.log("Mise à jour prête");
		updateSWbuttons();
	}


	// when install button pressed
	const workerInstall = async function ()
	{
		if(document.getElementById('SWinstallButton'))
			document.getElementById('SWinstallButton').disabled = true;
		try {
			const reg = await navigator.serviceWorker.register(SW_FILENAME)
			console.log('Service worker registered.', reg);
			workerStatus = "ready";
			updateSWbuttons();
		}
		catch (error) { currentStatus = "failed"; throw new Error('Service worker registration failed : '+error); }
	}

	
	return {
		getVersion: () => VERSION,
		useSW: () => useSW,
		init: init,
		workerStatus: () => workerStatus,
		workerInstall: workerInstall,
	}

})();