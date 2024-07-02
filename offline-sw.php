<?php
/*
	OFFLINE CACHING
*/
$exclude = array("offline-sw.php","git","LICENSE","README.md");
$files = array();
$size = 0;
$maxDate = 0;


// function to recursively add files to the list of files to cache
// input : $dir is the start directory or file, $exclude is list of files of dirs to skip
// output : $files is the list, $size is the total size in bytes, maxDate is the last modification date
function add_files ($dir)
{
	global $exclude, $size, $files, $maxDate;
	foreach(scandir($dir) as $file)
	{
		if($file[0]==".") continue;
		if($file==basename(__FILE__)) continue;
		if(in_array($file,$exclude)) continue;
		$path = ($dir=="." ? $file : ($dir."/".$file));
		if(is_dir($path)) add_files($path);
		else
		{
			$filedate = filemtime($path);
			$files[] = $path;
			if($filedate>$maxDate) $maxDate = $filedate;
			$size += filesize ($path);
		}
	}
}


// add all files from current directory recursively
add_files(".");

// prepare the result output
$manifest = array(
	'date' => $maxDate,
	'size' => $size,
	'files' => $files
);

// start output
header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT"); // past date to force refresh
//header("Service-Worker-Allowed: https://cmrr-nice.fr/lab/offline/");
//header("Content-Type: application/javascript; charset=UTF-8");
header('Content-Type: application/javascript');
echo "\nconst manifest = ".json_encode($manifest, JSON_UNESCAPED_SLASHES).";\n";
echo "\nconst VERSION = '".$maxDate."';\n";    // version, append in cache name and used for database
echo <<<EOT
const CACHEPREFIX = 'test-cache-';             // used to detect the caches of this app (don't delete cache of other apps)
const CACHENAME = CACHEPREFIX+VERSION;         // cache name for offline access
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
	self.skipWaiting();
});


// on activation, do nothing ?
self.addEventListener("activate", function(event)
{
	log("activate SW "+VERSION);
	event.waitUntil(cacheRemoveOld().then(cacheDownload()));
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

// download the current cache : check if file changed and if yes download it
async function cacheDownload ()
{
	try {
		let cache = await caches.open(CACHENAME);
		const filesToDownload = manifest.files;
		const nb = filesToDownload.length;
		log(nb+" files to download, "+Math.round(manifest.size/(1024*1024))+" Mo");
		for(let i=0; i<nb; i++)
		{
			const file = filesToDownload[i]
			await cache.add(new Request(file,{cache: "no-store", headers:{'Cache-control':'no-cache'}})).then(
				async function() { broadcastMessage("downloading", Math.round(100*(i+1)/nb)+"%"); });
		}
		await sleep(2000);
		broadcastMessage("updated");
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
		const list = manifest.files;
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
		warn("Unable to clean cache : "+error);
	}
}
EOT;
?>