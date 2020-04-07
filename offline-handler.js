
const OfflineHandler = (function()
{
	const VERSION = "8";
	const SW_FILENAME = 'offline-sw.js';
	const CHANNEL_NAME = 'offline-sw';
	
	function get (id) { return document.getElementById(id); }


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
	

	const init = function ()
	{
		// register SW
		navigator.serviceWorker.register(SW_FILENAME).then(
			reg => 
			{
				console.log('service worker registred.');
				reg.addEventListener('updatefound', () =>
				{
					let newWorker = reg.installing;
					newWorker.addEventListener('statechange', () =>
					{
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller)
						{
							console.log("NEW SERVICE WORKER INSTALLED");
							// maybe ask to reload the page
						}
					});
				});
			},
			error => console.log('service worker registration failed : '+error)
		);
		// listen for broadcast messages
		(new BroadcastChannel(CHANNEL_NAME)).addEventListener('message', event =>
		{
			switch(event.data.type)
			{
				case "message" : console.log('Received', event.data.value); break;
				case "downloading" : window.dispatchEvent(new CustomEvent("cacheUpdate",{detail:{type:'progress', progress:event.data.value}})); break;
				case "updated" : window.dispatchEvent(new CustomEvent("cacheUpdate",{detail:{type:'finish', updated:event.data.value}})); break;
				case "error" :  window.dispatchEvent(new CustomEvent("cacheUpdate",{detail:{type:'error', error:event.data.value}})); break;
				default: console.log("unknown message : "+event.data.type+" : "+event.data.value); 
			}
		});
	}

	
	const sendMessageToSW = function (msg, callback)
	{
		if(!navigator.serviceWorker.controller) throw new Error("no SW service !");
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
		getVersion : () => VERSION,
		missingBrowserFeatures: missingBrowserFeatures,
		init: init,
		workerUpdate: workerUpdate,
		cacheUpdate: () => sendMessageToSW('cache-update'),
		cacheReset: () => sendMessageToSW('reset'),
		askStatus: (callback) => sendMessageToSW('status',callback),
		resetEverything: () => sendMessageToSW('fix')
	}

})();