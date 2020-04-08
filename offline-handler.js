
const OfflineHandler = (function()
{
	const VERSION = "8";
	const SW_FILENAME = 'offline-sw.js';
	const CHANNEL_NAME = 'offline-sw';
	
	function get (id) { return document.getElementById(id); }
	
	function fireEvent (type, data) { window.dispatchEvent(new CustomEvent(type,{detail:data})) };
	
	const missingBrowserFeatures = function ()
	{
		const checkList = ["serviceWorker","caches","BroadcastChannel", "indexedDB"];
		let missing = [];
		checkList.forEach( check =>
		{
			let ok = (check in window || check in navigator);
			if(!ok) missing.push(check);
		});
		return missing;
	}
	
	
	const workerUpdateFound = function (reg)
	{
		let newWorker = reg.installing;
		newWorker.addEventListener('statechange', () =>
		{
			if (newWorker.state==='installed' && navigator.serviceWorker.controller)
			{
				fireEvent("newWorkerInstalled");
			}
		});
	}
	

	const init = function ()
	{
		// register SW
		navigator.serviceWorker.register(SW_FILENAME).then(
			reg => 
			{
				console.log('service worker registred.');
				reg.addEventListener('updatefound', () => { workerUpdateFound(reg); });
			},
			error => console.log('service worker registration failed : '+error)
		);
		// listen for broadcast messages
		(new BroadcastChannel(CHANNEL_NAME)).addEventListener('message', event =>
		{
			switch(event.data.type)
			{
				case "message" : console.log('Received', event.data.value); break;
				case "downloading" : fireEvent("cacheUpdate",{type:'progress', progress:event.data.value}); break;
				case "updated" : fireEvent("cacheUpdate",{type:'finish', updated:event.data.value}); break;
				case "error" : fireEvent("cacheUpdate",{type:'error', error:event.data.value}); break;
				default: console.log("unknown message : "+event.data.type+" : "+event.data.value); 
			}
		});
	}
	
	
	const sendMessageToSW = function (msg, callback)
	{
		if(!navigator.serviceWorker.controller)
		{
			fireEvent("noController");
			return;
		}
		let p = new Promise(function(resolve, reject)
		{
			let messageChannel = new MessageChannel();
			messageChannel.port1.onmessage = function(event)
			{
				if (event.data.error) reject(event.data.error);
				else resolve(event.data);
			};
			navigator.serviceWorker.controller.postMessage(msg, [messageChannel.port2]);
		});
		p.then(response => { if(callback) callback(response); else console.log(response); });
	}
	
	
	const workerUpdate = function ()
	{
		navigator.serviceWorker.getRegistration().then(reg => reg.update());
	}
	
	
	return {
		getVersion: () => VERSION,
		missingBrowserFeatures: missingBrowserFeatures,
		init: init,
		workerUpdate: workerUpdate,
		cacheUpdate: () => sendMessageToSW('cache-update'),
		cacheReset: () => sendMessageToSW('reset'),
		askStatus: (callback) => sendMessageToSW('status',callback),
		resetEverything: () => sendMessageToSW('fix')
	}

})();