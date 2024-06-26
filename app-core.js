const App = (function()
{
	const VERSION = "1";
	const redDot = '<span style="color:red">&#x2b24;</span>';       //"&#128308;";
	const orangeDot = '<span style="color:orange">&#x2b24;</span>'; //"&#128992;";
	const greenDot = '<span style="color:green">&#x2b24;</span>';   //"&#128994;";
	
	let _currentScreen = "loading"; 

	const get = function (id) { return document.getElementById(id); }
	let useSW = (location.search.indexOf("nocache")==-1)
			&& ('serviceWorker' in window || 'serviceWorker' in navigator)
			&& ('caches' in window || 'caches' in navigator);
	
	const show = function (destination)
	{
		if(!get(destination)) throw new Error("Screen '"+destination+"' not found");
		if(!get(_currentScreen)) throw new Error("Screen '"+_currentScreen+"' not found");
		get(_currentScreen).style.display = "none";
		_currentScreen = destination;
		get(_currentScreen).style.display = "block";
	}


	const init = async function ()
	{
		if(get('SWbuttons')) get('SWbuttons').style.display = useSW ? "block" : "none";
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
			// initialize Offline Service Worker
			try { await OfflineHandler.init(); }
			catch(error) { console.error("OfflineHandler init failed : "+error); }
		}
		console.log("App started");
		updateSWbuttons();
		show('home');
		//OfflineHandler.cacheUpdate();
	}


	const updateSWbuttons = function ()
	{
		const reg = navigator.serviceWorker.controller;
		const downloading = (OfflineHandler && OfflineHandler.workerStatus()=="downloading")
		const updated = (OfflineHandler && OfflineHandler.workerStatus()=="updated")
		get('SWinstallButton').style.display = !reg ? "inline-block" : "none";
		get('SWinstalling').style.display = (reg && downloading) ? "inline-block" : "none";
		get('SWready').style.display = (reg && !downloading) ? "inline-block" : "none";
		get('SWrestartButton').style.display = updated ? "inline-block" : "none";
	}


	const install = function ()
	{
		if(OfflineHandler)
		{
			get("SWinstallButton").disabled = true;
			get("SWinstallButton").value = "Installation en cours...";
			updateSWbuttons();
			OfflineHandler.workerInstall();
		}
	}
	
	
	const cacheEventHandler = function (event)
	{
		const e = event.detail;
		if(e.type=='error') console.log("Erreur de cache : "+e.error);
		if(e.type=='progress') console.log("Téléchargement : "+e.progress);
		if(e.type=='updated') console.log("Mise à jour prête");
		updateSWbuttons();
	}

	const showOfflineStatus = function ()
	{
		OfflineHandler.askStatus(function(response)
		{
			let txt = "<p>Version : "+response.version;
			txt += "<p>Cache size : "+(response.size ? (Math.round(response.size/1024)+" ko") : "unknown");
			get('status').innerHTML = txt;
		});
	}
	
	let API = {
		getVersion: () => VERSION,
		init: init,
		show: show,
		install: install
	}
	if(useSW)
	{
		API.workerUpdate = OfflineHandler.workerUpdate;
		API.cacheUpdate = OfflineHandler.cacheUpdate;
		API.showOfflineStatus = showOfflineStatus;
	}
	return API;
})();

window.addEventListener('load', App.init, false);
