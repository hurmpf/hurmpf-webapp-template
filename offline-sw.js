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
const DBNAME = 'test-database';                // name of database where are stored the files hashes and basic infos
const MANIFEST = 'offline.php';                // path to manifest script (should not be changed)
const CHANNELNAME = 'offline-sw';              // comminucation channel between service worker and page script (should not be changed)
const CHANNEL = (typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNELNAME));

// for simulation (not used)
const sleep = function (ms) { return new Promise(resolve => setTimeout(resolve, ms)); }



//--------
// EVENTS
//--------

// on installation, remove old cache and update current cache
self.addEventListener("install", function(event)
{
	log("install new SW : "+VERSION);
	broadcastMessage('installed');
	event.waitUntil(dbUpdate().then(cacheRemoveOld()).then(cacheUpdate()));
	//self.skipWaiting();
});


// on activation, do nothing ?
self.addEventListener("activate", function(event)
{
	log("activate SW "+VERSION);
	//event.waitUntil(dbUpdate().then(cacheRemoveOld()).then(cacheUpdate()));
});


// on fetch event, try cache first, if no match call network
// if empty url, get main page instead
self.addEventListener("fetch", function(event)
{
	event.respondWith(async function() {
		let request = event.request;
		if(baseName(request.url)=="") 
		{
			const mainPage = await dbGet("infos","mainPage");
			if(mainPage) request = new Request(request.url + mainPage.value, {
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
// status : send current status
// cache-update : update cache
// reset : reset database and cache
// fix : attempt to reset everything in case of problem
self.addEventListener('message', async function(event)
{
	log("receive message '"+event.data+"'");
	let answer = "?";
	switch (event.data)
	{
		case "status": answer = await getStatus(); break;
		case "cache-update": answer = await cacheUpdate(); break;
		case "reset": answer = await resetDatabaseAndCache(); break;
		case "fix": answer = await fix(); break;
		default: log("unknown message : "+event.data);
	}
	event.ports[0].postMessage(answer);
});





//-------
// UTILS
//-------

function log (content) { console.log("SW :", content); }
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





//---------------
// COMMUNICATION
//---------------

// returns infos object { version:string, scope:string, size:int, database:array, cache:array, integrity:boolean }
async function getStatus ()
{ 
	let returnValue = { };
	returnValue.version = VERSION;
	returnValue.scope = self.registration.scope;
	let sizeRequest = await dbGet('infos', 'size');
	returnValue.size = sizeRequest ? sizeRequest.value : null;
	returnValue.database = await dbList('files');
	returnValue.cache = await cacheList();
	returnValue.integrity = await checkIntegrity();
	return returnValue;
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
		const manifestResponse = await fetch(MANIFEST, {cache: "no-store", headers:{'Cache-control':'no-cache'}});
		const manifestObject = await manifestResponse.json();
		const list = manifestObject.files;
		let filesToDownload = [];
		for(let path in list)
		{
			const knownFile = await dbGet("files", path);
			if(knownFile)
			{
				const changed = (knownFile.hash != list[path]);
				//log(path+" : "+(changed?"changed !":"ok"));
				if(changed) filesToDownload.push(path);
			}
			else
			{
				//log(path+" : new !");
				filesToDownload.push(path);
			}
		}
		log(filesToDownload.length==0 ? "nothing to download" : ("to download = "+filesToDownload.join(', ')));
		await caches.open(CACHENAME).then(async function(cache)
		{
			const nb = filesToDownload.length;
			for(let i=0; i<nb; i++)
			{
				const file = filesToDownload[i]
				await cache.add(new Request(file,{cache: "no-store", headers:{'Cache-control':'no-cache'}})).then(async function()
				{
					await dbPut("files", {path:file, hash:list[file]}).then(() => broadcastMessage("downloading",Math.round(100*(i+1)/nb)+"%"));
				});
			}
		});
		await dbPut("infos", {id:"size", value:manifestObject.size});
		await dbPut("infos", {id:"mainPage", value:manifestObject.mainPage});
		broadcastMessage("updated",filesToDownload.length>0);
		await cacheClean(true);
		log("cache update successful");
		return "OK";
	}
	catch (error)
	{
		//warn("Unable to update cache : "+error);
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
		const db = await promisifyRequest(indexedDB.open(DBNAME, VERSION));
		const transaction = db.transaction("files", "readwrite");
		const store = transaction.objectStore("files");
		cacheKeys.forEach(function(element)
		{
			var file = baseName(element.url);
			if(!list[file])
			{
				cache.delete(element);
				store.delete(baseName(element.url));
				if(verbose) log("[cacheClean] removed from cache : "+file);
			}
		});
	}
	catch (error)
	{
		warn("Unable to clean cache : "+error+"\n"+error.stack);
	}
}






//----------
// DATABASE
//----------

// create/update database
async function dbUpdate ()
{
	try
	{
		let request = indexedDB.open(DBNAME, VERSION);
		request.onupgradeneeded = function (event)
		{
			log("database upgrade");
			const db = event.target.result;
			if (!db.objectStoreNames.contains('files')) db.createObjectStore("files", { keyPath: "path" });
			else dbClear("files").catch( error => warn("Unable to clear store 'files' : "+error));
			if (!db.objectStoreNames.contains('infos')) db.createObjectStore("infos", { keyPath: "id" });
			else dbClear("infos").catch( error => warn("Unable to clear store 'infos' : "+error));
		}
	}
	catch (error) { warn("error updating database : "+error); }
}

// empty the IDBObjectStore, return the Promise
async function dbClear (storeName)
{
	try
	{
		const db = await promisifyRequest(indexedDB.open(DBNAME, VERSION));
		const transaction = db.transaction(storeName, "readwrite");
		const store = transaction.objectStore(storeName);
		return store.clear();
	}
	catch (error) { warn("error clearing database : "+error); }
}


// return the store content
async function dbList (storeName)
{
	try
	{
		const db = await promisifyRequest(indexedDB.open(DBNAME, VERSION));
		const transaction = db.transaction(storeName, "readonly");
		const store = transaction.objectStore(storeName);
		return await promisifyRequest(store.getAll());
	}
	catch (error) { warn("error listing database : "+error); }
}

// return the value associated to this key in this IDBObjectStore
async function dbGet (storeName, key)
{
	try
	{
		const db = await promisifyRequest(indexedDB.open(DBNAME, VERSION));
		const transaction = db.transaction(storeName, "readonly");
		const store = transaction.objectStore(storeName);
		return await promisifyRequest(store.get(key));
	}
	catch (error) { warn("error reading database : "+error); }
}

// add an item in the IDBObjectStore
async function dbPut (storeName, item)
{
	try
	{
		const db = await promisifyRequest(indexedDB.open(DBNAME, VERSION));
		const transaction = db.transaction(storeName, "readwrite");
		const store = transaction.objectStore(storeName);
		return await promisifyRequest(store.put(item));
	}
	catch (error) { warn("error writing database : "+error); }
}





//---------
// SPECIAL
//---------

async function resetDatabaseAndCache ()
{
	//await dbClear("files");
	//await dbClear("infos");
	await indexedDB.deleteDatabase(DBNAME); /* TODO: check this */
	await cacheClear();
	log("database and cache cleared !");
	return "OK";
}

async function checkIntegrity (verbose)
{
	const dbFiles = await dbList("files");
	if(!dbFiles) return false; // bad database
	const cacheFiles = await cacheList();
	let dbFilesSimple = [];
	let ok = true;
	dbFiles.forEach(item =>
	{
		dbFilesSimple.push(item.path);
		if(cacheFiles.indexOf(item.path)==-1)
		{
			if(verbose) log("[integrityCheck] "+item.path+" is not in cache");
			ok = false;
		}
	});
	cacheFiles.forEach(path => { 
		if(!dbFilesSimple.indexOf(path)==-1)
		{
			if(verbose) log("[integrityCheck] "+path+" is not in database");
			ok = false;
		}
	});
	return ok;
}

async function fix ()
{
	let ok = await checkIntegrity(true);
	log("intregrity : "+(ok?"ok":"failed"));
	if(!ok)
	{
		await resetDatabaseAndCache();
		await dbUpdate();
		await cacheUpdate();
		ok = await checkIntegrity();
		log("intregrity : "+(ok?"ok":"failed"));
	}
	return "OK";
	/*
	var request = indexedDB.open(DBNAME, version);
	request.onsuccess = function()
	{
		var db = request.result;
		var transaction = db.transaction("files", "readwrite");
		const store = transaction.objectStore("files");
		store.delete("azd.txt");
	};
	*/
}
