
const OfflineHandler = (function()
{
	const VERSION = "8";
	const SW_FILENAME = 'offline-sw.js';
	const CHANNEL_NAME = 'offline-sw';
	//let workerRunningStatus = "unknown"; // installing, installed, activating, activated, redundant, error
	let workerUpdateStatus = "unknown";  // noupdate, updating, ready, error
	
	function fireEvent (type, data) { window.dispatchEvent(new CustomEvent(type,{detail:data})) };
	
	
	const workerUpdateFound = function (reg)
	{
		workerUpdateStatus = "updating";
		let newWorker = reg.installing;
		newWorker.addEventListener('statechange', () =>
		{
			if (newWorker.state==='installed' && navigator.serviceWorker.controller)
			{
				workerUpdateStatus = "ready";
				fireEvent("workerInstalled");
			}
		});
	}
	

	const init = async function ()
	{
		// listen for broadcast messages
		(new BroadcastChannel(CHANNEL_NAME)).addEventListener('message', event =>
		{
			switch(event.data.type)
			{
				case "message" : console.log('Received', event.data.value); break;
				case "installed" : fireEvent("workerInstalled"); break;
				case "downloading" : fireEvent("cacheUpdate",{type:'progress', progress:event.data.value}); break;
				case "updated" : fireEvent("cacheUpdate",{type:'finish', updated:event.data.value}); break;
				case "error" : fireEvent("cacheUpdate",{type:'error', error:event.data.value}); break;
				default: console.log("unknown message : "+event.data.type+" : "+event.data.value); 
			}
		});
	}


	const workerInstall = async function ()
	{
		//workerRunningStatus = "installing";
		try {
			const reg = await navigator.serviceWorker.register(SW_FILENAME)
			console.log('Service worker registered.', reg);
			//workerRunningStatus = "installed";
			reg.addEventListener('updatefound', () => { workerUpdateFound(reg); });
		}
		catch (error) { currentStatus = "failed"; throw new Error('Service worker registration failed : '+error); }
	}
	
	
	const sendMessageToSW = function (msg, shouldHaveSW)
	{
		if(!navigator.serviceWorker.controller)
		{
			if(shouldHaveSW) fireEvent("noController");
			return;
		}
		return new Promise(function(resolve, reject)
		{
			let messageChannel = new MessageChannel();
			messageChannel.port1.onmessage = function(event)
			{
				if (event.data.error) reject(event.data.error);
				else resolve(event.data);
			};
			navigator.serviceWorker.controller.postMessage(msg, [messageChannel.port2]);
		});
	}
	
	
	const workerUpdate = function ()
	{
		return navigator.serviceWorker.getRegistration().then(reg => { if(reg) reg.update() });
	}
	
	const askStatus = function (callback)
	{
		let p = sendMessageToSW('status');
		if(callback) p.then( callback );
		return p;
	}
	
	
	return {
		getVersion: () => VERSION,
		init: init,
		workerInstall: workerInstall,
		workerUpdate: workerUpdate,
		cacheUpdate: () => sendMessageToSW('cache-update'),
	}

})();