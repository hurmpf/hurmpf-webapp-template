<!doctype html>
<html<?php if(isset($_GET['appcache'])) echo ' manifest="offline.php?appcache"'; ?>>
<head>
<meta charset="UTF-8">
<link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon"> 
<style>
body { font-family: Calibri; padding: 1em; }
#status { margin: 1em 0; padding: 1em; border: 1px solid black; display: inline-block; }
</style>
<?php
	$hasServiceWorker = (!isset($_GET['appcache']) && !isset($_GET['nocache']));
	if($hasServiceWorker) // add service worker script
		echo '<script src="script.js"></script>'."\n";
?>
</head>
<body>

<h1>Offline Test</h1>

<p><input type="button" value="update" onclick="OfflineHandler.update()" />
<input type="button" value="cache update" onclick="OfflineHandler.sendMessageToSW('cache-update')" />
<input type="button" value="status" onclick="OfflineHandler.askStatus()" />
<input type="button" value="clear everything" onclick="OfflineHandler.sendMessageToSW('reset')" />
<input type="button" value="fix" onclick="OfflineHandler.sendMessageToSW('fix')" />

<div id="status"></div>

<div id="cache"></div>

</body>
<html>
