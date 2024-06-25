
const OfflineHandler = (function()
{
	const VERSION = "8";
	const SW_FILENAME = 'offline-sw.js';
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
				case "installed" : workerStatus="ready"; fireEvent("installed"); break;
				case "downloading" : workerStatus="downloading"; fireEvent("cacheUpdate",{type:'progress', progress:event.data.value}); break;
				case "updated" : workerStatus="ready"; fireEvent("cacheUpdate",{type:'finish', updated:event.data.value}); break;
				case "error" : workerStatus="error"; fireEvent("cacheUpdate",{type:'error', error:event.data.value}); break;
				default: console.log("unknown message : "+event.data.type+" : "+event.data.value); 
			}
		});
		workerUpdate();
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
	
	
	// pour demander status ou lancer la mise à jour du cache
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
		if(callback)
			if(p) p.then( callback );
			else callback();
		return p;
	}
	
	
	return {
		getVersion: () => VERSION,
		init: init,
		workerStatus: () => workerStatus,
		workerInstall: workerInstall,
		//workerAskStatus: askStatus,
		cacheUpdate: () => sendMessageToSW('cache-update'),
	}

})();