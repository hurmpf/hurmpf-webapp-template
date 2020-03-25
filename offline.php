<?php
/*
	recursively list files and return a JSON list of couples filename/hash
	the list can be used by service worker to update modified files
*/
$exclude = array("service-worker.js","git");
$possibleMainPage = array("index.php","index.html");
$files = array();
$size = 0;

function add_files ($dir)
{
	global $exclude, $size, $files;
	foreach(scandir($dir) as $file)
	{
		if($file[0]==".") continue;
		if($file==basename(__FILE__)) continue;
		if(in_array($file,$exclude)) continue;
		$path = ($dir=="." ? $file : ($dir."/".$file));
		if(is_dir($path)) add_files($path);
		else
		{
			$files[$path] = md5_file($path);
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
echo json_encode($results,  JSON_UNESCAPED_SLASHES);

?>
