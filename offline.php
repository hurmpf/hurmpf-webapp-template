 <?php
/*
 HURMPF OFFLINE CACHING MANIFEST
	recursively list files
	return a JSON list of couples filename/hash, can be used by service worker to update modified files
*/
$exclude = array("offline-sw.js","git","LICENSE","README.md");
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
$results = array(
	'date' => $maxDate,
	'size' => $size,
	'files' => $files
);


// start output
header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT"); // past date to force refresh
header("Content-Type: application/json;charset=utf-8");
echo json_encode($results, JSON_UNESCAPED_SLASHES);

?>
