<!doctype html>
<html<?php if(isset($_GET['appcache'])) echo ' manifest="offline.php?appcache"'; ?>>
<head>
<meta charset="UTF-8">
<link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon"> 
<style>
body { font-family: Calibri; padding: 1em; }
#status { margin: 1em 0; padding: 1em; border: 1px solid black; display: inline-block; }
html, body, .screen { width:100%; height:100%; }
.screen { display: none; }
#loading { display: block; }
#notification {
	position: absolute; bottom: 0; right: 0;
	border: 1px solid black; border-radius: 1em 0 0 0; 
}
</style>
<?php
	$hasServiceWorker = (!isset($_GET['appcache']) && !isset($_GET['nocache']));
	if($hasServiceWorker) // add service worker script
		echo '<script src="offline-handler.js"></script>'."\n";
?>
<script src="app-core.js"></script>
</head>
<body>

<div class="screen" id="loading">Loading...</div>

<div class="screen" id="oldbrowser">Please update your browser</div>

<div class="screen" id="home">
	<h1>Offline Test</h1>

	<p><input type="button" value="update" onclick="OfflineHandler.update()" />
	<input type="button" value="cache update" onclick="OfflineHandler.sendMessageToSW('cache-update')" />
	<input type="button" value="status" onclick="OfflineHandler.askStatus()" />
	<input type="button" value="clear everything" onclick="OfflineHandler.sendMessageToSW('reset')" />
	<input type="button" value="fix" onclick="OfflineHandler.sendMessageToSW('fix')" />

	<div id="status"></div>
</div>

<div id="notification"></div>

</body>
<html>
