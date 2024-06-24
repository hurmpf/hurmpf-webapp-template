/**
 HURMPF OFFLINE CACHING SERVICE WORKER
 - cache files listed by MANIFEST file (offline.php returns a JSON of path/hash)
 - updates only modified files (file date or hash noted in database)
 - BroadcastMessage : type = "message", "status", "downloading", "updated", value = content
**/

'use strict';

const VERSION = 1;                             // version, append in cache name and used for database
const CACHEPREFIX = 'test-cache-';             // used to detect the caches of this app (don't delete cache of other apps)
const CACHENAME = CACHEPREFIX+VERSION;         // cache name for offline access
const MANIFEST = 'offline.php';                // path to manifest script (should not be changed)
const CHANNELNAME = 'offline-sw';              // comminucation channel between service worker and page script (should not be changed)
const CHANNEL = (typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNELNAME));
const MAINPAGE = "index.php";

// for simulation (not used)
const sleep = function (ms) { return new Promise(resolve => setTimeout(resolve, ms)); }


//--------
// EVENTS
//--------

// on installation, remove old cache and update current cache
self.addEventListener("install", function(event)
{
	log("install new SW : "+VERSION);
	broadcastMessage('installing');
	log("installed SW");
	self.skipWaiting();
});


// on activation, do nothing ?
self.addEventListener("activate", function(event)
{
	log("activate SW "+VERSION);
	event.waitUntil(cacheRemoveOld().then(cacheUpdate()));
	self.clients.claim();
});


// on fetch event, try cache first, if no match call network
// if empty url, get main page instead
self.addEventListener("fetch", function(event)
{
	event.respondWith(async function() {
		let request = event.request;
		if(baseName(request.url)=="") 
		{
			request = new Request(request.url + MAINPAGE, {
				method: request.method,
				headers: request.headers,
				credentials: request.credentials
			});
		}
		const cachedResponse = await caches.match(request);
		log("Fetching "+baseName(request.url)+" ("+(cachedResponse?"cached":"network")+")");
		if (cachedResponse) return cachedResponse;
		else return fetch(request.url).catch(error => broadcastMessage('error',error));
	}());
});


// on message received 
// cache-update : update cache
self.addEventListener('message', async function(event)
{
	log("receive message '"+event.data+"'");
	let answer = "?";
	switch (event.data)
	{
		case "cache-update": answer = await cacheUpdate(); break;
		default: log("unknown message : "+event.data);
	}
	event.ports[0].postMessage(answer);
});





//-------
// UTILS
//-------

function log(content) { console.log("SW :", content); }
function warn(content) { console.warn("SW :", content); }

function broadcastMessage (type, value) { if(CHANNEL) CHANNEL.postMessage({ type:type, value:value }); }

function baseName (url) { return url.replace(self.registration.scope,''); }

function promisifyRequest (request)
{
	return new Promise((resolve, reject) =>
	{
		request.addEventListener('success', () => resolve(request.result));
		request.addEventListener('error', () => reject(request.error));
	});
}



//-------
// CACHE
//-------

// returns the list of cached url
async function cacheList ()
{
	let cache = await caches.open(CACHENAME);
	let cacheKeys = await cache.keys();
	return cacheKeys.map(element => baseName(element.url));
}

// delete older caches (same prefix but different version)
async function cacheRemoveOld ()
{
	var cachenames = await caches.keys();
	cachenames.forEach(async function(cachename)
	{
		if(cachename.indexOf(CACHEPREFIX)==0 && cachename!=CACHENAME)
		{
			log("delete "+cachename)
			await caches.delete(cachename);
		}
	});
}

// delete the current cache (for bug fixing)
function cacheClear ()
{
	return caches.delete(CACHENAME);
}

// update the current cache : check if file changed and if yes download it
async function cacheUpdate ()
{
	try {
		let cache = await caches.open(CACHENAME);
		const manifestResponse = await fetch(MANIFEST, {cache: "no-store", headers:{'Cache-control':'no-cache'}});
		const manifestObject = await manifestResponse.json();
		const filesToDownload = manifestObject.files;
		const nb = filesToDownload.length;
		log(nb+" files to download, "+Math.round(manifestObject.size/(1024*1024))+" Mo");
		for(let i=0; i<nb; i++)
		{
			const file = filesToDownload[i]
			await cache.add(new Request(file,{cache: "no-store", headers:{'Cache-control':'no-cache'}})).then(
				async function() { broadcastMessage("downloading", Math.round(100*(i+1)/nb)+"%"); });
		}
		setTimeout(() => broadcastMessage("updated",nb>0), 1000);
		await cacheClean(true);
		log("cache update successful");
		return "OK";
	}
	catch (error)
	{
		warn("Unable to update cache : "+error);
		//broadcastMessage('error','Fetch failed');
		return "error";
	}
}


// delete old cache files not found in manifest
async function cacheClean (verbose)
{
	try {
		const manifestResponse = await fetch(MANIFEST, {headers:{'Cache-control':'no-cache'}});
		const manifestObject = await manifestResponse.json();
		const list = manifestObject.files;
		const cache = await caches.open(CACHENAME);
		const cacheKeys = await cache.keys();
		cacheKeys.forEach(function(element)
		{
			var file = baseName(element.url);
			if(!list.indexOf(file)===-1)
			{
				cache.delete(element);
				if(verbose) log("[cacheClean] removed from cache : "+file);
			}
		});
	}
	catch (error)
	{
		warn("Unable to clean cache : "+error+"\n"+error.stack);
	}
}

