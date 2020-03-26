<!doctype html>
<html<?php if(isset($_GET['appcache'])) echo ' manifest="offline.php?appcache"'; ?>>
<head>
<meta charset="UTF-8">
<link rel="icon" href="favicon.ico" />
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
<body<?php if($hasServiceWorker) echo ' onLoad="init()"'; ?>>

<h1>Offline Test</h1>

<p><input type="button" value="update" onclick="tryUpdate()" />
<input type="button" value="cache update" onclick="sendMessageToSW('cache-update')" />
<input type="button" value="status" onclick="askStatus()" />
<input type="button" value="clear everything" onclick="sendMessageToSW('reset')" />
<input type="button" value="fix" onclick="sendMessageToSW('fix')" />

<div id="status"></div>

<div id="cache"></div>

</body>
<html>
