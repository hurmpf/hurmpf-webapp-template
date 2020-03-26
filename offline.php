<?php
/**
 HURMPF OFFLINE CACHING MANIFEST
	recursively list files
	can return a JSON list of couples filename/hash, can be used by service worker to update modified files
	can return an ApplicationCache Manifest if called with ?appcache
**/
$exclude = array("service-worker.js","git","LICENSE","README.md");
$possibleMainPage = array("index.php","index.html");
$files = array();
$size = 0;
$md5Hash = false; // true => md5, false => last-modified
$appCacheMode = isset($_GET['appcache']); // true => appCache, false => ServiceWorker
$maxdate = 0;

function add_files ($dir)
{
	global $exclude, $size, $files, $md5Hash, $maxdate;
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
			if($md5Hash) $files[$path] = md5_file($path);
			else $files[$path] = $filedate;
			if($filedate>$maxdate) $maxdate = $filedate;
			$size += filesize ($path);
		}
	}
}

add_files(".");
$mainPage = null;
foreach($files as $page=>$hash)
{
	if(in_array($page, $possibleMainPage))
	{
		$mainPage = $page;
		break;
	}
}		
$results = array(
	'size' => $size,
	'mainPage' => $mainPage,
	'files' => $files
);

// start output
header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT"); // past date to force refresh
if($appCacheMode)
{
	// ApplicationCache manifest
	header("Content-Type: text/cache-manifest;charset=utf-8");
	echo "CACHE MANIFEST\n";
	echo "# v".$maxdate."\n"; // add last modified date to trigger updates
	foreach($files as $path => $hash)
		echo $path."\n";
}
else
{
	// JSON for service worker
	header("Content-Type: application/json;charset=utf-8");
	echo json_encode($results,  JSON_UNESCAPED_SLASHES);
}

?>
