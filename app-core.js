(function(){
	window.App = (window.App || {});
	const VERSION = "1";
	const NOTIF_ERROR = 1;
	const NOTIF_MESSAGE = 2;
	const NOTIF_CACHE = 3;
	const redDot = '<span style="color:red">&#x2b24;</span>'; //"&#128308;";
	const orangeDot = '<span style="color:orange">&#x2b24;</span>'; //"&#128992;";
	const greenDot = '<span style="color:green">&#x2b24;</span>'; //"&#128994;";
	const goodNewsStyle = "color:green;font-weight:bold;";
	const badNewsStyle = "color:red;font-weight:bold;";
	
	App.currentScreen = "loading";

	var get = function (id) { return document.getElementById(id); }
	
	App.show = function (destination)
	{
		if(!get(destination)) throw new Error("Screen '"+destination+"' not found");
		if(!get(App.currentScreen)) throw new Error("Screen '"+App.currentScreen+"' not found");
		get(App.currentScreen).style.display = "none";
		App.currentScreen = destination;
		get(App.currentScreen).style.display = "block";
	}

	App.getVersion = function () { return VERSION; }
	
	App.init = async function ()
	{
		if(!App.checkCapabilities()) return App.show('oldbrowser');
		
		if(location.search.indexOf("appcache")==-1 && location.search.indexOf("nocache")==-1)
		{
			// if missing any browser feature, redirect to use ApplicationCache
			if(!OfflineHandler.checkCapabilities()) return location.href = "index.php?appcache";
			// initialize Offline Service Worker
			await OfflineHandler.init();
			OfflineHandler.update();
		}
		App.show('home');
	}
	
	App.checkCapabilities = function ()
	{
		const checkList = ["createEvent"];
		let allOK = true;
		checkList.forEach( check =>
		{
			let ok = (check in document || check in window || check in navigator);
			if(ok) console.log("%c✓ "+check+" OK",goodNewsStyle);
			else console.log("%c✗ "+check+" not available !",badNewsStyle);
			allOK &= ok;
		});
		return allOK;
	}

})();

window.addEventListener('load', App.init, false);
