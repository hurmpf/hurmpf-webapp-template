(function(){
	window.OfflineHandler = (window.OfflineHandler || {});
	const VERSION = "8";
	const SW_FILENAME = 'offline-sw.js';
	const redDot = '<span style="color:red">&#x2b24;</span>'; //"&#128308;";
	const orangeDot = '<span style="color:orange">&#x2b24;</span>'; //"&#128992;";
	const greenDot = '<span style="color:green">&#x2b24;</span>'; //"&#128994;";
	const goodNewsStyle = "color:green;font-weight:bold;";
	const badNewsStyle = "color:red;font-weight:bold;";

	function get (id) { return document.getElementById(id); }

	OfflineHandler.getVersion = function () { return VERSION; }
	
	OfflineHandler.sendMessageToSW = function (msg, callback)
	{
		if(!navigator.serviceWorker.controller) return console.log("no service !");
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


	OfflineHandler.checkCapabilities = function ()
	{
		const checkList = ["serviceWorker","caches","BroadcastChannel", "indexedDB"];
		let allOK = true;
		checkList.forEach( check =>
		{
			let ok = (typeof window[check]!=="undefined" || typeof navigator[check]!=="undefined");
			if(ok) console.log("%c✓ "+check+" OK",goodNewsStyle);
			else console.log("%c✗ "+check+" not available !",badNewsStyle);
			allOK &= ok;
		});
		return allOK;
	}


	OfflineHandler.init = function ()
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
		(new BroadcastChannel('sw-messages')).addEventListener('message', event =>
		{
			switch(event.data.type)
			{
				case "message" : console.log('Received', event.data.value); break;
				case "downloading" : get('cache').innerHTML = orangeDot+" "+event.data.value; break;
				case "updated" : get('cache').innerHTML = greenDot+" "+(event.data.value ? "updated !" : "nothing new !"); break;
				case "error" :  get('cache').innerHTML = orangeDot+" "+event.data.value; break;
				default: console.log("unknown message : "+event.data.type+" : "+event.data.value);
			}
		});
	}


	OfflineHandler.update = function ()
	{
		navigator.serviceWorker.getRegistration().then(reg => console.log(reg.update()));
	}


	OfflineHandler.askStatus = function ()
	{
		if(!navigator.serviceWorker.controller) return get('status').innerHTML = "<b>no service !</b>";
		this.sendMessageToSW("status", function(response)
		{
			let txt = "<p>Version : "+response.version;
			txt += "<p>Cache size : "+(response.size ? (Math.round(response.size/1024)+" ko") : "unknown");
			txt += "<p>Integrity : "+(response.integrity?greenDot:redDot);
			//txt += "<p>Database : <br>"+response.database.map(x => x.path).join('<br>');
			//txt += "<p>Cache : <br>"+response.cache.join('<br>');
			get('status').innerHTML = txt;
		});
	}

})();