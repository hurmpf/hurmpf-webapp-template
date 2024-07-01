const App = {
	VERSION: "1",
	_currentScreen: "loading",

	get: function (id) { return document.getElementById(id); },

	show: function (destination)
	{
		if(!App.get(destination)) throw new Error("Screen '"+destination+"' not found");
		if(!App.get(App._currentScreen)) throw new Error("Screen '"+App._currentScreen+"' not found");
		App.get(App._currentScreen).style.display = "none";
		App._currentScreen = destination;
		App.get(App._currentScreen).style.display = "block";
	},

	init: async function ()
	{
		try { await OfflineHandler.init(); }
		catch(error) { console.error("OfflineHandler init failed : "+error); }
		console.log("App started");
		App.show('home');
	}
}

window.addEventListener('load', App.init, false);
