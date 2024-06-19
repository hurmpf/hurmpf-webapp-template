const App = (function()
{
	const VERSION = "1";
	const NOTIF_ERROR = 1;
	const NOTIF_MESSAGE = 2;
	const NOTIF_CACHE = 3;
	const redDot = '<span style="color:red">&#x2b24;</span>';       //"&#128308;";
	const orangeDot = '<span style="color:orange">&#x2b24;</span>'; //"&#128992;";
	const greenDot = '<span style="color:green">&#x2b24;</span>';   //"&#128994;";
	const goodNewsStyle = "color:green;font-weight:bold;";
	const badNewsStyle = "color:red;font-weight:bold;";
	
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
		if(get('installButton')) get('installButton').style.display = useSW ? "block" : "none";
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
			catch(error) { workerRegisterFailed(error); }
			// if nothing is being installed, update
			OfflineHandler.workerUpdate();
		}
		console.log("App started");
		show('home');
		//OfflineHandler.cacheUpdate();
	}


	const install = function ()
	{
		if(OfflineHandler)
		{
			get("installButton").disabled = true;
			get("installButton").value = "Installation en cours...";
			OfflineHandler.workerInstall();
		}
	}
	
	
	const workerRegisterFailed = function (error)
	{
		console.error("worker register failed : "+error);
		useSW = false;
	}
	
	
	const cacheEventHandler = function (event)
	{
		const e = event.detail;
		if(e.type=='error') showNotification("cache","Erreur de cache !<br><small>"+e.error+"</small>");
		if(e.type=='progress') showNotification("cache-download","Téléchargement : "+e.progress);//console.log("Cache download : "+e.progress);
	}
	
	
	// type = update, error, other
	const showNotification = function (type, text, callback)
	{
		console.log("notif "+type+" : "+text);
		if(type=="cache-download")
		{
			// look for another update notification
			let prevNotif = document.querySelector(".notification-cache-download");
			if(prevNotif) prevNotif.parentElement.removeChild(prevNotif);
		}
		let notifDiv = document.createElement("div")
		notifDiv.innerHTML = text;
		notifDiv.style.display = "block";
		notifDiv.className = "notification-"+type;
		notifDiv.style.opacity = 1;
		notifDiv.onclick = (function(notif, callback) { return function() { if(callback) callback(); hideNotification(notif); } })(notifDiv,callback);
		notifDiv.timeout = setTimeout(() => hideNotification(notifDiv),10000);
		get('notifications').appendChild(notifDiv);
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
			get('status').innerHTML = txt;
		});
	}
	
	let API = {
		getVersion: () => VERSION,
		init: init,
		show: show,
		install: install,
		showNotification: showNotification
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
