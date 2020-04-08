const App = (function()
{
	const VERSION = "1";
	const NOTIF_ERROR = 1;
	const NOTIF_MESSAGE = 2;
	const NOTIF_CACHE = 3;
	const redDot = '<span style="color:red">&#x2b24;</span>'; //"&#128308;";
	const orangeDot = '<span style="color:orange">&#x2b24;</span>'; //"&#128992;";
	const greenDot = '<span style="color:green">&#x2b24;</span>'; //"&#128994;";
	const goodNewsStyle = "color:green;font-weight:bold;";
	const badNewsStyle = "color:red;font-weight:bold;";
	
	let _currentScreen = "loading";

	const get = function (id) { return document.getElementById(id); }
	let useSW = (location.search.indexOf("appcache")==-1 && location.search.indexOf("nocache")==-1)
	
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
		if(missingBrowserFeatures().length>0) return show('oldbrowser');
		
		if(!useSW)
		{
			// remove service worker
			navigator.serviceWorker.getRegistrations().then(
				function(registrations) { for(let registration of registrations) registration.unregister(); }
			);
		}
		if(useSW)
		{
			// if missing any browser feature, redirect to use ApplicationCache
			if(OfflineHandler.missingBrowserFeatures().length>0) return location.href = "index.php?appcache";
			// initialize Offline Service Worker
			await OfflineHandler.init();
			window.addEventListener("noController", noController);
			window.addEventListener("newWorkerInstalled", updateAvailable);
			window.addEventListener("cacheUpdate", cacheEventHandler);
			await OfflineHandler.workerUpdate();
			await OfflineHandler.cacheUpdate();
		}
		console.log("App started");
		show('home');
	}
	
	
	const missingBrowserFeatures = function ()
	{
		const checkList = [];
		let missing = [];
		checkList.forEach( check =>
		{
			let ok = (check in window || check in navigator);
			if(!ok) missing.push(check);
		});
		return missing;
	}
	
	
	const noController = function ()
	{
		showNotification("Le service de cache n'est pas lancé.<br><small>Cliquez ici pour relancer l'application.</small>",()=>document.location.reload());
		useSW = false;
	}
	
	
	const updateAvailable = function ()
	{
		showNotification("Une mise à jour est disponible.<br><small>Cliquez ici pour relancer l'application.</small>",()=>document.location.reload());
	}
	
	
	const cacheEventHandler = function (event)
	{
		const e = event.detail;
		if(e.type=='error') showNotification("Erreur de cache !<br><small>"+e.error+"</small>");
		if(e.type=='progress') console.log("Cache download : "+e.progress);
		if(e.type=='finish' && e.updated) updateAvailable();
	}
	
	
	const showNotification = function (text, callback)
	{
		let newNotif = document.createElement("div");
		newNotif.innerHTML = text;
		newNotif.style.display = "block";
		newNotif.style.opacity = 1;
		newNotif.onclick = (function(notif, callback) { return function() { if(callback) callback(); hideNotification(notif); } })(newNotif,callback);
		newNotif.timeout = setTimeout(()=>hideNotification(newNotif),10000);
		get('notifications').appendChild(newNotif);
	}
	
	const hideNotification = function (notif)
	{
		notif.style.opacity = 0;
		clearTimeout(notif.timeout);
		setTimeout(function() { notif.style.display = "none"; }, 1000);
	}

	
	const showOfflineStatus = function ()
	{
		OfflineHandler.askStatus(function(response)
		{
			let txt = "<p>Version : "+response.version;
			txt += "<p>Cache size : "+(response.size ? (Math.round(response.size/1024)+" ko") : "unknown");
			txt += "<p>Integrity : "+(response.integrity?greenDot:redDot);
			//txt += "<p>Database : <br>"+response.database.map(x => x.path).join('<br>');
			//txt += "<p>Cache : <br>"+response.cache.join('<br>');
			get('status').innerHTML = txt;
		});
	}
	
	let API = {
		getVersion: () => VERSION,
		init: init,
		show: show
	}
	if(useSW)
	{
		API.workerUpdate = OfflineHandler.workerUpdate;
		API.cacheUpdate = OfflineHandler.cacheUpdate;
		API.cacheReset = OfflineHandler.cacheReset;
		API.showOfflineStatus = showOfflineStatus;
		API.fix = OfflineHandler.resetEverything;
	}
	return API;
})();

window.addEventListener('load', App.init, false);
