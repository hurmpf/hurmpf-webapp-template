<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=0">
<meta charset="UTF-8">
<meta http-equiv="cache-control" content="max-age=0" />
<meta http-equiv="cache-control" content="no-cache" />
<meta http-equiv="expires" content="0" />
<meta http-equiv="expires" content="Tue, 01 Jan 1980 1:00:00 GMT" />
<meta http-equiv="pragma" content="no-cache" />
<link rel="manifest" href="offline.webmanifest" />
<link rel="icon" href="icon.png" />
<link rel="apple-touch-icon" href="icon.png" />
<link rel="shortcut icon" href="icon.png" />
<style>
html, body { font-family:sans-serif; width:100%; height:100%; padding:0; margin:0; }
.screen { width:calc(100%-1em); height:calc(100%-1em); padding:1em; display: none; }
#loading { display: block; }
#loading h1 { text-align: center; margin-top: 20vmin; }
#notifications { position: absolute; bottom: 1em; right: 1em; }
#notifications div {
	margin-top: 1em;
	padding: 1em;
	border: 1px solid black;
	border-radius: 0.5em;
	background-color: #fdd;
	transition: opacity 1s ease-out;
	opacity: 0;
	display: none;
}
#SWbuttons div { display: inline-block; border: 1px solid black; font-size: small; padding: 0.2em 0.4em; }
</style>
<title>Offline Test</title>
</head>
<body>

<div class="screen" id="loading">
	<h1>Loading...</h1>
</div>

<div class="screen" id="home">
	<h1>Offline Test</h1>

	<div id="SWbuttons">
		<input type="button" id="SWinstallButton" value="Installer" />
		<div id="SWinstalling">⏳ Installation...<span id="SWinstallPrc"></span></div>
		<div id="SWready">✅ Installé</div>
		<input type="button" id="SWrestartButton" value="Cliquer ici pour relancer l'application" onclick="location.reload()" />
	</div>

	<p>
		<img src="assets/earth1.jpg" style="max-height:20vh; max-width:20vw;" />
		<img src="assets/earth2.jpg" style="max-height:20vh; max-width:20vw;" />
		<img src="assets/earth3.jpg" style="max-height:20vh; max-width:20vw;" />
		<img src="assets/earth4.jpg" style="max-height:20vh; max-width:20vw;" />
</div>

<div id="notifications"></div>

<?php
	$useServiceWorker = !isset($_GET['nocache']);
	if($useServiceWorker) // add service worker script
		echo '<script src="offline-handler.js"></script>'."\n";
?>
<script src="app-core.js"></script>
</body>
<html>
